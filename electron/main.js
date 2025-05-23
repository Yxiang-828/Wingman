const { app, BrowserWindow, nativeImage, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Fix paths when bundled
const getResourcePath = (relPath) => {
  return isDevelopment 
    ? path.join(__dirname, '..', relPath)
    : path.join(process.resourcesPath, relPath);
};

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
    isDevelopment ? __dirname : process.resourcesPath,
    isDevelopment ? '../src/assets' : 'resources',
    `${currentMood}.${process.platform === 'win32' ? 'ico' : 
     process.platform === 'darwin' ? 'icns' : 'png'}`
  );

  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (app.dock) app.dock.setIcon(icon); // macOS
    if (win) win.setIcon(icon); // Windows/Linux
    console.log(`Mood updated to ${currentMood} at ${new Date().toLocaleTimeString()}`);

    // Send mood to renderer
    if (win && win.webContents) {
      win.webContents.send('mood-changed', currentMood);
    }

    // Schedule next mood change
    moodTimeout = setTimeout(() => {
      currentMood = getRandomMood();
      updateMoodIcons(win);
    }, getNextMoodDelay());
    
  } catch (error) {
    console.error('Failed to update icons:', error);
  }
}

// Load environment variables for backend
function setupEnvVars() {
  try {
    const prodEnvPath = path.join(process.resourcesPath, 'Wingman-backend', '.env');
    const devEnvPath = path.join(__dirname, '..', 'Wingman-backend', '.env');
    
    const envPath = isDevelopment ? devEnvPath : prodEnvPath;
    
    if (fs.existsSync(envPath)) {
      console.log(`Found .env file at: ${envPath}`);
    } else {
      console.error(`ERROR: .env file not found at: ${envPath}`);
    }
  } catch (error) {
    console.error('Error checking .env file:', error);
  }
}

// Start the backend server
async function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      // Determine the path to the Python executable and backend directory
      const isProduction = !isDevelopment;
      const basePath = isProduction
        ? process.resourcesPath
        : path.join(__dirname, '..');
      
      const backendDir = getResourcePath('Wingman-backend');
      
      // Determine the Python executable path based on platform and environment
      let pythonExecutable;
      
      if (process.platform === 'win32') {
        pythonExecutable = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
      } else {
        pythonExecutable = path.join(backendDir, '.venv', 'bin', 'python');
      }
      
      console.log('Starting backend server...');
      console.log(`Python executable: ${pythonExecutable}`);
      console.log(`Backend directory: ${backendDir}`);

      // Start the FastAPI backend with uvicorn
      backendProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8080'], {
        cwd: backendDir,
        windowsHide: true
      });

      let startupComplete = false;

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Backend: ${output}`);
        
        if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
          console.log('Backend server started successfully');
          startupComplete = true;
          resolve(backendProcess);
        }
      });

      backendProcess.stderr.on('data', (data) => {
        console.error(`Backend error: ${data}`);
        // Only reject if it's a startup error
        if (!startupComplete && data.toString().includes('Error')) {
          reject(new Error(`Backend failed to start: ${data}`));
        }
      });

      backendProcess.on('error', (err) => {
        console.error('Failed to start backend process:', err);
        reject(err);
      });

      // Set a timeout in case the server doesn't start properly
      setTimeout(() => {
        if (!startupComplete) {
          console.log('Backend start timed out, but proceeding anyway');
          resolve(backendProcess); // Resolve anyway to allow the app to try to continue
        }
      }, 10000);
    } catch (error) {
      console.error('Error starting backend:', error);
      reject(error);
    }
  });
}

async function createWindow() {
  // Start backend first in production mode
  if (!isDevelopment) {
    try {
      setupEnvVars();
      await startBackendServer();
      console.log('Backend started successfully');
    } catch (error) {
      console.error('Failed to start backend:', error);
      // Continue anyway to allow UI to load
    }
  }

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
    // Initial mood set and first scheduled change
    updateMoodIcons(win); 
  });

  // Handle external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error(`Window failed to load: ${errorCode} - ${errorDescription}`);
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  const loadApp = async () => {
    try {
      if (isDevelopment) {
        win.loadURL('http://localhost:5173');
      } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
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

  return win;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill the backend process when the app is closed
  if (backendProcess) {
    console.log('Terminating backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Make sure backend is terminated when app quits
  if (backendProcess) {
    console.log('Terminating backend process on quit...');
    backendProcess.kill();
    backendProcess = null;
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});