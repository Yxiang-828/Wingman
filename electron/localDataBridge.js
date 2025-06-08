const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const { app, ipcMain } = require('electron');

/**
 * LocalDataManager handles all SQLite database operations for Wingman
 * Manages tasks, events, diary entries, chat history, and user settings
 * Uses better-sqlite3 for synchronous database operations with better performance
 */
class LocalDataManager {
  constructor() {
    // Determine database location in user data directory
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'wingman-data');
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.join(dataDir, 'wingman.db');
    console.log('LocalDataManager initializing database at:', this.dbPath);
    
    try {
      this.db = new Database(this.dbPath);
      this.initializeDatabase();
      console.log('SQLite database initialized successfully');
    } catch (err) {
      console.error('Error initializing SQLite database:', err);
      throw err;
    }
  }

  /**
   * Initializes database schema and performs necessary migrations
   * Attempts to load schema from file, falls back to inline creation
   */
  initializeDatabase() {
    // Enable foreign key constraints for data integrity
    this.db.pragma('foreign_keys = ON');
    
    // Try to load schema from multiple possible locations
    const schemaPaths = [
      path.join(__dirname, '..', 'src', 'storage', 'schema.sql'),
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, '..', 'schema.sql')
    ];
    
    let schemaLoaded = false;
    
    for (const schemaPath of schemaPaths) {
      if (fs.existsSync(schemaPath)) {
        console.log('Loading schema from', schemaPath);
        const schema = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schema);
        schemaLoaded = true;
        break;
      }
    }
    
    // Create tables programmatically if no schema file found
    if (!schemaLoaded) {
      console.log('No schema file found, creating tables inline');
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
      const hasFailedColumn = tableInfo.some(column => column.name === 'failed');
      
      if (!hasFailedColumn) {
        console.log('Adding failed column to tasks table');
        this.db.exec('ALTER TABLE tasks ADD COLUMN failed BOOLEAN DEFAULT FALSE');
      }

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
          ai_model_auto_selected BOOLEAN DEFAULT FALSE,
          theme TEXT DEFAULT 'dark',
          background TEXT DEFAULT 'default',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure chat quick prompts table exists
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

    } catch (error) {
      console.error('Migration error:', error);
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
        completed BOOLEAN DEFAULT FALSE,
        failed BOOLEAN DEFAULT FALSE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        task_type TEXT,
        due_date TEXT,
        last_reset_date TEXT,
        urgency_level INTEGER,
        status TEXT
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
        is_ai BOOLEAN DEFAULT FALSE,
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
        is_ai BOOLEAN DEFAULT FALSE
      )
    `;

    try {
      this.db.exec(createTasksTable);
      this.db.exec(createEventsTable);
      this.db.exec(createDiaryTable);
      this.db.exec(createChatSessionsTable);
      this.db.exec(createChatMessagesTable);
      this.db.exec(createChatHistoryTable);
      console.log('Tables created inline successfully');
    } catch (error) {
      console.error('Error creating tables inline:', error);
      throw error;
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
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        let updatedCount = 0;
        
        tasks.forEach(task => {
          // Only check tasks for today or past dates that aren't completed or already failed
          if (task.task_date <= currentDate && 
              !task.completed && !task.failed && task.task_time && 
              task.task_time !== 'All day' && task.task_time <= currentTime) {
            
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
        });
        
        if (updatedCount > 0) {
          console.log(`Auto-marked ${updatedCount} tasks as failed for ${date}`);
        }
      }
      
      return tasks;
      
    } catch (error) {
      console.error('Error getting tasks:', error);
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
      if (typeof value === 'boolean') {
        // SQLite stores booleans as integers
        sanitized[key] = value ? 1 : 0;
      } else if (value === undefined) {
        // Convert undefined to null for database storage
        sanitized[key] = null;
      } else if (typeof value === 'object' && value !== null) {
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
      console.log('Attempting to save task:', task);
      
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
        urgency_level: task.urgency_level || null,
        status: task.status || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Sanitized task data:', sanitizedTask);

      const stmt = this.db.prepare(`
        INSERT INTO tasks (
          user_id, title, task_date, task_time, completed, failed,
          task_type, due_date, last_reset_date, urgency_level, status,
          created_at, updated_at
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
        sanitizedTask.urgency_level,
        sanitizedTask.status,
        sanitizedTask.created_at,
        sanitizedTask.updated_at
      );

      console.log('Task saved successfully with ID:', result.lastInsertRowid);
      return { id: result.lastInsertRowid, ...sanitizedTask };

    } catch (error) {
      console.error('Error saving task:', error);
      console.error('Problematic task data:', task);
      throw error;
    }
  }

  /**
   * Updates an existing task with new data
   * Handles partial updates and data type conversion
   * @param {number} id - Task ID to update
   * @param {Object} updates - Object containing fields to update
   * @returns {Object} Updated task data
   */
  updateTask(id, updates) {
    try {
      console.log('Attempting to update task ID:', id, 'with:', updates);

      // Sanitize all update values for SQLite compatibility
      const sanitizedUpdates = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'completed' || key === 'failed') {
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

      console.log('Sanitized updates:', sanitizedUpdates);

      // Build dynamic SQL query for partial updates
      const setClause = Object.keys(sanitizedUpdates)
        .map(key => `${key} = ?`)
        .join(', ');

      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET ${setClause}
        WHERE id = ?
      `);

      const values = [...Object.values(sanitizedUpdates), id];
      console.log('SQL values:', values);

      const result = stmt.run(...values);

      if (result.changes === 0) {
        throw new Error(`No task found with ID: ${id}`);
      }

      console.log('Task updated successfully, changes:', result.changes);
      return { id, ...sanitizedUpdates };

    } catch (error) {
      console.error('Error updating task:', error);
      console.error('Problematic ID:', id, 'Updates:', updates);
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
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes > 0) {
        console.log(`Task ${id} deleted successfully`);
        return { success: true, deleted: true };
      } else {
        console.log(`No task found with ID ${id}`);
        return { success: false, error: 'Task not found' };
      }
      
    } catch (error) {
      console.error('Error deleting task:', error);
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
      console.error('Error getting events:', error);
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
      console.log('Attempting to update event ID:', event.id);
      
      if (!event.id) {
        throw new Error('Event ID is required for updates');
      }

      const sanitizedEvent = this.sanitizeForSQLite({
        title: event.title || null,
        event_date: event.event_date || null,
        event_time: event.event_time || null,
        type: event.type || null,
        description: event.description || null,
        updated_at: new Date().toISOString()
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
        event.user_id
      );

      if (result.changes === 0) {
        throw new Error(`No event found with ID: ${event.id}`);
      }

      console.log('Event updated successfully, changes:', result.changes);
      return { id: event.id, ...sanitizedEvent, user_id: event.user_id };

    } catch (error) {
      console.error('Error updating event:', error);
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
      console.log('Attempting to save event:', event);
      
      // Use helper function for data sanitization
      const sanitizedEvent = this.sanitizeForSQLite({
        user_id: event.user_id || null,
        title: event.title || null,
        event_date: event.event_date || null,
        event_time: event.event_time || null,
        type: event.type || null,
        description: event.description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
        sanitizedEvent.updated_at
      );

      console.log('Event saved successfully with ID:', result.lastInsertRowid);
      return { id: result.lastInsertRowid, ...sanitizedEvent };

    } catch (error) {
      console.error('Error saving event:', error);
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
      const stmt = this.db.prepare('DELETE FROM calendar_events WHERE id = ?');
      const result = stmt.run(id);
      return { success: result.changes > 0, deleted: result.changes > 0 };
    } catch (error) {
      console.error('Error deleting event:', error);
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
      console.error('Error getting diary entries:', error);
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
        const result = stmt.run(entry.title, entry.content, entry.mood, entry.id, entry.user_id);
        return { id: entry.id, success: result.changes > 0 };
      } else {
        // Create new entry
        const stmt = this.db.prepare(`
          INSERT INTO diary_entries (user_id, entry_date, title, content, mood, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        const result = stmt.run(entry.user_id, entry.entry_date, entry.title, entry.content, entry.mood);
        return { id: result.lastInsertRowid, success: true };
      }
    } catch (error) {
      console.error('Error saving diary entry:', error);
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
      console.error('Error creating chat session:', error);
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
      console.error('Error getting current chat session:', error);
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
          const newSession = this.createChatSession(userId, 'Chat Session');
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
      const messageResult = messageStmt.run(sessionId, userId, message, isAi ? 1 : 0);

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
        success: true 
      };
    } catch (error) {
      console.error('Error saving chat message:', error);
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
      console.error('Error getting chat history:', error);
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
      console.error('Error getting chat sessions:', error);
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
      console.error('Error getting session messages:', error);
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
      const tasksStmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?');
      stats.total_tasks = tasksStmt.get(userId).count;
      
      // Count events
      const eventsStmt = this.db.prepare('SELECT COUNT(*) as count FROM calendar_events WHERE user_id = ?');
      stats.total_events = eventsStmt.get(userId).count;
      
      // Count diary entries
      const diaryStmt = this.db.prepare('SELECT COUNT(*) as count FROM diary_entries WHERE user_id = ?');
      stats.total_diary_entries = diaryStmt.get(userId).count;
      
      // Count chat messages
      const chatStmt = this.db.prepare('SELECT COUNT(*) as count FROM chat_history WHERE user_id = ?');
      stats.total_chat_messages = chatStmt.get(userId).count;
      
      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
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
      console.error('Error getting quick prompts:', error);
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
      console.error('Error saving quick prompt:', error);
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
      const stmt = this.db.prepare('DELETE FROM chat_quick_prompts WHERE id = ?');
      const result = stmt.run(promptId);
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error deleting quick prompt:', error);
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
      console.error('Error updating quick prompt usage:', error);
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
      console.log(`📊 Getting downloaded models for user: ${userId}`);
      const stmt = this.db.prepare('SELECT * FROM downloaded_models WHERE user_id = ? ORDER BY download_date DESC');
      const results = stmt.all(userId);
      console.log(`📊 Found ${results.length} downloaded models in database`);
      return results;
    } catch (error) {
      console.error('❌ Database Error - getDownloadedModels:', error);
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
      console.log(`💾 Saving downloaded model for user: ${userId}`, modelData);
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO downloaded_models (user_id, model_name, size_mb, status, download_date)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        userId, 
        modelData.model_name, 
        modelData.size_mb || 0, 
        modelData.status || 'completed', 
        new Date().toISOString()
      );
      console.log(`✅ Saved downloaded model: ${modelData.model_name} with ID ${result.lastInsertRowid}`);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('❌ Database Error - saveDownloadedModel:', error);
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
      console.log(`🗑️ Deleting downloaded model for user: ${userId}, model: ${modelName}`);
      const stmt = this.db.prepare('DELETE FROM downloaded_models WHERE user_id = ? AND model_name = ?');
      const result = stmt.run(userId, modelName);
      console.log(`✅ Deleted model: ${modelName}, changes: ${result.changes}`);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('❌ Database Error - deleteDownloadedModel:', error);
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
      console.error('Error getting user settings:', error);
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
        
        Object.keys(settings).forEach(key => {
          updates.push(`${key} = ?`);
          // Convert booleans to integers for SQLite
          const value = typeof settings[key] === 'boolean' ? (settings[key] ? 1 : 0) : settings[key];
          values.push(value);
        });
        
        values.push(userId);
        
        const stmt = this.db.prepare(`
          UPDATE user_settings 
          SET ${updates.join(', ')}, updated_at = datetime('now')
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
          settings.ai_model || 'llama3.2:1b',
          settings.ai_model_auto_selected ? 1 : 0,
          settings.theme || 'dark',
          settings.notifications_enabled ? 1 : 0
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }

  /**
   * Safely closes the database connection
   * Should be called when shutting down the application
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed successfully');
    }
  }
}

module.exports = { LocalDataManager };