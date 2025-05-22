// Use CommonJS format for compatibility
const { app, BrowserWindow, dialog, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Mood system - changes every 2-4 hours
const moods = ['productive', 'moody'];
let currentMood = moods[0];
let moodTimeout;
let backendProcess = null;

function getRandomMood() {
  return moods[Math.floor(Math.random() * moods.length)];
}

function getNextMoodDelay() {
  // Returns milliseconds for 2-4 hour interval
  return (2 + Math.random() * 2) * 60 * 60 * 1000; 
}

function updateMoodIcons(win) {
  const iconPath = path.join(
    __dirname,
    `../src/assets/${currentMood}.${process.platform === 'win32' ? 'ico' : 
     process.platform === 'darwin' ? 'icns' : 'png'}`
  );

  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (app.dock) {
      app.dock.setIcon(icon);
    }
    if (win) {
      win.setIcon(icon);
    }
    console.log(`Mood updated to ${currentMood} at ${new Date().toLocaleTimeString()}`);

    // Send mood to renderer
    if (win && win.webContents) {
      win.webContents.send('mood-changed', currentMood);
    }

    // Schedule next mood change
    currentMood = getRandomMood();
    moodTimeout = setTimeout(() => {
      updateMoodIcons(win);
    }, getNextMoodDelay());
    
  } catch (error) {
    console.error('Failed to update icons:', error);
  }
}

// Add this function to help with debugging
function findPythonScriptFile() {
  const possiblePaths = [
    path.join(__dirname, '..', 'Wingman-backend', 'main.py'),
    path.join(process.resourcesPath, 'backend', 'main.py'),
    path.join(app.getAppPath(), 'backend', 'main.py'),
    path.join(app.getPath('userData'), 'backend', 'main.py'),
    path.join(process.resourcesPath, 'app.asar', 'backend', 'main.py'),
    path.join(process.resourcesPath, '..', 'backend', 'main.py')
  ];
  
  console.log('Looking for main.py in these locations:');
  const foundPaths = [];
  
  possiblePaths.forEach(p => {
    const exists = fs.existsSync(p);
    console.log(`- ${p}: ${exists ? 'EXISTS' : 'not found'}`);
    if (exists) foundPaths.push(p);
  });
  
  if (foundPaths.length > 0) {
    console.log('Using:', foundPaths[0]);
    return foundPaths[0];
  }
  
  return null;
}

// Then modify startBackend to use this function
function startBackend() {
  // Look for backend in the correct locations
  const mainPyPaths = [
    // Development paths
    path.join(__dirname, '..', 'Wingman-backend', 'main.py'),
    path.join(__dirname, '..', 'main.py'),
    // Production paths
    path.join(process.resourcesPath, 'backend', 'main.py'),
    path.join(process.resourcesPath, 'extraResources', 'backend', 'main.py'),
    path.join(app.getAppPath(), '..', 'backend', 'main.py')
  ];
  
  console.log('Looking for backend script in these locations:');
  let scriptPath = null;
  
  for (const testPath of mainPyPaths) {
    console.log(`- ${testPath}: ${fs.existsSync(testPath) ? 'EXISTS' : 'not found'}`);
    if (fs.existsSync(testPath)) {
      scriptPath = testPath;
      break;
    }
  }
  
  if (!scriptPath) {
    console.error('Could not find main.py in any expected location');
    
    // Copy main.py from inside the app to a location we can access
    try {
      // Create a backend directory in userData if it doesn't exist
      const userDataBackendDir = path.join(app.getPath('userData'), 'backend');
      if (!fs.existsSync(userDataBackendDir)) {
        fs.mkdirSync(userDataBackendDir, { recursive: true });
      }
      
      // Copy embedded main.py to userData if it exists in the app
      const embeddedMainPy = path.join(__dirname, '..', 'Wingman-backend', 'main.py');
      const targetMainPy = path.join(userDataBackendDir, 'main.py');
      
      if (fs.existsSync(embeddedMainPy)) {
        fs.copyFileSync(embeddedMainPy, targetMainPy);
        scriptPath = targetMainPy;
        console.log(`Copied main.py to ${targetMainPy}`);
      }
    } catch (err) {
      console.error('Error creating backup backend files:', err);
    }
    
    if (!scriptPath) {
      dialog.showErrorBox(
        'Backend Error',
        'Cannot find Python backend script. Please reinstall the application.'
      );
      return;
    }
  }
  
  console.log(`Starting backend with script path: ${scriptPath}`);
  
  // Try multiple Python commands
  const pythonCommands = ['py', 'python', 'python3'];
  let currentCommandIndex = 0;
  
  const tryNextPythonCommand = () => {
    if (currentCommandIndex >= pythonCommands.length) {
      console.error('All Python commands failed');
      dialog.showErrorBox(
        'Backend Error',
        'Could not start Python backend. Please ensure Python is installed.'
      );
      return;
    }
    
    const cmd = pythonCommands[currentCommandIndex++];
    console.log(`Attempting with ${cmd}...`);
    
    backendProcess = spawn(cmd, [scriptPath]);
    
    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend (${cmd}): ${data}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend error (${cmd}): ${data}`);
    });
    
    backendProcess.on('error', (error) => {
      console.error(`Failed to start backend with ${cmd}: ${error}`);
      tryNextPythonCommand();
    });
    
    backendProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`Backend process exited with code ${code}, trying next Python command`);
        tryNextPythonCommand();
      } else {
        console.log(`Backend process exited normally with code ${code}`);
      }
    });
  };
  
  // Start with the first Python command
  tryNextPythonCommand();
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
      devTools: true // Always enable DevTools for debugging
    }
  });

  win.on('ready-to-show', () => {
    win.show();
    win.webContents.openDevTools({ mode: 'detach' }); // Open DevTools for debugging
    // Initial mood set and first scheduled change
    updateMoodIcons(win); 
  });

  win.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error(`Window failed to load: ${errorCode} - ${errorDescription}`);
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  // Log all console messages from renderer
  win.webContents.on('console-message', (_, level, message) => {
    const levels = ['debug', 'info', 'warning', 'error', 'log'];
    console.log(`[Renderer ${levels[level] || level}]: ${message}`);
  });

  // Update the loadApp function
  const loadApp = async () => {
    try {
      if (isDevelopment) {
        win.loadURL('http://localhost:5173');
      } else {
        // Use file URL with the correct path
        const indexPath = path.join(__dirname, '../dist/index.html');
        win.loadFile(indexPath);
        
        // Log the path for debugging
        console.log('Loading app from:', indexPath);
      }
    } catch (error) {
      console.error('Failed to load:', error);
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  };

  loadApp();

  // Cleanup on window close
  win.on('closed', () => {
    clearTimeout(moodTimeout);
  });

  // In the createWindow function, after win.show():
  if (isDevelopment) {
    // Add a debug button for checking backend connection
    win.webContents.executeJavaScript(`
      // Wait for DOM to be ready
      document.addEventListener('DOMContentLoaded', () => {
        try {
          const debugDiv = document.createElement('div');
          debugDiv.style = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#333;padding:5px;border-radius:4px;';
          debugDiv.innerHTML = '<button id="check-backend" style="padding:5px">Check Backend</button>';
          document.body.appendChild(debugDiv);
          
          document.getElementById('check-backend').addEventListener('click', async () => {
            try {
              const res = await fetch('http://localhost:8000/health');
              const data = await res.json();
              alert('Backend OK: ' + JSON.stringify(data));
            } catch (err) {
              alert('Backend Error: ' + err.message);
            }
          });
        } catch (e) {
          console.error('Error adding debug button:', e);
        }
      });
    `);
  }

  return win;
}

function setupAutoUpdater() {
  // Configure the updater
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Yxiang-828',
    repo: 'Wingman'
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  // Listen for update events
  autoUpdater.on('update-available', () => {
    console.log('Update available');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded');
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new version has been downloaded. Restart to apply the updates.',
      buttons: ['Restart', 'Later']
    }).then((returnValue) => {
      if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
  });
}

// Call this after the app is ready
app.whenReady().then(() => {
  try {
    startBackend();
    const win = createWindow();
    setupAutoUpdater();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Fatal error during app startup:', error);
    dialog.showErrorBox('Startup Error', `Failed to start: ${error.message}`);
  }
});

// Add these handlers to properly clean up resources when the app closes
app.on('window-all-closed', () => {
  if (backendProcess) {
    try {
      // On Windows, terminate process tree to avoid orphaned processes
      if (process.platform === 'win32') {
        const execSync = require('child_process').execSync;
        try {
          execSync(`taskkill /pid ${backendProcess.pid} /t /f`);
        } catch (e) {
          console.error('Error killing backend with taskkill:', e);
          backendProcess.kill('SIGTERM');
        }
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('Error killing backend process:', e);
    }
    backendProcess = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Add this to ensure process cleanup before quitting
app.on('will-quit', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {
      console.error('Error killing backend process on quit:', e);
    }
    backendProcess = null;
  }
  
  // Clear any other timers or resources
  clearTimeout(moodTimeout);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Uncaught Exception', error.stack || error.message);
});