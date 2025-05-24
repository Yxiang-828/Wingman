const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const isDevelopment = process.env.NODE_ENV === 'development';

let backendProcess = null;

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

async function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      const backendDir = getResourcePath('Wingman-backend');
      const pythonExecutable = findPythonExecutable(backendDir);
      
      console.log(`Starting backend with Python: ${pythonExecutable}`);
      console.log(`Working directory: ${backendDir}`);
      
      // Create environment with Python paths
      const pythonPaths = [
        backendDir,
        path.join(backendDir, 'app')
      ].join(process.platform === 'win32' ? ';' : ':');
      
      // First run the patch script for Python 3.13 compatibility
      console.log('Running orjson patch for Python 3.13...');
      const patchProcess = spawn(pythonExecutable, [path.join(backendDir, 'patch-orjson.py')], {
        cwd: backendDir,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONPATH: pythonPaths
        }
      });
      
      patchProcess.stdout.on('data', (data) => {
        console.log(`Patch: ${data}`);
      });
      
      patchProcess.stderr.on('data', (data) => {
        console.error(`Patch error: ${data}`);
      });
      
      patchProcess.on('close', (code) => {
        console.log(`Patch process exited with code: ${code}`);
        
        // Now start the FastAPI backend
        console.log('Starting FastAPI backend...');
        backendProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8080'], {
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
        });
        
        backendProcess.on('error', (err) => {
          console.error('Failed to start backend process:', err);
          reject(err);
        });
        
        // Timeout fallback with health check
        setTimeout(() => {
          console.log('Backend startup timeout, checking health...');
          // Try a simple connection test
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
      
    } catch (error) {
      console.error('Error in startBackendServer:', error);
      reject(error);
    }
  });
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
      devTools: isDevelopment
    }
  });

  win.on('ready-to-show', () => {
    win.show();
    if (isDevelopment) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
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