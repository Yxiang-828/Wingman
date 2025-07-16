const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

// Conditional Electron import - only load when not in test environment
let app, ipcMain;
if (
  process.env.NODE_ENV !== "test" &&
  process.env.JEST_WORKER_ID === undefined
) {
  const electron = require("electron");
  app = electron.app;
  ipcMain = electron.ipcMain;
}

// Define development mode flag
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * LocalDataManager handles all SQLite database operations for Wingman
 * Manages tasks, events, diary entries, chat history, and user settings
 * Uses better-sqlite3 for synchronous database operations with better performance
 */
class LocalDataManager {
  constructor(customDbPath = null) {
    if (customDbPath) {
      // Use custom path for testing
      this.dbPath = customDbPath;
      console.log(
        "LocalDataManager initializing TEST database at:",
        this.dbPath,
      );
    } else {
      // Use normal Electron app path for production
      const userDataPath = app.getPath("userData");
      const dataDir = path.join(userDataPath, "wingman-data");

      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.dbPath = path.join(dataDir, "wingman.db");
      console.log(
        "LocalDataManager initializing PRODUCTION database at:",
        this.dbPath,
      );
    }

    try {
      // Enhanced SQLite configuration for multi-instance safety
      this.db = new Database(this.dbPath, {
        timeout: 5000, // 5 second timeout for locks
        verbose: isDevelopment ? console.log : null,
        fileMustExist: false, // Create if doesn't exist
      });
      this.initializeDatabase();
      console.log(
        "SQLite database initialized successfully with enhanced configuration",
      );
    } catch (err) {
      console.error("Error initializing SQLite database:", err);
      throw err;
    }
  }

  /**
   * Initializes database schema and performs necessary migrations
   * Attempts to load schema from file, falls back to inline creation
   */ initializeDatabase() {
    // Enhanced SQLite configuration for stability and performance
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("journal_mode = WAL"); // Write-Ahead Logging for better concurrency
    this.db.pragma("synchronous = NORMAL"); // Balanced safety/performance
    this.db.pragma("cache_size = 1000"); // Cache for better performance
    this.db.pragma("temp_store = MEMORY"); // Store temp tables in memory
    this.db.pragma("mmap_size = 268435456"); // 256MB memory-mapped I/O

    // Try to load schema from multiple possible locations (to ensure database is always initialized correctly)
    const schemaPaths = [
      path.join(__dirname, "..", "src", "storage", "schema.sql"),
      path.join(__dirname, "schema.sql"),
      path.join(__dirname, "..", "schema.sql"),
    ];

    let schemaLoaded = false;

    for (const schemaPath of schemaPaths) {
      if (fs.existsSync(schemaPath)) {
        console.log("Loading schema from", schemaPath);
        const schema = fs.readFileSync(schemaPath, "utf8");
        this.db.exec(schema);
        schemaLoaded = true;
        break;
      }
    }

    // Create tables programmatically if no schema file found
    if (!schemaLoaded) {
      console.log("No schema file found, creating tables inline");
      this.createTablesInline();
    }

    // Run migrations to ensure all required columns exist
    this.migrateDatabase();
  }
  /**
   * Handles database migrations for schema changes
   * Adds new columns and tables without affecting existing data
   */
  migrateDatabase() {
    try {
      // Check if 'failed' column exists in tasks table and add if missing
      const tableInfo = this.db.prepare("PRAGMA table_info(tasks)").all();
      const hasFailedColumn = tableInfo.some(
        (column) => column.name === "failed",
      );

      if (!hasFailedColumn) {
        console.log("Adding failed column to tasks table");
        this.db.exec(
          "ALTER TABLE tasks ADD COLUMN failed BOOLEAN DEFAULT FALSE",
        );
      }

      // Check if 'recurring_id' column exists in tasks table and add if missing
      const hasRecurringIdColumn = tableInfo.some(
        (column) => column.name === "recurring_id",
      );

      if (!hasRecurringIdColumn) {
        console.log("Adding recurring_id column to tasks table");
        this.db.exec("ALTER TABLE tasks ADD COLUMN recurring_id INTEGER");
      }

      // Migrate users table to add new columns for offline authentication
      console.log("Checking users table for authentication columns...");
      const usersTableInfo = this.db.prepare("PRAGMA table_info(users)").all();

      const hasNameColumn = usersTableInfo.some(
        (column) => column.name === "name",
      );
      const hasPasswordColumn = usersTableInfo.some(
        (column) => column.name === "password",
      );
      const hasLastSyncedColumn = usersTableInfo.some(
        (column) => column.name === "last_synced_at",
      );

      if (!hasNameColumn) {
        console.log("Adding name column to users table");
        this.db.exec("ALTER TABLE users ADD COLUMN name TEXT");
      }

      if (!hasPasswordColumn) {
        console.log("Adding password column to users table");
        this.db.exec("ALTER TABLE users ADD COLUMN password TEXT");
      }

      if (!hasLastSyncedColumn) {
        console.log("Adding last_synced_at column to users table");
        this.db.exec("ALTER TABLE users ADD COLUMN last_synced_at TEXT");
      }

      // Check and fix user_settings table schema
      try {
        const userSettingsInfo = this.db
          .prepare("PRAGMA table_info(user_settings)")
          .all();
        const hasNotificationsEnabled = userSettingsInfo.some(
          (col) => col.name === "notifications_enabled",
        );
        const hasBackgroundColumn = userSettingsInfo.some(
          (col) => col.name === "background",
        );

        if (userSettingsInfo.length > 0) {
          if (!hasNotificationsEnabled) {
            console.log(
              "Adding notifications_enabled column to user_settings table",
            );
            this.db.exec(
              "ALTER TABLE user_settings ADD COLUMN notifications_enabled INTEGER DEFAULT 1",
            );
          }

          if (hasBackgroundColumn) {
            console.log(
              "Removing deprecated background column from user_settings table",
            );
            // SQLite doesn't support DROP COLUMN, so we need to recreate the table
            this.db.exec(`
              CREATE TABLE user_settings_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL UNIQUE,
                ai_model TEXT DEFAULT 'llama3.2:1b',
                ai_model_auto_selected INTEGER DEFAULT 1,
                theme TEXT DEFAULT 'dark',
                notifications_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
              )
            `);
            this.db.exec(`
              INSERT INTO user_settings_new (id, user_id, ai_model, ai_model_auto_selected, theme, notifications_enabled, created_at, updated_at)
              SELECT id, user_id, ai_model, 
                CASE WHEN ai_model_auto_selected = 'true' OR ai_model_auto_selected = 1 THEN 1 ELSE 0 END,
                theme, 
                COALESCE(notifications_enabled, 1),
                created_at, updated_at
              FROM user_settings
            `);
            this.db.exec("DROP TABLE user_settings");
            this.db.exec(
              "ALTER TABLE user_settings_new RENAME TO user_settings",
            );
          }
        }
      } catch (error) {
        console.log(
          "user_settings table does not exist yet, will be created with correct schema",
        );
      }

      // Check and fix recurring_tasks table schema
      try {
        const recurringTasksInfo = this.db
          .prepare("PRAGMA table_info(recurring_tasks)")
          .all();
        if (recurringTasksInfo.length > 0) {
          const isActiveColumn = recurringTasksInfo.find(
            (col) => col.name === "is_active",
          );
          if (isActiveColumn && isActiveColumn.type === "BOOLEAN") {
            console.log(
              "Fixing is_active column type in recurring_tasks table",
            );
            this.db.exec(`
              CREATE TABLE recurring_tasks_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                task_title TEXT NOT NULL,
                task_time TEXT,
                weekdays TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
              )
            `);
            this.db.exec(`
              INSERT INTO recurring_tasks_new (id, user_id, task_title, task_time, weekdays, is_active, created_at)
              SELECT id, user_id, task_title, task_time, weekdays,
                CASE WHEN is_active = 'true' OR is_active = 1 THEN 1 ELSE 0 END,
                created_at
              FROM recurring_tasks
            `);
            this.db.exec("DROP TABLE recurring_tasks");
            this.db.exec(
              "ALTER TABLE recurring_tasks_new RENAME TO recurring_tasks",
            );
          }
        }
      } catch (error) {
        console.log(
          "recurring_tasks table does not exist yet, will be created with correct schema",
        );
      }

      // Ensure recurring_tasks table exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS recurring_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          task_title TEXT NOT NULL,
          task_time TEXT,
          weekdays TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure model management tables exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS downloaded_models (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          model_name TEXT NOT NULL,
          size_mb INTEGER DEFAULT 0,
          status TEXT DEFAULT 'completed',
          download_date TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, model_name)
        )
      `);

      // Ensure user settings table exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL UNIQUE,
          ai_model TEXT DEFAULT 'llama3.2:1b',
          ai_model_auto_selected INTEGER DEFAULT 1,
          theme TEXT DEFAULT 'dark',
          notifications_enabled INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `); // Ensure chat quick prompts table exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS chat_quick_prompts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          prompt_text TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_used_at TEXT DEFAULT CURRENT_TIMESTAMP,
          usage_count INTEGER DEFAULT 0
        )
      `);

      // Create indexes for recurring tasks functionality
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_recurring_id ON tasks(recurring_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user_id ON recurring_tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_tasks_active ON recurring_tasks(user_id, is_active);
      `);
    } catch (error) {
      console.error("Migration error:", error);
    }
  }

  /**
   * Creates all required database tables programmatically
   * Used when no schema file is available
   */
  createTablesInline() {
    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        task_date TEXT,
        task_time TEXT,
        completed INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        task_type TEXT,
        due_date TEXT,
        last_reset_date TEXT,
        status TEXT,
        recurring_id INTEGER
      )
    `;

    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        event_date TEXT,
        event_time TEXT,
        type TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createDiaryTable = `
      CREATE TABLE IF NOT EXISTS diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        entry_date TEXT,
        title TEXT,
        content TEXT,
        mood TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createChatSessionsTable = `
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createChatMessagesTable = `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id TEXT NOT NULL,
        is_ai INTEGER DEFAULT 0,
        message TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )
    `;

    const createChatHistoryTable = `
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        is_ai INTEGER DEFAULT 0
      )
    `;

    try {
      this.db.exec(createTasksTable);
      this.db.exec(createEventsTable);
      this.db.exec(createDiaryTable);
      this.db.exec(createChatSessionsTable);
      this.db.exec(createChatMessagesTable);
      this.db.exec(createChatHistoryTable);
      console.log("Tables created inline successfully");
    } catch (error) {
      console.error("Error creating tables inline:", error);
      throw error;
    }
  }

  /**
   * Retrieves ALL tasks for a specific user across all dates
   * @param {string} userId - The user identifier
   * @returns {Array} Array of all task objects for the user
   */
  getAllTasks(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE user_id = ? 
        ORDER BY task_date DESC, 
          CASE WHEN task_time IS NULL OR task_time = '' THEN 1 ELSE 0 END,
          task_time ASC
      `);

      const tasks = stmt.all(userId);

      // Convert SQLite integers back to booleans for JavaScript compatibility
      const convertedTasks = tasks.map((task) => ({
        ...task,
        completed: task.completed === 1,
        failed: task.failed === 1,
      }));

      return convertedTasks;
    } catch (error) {
      console.error("Error getting all tasks:", error);
      return [];
    }
  }

  /**
   * Retrieves tasks for a specific user and date
   * Automatically marks overdue tasks as failed based on current time
   * @param {string} userId - The user identifier
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} Array of task objects
   */
  getTasks(userId, date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE user_id = ? AND task_date = ? 
        ORDER BY 
          CASE WHEN task_time IS NULL OR task_time = '' THEN 1 ELSE 0 END,
          task_time ASC
      `);

      const tasks = stmt.all(userId, date);
      // Auto-mark overdue tasks as failed for better user experience
      if (tasks.length > 0) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD format

        let updatedCount = 0;

        tasks.forEach((task) => {
          // Only check tasks for TODAY that are overdue, not future dates
          if (
            task.task_date === currentDate &&
            !task.completed &&
            !task.failed &&
            task.task_time &&
            task.task_time !== "All day"
          ) {
            // time comparison instead of string comparison (This used to be a string comparison bug)
            const taskTimeMinutes = this.timeToMinutes(task.task_time);
            const currentTimeMinutes = this.timeToMinutes(currentTime);

            if (taskTimeMinutes < currentTimeMinutes) {
              console.log(
                `⏰ Auto-marking task "${task.title}" as failed (${task.task_time} < ${currentTime} on ${task.task_date})`,
              );

              // Mark as failed in database
              const updateStmt = this.db.prepare(`
                UPDATE tasks 
                SET failed = TRUE, updated_at = datetime('now') 
                WHERE id = ?
              `);
              updateStmt.run(task.id);

              // Update in memory for immediate UI feedback
              task.failed = true;
              updatedCount++;
            }
          }
        });

        if (updatedCount > 0) {
          console.log(
            `Auto-marked ${updatedCount} tasks as failed for ${date}`,
          );
        }
      }

      // Convert SQLite integers back to booleans for JavaScript compatibility
      const convertedTasks = tasks.map((task) => ({
        ...task,
        completed: task.completed === 1,
        failed: task.failed === 1,
      }));

      return convertedTasks;
    } catch (error) {
      console.error("Error getting tasks:", error);
      return [];
    }
  }

  /**
   * Retrieves all events for a specific user across all dates
   * @param {string} userId - The user identifier
   * @returns {Array} Array of event objects
   */
  getAllEvents(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM calendar_events 
        WHERE user_id = ? 
        ORDER BY event_date DESC, event_time ASC
      `);

      const events = stmt.all(userId);
      return events;
    } catch (error) {
      console.error("Error getting all events:", error);
      return [];
    }
  }

  /**
   * Retrieves all diary entries for a specific user across all dates
   * @param {string} userId - The user identifier
   * @returns {Array} Array of diary entry objects
   */
  getAllDiaryEntries(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM diary_entries 
        WHERE user_id = ? 
        ORDER BY entry_date DESC, id DESC
      `);

      const entries = stmt.all(userId);
      return entries;
    } catch (error) {
      console.error("Error getting all diary entries:", error);
      return [];
    }
  }

  /**
   * Sanitizes data for SQLite compatibility
   * Converts booleans to integers, undefined to null, objects to JSON
   * @param {Object} data - Raw data object
   * @returns {Object} Sanitized data object
   */
  sanitizeForSQLite(data) {
    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "boolean") {
        // SQLite stores booleans as integers
        sanitized[key] = value ? 1 : 0;
      } else if (value === undefined) {
        // Convert undefined to null for database storage
        sanitized[key] = null;
      } else if (typeof value === "object" && value !== null) {
        // Convert complex objects to JSON strings if needed
        sanitized[key] = JSON.stringify(value);
      } else {
        // Keep primitives as-is (string, number, null)
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Saves a new task to the database
   * Handles data type conversion and provides detailed error logging
   * @param {Object} task - Task object to save
   * @returns {Object} Saved task with generated ID
   */
  saveTask(task) {
    try {
      console.log("Attempting to save task:", task);

      // Convert data types for SQLite compatibility
      const sanitizedTask = {
        user_id: task.user_id || null,
        title: task.title || null,
        task_date: task.task_date || null,
        task_time: task.task_time || null,
        // Convert booleans to integers for SQLite
        completed: task.completed ? 1 : 0,
        failed: task.failed ? 1 : 0,
        // Handle optional fields
        task_type: task.task_type || null,
        due_date: task.due_date || null,
        last_reset_date: task.last_reset_date || null,
        status: task.status || null,
        recurring_id: task.recurring_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Sanitized task data:", sanitizedTask);

      const stmt = this.db.prepare(`
        INSERT INTO tasks (
          user_id, title, task_date, task_time, completed, failed,
          task_type, due_date, last_reset_date, status,
          recurring_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        sanitizedTask.user_id,
        sanitizedTask.title,
        sanitizedTask.task_date,
        sanitizedTask.task_time,
        sanitizedTask.completed,
        sanitizedTask.failed,
        sanitizedTask.task_type,
        sanitizedTask.due_date,
        sanitizedTask.last_reset_date,
        sanitizedTask.status,
        sanitizedTask.recurring_id,
        sanitizedTask.created_at,
        sanitizedTask.updated_at,
      );

      console.log("Task saved successfully with ID:", result.lastInsertRowid);
      return { id: result.lastInsertRowid, ...sanitizedTask };
    } catch (error) {
      console.error("Error saving task:", error);
      console.error("Problematic task data:", task);
      throw error;
    }
  }

  /**
   * Updates an existing task with new data
   * Handles partial updates and data type conversion
   * @param {number} id - Task ID to update
   * @param {Object} updates - Object containing fields to update
   * @returns {Object} Updated task data
   */ updateTask(id, updates) {
    try {
      console.log("Attempting to update task ID:", id, "with:", updates);

      // First, get the current task to check if it's a recurring task
      const getTaskStmt = this.db.prepare("SELECT * FROM tasks WHERE id = ?");
      const currentTask = getTaskStmt.get(id);

      if (!currentTask) {
        throw new Error(`No task found with ID: ${id}`);
      }

      // Sanitize all update values for SQLite compatibility
      const sanitizedUpdates = {};

      for (const [key, value] of Object.entries(updates)) {
        if (key === "completed" || key === "failed") {
          // Convert boolean to integer
          sanitizedUpdates[key] = value ? 1 : 0;
        } else if (value === undefined) {
          // Convert undefined to null
          sanitizedUpdates[key] = null;
        } else {
          sanitizedUpdates[key] = value;
        }
      }

      // Always update the timestamp for tracking purposes
      sanitizedUpdates.updated_at = new Date().toISOString();

      console.log("Sanitized updates:", sanitizedUpdates);

      // Build dynamic SQL query for partial updates
      const setClause = Object.keys(sanitizedUpdates)
        .map((key) => `${key} = ?`)
        .join(", ");

      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET ${setClause}
        WHERE id = ?
      `);

      const values = [...Object.values(sanitizedUpdates), id];
      console.log("SQL values:", values);

      const result = stmt.run(...values);
      if (result.changes === 0) {
        throw new Error(`No task found with ID: ${id}`);
      }

      console.log("Task updated successfully, changes:", result.changes);

      // Convert integer values back to booleans for the response
      const responseData = { id, ...sanitizedUpdates };
      if (responseData.completed !== undefined) {
        responseData.completed = responseData.completed === 1;
      }
      if (responseData.failed !== undefined) {
        responseData.failed = responseData.failed === 1;
      }

      return responseData;
    } catch (error) {
      console.error("Error updating task:", error);
      console.error("Problematic ID:", id, "Updates:", updates);
      throw error;
    }
  }

  /**
   * Deletes a task from the database
   * @param {number} id - Task ID to delete
   * @returns {Object} Success status and deletion confirmation
   */
  deleteTask(id) {
    try {
      const stmt = this.db.prepare("DELETE FROM tasks WHERE id = ?");
      const result = stmt.run(id);

      if (result.changes > 0) {
        console.log(`Task ${id} deleted successfully`);
        return { success: true, deleted: true };
      } else {
        console.log(`No task found with ID ${id}`);
        return { success: false, error: "Task not found" };
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }

  // RECURRING TASK OPERATIONS

  /**
   * Saves a new recurring task template
   * @param {Object} recurringTask - Recurring task template data
   * @returns {Object} Saved recurring task with generated ID
   */
  saveRecurringTask(recurringTask) {
    try {
      console.log("Saving recurring task template:", recurringTask);

      const sanitizedData = {
        user_id: recurringTask.user_id || null,
        task_title: recurringTask.task_title || null,
        task_time: recurringTask.task_time || null,
        weekdays: Array.isArray(recurringTask.weekdays)
          ? JSON.stringify(recurringTask.weekdays)
          : recurringTask.weekdays,
        is_active: recurringTask.is_active !== false ? 1 : 0,
        created_at: new Date().toISOString(),
      };

      const stmt = this.db.prepare(`
        INSERT INTO recurring_tasks (
          user_id, task_title, task_time, weekdays, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        sanitizedData.user_id,
        sanitizedData.task_title,
        sanitizedData.task_time,
        sanitizedData.weekdays,
        sanitizedData.is_active,
        sanitizedData.created_at,
      );

      console.log(
        "Recurring task template saved with ID:",
        result.lastInsertRowid,
      );
      return { id: result.lastInsertRowid, ...sanitizedData };
    } catch (error) {
      console.error("Error saving recurring task template:", error);
      throw error;
    }
  }

  /**
   * Retrieves all active recurring task templates for a user
   * @param {string} userId - The user identifier
   * @returns {Array} Array of active recurring task templates
   */
  getRecurringTasks(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM recurring_tasks 
        WHERE user_id = ? AND is_active = 1 
        ORDER BY created_at DESC
      `);

      const templates = stmt.all(userId);

      // Parse weekdays JSON for each template
      return templates.map((template) => ({
        ...template,
        weekdays: JSON.parse(template.weekdays || "[]"),
        is_active: template.is_active === 1,
      }));
    } catch (error) {
      console.error("Error getting recurring task templates:", error);
      return [];
    }
  }

  /**
   * Updates an existing recurring task template
   * @param {number} id - Recurring task template ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Success status
   */
  updateRecurringTask(id, updates) {
    try {
      console.log("Updating recurring task template ID:", id, "with:", updates);

      const sanitizedUpdates = {};

      for (const [key, value] of Object.entries(updates)) {
        if (key === "is_active") {
          sanitizedUpdates[key] = value ? 1 : 0;
        } else if (key === "weekdays" && Array.isArray(value)) {
          sanitizedUpdates[key] = JSON.stringify(value);
        } else if (value === undefined) {
          sanitizedUpdates[key] = null;
        } else {
          sanitizedUpdates[key] = value;
        }
      }

      const setClause = Object.keys(sanitizedUpdates)
        .map((key) => `${key} = ?`)
        .join(", ");

      const stmt = this.db.prepare(`
        UPDATE recurring_tasks 
        SET ${setClause}
        WHERE id = ?
      `);

      const values = [...Object.values(sanitizedUpdates), id];
      const result = stmt.run(...values);

      if (result.changes === 0) {
        throw new Error(`No recurring task template found with ID: ${id}`);
      }

      console.log("Recurring task template updated successfully");
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error("Error updating recurring task template:", error);
      throw error;
    }
  }

  /**
   * Deletes a recurring task template from the database
   * @param {number} id - Recurring task template ID to delete
   * @returns {Object} Success status and deletion confirmation
   */ deleteRecurringTask(id) {
    try {
      console.log("Deleting recurring task template ID:", id);

      // Start a transaction to delete both the template and all generated tasks
      const deleteTransaction = this.db.transaction(() => {
        // First, count how many tasks will be deleted for logging
        const countStmt = this.db.prepare(
          "SELECT COUNT(*) as count FROM tasks WHERE recurring_id = ?",
        );
        const taskCount = countStmt.get(id)?.count || 0;

        // Delete all tasks that were generated from this template in batches for better performance
        if (taskCount > 0) {
          console.log(
            `Preparing to delete ${taskCount} generated tasks from template ${id}`,
          );

          // Use a more efficient delete with LIMIT for very large datasets
          if (taskCount > 1000) {
            // For large datasets, delete in chunks to avoid locking issues
            let deleted = 0;
            const batchSize = 500;
            const deleteChunkStmt = this.db.prepare(`
              DELETE FROM tasks 
              WHERE id IN (
                SELECT id FROM tasks 
                WHERE recurring_id = ? 
                LIMIT ?
              )
            `);

            while (deleted < taskCount) {
              const result = deleteChunkStmt.run(id, batchSize);
              deleted += result.changes;
              if (result.changes === 0) break; // No more rows to delete
            }
            console.log(`Deleted ${deleted} tasks in batches`);
          } else {
            // For smaller datasets, delete all at once
            const deleteTasksStmt = this.db.prepare(
              "DELETE FROM tasks WHERE recurring_id = ?",
            );
            const taskResult = deleteTasksStmt.run(id);
            console.log(
              `Deleted ${taskResult.changes} generated tasks from template ${id}`,
            );
          }
        }

        // Then delete the recurring task template itself
        const deleteTemplateStmt = this.db.prepare(
          "DELETE FROM recurring_tasks WHERE id = ?",
        );
        const templateResult = deleteTemplateStmt.run(id);

        return { taskCount, templateResult };
      });

      const results = deleteTransaction();

      if (results.templateResult.changes > 0) {
        console.log(
          `Recurring task template ${id} and ${results.taskCount} generated tasks deleted successfully`,
        );
        return {
          success: true,
          deleted: true,
          changes: results.templateResult.changes,
          deletedTasks: results.taskCount,
        };
      } else {
        console.log(`No recurring task template found with ID ${id}`);
        return { success: false, error: "Recurring task template not found" };
      }
    } catch (error) {
      console.error("Error deleting recurring task template:", error);
      throw error;
    }
  }
  /**
   * Core auto-generation function: Creates task instances for active recurring templates
   * @param {string} userId - The user identifier
   * @param {string} targetDate - Target date in YYYY-MM-DD format (defaults to today)
   * @returns {Object} Generation results with counts and created tasks
   */
  generateRecurringTasks(userId, targetDate = null) {
    try {
      // Enhanced validation
      if (!userId) {
        throw new Error("User ID is required for recurring task generation");
      }

      // Use provided date or default to today
      const date = targetDate || new Date().toISOString().split("T")[0];

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date: ${date}`);
      }

      const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      console.log(
        `Generating recurring tasks for user ${userId} on ${date} (day ${dayOfWeek})`,
      );

      // Find active recurring templates for this user that include today's weekday
      const stmt = this.db.prepare(`
        SELECT * FROM recurring_tasks 
        WHERE user_id = ? AND is_active = 1
      `);

      const templates = stmt.all(userId);
      const eligibleTemplates = templates.filter((template) => {
        try {
          if (!template.weekdays) {
            console.warn(`Template ${template.id} has no weekdays defined`);
            return false;
          }

          const weekdays = JSON.parse(template.weekdays);

          if (!Array.isArray(weekdays)) {
            console.error(
              `Template ${template.id} has invalid weekdays format (not array)`,
            );
            return false;
          }

          if (
            weekdays.some(
              (day) => typeof day !== "number" || day < 0 || day > 6,
            )
          ) {
            console.error(
              `Template ${template.id} has invalid weekday values (must be 0-6)`,
            );
            return false;
          }

          return weekdays.includes(dayOfWeek);
        } catch (e) {
          console.error(
            `Error processing template ${template.id} weekdays:`,
            e,
          );
          return false;
        }
      });

      console.log(
        `Found ${eligibleTemplates.length} eligible templates for day ${dayOfWeek}`,
      );

      // Check which tasks already exist for this date
      const existingTasksStmt = this.db.prepare(`
        SELECT recurring_id FROM tasks 
        WHERE user_id = ? AND task_date = ? AND recurring_id IS NOT NULL
      `);

      const existingTasks = existingTasksStmt.all(userId, date);
      const existingRecurringIds = new Set(
        existingTasks.map((task) => task.recurring_id),
      ); // Filter out templates that already have tasks created for today
      const templatesNeedingTasks = eligibleTemplates.filter(
        (template) => !existingRecurringIds.has(template.id),
      );

      console.log(
        `${templatesNeedingTasks.length} templates need new tasks created`,
      );

      // Create task instances for templates that don't have tasks yet
      const createdTasks = [];
      const failedTasks = [];

      if (templatesNeedingTasks.length === 0) {
        console.log("No new recurring tasks needed for today");
        return {
          success: true,
          date: date,
          dayOfWeek: dayOfWeek,
          totalTemplates: templates.length,
          eligibleTemplates: eligibleTemplates.length,
          existingTasks: existingTasks.length,
          createdTasks: 0,
          failedTasks: 0,
          tasks: [],
        };
      }

      const insertTaskStmt = this.db.prepare(`
        INSERT INTO tasks (
          user_id, title, task_date, task_time, completed, failed,
          recurring_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)
      `);

      for (const template of templatesNeedingTasks) {
        try {
          // Enhanced validation for template
          if (!template.task_title || template.task_title.trim() === "") {
            console.warn(`Skipping template ${template.id}: Empty task title`);
            failedTasks.push({
              templateId: template.id,
              reason: "Empty task title",
            });
            continue;
          }

          // Validate task_time if provided
          if (
            template.task_time &&
            !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(template.task_time)
          ) {
            console.warn(
              `Skipping template ${template.id}: Invalid time format: ${template.task_time}`,
            );
            failedTasks.push({
              templateId: template.id,
              reason: `Invalid time format: ${template.task_time}`,
            });
            continue;
          }
          const now = new Date().toISOString();

          const result = insertTaskStmt.run(
            userId,
            template.task_title,
            date,
            template.task_time,
            template.id, // recurring_id
            now,
            now,
          );

          const newTask = {
            id: result.lastInsertRowid,
            user_id: userId,
            title: template.task_title,
            task_date: date,
            task_time: template.task_time,
            completed: false,
            failed: false,
            recurring_id: template.id,
            created_at: now,
            updated_at: now,
          };

          createdTasks.push(newTask);
          console.log(
            `Created recurring task: "${template.task_title}" with ID ${result.lastInsertRowid}`,
          );
        } catch (taskError) {
          console.error(
            `Failed to create task from template ${template.id}:`,
            taskError,
          );
          failedTasks.push({
            templateId: template.id,
            reason: taskError.message,
          });
        }
      }

      return {
        success: true,
        date: date,
        dayOfWeek: dayOfWeek,
        totalTemplates: templates.length,
        eligibleTemplates: eligibleTemplates.length,
        existingTasks: existingTasks.length,
        createdTasks: createdTasks.length,
        failedTasks: failedTasks.length,
        tasks: createdTasks,
        errors: failedTasks,
      };
    } catch (error) {
      console.error("Error generating recurring tasks:", error);
      return {
        success: false,
        date: targetDate || new Date().toISOString().split("T")[0],
        dayOfWeek: -1,
        totalTemplates: 0,
        eligibleTemplates: 0,
        existingTasks: 0,
        createdTasks: 0,
        failedTasks: 0,
        tasks: [],
        errors: [{ reason: error.message }],
      };
    }
  }

  /**
   * Handles recurring task completion/failure logic
   * When a recurring task is completed or failed, this can be used for cleanup
   * @param {number} taskId - The completed/failed task ID
   * @returns {Object} Success status and any follow-up actions
   */
  handleRecurringTaskCompletion(taskId) {
    try {
      // Get the task to check if it's recurring
      const taskStmt = this.db.prepare(`
        SELECT * FROM tasks WHERE id = ? AND recurring_id IS NOT NULL
      `);

      const task = taskStmt.get(taskId);

      if (!task) {
        return { success: false, message: "Task not found or not recurring" };
      }

      // For now, just log the completion
      // Future enhancement: Could trigger next occurrence generation (!not in orbital)
      console.log(
        `Recurring task completed: ${task.title} (recurring_id: ${task.recurring_id})`,
      );

      return {
        success: true,
        task: task,
        message: "Recurring task completion handled",
      };
    } catch (error) {
      console.error("Error handling recurring task completion:", error);
      throw error;
    }
  }

  /**
   * Retrieves calendar events for a specific user and date
   * @param {string} userId - The user identifier
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} Array of event objects sorted by time
   */
  getEvents(userId, date) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM calendar_events 
        WHERE user_id = ? AND event_date = ? 
        ORDER BY event_time ASC
      `);
      return stmt.all(userId, date);
    } catch (error) {
      console.error("Error getting events:", error);
      return [];
    }
  }

  /**
   * Updates an existing calendar event
   * @param {Object} event - Event object with id and updated fields
   * @returns {Object} Updated event data
   */
  updateEvent(event) {
    try {
      console.log("Attempting to update event ID:", event.id);

      if (!event.id) {
        throw new Error("Event ID is required for updates");
      }

      const sanitizedEvent = this.sanitizeForSQLite({
        title: event.title || null,
        event_date: event.event_date || null,
        event_time: event.event_time || null,
        type: event.type || null,
        description: event.description || null,
        updated_at: new Date().toISOString(),
      });

      const stmt = this.db.prepare(`
        UPDATE calendar_events 
        SET title = ?, event_date = ?, event_time = ?, type = ?, description = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `);

      const result = stmt.run(
        sanitizedEvent.title,
        sanitizedEvent.event_date,
        sanitizedEvent.event_time,
        sanitizedEvent.type,
        sanitizedEvent.description,
        sanitizedEvent.updated_at,
        event.id,
        event.user_id,
      );

      if (result.changes === 0) {
        throw new Error(`No event found with ID: ${event.id}`);
      }

      console.log("Event updated successfully, changes:", result.changes);
      return { id: event.id, ...sanitizedEvent, user_id: event.user_id };
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  }

  /**
   * Saves a new calendar event to the database
   * @param {Object} event - Event object to save
   * @returns {Object} Saved event with generated ID
   */
  saveEvent(event) {
    try {
      console.log("Attempting to save event:", event);

      // Use helper function for data sanitization
      const sanitizedEvent = this.sanitizeForSQLite({
        user_id: event.user_id || null,
        title: event.title || null,
        event_date: event.event_date || null,
        event_time: event.event_time || null,
        type: event.type || null,
        description: event.description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const stmt = this.db.prepare(`
        INSERT INTO calendar_events (
          user_id, title, event_date, event_time, type, description,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        sanitizedEvent.user_id,
        sanitizedEvent.title,
        sanitizedEvent.event_date,
        sanitizedEvent.event_time,
        sanitizedEvent.type,
        sanitizedEvent.description,
        sanitizedEvent.created_at,
        sanitizedEvent.updated_at,
      );

      console.log("Event saved successfully with ID:", result.lastInsertRowid);
      return { id: result.lastInsertRowid, ...sanitizedEvent };
    } catch (error) {
      console.error("Error saving event:", error);
      throw error;
    }
  }

  /**
   * Deletes a calendar event from the database
   * @param {number} id - Event ID to delete
   * @returns {Object} Success status and deletion confirmation
   */
  deleteEvent(id) {
    try {
      const stmt = this.db.prepare("DELETE FROM calendar_events WHERE id = ?");
      const result = stmt.run(id);
      return { success: result.changes > 0, deleted: result.changes > 0 };
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  }
  /**
   * Deletes a diary entry from the database
   * @param {number} id - Entry ID to delete
   * @returns {Object} Success status and deletion confirmation
   */
  deleteDiaryEntry(id) {
    try {
      console.log("LocalDataManager: Deleting diary entry:", id);

      const stmt = this.db.prepare("DELETE FROM diary_entries WHERE id = ?");
      const result = stmt.run(id);

      if (result.changes === 0) {
        throw new Error(`No diary entry found with id ${id}`);
      }

      console.log("LocalDataManager: Diary entry deleted successfully:", id);
      return { success: true, deletedId: id };
    } catch (error) {
      console.error("LocalDataManager: Error deleting diary entry:", error);
      throw error;
    }
  }
  /**
   * Retrieves diary entries for a user, optionally filtered by date
   * @param {string} userId - The user identifier
   * @param {string} date - Optional date filter in YYYY-MM-DD format
   * @returns {Array} Array of diary entries
   */
  getDiaryEntries(userId, date) {
    try {
      if (date) {
        // Get entries for specific date
        const stmt = this.db.prepare(`
          SELECT * FROM diary_entries 
          WHERE user_id = ? AND entry_date = ? 
          ORDER BY created_at DESC
        `);
        return stmt.all(userId, date);
      } else {
        // Get recent entries across all dates
        const stmt = this.db.prepare(`
          SELECT * FROM diary_entries 
          WHERE user_id = ? 
          ORDER BY entry_date DESC, created_at DESC 
          LIMIT 50
        `);
        return stmt.all(userId);
      }
    } catch (error) {
      console.error("Error getting diary entries:", error);
      return [];
    }
  }

  /**
   * Saves or updates a diary entry
   * Updates existing entry if ID provided, creates new entry otherwise
   * @param {Object} entry - Diary entry object
   * @returns {Object} Success status and entry ID
   */
  saveDiaryEntry(entry) {
    try {
      if (entry.id) {
        // Update existing entry
        const stmt = this.db.prepare(`
          UPDATE diary_entries 
          SET title = ?, content = ?, mood = ?, updated_at = datetime('now') 
          WHERE id = ? AND user_id = ?
        `);
        const result = stmt.run(
          entry.title,
          entry.content,
          entry.mood,
          entry.id,
          entry.user_id,
        );
        return { id: entry.id, success: result.changes > 0 };
      } else {
        // Create new entry
        const stmt = this.db.prepare(`
          INSERT INTO diary_entries (user_id, entry_date, title, content, mood, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        const result = stmt.run(
          entry.user_id,
          entry.entry_date,
          entry.title,
          entry.content,
          entry.mood,
        );
        return { id: result.lastInsertRowid, success: true };
      }
    } catch (error) {
      console.error("Error saving diary entry:", error);
      throw error;
    }
  }

  /**
   * Creates a new chat session for a user
   * @param {string} userId - The user identifier
   * @param {string} [title=null] - Optional title for the session
   * @returns {Object} Success status and session ID
   */
  createChatSession(userId, title = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO chat_sessions (user_id, title, started_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `);
      const result = stmt.run(userId, title);
      return { id: result.lastInsertRowid, success: true };
    } catch (error) {
      console.error("Error creating chat session:", error);
      throw error;
    }
  }

  /**
   * Retrieves the current active chat session for a user
   * @param {string} userId - The user identifier
   * @returns {Object|null} Current chat session data or null if none found
   */
  getCurrentChatSession(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_sessions 
        WHERE user_id = ? 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      return stmt.get(userId);
    } catch (error) {
      console.error("Error getting current chat session:", error);
      return null;
    }
  }

  /**
   * Saves a chat message to the database, associated with a session
   * @param {string} message - The chat message content
   * @param {boolean} isAi - Flag indicating if the message is from AI
   * @param {string} userId - The user identifier
   * @param {string|null} sessionId - Optional session ID, will create or use current session if not provided
   * @returns {Object} Saved message data including ID and session ID
   */
  saveChatMessage(message, isAi, userId, sessionId = null) {
    try {
      // If no session ID provided, get or create current session
      if (!sessionId) {
        let currentSession = this.getCurrentChatSession(userId);
        if (!currentSession) {
          const newSession = this.createChatSession(userId, "Chat Session");
          sessionId = newSession.id;
        } else {
          sessionId = currentSession.id;
        }
      }

      // Save to chat_history (for simple access)
      const historyStmt = this.db.prepare(`
        INSERT INTO chat_history (user_id, message, is_ai, timestamp)
        VALUES (?, ?, ?, datetime('now'))
      `);
      const historyResult = historyStmt.run(userId, message, isAi ? 1 : 0);

      // Also save to chat_messages (for session management)
      const messageStmt = this.db.prepare(`
        INSERT INTO chat_messages (session_id, user_id, message, is_ai, timestamp, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      const messageResult = messageStmt.run(
        sessionId,
        userId,
        message,
        isAi ? 1 : 0,
      );

      // Update session timestamp
      const updateSessionStmt = this.db.prepare(`
        UPDATE chat_sessions 
        SET updated_at = datetime('now') 
        WHERE id = ?
      `);
      updateSessionStmt.run(sessionId);

      return {
        id: historyResult.lastInsertRowid,
        session_id: sessionId,
        success: true,
      };
    } catch (error) {
      console.error("Error saving chat message:", error);
      throw error;
    }
  }

  /**
   * Retrieves chat history for a user, with optional session info
   * @param {string} userId - The user identifier
   * @param {number} [limit=50] - Optional limit on number of messages
   * @returns {Array} Array of chat history objects
   */
  getChatHistory(userId, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT h.*, s.id as session_id, s.title as session_title
        FROM chat_history h
        LEFT JOIN chat_sessions s ON s.user_id = h.user_id
        WHERE h.user_id = ? 
        ORDER BY h.timestamp ASC 
        LIMIT ?
      `);
      return stmt.all(userId, limit);
    } catch (error) {
      console.error("Error getting chat history:", error);
      return [];
    }
  }

  /**
   * Retrieves all chat sessions for a user, with message count
   * @param {string} userId - The user identifier
   * @returns {Array} Array of chat session objects
   */
  getChatSessions(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT s.*, COUNT(m.id) as message_count
        FROM chat_sessions s
        LEFT JOIN chat_messages m ON s.id = m.session_id
        WHERE s.user_id = ?
        GROUP BY s.id
        ORDER BY s.updated_at DESC
      `);
      return stmt.all(userId);
    } catch (error) {
      console.error("Error getting chat sessions:", error);
      return [];
    }
  }

  /**
   * Retrieves all messages for a specific chat session
   * @param {string} sessionId - The session identifier
   * @returns {Array} Array of message objects
   */
  getSessionMessages(sessionId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
      `);
      return stmt.all(sessionId);
    } catch (error) {
      console.error("Error getting session messages:", error);
      return [];
    }
  }

  /**
   * Retrieves storage statistics for a user
   * @param {string} userId - The user identifier
   * @returns {Object} Storage statistics including counts of tasks, events, diary entries, and chat messages
   */
  getStorageStats(userId) {
    try {
      const stats = {};

      // Count tasks
      const tasksStmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE user_id = ?",
      );
      stats.total_tasks = tasksStmt.get(userId).count;

      // Count events
      const eventsStmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM calendar_events WHERE user_id = ?",
      );
      stats.total_events = eventsStmt.get(userId).count;

      // Count diary entries
      const diaryStmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM diary_entries WHERE user_id = ?",
      );
      stats.total_diary_entries = diaryStmt.get(userId).count;

      // Count chat messages
      const chatStmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM chat_history WHERE user_id = ?",
      );
      stats.total_chat_messages = chatStmt.get(userId).count;

      return stats;
    } catch (error) {
      console.error("Error getting storage stats:", error);
      return {};
    }
  }

  /**
   * Retrieves quick prompts for a user, sorted by usage
   * @param {string} userId - The user identifier
   * @returns {Array} Array of quick prompt objects
   */
  getQuickPrompts(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_quick_prompts 
        WHERE user_id = ? 
        ORDER BY usage_count DESC, last_used_at DESC 
        LIMIT 4
      `);
      return stmt.all(userId);
    } catch (error) {
      console.error("Error getting quick prompts:", error);
      return [];
    }
  }

  /**
   * Saves a new quick prompt for a user
   * @param {string} userId - The user identifier
   * @param {string} promptText - The prompt text
   * @returns {Object} Success status and prompt ID
   */
  saveQuickPrompt(userId, promptText) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO chat_quick_prompts (user_id, prompt_text, created_at, last_used_at, usage_count)
        VALUES (?, ?, datetime('now'), datetime('now'), 0)
      `);
      const result = stmt.run(userId, promptText);
      return { id: result.lastInsertRowid, success: true };
    } catch (error) {
      console.error("Error saving quick prompt:", error);
      throw error;
    }
  }

  /**
   * Deletes a quick prompt by ID
   * @param {number} promptId - The prompt ID to delete
   * @returns {Object} Success status
   */
  deleteQuickPrompt(promptId) {
    try {
      const stmt = this.db.prepare(
        "DELETE FROM chat_quick_prompts WHERE id = ?",
      );
      const result = stmt.run(promptId);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error("Error deleting quick prompt:", error);
      throw error;
    }
  }

  /**
   * Increments the usage count of a quick prompt
   * @param {number} promptId - The prompt ID to update
   * @returns {Object} Success status
   */
  updateQuickPromptUsage(promptId) {
    try {
      const stmt = this.db.prepare(`
        UPDATE chat_quick_prompts 
        SET usage_count = usage_count + 1, last_used_at = datetime('now') 
        WHERE id = ?
      `);
      const result = stmt.run(promptId);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error("Error updating quick prompt usage:", error);
      throw error;
    }
  }

  /**
   * Retrieves downloaded models for a user, sorted by download date
   * @param {string} userId - The user identifier
   * @returns {Array} Array of downloaded model objects
   */
  getDownloadedModels(userId) {
    try {
      console.log(`Getting downloaded models for user: ${userId}`);
      const stmt = this.db.prepare(
        "SELECT * FROM downloaded_models WHERE user_id = ? ORDER BY download_date DESC",
      );
      const results = stmt.all(userId);
      console.log(`Found ${results.length} downloaded models in database`);
      return results;
    } catch (error) {
      console.error("Database Error - getDownloadedModels:", error);
      return [];
    }
  }

  /**
   * Saves or updates a downloaded model for a user
   * @param {string} userId - The user identifier
   * @param {Object} modelData - Model data including name, size, and status
   * @returns {Object} Success status and model ID
   */
  saveDownloadedModel(userId, modelData) {
    try {
      console.log(`Saving downloaded model for user: ${userId}`, modelData);
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO downloaded_models (user_id, model_name, size_mb, status, download_date)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        userId,
        modelData.model_name,
        modelData.size_mb || 0,
        modelData.status || "completed",
        new Date().toISOString(),
      );
      console.log(
        `Saved downloaded model: ${modelData.model_name} with ID ${result.lastInsertRowid}`,
      );
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error("Database Error - saveDownloadedModel:", error);
      throw error;
    }
  }

  /**
   * Deletes a downloaded model for a user
   * @param {string} userId - The user identifier
   * @param {string} modelName - The model name to delete
   * @returns {Object} Success status
   */
  deleteDownloadedModel(userId, modelName) {
    try {
      console.log(
        `Deleting downloaded model for user: ${userId}, model: ${modelName}`,
      );
      const stmt = this.db.prepare(
        "DELETE FROM downloaded_models WHERE user_id = ? AND model_name = ?",
      );
      const result = stmt.run(userId, modelName);
      console.log(`Deleted model: ${modelName}, changes: ${result.changes}`);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error("Database Error - deleteDownloadedModel:", error);
      throw error;
    }
  }

  /**
   * Retrieves user settings for a specific user
   * @param {string} userId - The user identifier
   * @returns {Object} User settings object
   */
  getUserSettings(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM user_settings WHERE user_id = ?
      `);
      const result = stmt.get(userId);

      // Convert integers back to booleans
      if (result) {
        result.ai_model_auto_selected = result.ai_model_auto_selected === 1;
        result.notifications_enabled = result.notifications_enabled === 1;
      }

      return result || {};
    } catch (error) {
      console.error("Error getting user settings:", error);
      return {};
    }
  }

  /**
   * Saves user settings, inserting or updating as necessary
   * @param {string} userId - The user identifier
   * @param {Object} settings - Settings object containing user preferences
   * @returns {Object} Success status
   */
  saveUserSettings(userId, settings) {
    try {
      // Check if settings exist
      const existing = this.getUserSettings(userId);

      if (Object.keys(existing).length > 0) {
        // Update existing settings
        const updates = [];
        const values = [];

        Object.keys(settings).forEach((key) => {
          updates.push(`${key} = ?`);
          // Convert booleans to integers for SQLite
          const value =
            typeof settings[key] === "boolean"
              ? settings[key]
                ? 1
                : 0
              : settings[key];
          values.push(value);
        });

        values.push(userId);

        const stmt = this.db.prepare(`
          UPDATE user_settings 
          SET ${updates.join(", ")}, updated_at = datetime('now')
          WHERE user_id = ?
        `);
        stmt.run(...values);
      } else {
        // Insert new settings
        const stmt = this.db.prepare(`
          INSERT INTO user_settings (
            user_id, ai_model, ai_model_auto_selected, theme, notifications_enabled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        stmt.run(
          userId,
          settings.ai_model || "llama3.2:1b",
          settings.ai_model_auto_selected ? 1 : 0,
          settings.theme || "dark",
          settings.notifications_enabled ? 1 : 0,
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving user settings:", error);
      throw error;
    }
  }
  /**
   * Safely closes the database connection with enhanced cleanup
   * Should be called when shutting down the application
   */
  close() {
    if (this.db) {
      try {
        // Ensure all pending transactions are complete
        this.db.pragma("optimize");

        // Checkpoint WAL to main database file
        this.db.pragma("wal_checkpoint(TRUNCATE)");

        // Close the database connection
        this.db.close();
        console.log("Database connection closed successfully with cleanup");

        this.db = null;
      } catch (error) {
        console.error("Error during database close:", error);

        // Force close if needed
        if (this.db) {
          try {
            this.db.close();
            this.db = null;
          } catch (forceError) {
            console.error("Error during force close:", forceError);
          }
        }
      }
    }
  }
  /**
   * Deletes all chat history for a user
   * @param {string} userId - The user identifier
   * @returns {Object} Success status and count of deleted entries
   */
  clearChatHistory(userId) {
    try {
      console.log(`Clearing chat history for user: ${userId}`);

      // Begin a transaction to ensure all operations succeed or fail together
      this.db.exec("BEGIN TRANSACTION");

      // Delete from chat_history table
      const historyStmt = this.db.prepare(
        "DELETE FROM chat_history WHERE user_id = ?",
      );
      const historyResult = historyStmt.run(userId);

      // Delete messages from all sessions for this user
      const messagesStmt = this.db.prepare(`
        DELETE FROM chat_messages 
        WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = ?)
      `);
      const messagesResult = messagesStmt.run(userId);

      // Delete all sessions for this user
      const sessionsStmt = this.db.prepare(
        "DELETE FROM chat_sessions WHERE user_id = ?",
      );
      const sessionsResult = sessionsStmt.run(userId);

      // Commit the transaction
      this.db.exec("COMMIT");

      console.log(
        `Chat history cleared successfully for ${userId}. Deleted: ` +
          `${historyResult.changes} history entries, ` +
          `${messagesResult.changes} messages, ` +
          `${sessionsResult.changes} sessions`,
      );
      return {
        success: true,
        deletedHistoryCount: historyResult.changes,
        deletedMessagesCount: messagesResult.changes,
        deletedSessionsCount: sessionsResult.changes,
      };
    } catch (error) {
      // Rollback on error
      this.db.exec("ROLLBACK");
      console.error("Error clearing chat history:", error);
      throw error;
    }
  }

  /**
   * Helper function: Converts time string (HH:MM) to minutes since midnight
   * Used for proper time comparison instead of string comparison
   * @param {string} timeStr - Time in HH:MM format (e.g., "09:30")
   * @returns {number} Minutes since midnight
   */
  timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return 0;

    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;

    return hours * 60 + minutes;
  }

  // ============================================================================
  // USER AUTHENTICATION METHODS - Hybrid Online/Offline System
  // ============================================================================

  /**
   * Store user credentials locally for offline authentication
   * Only stores the current device user - not all users
   */
  storeUserCredentials(userId, userData) {
    try {
      const query = this.db.prepare(`
        INSERT OR REPLACE INTO users 
        (id, username, email, name, password, created_at, updated_at, last_synced_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = query.run(
        userId,
        userData.username,
        userData.email,
        userData.name,
        userData.password,
        userData.created_at,
        userData.updated_at,
        userData.last_synced_at,
      );

      console.log(`User credentials stored locally for user: ${userId}`);
      return result;
    } catch (error) {
      console.error("Error storing user credentials:", error);
      throw error;
    }
  }

  /**
   * Get user credentials for offline authentication
   * Returns null if user not found
   */
  getUserCredentials(username, password) {
    try {
      const query = this.db.prepare(`
        SELECT id, username, email, name, password, created_at, updated_at, last_synced_at
        FROM users 
        WHERE username = ? AND password = ?
      `);

      const user = query.get(username, password);

      if (user) {
        console.log(
          `User credentials retrieved for offline login: ${username}`,
        );
        return user;
      }

      return null;
    } catch (error) {
      console.error("Error getting user credentials:", error);
      throw error;
    }
  }

  /**
   * Check if a username exists in local SQLite database
   * Used for offline registration to prevent duplicate usernames
   * Returns true if username exists, false if available
   */
  usernameExistsLocally(username) {
    try {
      const query = this.db.prepare(`
        SELECT username
        FROM users 
        WHERE username = ?
      `);

      const user = query.get(username);
      const exists = user !== undefined;

      console.log(`Username '${username}' exists locally: ${exists}`);
      return exists;
    } catch (error) {
      console.error("Error checking username existence:", error);
      throw error;
    }
  }

  /**
   * Check if user needs to sync to Supabase
   * Returns true if local changes need to be pushed to cloud
   */
  userNeedsSync(userId) {
    try {
      const query = this.db.prepare(`
        SELECT updated_at, last_synced_at 
        FROM users 
        WHERE id = ?
      `);

      const user = query.get(userId);

      if (!user) return false;

      // If never synced OR updated after last sync
      const needsSync =
        !user.last_synced_at ||
        new Date(user.updated_at) > new Date(user.last_synced_at);

      console.log(`User ${userId} needs sync: ${needsSync}`);
      return needsSync;
    } catch (error) {
      console.error("Error checking user sync status:", error);
      return false;
    }
  }

  /**
   * Update user sync timestamp after successful cloud sync
   */
  markUserSynced(userId) {
    try {
      const query = this.db.prepare(`
        UPDATE users 
        SET last_synced_at = ? 
        WHERE id = ?
      `);

      const result = query.run(new Date().toISOString(), userId);

      console.log(`User ${userId} marked as synced`);
      return result;
    } catch (error) {
      console.error("Error marking user as synced:", error);
      throw error;
    }
  }

  /**
   * Get current user stored locally (should only be one per device)
   */
  getCurrentUser() {
    try {
      const query = this.db.prepare(`
        SELECT id, username, email, name, created_at, updated_at, last_synced_at
        FROM users 
        LIMIT 1
      `);

      const user = query.get();

      if (user) {
        console.log(`Current user retrieved: ${user.username}`);
        return user;
      }

      console.log("No current user found locally");
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      throw error;
    }
  }

  /**
   * Clear local user credentials (for logout)
   */
  clearUserCredentials() {
    try {
      const query = this.db.prepare("DELETE FROM users");
      const result = query.run();

      console.log("Local user credentials cleared");
      return result;
    } catch (error) {
      console.error("Error clearing user credentials:", error);
      throw error;
    }
  }

  /**
   * Get user by ID from local database
   */
  getUserById(userId) {
    try {
      const query = this.db.prepare(`
        SELECT id, username, email, name, password, created_at, updated_at, last_synced_at
        FROM users 
        WHERE id = ?
      `);

      const user = query.get(userId);

      if (user) {
        console.log(`User retrieved by ID: ${user.username} (${userId})`);
        return user;
      }

      console.log(`No user found with ID: ${userId}`);
      return null;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }
}

module.exports = { LocalDataManager };
