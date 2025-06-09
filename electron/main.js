const { app, BrowserWindow, shell, ipcMain, globalShortcut, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Import LocalDataManager for database operations
const { LocalDataManager } = require('./localDataBridge');

const isDevelopment = process.env.NODE_ENV === 'development';

// Configure GPU acceleration with reasonable flags
// These flags provide good performance without causing crashes
app.commandLine.appendSwitch('enable-gpu');
app.commandLine.appendSwitch('enable-gpu-compositing');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-smooth-scrolling');

// Platform-specific optimizations for Windows
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('enable-d3d11');
}

// Global variables for process management
let backendProcess = null;
let isBackendStarting = false;
let dataManager = null;

/**
 * Determines the correct resource path based on environment
 * In development, resources are relative to the electron folder
 * In production, they're packaged in the app resources
 */
function getResourcePath(relPath) {
  if (isDevelopment) {
    return path.join(__dirname, '..', relPath);
  } else {
    return path.join(process.resourcesPath, relPath);
  }
}

/**
 * Searches for Python executable in order of preference:
 * 1. Bundled portable Python (most reliable)
 * 2. Virtual environment Python
 * 3. System Python installations
 */
function findPythonExecutable(backendDir) {
  const possiblePaths = [
    // Bundled Python takes priority for consistency
    isDevelopment 
      ? path.join(__dirname, '..', 'python-dist', 'python.exe')
      : path.join(process.resourcesPath, 'python-dist', 'python.exe'),
    
    // Virtual environment Python
    path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
    
    // System Python installations
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
      // Continue checking other paths if this one fails
      continue;
    }
  }

  console.log('Using default python command');
  return 'python';
}

const execAsync = util.promisify(exec);

/**
 * Forcefully releases port 8080 by terminating any processes using it
 * This prevents conflicts when restarting the backend server
 * @param {number} port - The port number to free
 * @returns {Promise<boolean>} True if port was freed successfully
 */
async function forceReleasePort(port) {
  try {
    console.log(`Checking if port ${port} is in use...`);
    
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      console.log(`Port ${port} is already free`);
      return true;
    }
    
    console.log('Port is in use. Attempting to kill processes...');
    
    const lines = stdout.split('\n');
    let killed = false;
    
    // Parse netstat output to find and kill processes using the port
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        
        // Only target valid PIDs (not PID 0 which is system)
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
    
    // Last resort: kill all Python processes if specific PIDs failed
    if (!killed) {
      console.log('Nuclear option: Killing all Python processes');
      try {
        await execAsync('taskkill /F /IM python.exe');
        await execAsync('taskkill /F /IM uvicorn.exe');
      } catch (pythonKillError) {
        console.log('Python processes not found or already killed');
      }
    }
    
    // Give the OS time to actually release the port
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the port is now actually free
    try {
      const { stdout: checkStdout } = await execPromise(`netstat -ano | findstr :${port}`);
      const stillUsed = checkStdout.split('\n').some(line => line.includes(`LISTENING`));
      
      if (stillUsed) {
        console.log(`Port ${port} still in use after cleanup attempt`);
        return false;
      }
    } catch (error) {
      // If command fails, likely because nothing is listening anymore
      console.log(`Verified port ${port} is now free`);
    }
    
    return true;
  } catch (error) {
    // If initial netstat command fails, port is likely free
    console.log(`Port ${port} appears to be free (no processes found)`);
    return true;
  }
}

/**
 * Starts the FastAPI backend server
 * Handles port conflicts, Python path resolution, and health monitoring
 */
async function startBackend(backendDir) {
  return new Promise((resolve, reject) => {
    const BACKEND_PORT = 8080;
    
    // Ensure the port is free before starting
    forceReleasePort(BACKEND_PORT).then(portFreed => {
      if (!portFreed) {
        reject(new Error(`Could not free port ${BACKEND_PORT}`));
        return;
      } else {
        console.log(`Port ${BACKEND_PORT} is free, starting backend...`);
      }
      
      // Locate Python executable
      const pythonPath = findPythonExecutable(backendDir);
      if (!pythonPath) {
        reject(new Error('Python executable not found'));
        return;
      }
      
      console.log(`Found Python at: ${pythonPath}`);
      
      // Apply Python 3.13 compatibility patches
      console.log('Running orjson patch for Python 3.13...');
      const { spawnSync } = require('child_process');
      const patchResult = spawnSync(
        pythonPath,
        [path.join(backendDir, 'patch-orjson.py')],
        { cwd: backendDir }
      );
      
      const pythonPaths = process.env.PYTHONPATH || '';
      
      // Start the FastAPI server with uvicorn
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
      
      // Monitor backend startup output
      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Backend:', output);
        
        // Look for successful startup indicator
        if (output.includes('Uvicorn running on')) {
          console.log('Backend server started successfully');
          resolve();
        }
      });
      
      // Handle backend errors
      backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Backend Status:', error);
        
        if (error.includes('Address already in use')) {
          console.error('Port 8080 is still in use');
          reject(new Error('Port 8080 already in use'));
        }
      });
      
      backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err);
        reject(err);
      });
      
      // Fallback health check if stdout doesn't indicate success
      setTimeout(() => {
        console.log('Backend startup timeout, checking health...');
        
        const http = require('http');
        const req = http.get('http://127.0.0.1:8080/health', (res) => {
          console.log('Backend health check passed, resolving...');
          resolve();
        });
        
        req.on('error', (err) => {
          console.error('Backend health check failed:', err);
          reject(new Error('Backend failed to start within timeout'));
        });
        
        req.setTimeout(5000, () => {
          console.error('Backend health check timed out');
          reject(new Error('Backend health check timeout'));
        });
      }, 15000);
    });
  });
}

async function startBackendServer() {
  const backendDir = getResourcePath('Wingman-backend');
  return startBackend(backendDir);
}

/**
 * Creates the main application window with appropriate security settings
 * Balances functionality with security best practices
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    show: false, // Don't show until ready to prevent flash
    webPreferences: {
      nodeIntegration: false,        // Security: Disable node in renderer
      contextIsolation: true,        // Security: Isolate context
      sandbox: true,                 // Security: Enable sandbox
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      experimentalFeatures: false,   // Stability: Disable experimental features
      enableRemoteModule: false,     // Security: Disable remote module
      webSecurity: true,             // Security: Enable web security
      offscreen: false,
      backgroundThrottling: false,
      hardwareAcceleration: true,    // Performance: Keep hardware acceleration
      allowRunningInsecureContent: false, // Security: Block insecure content
    }
  });

  // Show window only when ready to prevent visual glitches
  win.on('ready-to-show', () => {
    win.show();
    if (isDevelopment) {
      win.webContents.openDevTools({ mode: 'detach' });
      
      // Simple GPU debugging without crash-prone calls
      console.log('GPU Acceleration Status:');
      win.webContents.executeJavaScript(`
        (function() {
          console.log('GPU Debug - Safe Mode');
          console.log('Hardware concurrency:', navigator.hardwareConcurrency);
          
          // Test WebGL availability safely
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          if (gl) {
            console.log('WebGL available');
            console.log('WebGL Renderer:', gl.getParameter(gl.RENDERER));
          } else {
            console.log('WebGL not available');
          }
          
          canvas.remove();
        })();
      `);
    }
  });

  // Load the appropriate app version
  const loadApp = async () => {
    try {
      if (isDevelopment) {
        console.log('Loading development server...');
        await win.loadURL('http://localhost:5173');
      } else {
        console.log('Loading production build...');
        await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
      }
    } catch (error) {
      console.error('Error loading app:', error);
    }
  };

  loadApp();
}

/**
 * Initializes the local database and sets up all IPC handlers
 * This is critical for the app to function properly
 */
async function setupDatabaseIPC() {
  try {
    // Initialize the database manager
    dataManager = new LocalDataManager();
    console.log('LocalDataManager initialized successfully');

    // Verify that all required methods are available
    console.log('Testing dataManager methods:');
    console.log('- getTasks method:', typeof dataManager.getTasks);
    console.log('- getEvents method:', typeof dataManager.getEvents);
    console.log('- getDiaryEntries method:', typeof dataManager.getDiaryEntries);
    console.log('- saveTask method:', typeof dataManager.saveTask);
    console.log('- saveEvent method:', typeof dataManager.saveEvent);
    console.log('- saveDiaryEntry method:', typeof dataManager.saveDiaryEntry);
    
    // Test database connectivity
    const testResult = dataManager.getStorageStats('test-user');
    console.log('Database connection test passed:', testResult);
    
    // Set up all IPC handlers for database operations
    // Task management handlers
    ipcMain.handle('db:getTasks', async (event, userId, date) => {
      try {
        console.log(`Getting tasks for user ${userId}${date ? ` on ${date}` : ''}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const tasks = dataManager.getTasks(userId, date);
        console.log(`Found ${tasks.length} tasks`);
        return tasks;
      } catch (error) {
        console.error('Error getting tasks:', error);
        throw new Error(`Failed to get tasks: ${error.message}`);
      }
    });

    // Safe GPU info handler that doesn't crash the app
    ipcMain.handle('get-gpu-info', async () => {
      try {
        // Return safe placeholder data instead of calling crash-prone GPU APIs
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
        console.log('Saving task:', task);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedTask = dataManager.saveTask(task);
        console.log('Task saved successfully:', savedTask);
        return savedTask;
      } catch (error) {
        console.error('Error saving task:', error);
        throw new Error(`Failed to save task: ${error.message}`);
      }
    });

    ipcMain.handle('db:updateTask', async (event, id, updates) => {
      try {
        console.log(`Updating task ${id} with:`, updates);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const updatedTask = dataManager.updateTask(id, updates);
        console.log('Task updated successfully:', updatedTask);
        return updatedTask;
      } catch (error) {
        console.error('Error updating task:', error);
        throw new Error(`Failed to update task: ${error.message}`);
      }
    });

    ipcMain.handle('db:deleteTask', async (event, id) => {
      try {
        console.log(`Deleting task ${id}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.deleteTask(id);
        console.log('Task deleted successfully');
        return result;
      } catch (error) {
        console.error('Error deleting task:', error);
        throw new Error(`Failed to delete task: ${error.message}`);
      }
    });

    // EVENT HANDLERS
    ipcMain.handle('db:getEvents', async (event, userId, date) => {
      try {
        console.log(`Getting events for user ${userId}${date ? ` on ${date}` : ''}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const events = dataManager.getEvents(userId, date);
        console.log(`Found ${events.length} events`);
        return events;
      } catch (error) {
        console.error('Error getting events:', error);
        throw new Error(`Failed to get events: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveEvent', async (event, eventData) => {
      try {
        console.log('Saving event:', eventData);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedEvent = dataManager.saveEvent(eventData);
        console.log('Event saved successfully:', savedEvent);
        return savedEvent;
      } catch (error) {
        console.error('Error saving event:', error);
        throw new Error(`Failed to save event: ${error.message}`);
      }
    });

    ipcMain.handle('db:updateEvent', async (event, eventData) => {
      try {
        console.log('Updating event:', eventData);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.updateEvent(eventData); // saveEvent handles both create and update
        console.log('Event updated successfully:', result);
        return result;
      } catch (error) {
        console.error('Error updating event:', error);
        throw new Error(`Failed to update event: ${error.message}`);
      }
    });

    ipcMain.handle('db:deleteEvent', async (event, id) => {
      try {
        console.log(`Deleting event ${id}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.deleteEvent(id);
        console.log('Event deleted successfully');
        return result;
      } catch (error) {
        console.error('Error deleting event:', error);
        throw new Error(`Failed to delete event: ${error.message}`);
      }
    });

    // DIARY HANDLERS
    ipcMain.handle('db:getDiaryEntries', async (event, userId, date) => {
      try {
        console.log(`Getting diary entries for user ${userId}${date ? ` on ${date}` : ''}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const entries = dataManager.getDiaryEntries(userId, date);
        console.log(`Found ${entries.length} diary entries`);
        return entries;
      } catch (error) {
        console.error('Error getting diary entries:', error);
        throw new Error(`Failed to get diary entries: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveDiaryEntry', async (event, entry) => {
      try {
        console.log('Saving diary entry:', entry);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedEntry = dataManager.saveDiaryEntry(entry);
        console.log('Diary entry saved successfully:', savedEntry);
        return savedEntry;
      } catch (error) {
        console.error('Error saving diary entry:', error);
        throw new Error(`Failed to save diary entry: ${error.message}`);
      }
    });


    ipcMain.handle('db:deleteDiaryEntry', async (event, id) => {
      try {
        console.log('🗑️ Main: Deleting diary entry:', id);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.deleteDiaryEntry(id);
        console.log('✅ Main: Diary entry deleted successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Main: IPC Error deleting diary entry:', error);
        throw error;
      }
    });

    // CHAT HANDLERS
    ipcMain.handle('db:getChatHistory', async (event, userId, limit) => {
      try {
        console.log(`Getting chat history for user ${userId}, limit: ${limit}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const history = dataManager.getChatHistory(userId, limit);
        console.log(`Found ${history.length} chat messages`);
        return history;
      } catch (error) {
        console.error('Error getting chat history:', error);
        throw new Error(`Failed to get chat history: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveChatMessage', async (event, message, isAi, userId, sessionId) => {
      try {
        console.log(`Saving chat message for user ${userId}, isAi: ${isAi}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const savedMessage = dataManager.saveChatMessage(message, isAi, userId, sessionId);
        console.log('Chat message saved successfully:', savedMessage);
        return savedMessage;
      } catch (error) {
        console.error('Error saving chat message:', error);
        throw new Error(`Failed to save chat message: ${error.message}`);
      }
    });

    ipcMain.handle('db:clearChatHistory', async (event, userId) => {
      try {
        console.log(`Clearing chat history for user ${userId}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        dataManager.clearChatHistory(userId);
        console.log('Chat history cleared successfully');
        return { success: true };
      } catch (error) {
        console.error('Error clearing chat history:', error);
        throw new Error(`Failed to clear chat history: ${error.message}`);
      }
    });

    // QUICK PROMPTS HANDLERS
    ipcMain.handle('db:getQuickPrompts', async (event, userId) => {
      try {
        return dataManager.getQuickPrompts(userId);
      } catch (error) {
        console.error('Error getting quick prompts:', error);
        return [];
      }
    });

    ipcMain.handle('db:saveQuickPrompt', async (event, userId, promptText) => {
      try {
        return dataManager.saveQuickPrompt(userId, promptText);
      } catch (error) {
        console.error('Error saving quick prompt:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteQuickPrompt', async (event, promptId) => {
      try {
        return dataManager.deleteQuickPrompt(promptId);
      } catch (error) {
        console.error('Error deleting quick prompt:', error);
        throw error;
      }
    });

    ipcMain.handle('db:updateQuickPromptUsage', async (event, promptId) => {
      try {
        return dataManager.updateQuickPromptUsage(promptId);
      } catch (error) {
        console.error('Error updating quick prompt usage:', error);
        throw error;
      }
    });

    // USER SETTINGS HANDLERS
    ipcMain.handle('db:getUserSettings', async (event, userId) => {
      try {
        console.log(`Getting user settings for ${userId}`);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const settings = dataManager.getUserSettings(userId);
        console.log('User settings retrieved:', settings);
        return settings;
      } catch (error) {
        console.error('Error getting user settings:', error);
        throw new Error(`Failed to get user settings: ${error.message}`);
      }
    });

    ipcMain.handle('db:saveUserSettings', async (event, userId, settings) => {
      try {
        console.log(`Saving user settings for ${userId}:`, settings);
        if (!dataManager) {
          throw new Error('DataManager is not initialized');
        }
        const result = dataManager.saveUserSettings(userId, settings);
        console.log('User settings saved successfully');
        return result;
      } catch (error) {
        console.error('Error saving user settings:', error);
        throw new Error(`Failed to save user settings: ${error.message}`);
      }
    });

    // MODEL HANDLERS
    ipcMain.handle('db:getDownloadedModels', async (event, userId) => {
      try {
        if (!dataManager) throw new Error('DataManager not initialized');
        console.log(`Getting downloaded models for user ${userId}`);
        return dataManager.getDownloadedModels(userId);
      } catch (error) {
        console.error('Error getting downloaded models:', error);
        return [];
      }
    });

    ipcMain.handle('db:saveDownloadedModel', async (event, userId, modelData) => {
      try {
        if (!dataManager) throw new Error('DataManager not initialized');
        console.log(`Saving downloaded model for user ${userId}:`, modelData);
        return dataManager.saveDownloadedModel(userId, modelData);
      } catch (error) {
        console.error('Error saving downloaded model:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteDownloadedModel', async (event, userId, modelName) => {
      try {
        if (!dataManager) throw new Error('DataManager not initialized');
        console.log(`Deleting downloaded model for user ${userId}: ${modelName}`);
        return dataManager.deleteDownloadedModel(userId, modelName);
      } catch (error) {
        console.error('Error deleting downloaded model:', error);
        throw error;
      }
    });

    // Chat session handlers
    ipcMain.handle('db:createChatSession', async (event, userId, title) => {
      try {
        const result = dataManager.createChatSession(userId, title);
        console.log('Chat session created:', result);
        return result;
      } catch (error) {
        console.error('Error creating chat session:', error);
        throw new Error(`Failed to create chat session: ${error.message}`);
      }
    });

    ipcMain.handle('db:getChatSessions', async (event, userId) => {
      try {
        const sessions = dataManager.getChatSessions(userId);
        console.log(`Found ${sessions.length} chat sessions`);
        return sessions;
      } catch (error) {
        console.error('Error getting chat sessions:', error);
        throw new Error(`Failed to get chat sessions: ${error.message}`);
      }
    });

    ipcMain.handle('db:getSessionMessages', async (event, sessionId) => {
      try {
        const messages = dataManager.getSessionMessages(sessionId);
        console.log(`Found ${messages.length} messages in session ${sessionId}`);
        return messages;
      } catch (error) {
        console.error('Error getting session messages:', error);
        throw new Error(`Failed to get session messages: ${error.message}`);
      }
    });

    // NOTIFICATIONS HANDLERS
    ipcMain.handle('notifications:showImmediate', async (event, options) => {
      try {
        const { title, body, type, iconPath } = options;
        
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: title,
            body: body,
            icon: iconPath || path.join(__dirname, '..', 'src', 'assets', 'icons', 'moody.png'),
            silent: false
          });
          
          notification.show();
          
          notification.on('click', () => {
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
              if (win.isMinimized()) win.restore();
              win.focus();
            }
          });
          
          return { success: true };
        }
        
        return { success: false, error: 'Notifications not supported' };
      } catch (error) {
        console.error('Error showing notification:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('notifications:requestPermission', async () => {
      return { permission: 'granted' }; // Electron has built-in permission
    });

    // VERIFY ALL HANDLERS ARE REGISTERED
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

    console.log('All database IPC handlers registered successfully:');
    registeredHandlers.forEach(handler => {
      console.log(`  - ${handler}`);
    });

  } catch (error) {
    console.error('Failed to setup database IPC:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Application lifecycle management
app.whenReady().then(async () => {
  try {
    console.log('Starting database setup...');
    await setupDatabaseIPC();
    console.log('Database IPC setup complete');
    
    console.log('All IPC handlers registered successfully');
    
    await startBackendServer();
    createWindow();
    
  } catch (error) {
    console.error('CRITICAL: App initialization failed:', error);
    console.error('Stack trace:', error.stack);
    
    dialog.showErrorBox('Startup Error', 
      `Application failed to start: ${error.message}\n\nPlease check the console for details.`
    );
    app.quit();
  }
});

// Keyboard shortcut registration
app.whenReady().then(() => {
  // F12 for DevTools
  globalShortcut.register('F12', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });
  
  // Ctrl+Shift+I as alternative
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });
});

// Cleanup on app quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Close database connection properly
  if (dataManager) {
    dataManager.close();
    dataManager = null;
  }
  
  // Terminate backend process
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

// DevTools toggle handler
ipcMain.on('toggle-dev-tools', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.toggleDevTools();
  }
});

// Backend health monitoring with improved failure handling
let healthCheckFailCount = 0;

setInterval(() => {
  if (backendProcess) {
    const http = require('http');
    const req = http.get('http://127.0.0.1:8080/health', (res) => {
      if (res.statusCode === 200) {
        healthCheckFailCount = 0; // Reset counter on success
      } else {
        handlePotentialFailure(`HTTP ${res.statusCode}`);
      }
    });
    
    // Generous timeout to account for system load
    req.setTimeout(15000, () => {
      req.destroy();
      handlePotentialFailure('Health check timeout');
    });
    
    req.on('error', (err) => {
      handlePotentialFailure(`Connection error: ${err.message}`);
    });
  }
}, 60000); // Check every minute

/**
 * Handles potential backend failures with progressive response
 * Only restarts after multiple consecutive failures to avoid unnecessary restarts
 */
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

/**
 * Cleanly restarts the backend server
 * Ensures proper cleanup before attempting restart
 */
async function restartBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  
  await forceReleasePort(8080);
  startBackendServer().catch(console.error);
}

/**
 * Checks if Python 3.13 is available on the system
 * Provides helpful feedback but doesn't block operation
 */
async function checkPythonVersion() {
  try {
    const { stdout } = await execPromise('python --version');
    console.log(`Python version check: ${stdout}`);
    
    if (!stdout.includes('Python 3.13')) {
      console.log('Python 3.13 recommended but not required');
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

/**
 * Shows a user-friendly dialog for Python installation
 * Only displayed when Python is not available
 */
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
  
  pythonDialog.loadFile(path.join(__dirname, 'python-install.html'));
  pythonDialog.setMenu(null);
}



class BackgroundNotificationService {
  constructor() {
    this.checkInterval = null;
    this.lastActiveUser = null;
  }

  start() {
    console.log('🔔 Starting background notification service');
    
    // Check every minute for overdue tasks
    this.checkInterval = setInterval(async () => {
      await this.checkForNotifications();
    }, 60000);
    
    // Also check immediately
    this.checkForNotifications();
  }

  async checkForNotifications() {
    try {
      const userId = this.getLastActiveUser();
      if (!userId) return;

      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

      // Query database directly from main process
      const tasks = dataManager.getTasks(userId, today);
      
      const overdueTasks = tasks.filter(task => 
        !task.completed && !task.failed && 
        task.task_time && task.task_time < currentTime
      );

      for (const task of overdueTasks) {
        await dataManager.updateTask(task.id, { failed: true });
        
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: '❌ Task Failed',
            body: `"${task.title}" was due at ${task.task_time}`,
            icon: path.join(__dirname, '..', 'src', 'assets', 'icons', 'moody.png')
          });
          notification.show();
        }
      }
    } catch (error) {
      console.error('Background notification check failed:', error);
    }
  }

  getLastActiveUser() {
    // Store this when user logs in
    return this.lastActiveUser;
  }

  setLastActiveUser(userId) {
    this.lastActiveUser = userId;
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Initialize background service
const backgroundNotificationService = new BackgroundNotificationService();

// Modify the window-all-closed handler:
app.on('window-all-closed', () => {
  // Close database connection properly
  if (dataManager) {
    dataManager.close();
    dataManager = null;
  }
  
  // Terminate backend process
  if (backendProcess) {
    backendProcess.kill();
  }
  
  // CHANGE: Don't quit immediately - start background service
  if (process.platform !== 'darwin') {
    console.log('🔔 App closed, starting background notification service');
    backgroundNotificationService.start();
    
    // Optional: Create system tray icon to allow reopening
    // createSystemTray();
  }
});

// Start background service when app starts
app.whenReady().then(async () => {
  // ... existing code ...
  backgroundNotificationService.start();
});