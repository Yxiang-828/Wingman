import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

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
    win.loadFile(path.join(__dirname, '../dist/fallback.html'));
  });

  const loadApp = async () => {
    try {
      if (isDevelopment) {
        await win.loadURL('http://localhost:5173');
      } else {
        await win.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    } catch (error) {
      console.error('Failed to load:', error);
      win.loadFile(path.join(__dirname, '../dist/fallback.html'));
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});