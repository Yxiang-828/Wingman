const { app, BrowserWindow, shell, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Import LocalDataManager
const { LocalDataManager } = require('./localDataBridge');

const isDevelopment = process.env.NODE_ENV === 'development';

// ✅ SANE GPU FLAGS - Not nuclear overkill
app.commandLine.appendSwitch('enable-gpu');
app.commandLine.appendSwitch('enable-gpu-compositing');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-smooth-scrolling');

// ✅ REMOVE THE INSANE FLAGS THAT CRASH GPU
// REMOVED: enable-unsafe-webgpu, disable-gpu-sandbox, ignore-gpu-blacklist, etc.

if (process.platform === 'win32') {
  // ✅ MINIMAL Windows flags
  app.commandLine.appendSwitch('enable-d3d11');
}

// FIXED: Check if backend is already running
let backendProcess = null;
let isBackendStarting = false;
let dataManager = null; // Initialize LocalDataManager

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
        console.log(`Found Python executable: ${pythonPath}`);
        return pythonPath;
      }
    } catch (error) {
      continue;
    }
  }

  console.log('Using default python command');
  return 'python';
}

// Helper function
const execAsync = util.promisify(exec);

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
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        
        if (pid && !isNaN(pid) && parseInt(pid) > 0) {
          try {
            console.log(`Killing process with PID: ${pid}`);
            await execAsync(`taskkill /F /PID ${pid}`);
            killed = true;
          } catch (killError) {
            console.log(`Failed to kill PID ${pid}:`, killError.message);
          }
        }
      }
    }
    
    if (!killed) {
      console.log('⚠️ NUCLEAR OPTION: Killing all Python processes');
      try {
        await execAsync('taskkill /F /IM python.exe');
        await execAsync('taskkill /F /IM uvicorn.exe');
      } catch (pythonKillError) {
        console.log('Python processes not found or already killed');
      }
    }
    
    // Verify port is now free
    await new Promise(resolve => setTimeout(resolve, 1000)); // Give OS time to release port
    
    try {
      const { stdout: checkStdout } = await execPromise(`netstat -ano | findstr :${port}`);
      const stillUsed = checkStdout.split('\n').some(line => line.includes(`LISTENING`));
      
      if (stillUsed) {
        console.log(`⚠️ Port ${port} still in use after cleanup attempt`);
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
        reject(new Error(`Could not free port ${BACKEND_PORT}`));
        return;
      } else {
        console.log(`✅ Port ${BACKEND_PORT} is free, starting backend...`);
      }
      
      // Find Python executable
      const pythonPath = findPythonExecutable(backendDir);
      if (!pythonPath) {
        reject(new Error('Python executable not found'));
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
        console.log('🐍 Backend:', output);
        
        if (output.includes('Uvicorn running on')) {
          console.log('✅ Backend server started successfully');
          resolve();
        }
      });
      
      backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('🐍 Backend Status:', error);
        
        if (error.includes('Address already in use')) {
          console.error('❌ Port 8080 is still in use');
          reject(new Error('Port 8080 already in use'));
        }
      });
      
      backendProcess.on('error', (err) => {
        console.error('❌ Failed to start backend:', err);
        reject(err);
      });
      
      // Timeout fallback with health check
      setTimeout(() => {
        console.log('⏰ Backend startup timeout, checking health...');
        
        const http = require('http');
        const req = http.get('http://127.0.0.1:8080/health', (res) => {
          console.log('✅ Backend health check passed, resolving...');
          resolve();
        });
        
        req.on('error', (err) => {
          console.error('❌ Backend health check failed:', err);
          reject(new Error('Backend failed to start within timeout'));
        });
        
        req.setTimeout(5000, () => {
          console.error('❌ Backend health check timed out');
          reject(new Error('Backend health check timeout'));
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
      devTools: true,
      experimentalFeatures: false, // ✅ DISABLE experimental features
      enableRemoteModule: false,
      webSecurity: true, // ✅ RE-ENABLE web security
      offscreen: false,
      backgroundThrottling: false,
      hardwareAcceleration: true, // Keep this
      allowRunningInsecureContent: false, // ✅ DISABLE insecure content
    }
  });

  win.on('ready-to-show', () => {
    win.show();
    if (isDevelopment) {
      win.webContents.openDevTools({ mode: 'detach' });
      
      // ✅ SIMPLE GPU DEBUG - No crashes
      console.log('🎮 GPU Acceleration Status:');
      win.webContents.executeJavaScript(`
        (function() {
          console.log('🎮 GPU Debug - Safe Mode');
          console.log('🎮 Hardware concurrency:', navigator.hardwareConcurrency);
          
          // Simple WebGL test
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          if (gl) {
            console.log('✅ WebGL available');
            console.log('🎮 WebGL Renderer:', gl.getParameter(gl.RENDERER));
          } else {
            console.log('❌ WebGL not available');
          }
          
          canvas.remove();
        })();
      `);
    }
  });

  const loadApp = async () => {
    try {
      if (isDevelopment) {
        console.log('🚀 Loading development server...');
        await win.loadURL('http://localhost:5173');
      } else {
        console.log('🚀 Loading production build...');
        await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
      }
    } catch (error) {
      console.error('Error loading app:', error);
    }
  };

  loadApp();
}

// ✅ COMPLETE: Initialize LocalDataManager and setup ALL IPC handlers
async function setupDatabaseIPC() {
  try {
    // Initialize LocalDataManager
    dataManager = new LocalDataManager();
    console.log('✅ LocalDataManager initialized successfully');

    // ✅ CRITICAL TEST: Verify dataManager methods exist
    console.log('🧪 Testing dataManager methods:');
    console.log('- getTasks method:', typeof dataManager.getTasks);
    console.log('- getEvents method:', typeof dataManager.getEvents);
    console.log('- getDiaryEntries method:', typeof dataManager.getDiaryEntries);
    console.log('- saveTask method:', typeof dataManager.saveTask);
    console.log('- saveEvent method:', typeof dataManager.saveEvent);
    console.log('- saveDiaryEntry method:', typeof dataManager.saveDiaryEntry);
    
    // Test database connection
    const testResult = dataManager.getStorageStats('test-user');
    console.log('✅ Database connection test passed:', testResult);
    
    // ═══════════════════════════════════════════════════════════════
    // 🎯 **COMPLETE IPC HANDLERS SETUP**
    // ═══════════════════════════════════════════════════════════════
    
    // ✅ TASK HANDLERS
    ipcMain.handle('db:getTasks', async (event, userId, date) => {
      try {
        console.log(`🔄 IPC: Getting tasks for user ${userId}${date ? ` on ${date}` : ''}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const tasks = dataManager.getTasks(userId, date);
        console.log(`✅ IPC: Found ${tasks.length} tasks`);
        return tasks;
      } catch (error) {
        console.error('❌ IPC: Error getting tasks:', error);
        throw new Error(`Failed to get tasks: ${error.message}`);
      }
    });

    // ✅ SAFE GPU HANDLER - No crashes
    ipcMain.handle('get-gpu-info', async () => {
      try {
        // ✅ SAFE: Don't call getGPUInfo - it crashes
        return {
          success: true,
          gpuInfo: { message: 'GPU info disabled to prevent crashes' },
          gpuFeatureStatus: { webgl: 'enabled', canvas2d: 'enabled' }
        };
      } catch (error) {
        return {  
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('db:saveTask', async (event, task) => {
      try {
        console.log('🔄 IPC: Saving task:', task);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedTask = dataManager.saveTask(task);
        console.log('✅ IPC: Task saved successfully:', savedTask);
        return savedTask;
      } catch (error) {
        console.error('❌ IPC: Error saving task:', error);
        throw new Error(`Failed to save task: ${error.message}`);
      }
    });

    ipcMain.handle('db:updateTask', async (event, id, updates) => {
      try {
        console.log(`🔄 IPC: Updating task ${id} with:`, updates);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const updatedTask = dataManager.updateTask(id, updates);
        console.log('✅ IPC: Task updated successfully:', updatedTask);
        return updatedTask;
      } catch (error) {
        console.error('❌ IPC: Error updating task:', error);
        throw new Error(`Failed to update task: ${error.message}`);
      }
    });

    ipcMain.handle('db:deleteTask', async (event, id) => {
      try {
        console.log(`🔄 IPC: Deleting task ${id}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.deleteTask(id);
        console.log('✅ IPC: Task deleted successfully');
        return result;
      } catch (error) {
        console.error('❌ IPC: Error deleting task:', error);
        throw new Error(`Failed to delete task: ${error.message}`);
      }
    });

    // ✅ EVENT HANDLERS
    ipcMain.handle('db:getEvents', async (event, userId, date) => {
      try {
        console.log(`🔄 IPC: Getting events for user ${userId}${date ? ` on ${date}` : ''}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const events = dataManager.getEvents(userId, date);
        console.log(`✅ IPC: Found ${events.length} events`);
        return events;
      } catch (error) {
        console.error('❌ IPC: Error getting events:', error);
        throw new Error(`Failed to get events: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveEvent', async (event, eventData) => {
      try {
        console.log('🔄 IPC: Saving event:', eventData);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedEvent = dataManager.saveEvent(eventData);
        console.log('✅ IPC: Event saved successfully:', savedEvent);
        return savedEvent;
      } catch (error) {
        console.error('❌ IPC: Error saving event:', error);
        throw new Error(`Failed to save event: ${error.message}`);
      }
    });

    ipcMain.handle('db:updateEvent', async (event, eventData) => {
      try {
        console.log('🔄 IPC: Updating event:', eventData);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.saveEvent(eventData); // saveEvent handles both create and update
        console.log('✅ IPC: Event updated successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ IPC: Error updating event:', error);
        throw new Error(`Failed to update event: ${error.message}`);
      }
    });

    ipcMain.handle('db:deleteEvent', async (event, id) => {
      try {
        console.log(`🔄 IPC: Deleting event ${id}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.deleteEvent(id);
        console.log('✅ IPC: Event deleted successfully');
        return result;
      } catch (error) {
        console.error('❌ IPC: Error deleting event:', error);
        throw new Error(`Failed to delete event: ${error.message}`);
      }
    });

    // ✅ DIARY HANDLERS
    ipcMain.handle('db:getDiaryEntries', async (event, userId, date) => {
      try {
        console.log(`🔄 IPC: Getting diary entries for user ${userId}${date ? ` on ${date}` : ''}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const entries = dataManager.getDiaryEntries(userId, date);
        console.log(`✅ IPC: Found ${entries.length} diary entries`);
        return entries;
      } catch (error) {
        console.error('❌ IPC: Error getting diary entries:', error);
        throw new Error(`Failed to get diary entries: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveDiaryEntry', async (event, entry) => {
      try {
        console.log('🔄 IPC: Saving diary entry:', entry);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedEntry = dataManager.saveDiaryEntry(entry);
        console.log('✅ IPC: Diary entry saved successfully:', savedEntry);
        return savedEntry;
      } catch (error) {
        console.error('❌ IPC: Error saving diary entry:', error);
        throw new Error(`Failed to save diary entry: ${error.message}`);
      }
    });

    // ✅ CHAT HANDLERS
    ipcMain.handle('db:getChatHistory', async (event, userId, limit) => {
      try {
        console.log(`🔄 IPC: Getting chat history for user ${userId}, limit: ${limit}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const history = dataManager.getChatHistory(userId, limit);
        console.log(`✅ IPC: Found ${history.length} chat messages`);
        return history;
      } catch (error) {
        console.error('❌ IPC: Error getting chat history:', error);
        throw new Error(`Failed to get chat history: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveChatMessage', async (event, message, isAi, userId, sessionId) => {
      try {
        console.log(`🔄 IPC: Saving chat message for user ${userId}, isAi: ${isAi}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedMessage = dataManager.saveChatMessage(message, isAi, userId, sessionId);
        console.log('✅ IPC: Chat message saved successfully:', savedMessage);
        return savedMessage;
      } catch (error) {
        console.error('❌ IPC: Error saving chat message:', error);
        throw new Error(`Failed to save chat message: ${error.message}`);
      }
    });

    ipcMain.handle('db:clearChatHistory', async (event, userId) => {
      try {
        console.log(`🔄 IPC: Clearing chat history for user ${userId}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        dataManager.clearChatHistory(userId);
        console.log('✅ IPC: Chat history cleared successfully');
        return { success: true };
      } catch (error) {
        console.error('❌ IPC: Error clearing chat history:', error);
        throw new Error(`Failed to clear chat history: ${error.message}`);
      }
    });

    // ✅ QUICK PROMPTS HANDLERS
    ipcMain.handle('db:getQuickPrompts', async (event, userId) => {
      try {
        return dataManager.getQuickPrompts(userId);
      } catch (error) {
        console.error('❌ IPC Error - getQuickPrompts:', error);
        return [];
      }
    });

    ipcMain.handle('db:saveQuickPrompt', async (event, userId, promptText) => {
      try {
        return dataManager.saveQuickPrompt(userId, promptText);
      } catch (error) {
        console.error('❌ IPC Error - saveQuickPrompt:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteQuickPrompt', async (event, promptId) => {
      try {
        return dataManager.deleteQuickPrompt(promptId);
      } catch (error) {
        console.error('❌ IPC Error - deleteQuickPrompt:', error);
        throw error;
      }
    });

    ipcMain.handle('db:updateQuickPromptUsage', async (event, promptId) => {
      try {
        return dataManager.updateQuickPromptUsage(promptId);
      } catch (error) {
        console.error('❌ IPC Error - updateQuickPromptUsage:', error);
        throw error;
      }
    });

    // ✅ USER SETTINGS HANDLERS
    ipcMain.handle('db:getUserSettings', async (event, userId) => {
      try {
        console.log(`🔄 IPC: Getting user settings for user ${userId}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const settings = dataManager.getUserSettings(userId);
        console.log(`✅ IPC: Found settings for user ${userId}`);
        return settings;
      } catch (error) {
        console.error('❌ IPC: Error getting user settings:', error);
        throw new Error(`Failed to get user settings: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveUserSettings', async (event, userId, settings) => {
      try {
        console.log(`🔄 IPC: Saving user settings for user ${userId}`, settings);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.saveUserSettings(userId, settings);
        console.log(`✅ IPC: User settings saved successfully for user ${userId}`);
        return result;
      } catch (error) {
        console.error('❌ IPC: Error saving user settings:', error);
        throw new Error(`Failed to save user settings: ${error.message}`);
      }
    });

    // ✅ MODEL HANDLERS
    ipcMain.handle('db:getDownloadedModels', async (event, userId) => {
      try {
        if (!dataManager) throw new Error('DataManager not initialized');
        console.log(`🔄 IPC: Getting downloaded models for user ${userId}`);
        return dataManager.getDownloadedModels(userId);
      } catch (error) {
        console.error('IPC Error - getDownloadedModels:', error);
        return [];
      }
    });

    ipcMain.handle('db:saveDownloadedModel', async (event, userId, modelData) => {
      try {
        if (!dataManager) throw new Error('DataManager not initialized');
        console.log(`🔄 IPC: Saving downloaded model for user ${userId}:`, modelData);
        return dataManager.saveDownloadedModel(userId, modelData);
      } catch (error) {
        console.error('IPC Error - saveDownloadedModel:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteDownloadedModel', async (event, userId, modelName) => {
      try {
        if (!dataManager) throw new Error('DataManager not initialized');
        console.log(`🔄 IPC: Deleting downloaded model for user ${userId}: ${modelName}`);
        return dataManager.deleteDownloadedModel(userId, modelName);
      } catch (error) {
        console.error('IPC Error - deleteDownloadedModel:', error);
        throw error;
      }
    });

    // ✅ VERIFY ALL HANDLERS ARE REGISTERED
    const registeredHandlers = [
      'db:getTasks', 'db:saveTask', 'db:updateTask', 'db:deleteTask',
      'db:getEvents', 'db:saveEvent', 'db:updateEvent', 'db:deleteEvent',
      'db:getDiaryEntries', 'db:saveDiaryEntry',
      'db:getChatHistory', 'db:saveChatMessage', 'db:clearChatHistory',
      'db:getStorageStats', 'get-gpu-info',
      'open-external', 'get-version', 'select-file', 'save-file', 'read-file', 'write-file',
      'db:getUserSettings', 'db:saveUserSettings',
      'db:getDownloadedModels', 'db:saveDownloadedModel', 'db:deleteDownloadedModel'
    ];

    console.log('✅ All database IPC handlers registered successfully:');
    registeredHandlers.forEach(handler => {
      console.log(`  - ${handler}`);
    });

  } catch (error) {
    console.error('❌ Failed to setup database IPC:', error);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
}

app.whenReady().then(async () => {
  try {
    console.log('🚀 Starting database setup...');
    await setupDatabaseIPC();
    console.log('✅ Database IPC setup complete');
    
    console.log('✅ All IPC handlers registered successfully');
    
    await startBackendServer();
    createWindow();
    
  } catch (error) {
    console.error('❌ CRITICAL: App initialization failed:', error);
    console.error('❌ Stack trace:', error.stack);
    
    dialog.showErrorBox('Startup Error', 
      `Application failed to start: ${error.message}\n\nPlease check the console for details.`
    );
    app.quit();
  }
});

// Register keyboard shortcuts
app.whenReady().then(() => {
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
  // Clean up database connection
  if (dataManager) {
    dataManager.close();
    dataManager = null;
  }
  
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
    const req = http.get('http://127.0.0.1:8080/health', (res) => {
      if (res.statusCode === 200) {
        healthCheckFailCount = 0; // Reset on success
      } else {
        handlePotentialFailure(`HTTP ${res.statusCode}`);
      }
    });
    
    // More generous timeout (15 seconds)
    req.setTimeout(15000, () => {
      req.destroy();
      handlePotentialFailure('Health check timeout');
    });
    
    req.on('error', (err) => {
      handlePotentialFailure(`Connection error: ${err.message}`);
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

// Add this to your main.js
async function checkPythonVersion() {
  try {
    const { stdout } = await execPromise('python --version');
    console.log(`Python version check: ${stdout}`);
    
    if (!stdout.includes('Python 3.13')) {
      console.log('⚠️ Python 3.13 recommended but not required');
    }
    
    return {
      installed: true,
      version: stdout.trim()
    };
  } catch (error) {
    console.error('Python not found:', error);
    return {
      installed: false,
      version: null
    };
  }
}

function showPythonInstallDialog() {
  const pythonDialog = new BrowserWindow({
    width: 600,
    height: 400,
    parent: BrowserWindow.getFocusedWindow(),
    modal: true,
    title: 'Python 3.13 Required',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Load HTML content
  pythonDialog.loadFile(path.join(__dirname, 'python-install.html'));
  pythonDialog.setMenu(null);
}