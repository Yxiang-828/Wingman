const {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  globalShortcut,
  dialog,
  Notification,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

// Import LocalDataManager for database operations
const { LocalDataManager } = require("./localDataBridge");

const isDevelopment = process.env.NODE_ENV === "development";

// Configure GPU acceleration with reasonable flags
// These flags provide good performance without causing crashes
app.commandLine.appendSwitch("enable-gpu");
app.commandLine.appendSwitch("enable-gpu-compositing");
app.commandLine.appendSwitch("enable-accelerated-2d-canvas");
app.commandLine.appendSwitch("enable-smooth-scrolling");

// Platform-specific optimizations for Windows
if (process.platform === "win32") {
  app.commandLine.appendSwitch("enable-d3d11");
}

// Global variables for process management
let backendProcess = null;
let isBackendStarting = false;
let dataManager = null;
let backgroundNotificationService = null;

/**
 * Requests a single instance lock to prevent multiple app instances
 * This solves the critical multi-instance database conflicts
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log(
    "Another instance of Wingman is already running - quitting this instance",
  );
  app.quit();
} else {
  console.log("Single instance lock acquired successfully");

  // Handle second instance attempts
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    console.log(
      "Second instance attempted to start - focusing existing window",
    );

    // Focus the existing window
    const existingWindow = BrowserWindow.getAllWindows()[0];
    if (existingWindow) {
      if (existingWindow.isMinimized()) {
        existingWindow.restore();
      }
      existingWindow.focus();
      existingWindow.show();
    } else {
      // If no window exists, create one
      createWindow();
    }
  });
}

/**
 * Determines the correct resource path based on environment
 * In development, resources are relative to the electron folder
 * In production, they're packaged in the app resources
 */
function getResourcePath(relPath) {
  if (isDevelopment) {
    return path.join(__dirname, "..", relPath);
  } else {
    return path.join(process.resourcesPath, relPath);
  }
}

/**
 * Searches for Python executable in order of preference:
 * 1. Bundled portable Python (packaged app) -> we will always use this for both production and development
 * 2. Local portable Python (development)
 * 3. System Python installations (fallback)
 */
function findPythonExecutable(backendDir) {
  const possiblePaths = [
    // Bundled portable Python in packaged app
    isDevelopment
      ? path.join(__dirname, "..", "python-dist", "python.exe")
      : path.join(process.resourcesPath, "python-dist", "python.exe"),

    // System Python installations (fallback for development only)
    "python",
    "python3",
    "py",
  ].filter(Boolean);

  for (const pythonPath of possiblePaths) {
    try {
      if (pythonPath.includes("python-dist")) {
        // For portable Python, check if file exists
        if (fs.existsSync(pythonPath)) {
          console.log(`Found Python executable: ${pythonPath}`);
          return pythonPath;
        }
      } else {
        // For system Python, try to execute it
        const { spawnSync } = require("child_process");
        const result = spawnSync(pythonPath, ["--version"], { timeout: 5000 });
        if (result.status === 0) {
          console.log(`Found Python executable: ${pythonPath}`);
          return pythonPath;
        }
      }
    } catch (error) {
      // Continue checking other paths if this one fails
      continue;
    }
  }

  console.error("ERROR: No working Python executable found!");
  console.error("Expected portable Python at:", possiblePaths[0]);
  return null;
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

    console.log("Port is in use. Attempting to kill processes...");

    const lines = stdout.split("\n");
    let killed = false;

    // Parse netstat output to find and kill processes using the port
    for (const line of lines) {
      if (line.includes("LISTENING")) {
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
      console.log("Nuclear option: Killing all Python processes");
      try {
        await execAsync("taskkill /F /IM python.exe");
        await execAsync("taskkill /F /IM uvicorn.exe");
      } catch (pythonKillError) {
        console.log("Python processes not found or already killed");
      }
    }

    // Give the OS time to actually release the port
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the port is now actually free
    try {
      const { stdout: checkStdout } = await execPromise(
        `netstat -ano | findstr :${port}`,
      );
      const stillUsed = checkStdout
        .split("\n")
        .some((line) => line.includes(`LISTENING`));

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
    forceReleasePort(BACKEND_PORT).then((portFreed) => {
      if (!portFreed) {
        reject(new Error(`Could not free port ${BACKEND_PORT}`));
        return;
      } else {
        console.log(`Port ${BACKEND_PORT} is free, starting backend...`);
      }

      // Locate Python executable
      const pythonPath = findPythonExecutable(backendDir);
      if (!pythonPath) {
        reject(new Error("Python executable not found"));
        return;
      }

      console.log(`Found Python at: ${pythonPath}`);

      // Apply Python 3.13 compatibility patches
      console.log("Running orjson patch for Python 3.13...");
      const { spawnSync } = require("child_process");
      const patchResult = spawnSync(
        pythonPath,
        [path.join(backendDir, "patch-orjson.py")],
        { cwd: backendDir },
      );

      const pythonPaths = process.env.PYTHONPATH || "";

      // Start the FastAPI server with uvicorn
      console.log("Starting FastAPI backend...");
      backendProcess = spawn(
        pythonPath,
        ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8080"],
        {
          cwd: backendDir,
          windowsHide: true,
          env: {
            ...process.env,
            PYTHONPATH: pythonPaths,
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_KEY: process.env.SUPABASE_KEY,
            DEBUG: process.env.DEBUG,
          },
        },
      );

      // Monitor backend startup output
      backendProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("Backend:", output);

        // Look for successful startup indicator
        if (output.includes("Uvicorn running on")) {
          console.log("Backend server started successfully");
          resolve();
        }
      });

      // Handle backend errors
      backendProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.error("Backend Status:", error);

        if (error.includes("Address already in use")) {
          console.error("Port 8080 is still in use");
          reject(new Error("Port 8080 already in use"));
        }
      });

      backendProcess.on("error", (err) => {
        console.error("Failed to start backend:", err);
        reject(err);
      });

      // Fallback health check if stdout doesn't indicate success
      setTimeout(() => {
        console.log("Backend startup timeout, checking health...");

        const http = require("http");
        const req = http.get("http://127.0.0.1:8080/health", (res) => {
          console.log("Backend health check passed, resolving...");
          resolve();
        });

        req.on("error", (err) => {
          console.error("Backend health check failed:", err);
          reject(new Error("Backend failed to start within timeout"));
        });

        req.setTimeout(5000, () => {
          console.error("Backend health check timed out");
          reject(new Error("Backend health check timeout"));
        });
      }, 15000);
    });
  });
}

async function startBackendServer() {
  const backendDir = getResourcePath("Wingman-backend");
  return startBackend(backendDir);
}

// ============================================================================
// SHUTDOWN HANDLER - USED FOR RESOURCE CLEANUP
// ============================================================================

/**
 * Handles shutdown of all resources to prevent multi-instance conflicts
 * This is critical for preventing database locks and zombie processes
 */
async function gracefulShutdown(signal = "SIGTERM") {
  console.log(`Graceful shutdown initiated (${signal})`);

  try {
    // 1. Stop background notification service first
    if (backgroundNotificationService) {
      console.log("Stopping background notification service...");
      backgroundNotificationService.stop();
    }

    // 2. Close database connection to release SQLite locks
    if (dataManager) {
      console.log("Closing database connection...");
      dataManager.close();
      dataManager = null;
    }

    // 3. Terminate backend process
    if (backendProcess) {
      console.log("Terminating backend process...");
      backendProcess.kill("SIGTERM");

      // Wait for process to terminate gracefully
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log("Force killing backend process...");
          backendProcess.kill("SIGKILL");
          resolve();
        }, 5000);

        backendProcess.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      backendProcess = null;
    }

    // 4. Unregister global shortcuts
    globalShortcut.unregisterAll();

    // 5. Close all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });

    console.log("Graceful shutdown completed");
  } catch (error) {
    console.error("ERROR: Error during graceful shutdown:", error);
  }

  // Force exit if needed
  setTimeout(() => {
    console.log("Force exiting application...");
    process.exit(0);
  }, 2000);
}

/**
 * Creates the main application window with appropriate security settings
 * Balances functionality with security best practices
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#1a1a1a",
    show: false, // Don't show until ready to prevent flash
    webPreferences: {
      nodeIntegration: false, // Security: Disable node in renderer
      contextIsolation: true, // Security: Isolate context
      sandbox: true, // Security: Enable sandbox
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
      experimentalFeatures: false, // Stability: Disable experimental features
      enableRemoteModule: false, // Security: Disable remote module
      webSecurity: true, // Security: Enable web security
      offscreen: false,
      backgroundThrottling: false,
      hardwareAcceleration: true, // Performance: Keep hardware acceleration
      allowRunningInsecureContent: false, // Security: Block insecure content
      // Cache management to fix ERR_CACHE_OPERATION_NOT_SUPPORTED
      partition: "persist:wingman-session",
      cache: true,
      // Additional cache-related settings
      disableHtmlFullscreenWindowResize: true,
    },
  });

  // Show window only when ready to prevent visual glitches
  win.on("ready-to-show", () => {
    win.show();
    if (isDevelopment) {
      win.webContents.openDevTools({ mode: "detach" });

      // Simple GPU debugging without crash-prone calls
      console.log("GPU Acceleration Status:");
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
        console.log("Loading development server...");
        await win.loadURL("http://localhost:5173");
      } else {
        console.log("Loading production build...");
        await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
      }
    } catch (error) {
      console.error("Error loading app:", error);
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
    // Initialize the database manager with enhanced error handling
    dataManager = new LocalDataManager();
    console.log("LocalDataManager initialized successfully");

    // database connection validation
    try {
      const testResult = dataManager.getStorageStats("connection-test");
      console.log("Database connection test passed:", testResult);
    } catch (dbError) {
      console.error("ERROR: Database connection test failed:", dbError);
      throw new Error("Database connection validation failed");
    }

    // Setup graceful database cleanup handlers
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGHUP", gracefulShutdown);

    // Verify that all required methods are available
    console.log("Testing dataManager methods:");
    console.log("- getTasks method:", typeof dataManager.getTasks);
    console.log("- getEvents method:", typeof dataManager.getEvents);
    console.log(
      "- getDiaryEntries method:",
      typeof dataManager.getDiaryEntries,
    );
    console.log("- saveTask method:", typeof dataManager.saveTask);
    console.log("- saveEvent method:", typeof dataManager.saveEvent);
    console.log("- saveDiaryEntry method:", typeof dataManager.saveDiaryEntry);

    // Set up all IPC handlers for database operations
    // Task management handlers
    ipcMain.handle("db:getStorageStats", async (event, userId) => {
      try {
        console.log("Getting storage stats for user:", userId);
        const stats = dataManager.getStorageStats(userId);
        console.log("Storage stats result:", stats);
        return stats;
      } catch (error) {
        console.error("Error getting storage stats:", error);
        throw error;
      }
    });

    ipcMain.handle("db:getTasks", async (event, userId, date) => {
      try {
        console.log(
          `Getting tasks for user ${userId}${date ? ` on ${date}` : ""}`,
        );
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const tasks = dataManager.getTasks(userId, date);
        console.log(`Found ${tasks.length} tasks`);
        return tasks;
      } catch (error) {
        console.error("Error getting tasks:", error);
        throw new Error(`Failed to get tasks: ${error.message}`);
      }
    });

    // Handler for getting all tasks for a user across all dates
    ipcMain.handle("db:getAllTasks", async (event, userId) => {
      try {
        console.log(`Getting all tasks for user ${userId}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const tasks = dataManager.getAllTasks(userId);
        console.log(`Found ${tasks.length} total tasks`);
        return tasks;
      } catch (error) {
        console.error("Error getting all tasks:", error);
        throw new Error(`Failed to get all tasks: ${error.message}`);
      }
    });

    // Safe GPU info handler that doesn't crash the app
    ipcMain.handle("get-gpu-info", async () => {
      try {
        // Return safe placeholder data instead of calling crash-prone GPU APIs
        return {
          success: true,
          gpuInfo: { message: "GPU info disabled to prevent crashes" },
          gpuFeatureStatus: { webgl: "enabled", canvas2d: "enabled" },
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    });

    ipcMain.handle("db:saveTask", async (event, task) => {
      try {
        console.log("Saving task:", task);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const savedTask = dataManager.saveTask(task);
        console.log("Task saved successfully:", savedTask);
        return savedTask;
      } catch (error) {
        console.error("Error saving task:", error);
        throw new Error(`Failed to save task: ${error.message}`);
      }
    });

    ipcMain.handle("db:updateTask", async (event, id, updates) => {
      try {
        console.log(`Updating task ${id} with:`, updates);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const updatedTask = dataManager.updateTask(id, updates);
        console.log("Task updated successfully:", updatedTask);
        return updatedTask;
      } catch (error) {
        console.error("Error updating task:", error);
        throw new Error(`Failed to update task: ${error.message}`);
      }
    });

    ipcMain.handle("db:deleteTask", async (event, id) => {
      try {
        console.log(`Deleting task ${id}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const result = dataManager.deleteTask(id);
        console.log("Task deleted successfully");
        return result;
      } catch (error) {
        console.error("Error deleting task:", error);
        throw new Error(`Failed to delete task: ${error.message}`);
      }
    });

    // EVENT HANDLERS
    ipcMain.handle("db:getEvents", async (event, userId, date) => {
      try {
        console.log(
          `Getting events for user ${userId}${date ? ` on ${date}` : ""}`,
        );
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const events = dataManager.getEvents(userId, date);
        console.log(`Found ${events.length} events`);
        return events;
      } catch (error) {
        console.error("Error getting events:", error);
        throw new Error(`Failed to get events: ${error.message}`);
      }
    });

    ipcMain.handle("db:saveEvent", async (event, eventData) => {
      try {
        console.log("Saving event:", eventData);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const savedEvent = dataManager.saveEvent(eventData);
        console.log("Event saved successfully:", savedEvent);
        return savedEvent;
      } catch (error) {
        console.error("Error saving event:", error);
        throw new Error(`Failed to save event: ${error.message}`);
      }
    });

    ipcMain.handle("db:updateEvent", async (event, eventData) => {
      try {
        console.log("Updating event:", eventData);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const result = dataManager.updateEvent(eventData); // saveEvent handles both create and update
        console.log("Event updated successfully:", result);
        return result;
      } catch (error) {
        console.error("Error updating event:", error);
        throw new Error(`Failed to update event: ${error.message}`);
      }
    });

    ipcMain.handle("db:deleteEvent", async (event, id) => {
      try {
        console.log(`Deleting event ${id}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const result = dataManager.deleteEvent(id);
        console.log("Event deleted successfully");
        return result;
      } catch (error) {
        console.error("Error deleting event:", error);
        throw new Error(`Failed to delete event: ${error.message}`);
      }
    });

    // DIARY HANDLERS
    ipcMain.handle("db:getDiaryEntries", async (event, userId, date) => {
      try {
        console.log(
          `Getting diary entries for user ${userId}${date ? ` on ${date}` : ""}`,
        );
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const entries = dataManager.getDiaryEntries(userId, date);
        console.log(`Found ${entries.length} diary entries`);
        return entries;
      } catch (error) {
        console.error("Error getting diary entries:", error);
        throw new Error(`Failed to get diary entries: ${error.message}`);
      }
    });

    ipcMain.handle("db:saveDiaryEntry", async (event, entry) => {
      try {
        console.log("Saving diary entry:", entry);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const savedEntry = dataManager.saveDiaryEntry(entry);
        console.log("Diary entry saved successfully:", savedEntry);
        return savedEntry;
      } catch (error) {
        console.error("Error saving diary entry:", error);
        throw new Error(`Failed to save diary entry: ${error.message}`);
      }
    });

    ipcMain.handle("db:deleteDiaryEntry", async (event, id) => {
      try {
        console.log("Main: Deleting diary entry:", id);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const result = dataManager.deleteDiaryEntry(id);
        console.log("Main: Diary entry deleted successfully:", result);
        return result;
      } catch (error) {
        console.error("ERROR: Main: IPC Error deleting diary entry:", error);
        throw error;
      }
    });

    // CHAT HANDLERS
    ipcMain.handle("db:getChatHistory", async (event, userId, limit) => {
      try {
        console.log(`Getting chat history for user ${userId}, limit: ${limit}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const history = dataManager.getChatHistory(userId, limit);
        console.log(`Found ${history.length} chat messages`);
        return history;
      } catch (error) {
        console.error("Error getting chat history:", error);
        throw new Error(`Failed to get chat history: ${error.message}`);
      }
    });

    ipcMain.handle(
      "db:saveChatMessage",
      async (event, message, isAi, userId, sessionId) => {
        try {
          console.log(`Saving chat message for user ${userId}, isAi: ${isAi}`);
          if (!dataManager) {
            throw new Error("DataManager is not initialized");
          }
          const savedMessage = dataManager.saveChatMessage(
            message,
            isAi,
            userId,
            sessionId,
          );
          console.log("Chat message saved successfully:", savedMessage);
          return savedMessage;
        } catch (error) {
          console.error("Error saving chat message:", error);
          throw new Error(`Failed to save chat message: ${error.message}`);
        }
      },
    );

    ipcMain.handle("db:clearChatHistory", async (event, userId) => {
      try {
        console.log(`Clearing chat history for user ${userId}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        dataManager.clearChatHistory(userId);
        console.log("Chat history cleared successfully");
        return { success: true };
      } catch (error) {
        console.error("Error clearing chat history:", error);
        throw new Error(`Failed to clear chat history: ${error.message}`);
      }
    });

    // QUICK PROMPTS HANDLERS
    ipcMain.handle("db:getQuickPrompts", async (event, userId) => {
      try {
        return dataManager.getQuickPrompts(userId);
      } catch (error) {
        console.error("Error getting quick prompts:", error);
        return [];
      }
    });

    ipcMain.handle("db:saveQuickPrompt", async (event, userId, promptText) => {
      try {
        return dataManager.saveQuickPrompt(userId, promptText);
      } catch (error) {
        console.error("Error saving quick prompt:", error);
        throw error;
      }
    });

    ipcMain.handle("db:deleteQuickPrompt", async (event, promptId) => {
      try {
        return dataManager.deleteQuickPrompt(promptId);
      } catch (error) {
        console.error("Error deleting quick prompt:", error);
        throw error;
      }
    });

    ipcMain.handle("db:updateQuickPromptUsage", async (event, promptId) => {
      try {
        return dataManager.updateQuickPromptUsage(promptId);
      } catch (error) {
        console.error("Error updating quick prompt usage:", error);
        throw error;
      }
    });

    // USER SETTINGS HANDLERS
    ipcMain.handle("db:getUserSettings", async (event, userId) => {
      try {
        console.log(`Getting user settings for ${userId}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const settings = dataManager.getUserSettings(userId);
        console.log("User settings retrieved:", settings);
        return settings;
      } catch (error) {
        console.error("Error getting user settings:", error);
        throw new Error(`Failed to get user settings: ${error.message}`);
      }
    });

    ipcMain.handle("db:saveUserSettings", async (event, userId, settings) => {
      try {
        console.log(`Saving user settings for ${userId}:`, settings);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const result = dataManager.saveUserSettings(userId, settings);
        console.log("User settings saved successfully");
        return result;
      } catch (error) {
        console.error("Error saving user settings:", error);
        throw new Error(`Failed to save user settings: ${error.message}`);
      }
    });

    // USER AUTHENTICATION HANDLERS
    ipcMain.handle(
      "db:storeUserCredentials",
      async (event, userId, userData) => {
        try {
          if (!dataManager) throw new Error("DataManager not initialized");
          console.log(`Storing user credentials for: ${userId}`);
          return dataManager.storeUserCredentials(userId, userData);
        } catch (error) {
          console.error("Error storing user credentials:", error);
          throw new Error(`Failed to store user credentials: ${error.message}`);
        }
      },
    );

    ipcMain.handle(
      "db:getUserCredentials",
      async (event, username, password) => {
        try {
          if (!dataManager) throw new Error("DataManager not initialized");
          console.log(
            `Getting user credentials for offline login: ${username}`,
          );
          return dataManager.getUserCredentials(username, password);
        } catch (error) {
          console.error("Error getting user credentials:", error);
          throw new Error(`Failed to get user credentials: ${error.message}`);
        }
      },
    );

    ipcMain.handle("db:userNeedsSync", async (event, userId) => {
      try {
        if (!dataManager) throw new Error("DataManager not initialized");
        return dataManager.userNeedsSync(userId);
      } catch (error) {
        console.error("Error checking user sync status:", error);
        return false;
      }
    });

    ipcMain.handle("db:markUserSynced", async (event, userId) => {
      try {
        if (!dataManager) throw new Error("DataManager not initialized");
        return dataManager.markUserSynced(userId);
      } catch (error) {
        console.error("Error marking user as synced:", error);
        throw new Error(`Failed to mark user as synced: ${error.message}`);
      }
    });

    ipcMain.handle("db:getCurrentUser", async (event) => {
      try {
        if (!dataManager) throw new Error("DataManager not initialized");
        return dataManager.getCurrentUser();
      } catch (error) {
        console.error("Error getting current user:", error);
        return null;
      }
    });

    ipcMain.handle("db:clearUserCredentials", async (event) => {
      try {
        if (!dataManager) throw new Error("DataManager not initialized");
        console.log("Clearing local user credentials");
        return dataManager.clearUserCredentials();
      } catch (error) {
        console.error("Error clearing user credentials:", error);
        throw new Error(`Failed to clear user credentials: ${error.message}`);
      }
    });

    ipcMain.handle("db:usernameExistsLocally", async (event, username) => {
      try {
        if (!dataManager) throw new Error("DataManager not initialized");
        console.log(`Checking if username exists locally: ${username}`);
        return dataManager.usernameExistsLocally(username);
      } catch (error) {
        console.error("Error checking username existence locally:", error);
        throw new Error(`Failed to check username existence: ${error.message}`);
      }
    });

    // MODEL HANDLERS
    ipcMain.handle("db:getDownloadedModels", async (event, userId) => {
      try {
        if (!dataManager) throw new Error("DataManager not initialized");
        console.log(`Getting downloaded models for user ${userId}`);
        return dataManager.getDownloadedModels(userId);
      } catch (error) {
        console.error("Error getting downloaded models:", error);
        return [];
      }
    });

    ipcMain.handle(
      "db:saveDownloadedModel",
      async (event, userId, modelData) => {
        try {
          if (!dataManager) throw new Error("DataManager not initialized");
          console.log(`Saving downloaded model for user ${userId}:`, modelData);
          return dataManager.saveDownloadedModel(userId, modelData);
        } catch (error) {
          console.error("Error saving downloaded model:", error);
          throw error;
        }
      },
    );

    ipcMain.handle(
      "db:deleteDownloadedModel",
      async (event, userId, modelName) => {
        try {
          if (!dataManager) throw new Error("DataManager not initialized");
          console.log(
            `Deleting downloaded model for user ${userId}: ${modelName}`,
          );
          return dataManager.deleteDownloadedModel(userId, modelName);
        } catch (error) {
          console.error("Error deleting downloaded model:", error);
          throw error;
        }
      },
    );

    // Chat session handlers
    ipcMain.handle("db:createChatSession", async (event, userId, title) => {
      try {
        const result = dataManager.createChatSession(userId, title);
        console.log("Chat session created:", result);
        return result;
      } catch (error) {
        console.error("Error creating chat session:", error);
        throw new Error(`Failed to create chat session: ${error.message}`);
      }
    });

    ipcMain.handle("db:getChatSessions", async (event, userId) => {
      try {
        const sessions = dataManager.getChatSessions(userId);
        console.log(`Found ${sessions.length} chat sessions`);
        return sessions;
      } catch (error) {
        console.error("Error getting chat sessions:", error);
        throw new Error(`Failed to get chat sessions: ${error.message}`);
      }
    });

    ipcMain.handle("db:getSessionMessages", async (event, sessionId) => {
      try {
        const messages = dataManager.getSessionMessages(sessionId);
        console.log(
          `Found ${messages.length} messages in session ${sessionId}`,
        );
        return messages;
      } catch (error) {
        console.error("Error getting session messages:", error);
        throw new Error(`Failed to get session messages: ${error.message}`);
      }
    });

    // NOTIFICATIONS HANDLERS
    ipcMain.handle("notifications:showImmediate", async (event, options) => {
      try {
        const { title, body, type, iconPath } = options;

        if (Notification.isSupported()) {
          const notification = new Notification({
            title: title,
            body: body,
            icon: iconPath || getNotificationIcon(),
            silent: false,
          });

          notification.show();

          notification.on("click", () => {
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
              if (win.isMinimized()) win.restore();
              win.focus();
            }
          });

          return { success: true };
        }

        return { success: false, error: "Notifications not supported" };
      } catch (error) {
        console.error("Error showing notification:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("notifications:requestPermission", async () => {
      return { permission: "granted" }; // Electron has built-in permission
    });

    // ============================================================================
    // ELECTRON INPUT FOCUS BUG FIX
    // ============================================================================
    // These handlers fix the critical Electron bug where window.confirm() and window.alert()
    // Input fields lose focus after certain operations
    // Solution: Use dialog.showMessageBox() with proper BrowserWindow focus restoration

    ipcMain.handle("dialog:confirm", async (event, message) => {
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();

        // Use Electron's native dialog with proper focus handling
        const result = await dialog.showMessageBox(focusedWindow, {
          type: "question",
          buttons: ["Cancel", "OK"],
          defaultId: 1,
          cancelId: 0,
          message: message,
          title: "Confirm",
        });

        // Restore window focus to fix input functionality
        if (focusedWindow) {
          focusedWindow.blur(); // Blur first to reset focus state
          focusedWindow.focus(); // Then refocus to restore input functionality
        }

        return result.response === 1; // Return true for OK, false for Cancel
      } catch (error) {
        console.error("Dialog confirm error:", error);
        return false;
      }
    });

    ipcMain.handle("dialog:alert", async (event, message) => {
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();

        // Use Electron's native dialog with proper focus handling
        await dialog.showMessageBox(focusedWindow, {
          type: "info",
          buttons: ["OK"],
          defaultId: 0,
          message: message,
          title: "Alert",
        });

        // Restore window focus to fix input functionality
        if (focusedWindow) {
          focusedWindow.blur(); // Blur first to reset focus state
          focusedWindow.focus(); // Then refocus to restore input functionality
        }

        return true;
      } catch (error) {
        console.error("Dialog alert error:", error);
        return false;
      }
    });

    // ============================================================================
    // SYSTEM AND FILE OPERATION HANDLERS
    // ============================================================================
    // Handlers for file operations and system utilities referenced in preload.js

    ipcMain.handle("open-external", async (event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error("Error opening external URL:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("get-version", async () => {
      try {
        return {
          app: app.getVersion(),
          electron: process.versions.electron,
          node: process.versions.node,
          chrome: process.versions.chrome,
        };
      } catch (error) {
        console.error("Error getting version info:", error);
        return { error: error.message };
      }
    });

    ipcMain.handle("select-file", async (event, options = {}) => {
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const result = await dialog.showOpenDialog(focusedWindow, {
          properties: ["openFile"],
          filters: options.filters || [
            { name: "All Files", extensions: ["*"] },
          ],
          ...options,
        });

        return result;
      } catch (error) {
        console.error("Error selecting file:", error);
        return { canceled: true, error: error.message };
      }
    });

    ipcMain.handle("save-file", async (event, options = {}) => {
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const result = await dialog.showSaveDialog(focusedWindow, {
          filters: options.filters || [
            { name: "All Files", extensions: ["*"] },
          ],
          ...options,
        });

        return result;
      } catch (error) {
        console.error("Error saving file dialog:", error);
        return { canceled: true, error: error.message };
      }
    });

    ipcMain.handle("read-file", async (event, filePath) => {
      try {
        const data = fs.readFileSync(filePath, "utf8");
        return { success: true, data };
      } catch (error) {
        console.error("Error reading file:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("write-file", async (event, filePath, data) => {
      try {
        fs.writeFileSync(filePath, data, "utf8");
        return { success: true };
      } catch (error) {
        console.error("Error writing file:", error);
        return { success: false, error: error.message };
      }
    });

    // ============================================================================
    // RECURRING TASK HANDLERS
    // ============================================================================

    ipcMain.handle("db:saveRecurringTask", async (event, recurringTask) => {
      try {
        console.log("Saving recurring task template:", recurringTask);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const savedTemplate = dataManager.saveRecurringTask(recurringTask);
        console.log(
          "Recurring task template saved successfully:",
          savedTemplate,
        );
        return savedTemplate;
      } catch (error) {
        console.error("Error saving recurring task template:", error);
        throw new Error(
          `Failed to save recurring task template: ${error.message}`,
        );
      }
    });

    ipcMain.handle("db:getRecurringTasks", async (event, userId) => {
      try {
        console.log(`Getting recurring task templates for user ${userId}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const templates = dataManager.getRecurringTasks(userId);
        console.log(`Found ${templates.length} recurring task templates`);
        return templates;
      } catch (error) {
        console.error("Error getting recurring task templates:", error);
        throw new Error(
          `Failed to get recurring task templates: ${error.message}`,
        );
      }
    });

    ipcMain.handle("db:updateRecurringTask", async (event, id, updates) => {
      try {
        console.log(`Updating recurring task template ${id} with:`, updates);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const result = dataManager.updateRecurringTask(id, updates);
        console.log("Recurring task template updated successfully:", result);
        return result;
      } catch (error) {
        console.error("Error updating recurring task template:", error);
        throw new Error(
          `Failed to update recurring task template: ${error.message}`,
        );
      }
    });

    ipcMain.handle("db:deleteRecurringTask", async (event, id) => {
      try {
        console.log(`Deleting recurring task template ${id}`);
        if (!dataManager) {
          throw new Error("DataManager is not initialized");
        }
        const result = dataManager.deleteRecurringTask(id);
        console.log("Recurring task template deleted successfully:", result);
        return result;
      } catch (error) {
        console.error("Error deleting recurring task template:", error);
        throw new Error(
          `Failed to delete recurring task template: ${error.message}`,
        );
      }
    });

    ipcMain.handle(
      "db:generateRecurringTasks",
      async (event, userId, targetDate) => {
        try {
          console.log(
            `Generating recurring tasks for user ${userId}, date: ${targetDate}`,
          );
          if (!dataManager) {
            throw new Error("DataManager is not initialized");
          }
          const result = dataManager.generateRecurringTasks(userId, targetDate);
          console.log("Recurring tasks generated successfully:", result);
          return result;
        } catch (error) {
          console.error("Error generating recurring tasks:", error);
          throw new Error(
            `Failed to generate recurring tasks: ${error.message}`,
          );
        }
      },
    );

    ipcMain.handle(
      "db:handleRecurringTaskCompletion",
      async (event, taskId) => {
        try {
          console.log(`Handling recurring task completion for task ${taskId}`);
          if (!dataManager) {
            throw new Error("DataManager is not initialized");
          }
          const result = dataManager.handleRecurringTaskCompletion(taskId);
          console.log(
            "Recurring task completion handled successfully:",
            result,
          );
          return result;
        } catch (error) {
          console.error("Error handling recurring task completion:", error);
          throw new Error(
            `Failed to handle recurring task completion: ${error.message}`,
          );
        }
      },
    );

    ipcMain.handle("db:getUserById", async (event, userId) => {
      try {
        if (!dataManager) throw new Error("DataManager not initialized");
        return dataManager.getUserById(userId);
      } catch (error) {
        console.error("Error getting user by ID:", error);
        return null;
      }
    });

    // verify all handlers are registered (just in case)
    const registeredHandlers = [
      "db:getTasks",
      "db:saveTask",
      "db:updateTask",
      "db:deleteTask",
      "db:getEvents",
      "db:saveEvent",
      "db:updateEvent",
      "db:deleteEvent",
      "db:getDiaryEntries",
      "db:saveDiaryEntry",
      "db:getChatHistory",
      "db:saveChatMessage",
      "db:clearChatHistory",
      "db:getStorageStats",
      "get-gpu-info",
      "open-external",
      "get-version",
      "select-file",
      "save-file",
      "read-file",
      "write-file",
      "db:getUserSettings",
      "db:saveUserSettings",
      "db:getDownloadedModels",
      "db:saveDownloadedModel",
      "db:deleteDownloadedModel",
      "db:saveRecurringTask",
      "db:getRecurringTasks",
      "db:updateRecurringTask",
      "db:deleteRecurringTask",
      "db:generateRecurringTasks",
      "db:handleRecurringTaskCompletion",
      "notifications:showImmediate",
      "notifications:requestPermission",
      "dialog:confirm",
      "dialog:alert",
    ];

    console.log("All database IPC handlers registered successfully:");
    registeredHandlers.forEach((handler) => {
      console.log(`  - ${handler}`);
    });
  } catch (error) {
    console.error("Failed to setup database IPC:", error);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

/**
 * Get correct icon path for notifications
 */
function getNotificationIcon() {
  const iconPaths = [
    // Development: Direct source access
    isDevelopment
      ? path.join(__dirname, "..", "src", "assets", "icons", "moody.png")
      : null,

    // Production: Find hashed asset in dist
    !isDevelopment
      ? (() => {
          try {
            const assetsDir = path.join(__dirname, "..", "dist", "assets");
            if (fs.existsSync(assetsDir)) {
              const files = fs.readdirSync(assetsDir);
              const moodeyIcon = files.find(
                (file) => file.startsWith("moody.") && file.endsWith(".png"),
              );
              return moodeyIcon ? path.join(assetsDir, moodeyIcon) : null;
            }
          } catch (error) {
            console.error("Error finding production icon:", error);
          }
          return null;
        })()
      : null,

    // Additional fallback paths
    path.join(__dirname, "..", "public", "moody.png"),
  ].filter(Boolean);
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      console.log("Found notification icon at:", iconPath);
      return iconPath;
    }
  }

  console.log("No notification icon found, using system default");
  return undefined;
}

// Application lifecycle management with single-instance support (does not allow multiple instances of the same app)
app.whenReady().then(async () => {
  // Only initialize if we have the lock (prevents duplicate initialization)
  if (!gotTheLock) {
    console.log("Exiting - another instance is already running");
    return;
  }
  try {
    console.log("Starting Wingman with single-instance protection...");

    console.log("Starting database setup...");
    await setupDatabaseIPC();
    console.log("Database IPC setup complete");
    console.log("All IPC handlers registered successfully");

    console.log("Starting backend server...");
    await startBackendServer();
    console.log("Backend server started successfully");

    console.log("Creating main window...");
    createWindow();
    console.log("Main window created successfully");

    //Initialize background notification service
    console.log("Initializing background notification service...");
    backgroundNotificationService.start();
    console.log("Background notification service initialized");

    console.log(
      "Wingman started successfully with enhanced multi-instance protection! YAY!",
    );
  } catch (error) {
    console.error("App initialization failed:", error);
    console.error("Stack trace:", error.stack);

    // error dialog with troubleshooting
    const errorMessage = `Wingman failed to start: ${error.message}

Nice try, nice to see you again!
Possible causes:
• Database connection issues
• Backend server startup failure
• Port conflicts (8080 may be in use)
• Permission issues

Please check the console for detailed error information.`;

    dialog.showErrorBox("Wingman Startup Error", errorMessage);

    // Cleanup before exit to prevent confusion later on
    await gracefulShutdown("STARTUP_ERROR");
    app.quit();
  }
});

// Keyboard shortcut registration
app.whenReady().then(() => {
  // F12 for DevTools
  globalShortcut.register("F12", () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });

  // Ctrl+Shift+I as alternative
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });
});

// Cleanup on app quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Cleanup on app quit with graceful shutdown
app.on("before-quit", async () => {
  console.log("App is actually quitting - initiating graceful shutdown");
  await gracefulShutdown("BEFORE_QUIT");
});

// ============================================================================
// BACKGROUND NOTIFICATION LOGIC
// ============================================================================
// Window-all-closed handler with proper resource management
app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    console.log(
      "App window closed, keeping background notification service running",
    );

    // Keep database connection OPEN for background notifications
    console.log(
      "Keeping database connection alive for background notifications",
    );

    // Keep backend process ALIVE for background notifications
    console.log("Keeping backend process alive for background notifications");

    // Coordinated transition to prevent duplicate notifications
    console.log("Transitioning to background mode with coordinated handoff...");

    // Add delay to ensure frontend timers have finished firing
    setTimeout(async () => {
      console.log(
        "Frontend notification timers cleared - reinitializing background service...",
      );
      backgroundNotificationService.stop(); // Clear existing state
      await backgroundNotificationService.start(); // Fresh start with current data
    }, 2000); // 2-second coordination delay

    // Don't call app.quit() - let the app run in background for notifications
    // The app will continue running and checking for overdue tasks
  } else {
    // On macOS, close resources normally since dock behavior is different
    await gracefulShutdown("WINDOW_CLOSED_MACOS");
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// DevTools toggle handler
ipcMain.on("toggle-dev-tools", () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.toggleDevTools();
  }
});

// Backend health monitoring with improved failure handling
let healthCheckFailCount = 0;

setInterval(() => {
  if (backendProcess) {
    const http = require("http");
    const req = http.get("http://127.0.0.1:8080/health", (res) => {
      if (res.statusCode === 200) {
        healthCheckFailCount = 0; // Reset counter on success
      } else {
        handlePotentialFailure(`HTTP ${res.statusCode}`);
      }
    });

    // Generous timeout to account for system load
    req.setTimeout(15000, () => {
      req.destroy();
      handlePotentialFailure("Health check timeout");
    });

    req.on("error", (err) => {
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
    console.log(
      `Restarting backend after ${healthCheckFailCount} consecutive failures (${reason})`,
    );
    restartBackend();
    healthCheckFailCount = 0;
  } else {
    console.log(
      `Health check issue (${reason}) - failure ${healthCheckFailCount}/3 - waiting for next check`,
    );
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
    const { stdout } = await execPromise("python --version");
    console.log(`Python version check: ${stdout}`);

    if (!stdout.includes("Python 3.13")) {
      console.log("Python 3.13 recommended but not required");
    }

    return {
      installed: true,
      version: stdout.trim(),
    };
  } catch (error) {
    console.error("Python not found:", error);
    return {
      installed: false,
      version: null,
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
    title: "Python 3.13 Required",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  pythonDialog.loadFile(path.join(__dirname, "python-install.html"));
  pythonDialog.setMenu(null);
}

// ============================================================================
// BACKGROUND NOTIFICATION SERVICE
// In-memory scheduler, not database polling
// ============================================================================
class BackgroundNotificationService {
  constructor() {
    this.lastActiveUser = null;
    this.isRunning = false;
    this.scheduler = new Map(); // In-memory notification scheduler
    this.timers = new Map(); // Active notification timers
    // Notification state tracking to prevent duplicates
    this.notificationsSent = new Map(); // Track sent notifications: itemId -> timestamp

    // Load stored user ID on startup
    this.loadStoredUser();
  }

  /**
   * Load the last active user from storage
   */
  loadStoredUser() {
    try {
      const userDataPath = app.getPath("userData");
      const userFilePath = path.join(
        userDataPath,
        "wingman-data",
        "last-active-user.json",
      );

      if (fs.existsSync(userFilePath)) {
        const userData = JSON.parse(fs.readFileSync(userFilePath, "utf8"));
        this.lastActiveUser = userData.userId;
        console.log(
          "BackgroundNotificationService: Loaded stored user ID:",
          this.lastActiveUser,
        );
      }
    } catch (error) {
      console.error(
        "BackgroundNotificationService: Error loading stored user:",
        error,
      );
    }
  }

  /**
   * Store the active user ID persistently
   */
  setLastActiveUser(userId) {
    this.lastActiveUser = userId;

    try {
      const userDataPath = app.getPath("userData");
      const dataDir = path.join(userDataPath, "wingman-data");

      // Ensure directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const userFilePath = path.join(dataDir, "last-active-user.json");
      const userData = {
        userId: userId,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));
      console.log("BackgroundNotificationService: Stored user ID:", userId);
    } catch (error) {
      console.error(
        "BackgroundNotificationService: Error storing user ID:",
        error,
      );
    }
  }

  /**
   *  Start method - Initialize in-memory scheduler
   */
  async start() {
    // Prevent duplicate starts
    if (this.isRunning) {
      console.log("BackgroundNotificationService: Already running");
      return;
    }

    console.log(
      " Background Notification Service: Starting in-memory scheduler",
    );

    const userId = this.getLastActiveUser();
    if (!userId) {
      console.log("No active user - will initialize when user logs in");
      return;
    }

    // Initialize in-memory scheduler (one-time data load)
    await this.initializeScheduler(userId);

    this.isRunning = true;
    console.log(
      "Background notification service running with in-memory scheduler",
    );
  }
  /**
   * Initialize in-memory scheduler ( Pattern)
   * Load data once, schedule with JavaScript timers
   */
  async initializeScheduler(userId) {
    try {
      console.log(`Initializing in-memory scheduler for user ${userId}`);

      // Clear existing timers
      this.clearAllTimers();

      // CRITICAL: Check if dataManager is available
      if (!dataManager) {
        console.error("Database connection lost, cannot initialize scheduler");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      // Use same time format as frontend to prevent discrepancies
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;

      // Load data once (no polling)
      const [tasks, events] = await Promise.all([
        dataManager.getTasks(userId, today),
        dataManager.getEvents(userId, today),
      ]);
      console.log(
        `Loaded ${tasks.length} tasks and ${events.length} events for scheduling`,
      );

      // Count items that will be scheduled vs filtered out
      let tasksScheduled = 0,
        eventsScheduled = 0;

      // Schedule all future tasks and events with precise timers
      tasksScheduled = this.scheduleTaskNotifications(
        tasks,
        currentTime,
        today,
      );
      eventsScheduled = this.scheduleEventNotifications(
        events,
        currentTime,
        today,
      );

      console.log(
        `In-memory scheduler initialized with ${this.timers.size} active timers (${tasksScheduled} tasks, ${eventsScheduled} events scheduled from current time: ${currentTime})`,
      );
    } catch (error) {
      console.error("Error initializing scheduler:", error);
    }
  }
  /**
   * Proper time comparison utility (fixes string comparison bug)
   */
  isTimeInFuture(targetTime, currentTime) {
    const parseTimeToMinutes = (timeString) => {
      const [hours, minutes] = timeString.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const targetMinutes = parseTimeToMinutes(targetTime);
    const currentMinutes = parseTimeToMinutes(currentTime);

    return targetMinutes > currentMinutes;
  }

  /**
   * Schedule task notifications with JavaScript timers
   */ scheduleTaskNotifications(tasks, currentTime, today) {
    tasks.forEach((task) => {
      if (
        task.completed ||
        task.failed ||
        !task.task_time ||
        task.task_time === "All day"
      ) {
        return; // Skip completed, failed, or all-day tasks
      }

      const taskTime = task.task_time.slice(0, 5); // Ensure HH:MM format

      // PROPERRR time comparison instead of string comparison
      if (!this.isTimeInFuture(taskTime, currentTime)) {
        return; // Skip past tasks
      }

      const targetDate = new Date(`${today}T${taskTime}:00`);
      const now = new Date();

      // Schedule 30-minute reminder
      const reminder30min = new Date(targetDate.getTime() - 30 * 60 * 1000);
      if (reminder30min > now) {
        const timerId = `task-${task.id}-30min`;
        const timer = setTimeout(() => {
          this.sendTaskReminder(task, 30);
        }, reminder30min.getTime() - now.getTime());

        this.timers.set(timerId, timer);
        console.log(
          `Scheduled 30min reminder for task "${
            task.title
          }" at ${reminder30min.toLocaleTimeString()}`,
        );
      }

      // Schedule 5-minute reminder
      const reminder5min = new Date(targetDate.getTime() - 5 * 60 * 1000);
      if (reminder5min > now) {
        const timerId = `task-${task.id}-5min`;
        const timer = setTimeout(() => {
          this.sendTaskReminder(task, 5);
        }, reminder5min.getTime() - now.getTime());

        this.timers.set(timerId, timer);
        console.log(
          `Scheduled 5min reminder for task "${
            task.title
          }" at ${reminder5min.toLocaleTimeString()}`,
        );
      }

      // Schedule overdue notification
      const timerId = `task-${task.id}-overdue`;
      const timer = setTimeout(() => {
        this.sendTaskOverdueNotification(task);
      }, targetDate.getTime() - now.getTime());

      this.timers.set(timerId, timer);
      console.log(
        `Scheduled overdue notification for task "${
          task.title
        }" at ${targetDate.toLocaleTimeString()}`,
      );
    });

    return tasks.length; // Return count of scheduled task notifications
  }

  /**
   * Schedule event notifications with JavaScript timers
   */ scheduleEventNotifications(events, currentTime, today) {
    events.forEach((event) => {
      const eventTime = event.event_time || event.start_time;
      if (!eventTime || eventTime === "All day") {
        return; // Skip all-day events
      }

      const eventTimeFormatted = eventTime.slice(0, 5); // Ensure HH:MM format

      // Use proper time comparison
      if (!this.isTimeInFuture(eventTimeFormatted, currentTime)) {
        return; // Skip past events
      }

      const targetDate = new Date(`${today}T${eventTimeFormatted}:00`);
      const now = new Date();

      // Schedule 30-minute reminder
      const reminder30min = new Date(targetDate.getTime() - 30 * 60 * 1000);
      if (reminder30min > now) {
        const timerId = `event-${event.id}-30min`;
        const timer = setTimeout(() => {
          this.sendEventReminder(event, 30);
        }, reminder30min.getTime() - now.getTime());

        this.timers.set(timerId, timer);
        console.log(
          `Scheduled 30min reminder for event "${
            event.title
          }" at ${reminder30min.toLocaleTimeString()}`,
        );
      }

      // Schedule 5-minute reminder
      const reminder5min = new Date(targetDate.getTime() - 5 * 60 * 1000);
      if (reminder5min > now) {
        const timerId = `event-${event.id}-5min`;
        const timer = setTimeout(() => {
          this.sendEventReminder(event, 5);
        }, reminder5min.getTime() - now.getTime());

        this.timers.set(timerId, timer);
        console.log(
          `Scheduled 5min reminder for event "${
            event.title
          }" at ${reminder5min.toLocaleTimeString()}`,
        );
      }

      // Schedule start notification
      const timerId = `event-${event.id}-start`;
      const timer = setTimeout(() => {
        this.sendEventStartNotification(event);
      }, targetDate.getTime() - now.getTime());

      this.timers.set(timerId, timer);
      console.log(
        `Scheduled start notification for event "${
          event.title
        }" at ${targetDate.toLocaleTimeString()}`,
      );
    });

    return events.length; // Return count of scheduled event notifications
  }
  /**
   * Send task reminder notification
   */ async sendTaskReminder(task, minutesBefore) {
    try {
      // Check for duplicate notifications
      const notificationType = `${minutesBefore}min-reminder`;
      if (this.wasNotificationRecentlySent(task.id, notificationType)) {
        console.log(
          `Skipping duplicate ${minutesBefore}min reminder for task "${task.title}"`,
        );
        return;
      }

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: `Task Reminder (${minutesBefore} min)`,
          body: `"${task.title}" is due in ${minutesBefore} minutes at ${task.task_time}`,
          icon: getNotificationIcon(),
          silent: false,
        });

        notification.show();
        this.handleNotificationClick(notification);

        // Mark notification as sent
        this.markNotificationSent(task.id, notificationType);

        console.log(
          `Sent ${minutesBefore}min reminder for task "${task.title}"`,
        );
      }
    } catch (error) {
      console.error(`Error sending task reminder:`, error);
    }
  }
  /**
   * Send task overdue notification
   */
  async sendTaskOverdueNotification(task) {
    try {
      // Check for duplicate notifications
      const notificationType = "overdue";
      if (this.wasNotificationRecentlySent(task.id, notificationType)) {
        console.log(
          `Skipping duplicate overdue notification for task "${task.title}"`,
        );
        return;
      }

      // Mark as failed in database
      if (dataManager) {
        dataManager.updateTask(task.id, { failed: true });
      }

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: "Task Failed",
          body: `"${task.title}" was due at ${task.task_time} and has been marked as failed.`,
          icon: getNotificationIcon(),
          silent: false,
        });

        notification.show();
        this.handleNotificationClick(notification);

        // Mark notification as sent
        this.markNotificationSent(task.id, notificationType);

        console.log(`Sent failure notification for task "${task.title}"`);
      }

      // Remove related timers
      this.removeTaskTimers(task.id);
    } catch (error) {
      console.error(`Error sending task overdue notification:`, error);
    }
  }
  /**
   * Send event reminder notification
   */
  async sendEventReminder(event, minutesBefore) {
    try {
      // Check for duplicate notifications
      const notificationType = `${minutesBefore}min-reminder`;
      if (this.wasNotificationRecentlySent(event.id, notificationType)) {
        console.log(
          `Skipping duplicate ${minutesBefore}min reminder for event "${event.title}"`,
        );
        return;
      }

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: `Event Reminder (${minutesBefore} min)`,
          body: `"${event.title}" starts in ${minutesBefore} minutes at ${
            event.event_time || event.start_time
          }`,
          icon: getNotificationIcon(),
          silent: false,
        });

        notification.show();
        this.handleNotificationClick(notification);

        // Mark notification as sent
        this.markNotificationSent(event.id, notificationType);

        console.log(
          `Sent ${minutesBefore}min reminder for event "${event.title}"`,
        );
      }
    } catch (error) {
      console.error(`Error sending event reminder:`, error);
    }
  }
  /**
   * Send event start notification
   */
  async sendEventStartNotification(event) {
    try {
      // Check for duplicate notifications
      const notificationType = "start";
      if (this.wasNotificationRecentlySent(event.id, notificationType)) {
        console.log(
          `Skipping duplicate start notification for event "${event.title}"`,
        );
        return;
      }

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: "Event Starting",
          body: `"${event.title}" is starting now!`,
          icon: getNotificationIcon(),
          silent: false,
        });

        notification.show();
        this.handleNotificationClick(notification);

        // Mark notification as sent
        this.markNotificationSent(event.id, notificationType);

        console.log(`Sent start notification for event "${event.title}"`);
      }

      // Remove related timers
      this.removeEventTimers(event.id);
    } catch (error) {
      console.error(`Error sending event start notification:`, error);
    }
  }

  /**
   * Handle notification click to reopen app
   */
  handleNotificationClick(notification) {
    notification.on("click", () => {
      const existingWindow = BrowserWindow.getAllWindows()[0];
      if (existingWindow) {
        existingWindow.show();
        existingWindow.focus();
      } else {
        createWindow();
      }
    });
  }

  /**
   * Remove all timers for a task
   */
  removeTaskTimers(taskId) {
    const timerIds = [
      `task-${taskId}-30min`,
      `task-${taskId}-5min`,
      `task-${taskId}-overdue`,
    ];
    timerIds.forEach((timerId) => {
      const timer = this.timers.get(timerId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(timerId);
      }
    });
  }

  /**
   * Remove all timers for an event
   */
  removeEventTimers(eventId) {
    const timerIds = [
      `event-${eventId}-30min`,
      `event-${eventId}-5min`,
      `event-${eventId}-start`,
    ];
    timerIds.forEach((timerId) => {
      const timer = this.timers.get(timerId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(timerId);
      }
    });
  }
  /**
   * Clear all active timers
   */
  clearAllTimers() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    // Also clear notification tracking state
    this.notificationsSent.clear();
    console.log("Cleared all notification timers and tracking state");
  }

  /**
   * Check if notification was already sent recently (prevent duplicates)
   */
  wasNotificationRecentlySent(itemId, type) {
    const key = `${itemId}-${type}`;
    const lastSent = this.notificationsSent.get(key);
    if (lastSent) {
      const timeSinceLastSent = Date.now() - lastSent;
      // Prevent duplicate notifications within 30 seconds
      return timeSinceLastSent < 30000;
    }
    return false;
  }

  /**
   * Mark notification as sent
   */
  markNotificationSent(itemId, type) {
    const key = `${itemId}-${type}`;
    this.notificationsSent.set(key, Date.now());
  }

  /**
   * Real-time update methods (called when data changes)
   */
  async onTaskCreated(taskData) {
    console.log("Real-time: Task created, updating scheduler");
    await this.reinitializeScheduler();
  }

  async onTaskUpdated(taskData) {
    console.log("Real-time: Task updated, updating scheduler");
    await this.reinitializeScheduler();
  }

  async onTaskDeleted(taskId) {
    console.log("Real-time: Task deleted, updating scheduler");
    this.removeTaskTimers(taskId);
  }

  async onEventCreated(eventData) {
    console.log("Real-time: Event created, updating scheduler");
    await this.reinitializeScheduler();
  }

  async onEventUpdated(eventData) {
    console.log("Real-time: Event updated, updating scheduler");
    await this.reinitializeScheduler();
  }

  async onEventDeleted(eventId) {
    console.log("Real-time: Event deleted, updating scheduler");
    this.removeEventTimers(eventId);
  }

  /**
   * Reinitialize scheduler (used for data changes)
   */
  async reinitializeScheduler() {
    const userId = this.getLastActiveUser();
    if (userId && this.isRunning) {
      await this.initializeScheduler(userId);
    }
  }
  getLastActiveUser() {
    return this.lastActiveUser;
  }

  /**
   * Stop method - Clean up all timers
   */
  stop() {
    this.clearAllTimers();
    this.isRunning = false;
    console.log("Professional Background Notification Service: Stopped");
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      userId: this.lastActiveUser,
      activeTimers: this.timers.size,
      timerIds: Array.from(this.timers.keys()),
    };
  }
}

// Initialize background service after class definition
backgroundNotificationService = new BackgroundNotificationService();

// Add IPC handler to store active user when they log in
ipcMain.handle("store-active-user", async (event, userId) => {
  try {
    backgroundNotificationService.setLastActiveUser(userId);
    console.log(
      "Main: Stored active user ID for background notifications:",
      userId,
    );
    return { success: true };
  } catch (error) {
    console.error("Main: Error storing active user ID:", error);
    return { success: false, error: error.message };
  }
});

// Handler for getting all events for a user across all dates
ipcMain.handle("db:getAllEvents", async (event, userId) => {
  try {
    console.log(`Getting all events for user ${userId}`);
    if (!dataManager) {
      throw new Error("DataManager is not initialized");
    }
    const events = dataManager.getAllEvents(userId);
    console.log(`Found ${events.length} total events`);
    return events;
  } catch (error) {
    console.error("Error getting all events:", error);
    throw new Error(`Failed to get all events: ${error.message}`);
  }
});

// Handler for getting all diary entries for a user across all dates
ipcMain.handle("db:getAllDiaryEntries", async (event, userId) => {
  try {
    console.log(`Getting all diary entries for user ${userId}`);
    if (!dataManager) {
      throw new Error("DataManager is not initialized");
    }
    const entries = dataManager.getAllDiaryEntries(userId);
    console.log(`Found ${entries.length} total diary entries`);
    return entries;
  } catch (error) {
    console.error("Error getting all diary entries:", error);
    throw new Error(`Failed to get all diary entries: ${error.message}`);
  }
});
