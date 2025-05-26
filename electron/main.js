const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const isDevelopment = process.env.NODE_ENV === 'development';

// FIXED: Check if backend is already running
let backendProcess = null;
let isBackendStarting = false;

function getResourcePath(relPath) {
  if (isDevelopment) {
    return path.join(__dirname, '..', relPath);
  } else {
    return path.join(process.resourcesPath, relPath);
  }
}

function findPythonExecutable(backendDir) {
  const possiblePaths = [
    // First priority: bundled portable Python
    isDevelopment 
      ? path.join(__dirname, '..', 'python-dist', 'python.exe')
      : path.join(process.resourcesPath, 'python-dist', 'python.exe'),
    
    // Second priority: virtual environment
    path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
    
    // Third priority: system Python
    'python',
    'python3',
    'py'
  ];

  for (const pythonPath of possiblePaths) {
    try {
      if (fs.existsSync(pythonPath)) {
        console.log(`Found Python at: ${pythonPath}`);
        return pythonPath;
      }
    } catch (error) {
      continue;
    }
  }

  console.log('Using default python command');
  return 'python';
}

/**
 * Forcefully frees port 8080 by killing any process using it
 * @returns {Promise<boolean>} True if port was freed or already free, false if failed
 */
async function forceReleasePort(port) {
  try {
    console.log(`Checking if port ${port} is in use...`);
    
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      console.log(`✅ Port ${port} is already free`);
      return true;
    }
    
    // Fix the PID extraction to avoid targeting PID 0
    console.log('Port is in use. Attempting to kill processes...');
    
    const lines = stdout.split('\n');
    let killed = false;
    
    for (const line of lines) {
      // Only target LISTENING connections with valid PIDs
      if (line.includes('LISTENING')) {
        const pidMatch = line.match(/\s+(\d+)\s*$/);
        if (pidMatch && pidMatch[1]) {
          const pid = parseInt(pidMatch[1], 10);
          // Skip PID 0 and obviously invalid PIDs
          if (pid > 0) {
            console.log(`🔥 Attempting to kill process ${pid} using port ${port}`);
            try {
              await execAsync(`taskkill /F /PID ${pid}`);
              console.log(`✅ Successfully terminated process ${pid}`);
              killed = true;
            } catch (killError) {
              console.log(`Failed to kill process ${pid}: ${killError.message}`);
            }
          }
        }
      }
    }
    
    if (!killed) {
      console.log('⚠️ NUCLEAR OPTION: Killing all Python processes');
      try {
        await execPromise('taskkill /F /IM python.exe /T');
        await execPromise('taskkill /F /IM pythonw.exe /T');
        console.log('✅ REPLACED: Killed all Python processes');
      } catch (pythonKillError) {
        console.log(`⚠️ Failed to kill Python processes: ${pythonKillError.message}`);
      }
    }
    
    // Verify port is now free
    await new Promise(resolve => setTimeout(resolve, 1000)); // Give OS time to release port
    
    try {
      const { stdout: checkStdout } = await execPromise(`netstat -ano | findstr :${port}`);
      const stillUsed = checkStdout.split('\n').some(line => line.includes(`LISTENING`));
      
      if (stillUsed) {
        console.log(`⚠️ Port ${port} is still in use after all termination attempts`);
        return false;
      }
    } catch (error) {
      // If command fails, likely because nothing is listening
      console.log(`✅ Verified port ${port} is now free`);
    }
    
    return true;
  } catch (error) {
    // If initial command fails, port is likely free
    console.log(`✅ Port ${port} appears to be free (no processes found)`);
    return true;
  }
}

// Replace your existing backend start function with this
async function startBackend(backendDir) {
  return new Promise((resolve, reject) => {
    const BACKEND_PORT = 8080;
    
    // Force kill any process using our port
    forceReleasePort(BACKEND_PORT).then(portFreed => {
      if (!portFreed) {
        console.error(`❌ Failed to free port ${BACKEND_PORT}.`);
        // Continue anyway - our backend will just fail to bind but at least we tried
      } else {
        console.log(`✅ Port ${BACKEND_PORT} is ready for backend`);
      }
      
      // Find Python executable
      const pythonPath = findPythonExecutable(backendDir);
      if (!pythonPath) {
        console.error('❌ Could not find Python executable');
        reject(new Error('Could not find Python executable'));
        return;
      }
      
      console.log(`Found Python at: ${pythonPath}`);
      
      // Run orjson patch for Python 3.13
      console.log('Running orjson patch for Python 3.13...');
      const { spawnSync } = require('child_process');
      const patchResult = spawnSync(
        pythonPath,
        [path.join(backendDir, 'patch-orjson.py')],
        { cwd: backendDir }
      );
      
      // Calculate Python path
      const pythonPaths = process.env.PYTHONPATH || '';
      
      // Now start the FastAPI backend
      console.log('Starting FastAPI backend...');
      backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8080'], {
        cwd: backendDir,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONPATH: pythonPaths,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_KEY: process.env.SUPABASE_KEY,
          DEBUG: process.env.DEBUG
        }
      });
      
      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Backend: ${output}`);
        
        // Look for startup completion
        if (output.includes('Application startup complete') || 
            output.includes('Uvicorn running on')) {
          resolve(backendProcess);
        }
      });
      
      backendProcess.stderr.on('data', (data) => {
        const errorText = data.toString();
        console.error(`Backend error: ${errorText}`);
        
        // Some servers output successful startup on stderr
        if (errorText.includes('Application startup complete') || 
            errorText.includes('Uvicorn running on')) {
          resolve(backendProcess);
        }
      });
      
      backendProcess.on('error', (err) => {
        console.error('Failed to start backend process:', err);
        reject(err);
      });
      
      // Timeout fallback with health check
      setTimeout(() => {
        console.log('Backend startup timeout, checking health...');
        const http = require('http');
        const req = http.get('http://localhost:8080/health', (res) => {
          if (res.statusCode === 200) {
            console.log('Backend health check passed!');
            resolve(backendProcess);
          } else {
            console.log('Backend health check failed, but continuing...');
            resolve(backendProcess);
          }
        });
        
        req.on('error', () => {
          console.log('Backend health check error, but continuing...');
          resolve(backendProcess);
        });
        
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(backendProcess);
        });
      }, 15000);
    });
  });
}

// Add this function before app.whenReady()
async function startBackendServer() {
  const backendDir = getResourcePath('Wingman-backend');
  return startBackend(backendDir);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true  // Always allow DevTools, regardless of environment
    }
  });

  win.on('ready-to-show', () => {
    win.show();
    if (isDevelopment) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
    // We don't auto-open DevTools in production, but they're available
  });

  const loadApp = async () => {
    try {
      if (isDevelopment) {
        win.loadURL('http://localhost:5173');
      } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    } catch (error) {
      console.error('Error loading app:', error);
    }
  };

  loadApp();
}

app.whenReady().then(() => {
  startBackendServer().then(() => {
    createWindow();
  }).catch((error) => {
    console.error('Failed to start backend:', error);
    // Create window anyway to show error
    createWindow();
  });
});

// Register keyboard shortcuts
app.whenReady().then(() => {
  // Register keyboard shortcut for DevTools
  const { globalShortcut } = require('electron');
  
  // Register F12 for DevTools
  globalShortcut.register('F12', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });
  
  // Register Ctrl+Shift+I as alternative
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });
});

// Make sure to unregister shortcuts when app quits
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('toggle-dev-tools', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.toggleDevTools();
  }
});

// Replace the existing health check interval with this one
let healthCheckFailCount = 0; // Track consecutive failures

setInterval(() => {
  if (backendProcess) {
    const http = require('http');
    const req = http.get('http://localhost:8080/health', (res) => {
      if (res.statusCode === 200) {
        // Success - reset failure counter
        if (healthCheckFailCount > 0) {
          console.log('Backend recovered, resetting failure counter');
        }
        healthCheckFailCount = 0;
      } else {
        console.log(`Backend returned status: ${res.statusCode}`);
        handlePotentialFailure('Non-200 response');
      }
    });
    
    // More generous timeout (15 seconds)
    req.setTimeout(15000, () => {
      req.abort();
      console.log('Health check timed out after 15 seconds');
      handlePotentialFailure('Timeout');
    });
    
    req.on('error', (err) => {
      // Ignore certain common network errors during idle periods
      if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
        console.log(`Ignoring common network error: ${err.code}`);
        return;
      }
      
      console.log(`Health check error: ${err.message}`);
      handlePotentialFailure(`Network error: ${err.code}`);
    });
  }
}, 60000); // Check every 60 seconds instead of 30

// Helper to only restart after multiple consecutive failures
function handlePotentialFailure(reason) {
  healthCheckFailCount++;
  
  if (healthCheckFailCount >= 3) {
    console.log(`Restarting backend after ${healthCheckFailCount} consecutive failures (${reason})`);
    restartBackend();
    healthCheckFailCount = 0;
  } else {
    console.log(`Health check issue (${reason}) - failure ${healthCheckFailCount}/3 - waiting for next check`);
  }
}

async function restartBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  
  await forceReleasePort(8080);
  startBackendServer().catch(console.error);
}