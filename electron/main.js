import { app, BrowserWindow, nativeImage } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Mood system - changes every 2-4 hours
const moods = ['productive', 'moody'];
let currentMood = moods[0];
let moodTimeout;

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
    if (app.dock) app.dock.setIcon(icon); // macOS
    if (win) win.setIcon(icon); // Windows/Linux
    console.log(`Mood updated to ${currentMood} at ${new Date().toLocaleTimeString()}`);

    // --- ADD THIS: send mood to renderer ---
    if (win && win.webContents) {
      win.webContents.send('mood-changed', currentMood);
    }
    // ---------------------------------------

    // Schedule next mood change
    moodTimeout = setTimeout(() => {
      currentMood = getRandomMood();
      updateMoodIcons(win);
    }, getNextMoodDelay());
    
  } catch (error) {
    console.error('Failed to update icons:', error);
  }
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
    // Initial mood set and first scheduled change
    updateMoodIcons(win); 
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
        // Make sure this file correctly loads your app
        // Check that it references the correct paths for production builds

        // When in production mode, it should load from the dist directory:
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

// Add this to the top of your file
let backendProcess = null;

function startBackend() {
  // Path to the packaged Python executable and script
  const pythonExecutable = path.join(process.resourcesPath, 'backend', '.venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(process.resourcesPath, 'backend', 'main.py');
  
  // In development, use the local paths
  const devPythonExecutable = isDevelopment ? 
    path.join(__dirname, '..', 'Wingman-backend', '.venv', 'Scripts', 'python.exe') : 
    pythonExecutable;
  const devScriptPath = isDevelopment ? 
    path.join(__dirname, '..', 'Wingman-backend', 'main.py') : 
    scriptPath;
  
  console.log('Starting backend server...');
  console.log(`Python: ${devPythonExecutable}`);
  console.log(`Script: ${devScriptPath}`);
  
  // Start the FastAPI server
  backendProcess = spawn(devPythonExecutable, [devScriptPath]);
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend error: ${data}`);
  });
  
  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

// Add this function
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
  });
}

// Call this after the app is ready
app.whenReady().then(() => {
  startBackend();
  createWindow();
  setupAutoUpdater();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});