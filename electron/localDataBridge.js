// Pure JavaScript implementation of LocalDataManager for Electron main process
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const { app } = require('electron');

class LocalDataManager {
  constructor() {
    // Get user data directory from Electron
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'wingman-data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.join(dataDir, 'wingman.db');
    console.log(`📦 LocalDataManager initializing database at: ${this.dbPath}`);
    
    try {
      this.db = new Database(this.dbPath);
      this.initializeDatabase();
      console.log('✅ SQLite database initialized successfully');
    } catch (err) {
      console.error('❌ Error initializing SQLite database:', err);
      throw err;
    }
  }

  initializeDatabase() {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Use the schema.sql file
    const schemaPath = path.join(__dirname, '..', 'src', 'storage', 'schema.sql');
    
    try {
      if (fs.existsSync(schemaPath)) {
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schemaSQL);
        console.log('✅ Database schema initialized from schema.sql');
      } else {
        console.warn('⚠️ schema.sql not found, using inline schema');
        this.createTablesInline();
      }
    } catch (error) {
      console.error('❌ Error loading schema:', error);
      this.createTablesInline();
    }
  }

  createTablesInline() {
    // Fallback schema creation matching your schema.sql
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        task_date TEXT,
        task_time TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        task_type TEXT,
        due_date TEXT,
        last_reset_date TEXT,
        urgency_level INTEGER,
        status TEXT
      );

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
      );

      CREATE TABLE IF NOT EXISTS diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        entry_date TEXT,
        title TEXT,
        content TEXT,
        mood TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id TEXT NOT NULL,
        is_ai BOOLEAN DEFAULT FALSE,
        message TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        is_ai BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
      CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);
      CREATE INDEX IF NOT EXISTS idx_diary_user_id ON diary_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
    `);
    console.log('✅ Tables created with inline schema');
  }

  // TASKS
  getTasks(userId, date) {
    try {
      console.log(`📊 Getting tasks for user ${userId}${date ? ` on ${date}` : ''}`);
      const query = date 
        ? 'SELECT * FROM tasks WHERE user_id = ? AND task_date = ? ORDER BY created_at DESC'
        : 'SELECT * FROM tasks WHERE user_id = ? ORDER BY task_date DESC, created_at DESC';
      
      const stmt = this.db.prepare(query);
      const rows = date ? stmt.all(userId, date) : stmt.all(userId);
      
      // Convert SQLite boolean (0/1) to JavaScript boolean
      return rows.map(row => ({
        ...row,
        completed: !!row.completed
      }));
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  saveTask(task) {
    try {
      if (task.id) {
        // Update existing task
        const keys = Object.keys(task)
          .filter(key => key !== 'id' && key !== 'isProcessing')
          .map(key => `${key} = @${key}`)
          .join(', ');
        
        // Add updated_at
        const updateQuery = `
          UPDATE tasks 
          SET ${keys}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = @id
        `;
        
        const updateStmt = this.db.prepare(updateQuery);
        updateStmt.run(task);
        
        // Return updated task
        const getStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const updatedTask = getStmt.get(task.id);
        
        return {
          ...updatedTask,
          completed: !!updatedTask.completed
        };
      } else {
        // Create new task
        const { isProcessing, ...taskData } = task; // Remove processing flag if present
        
        const columns = Object.keys(taskData).join(', ');
        const values = Object.keys(taskData)
          .map(key => `@${key}`)
          .join(', ');
        
        const insertQuery = `
          INSERT INTO tasks (${columns}) 
          VALUES (${values})
        `;
        
        const insertStmt = this.db.prepare(insertQuery);
        const result = insertStmt.run(taskData);
        
        // Return created task with ID
        const getStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const createdTask = getStmt.get(result.lastInsertRowid);
        
        return {
          ...createdTask,
          completed: !!createdTask.completed
        };
      }
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  }

  updateTask(id, updates) {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'isProcessing')
        .map(key => `${key} = @${key}`)
        .join(', ');
      
      if (!setClause) {
        throw new Error("No valid fields to update");
      }
      
      const updateQuery = `
        UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = @id
      `;
      
      const updateStmt = this.db.prepare(updateQuery);
      updateStmt.run({ ...updates, id });
      
      // Return updated task
      const getStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
      const updatedTask = getStmt.get(id);
      
      if (updatedTask) {
        return {
          ...updatedTask,
          completed: !!updatedTask.completed
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  deleteTask(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // CALENDAR EVENTS
  getEvents(userId, date) {
    try {
      const query = date 
        ? 'SELECT * FROM calendar_events WHERE user_id = ? AND event_date = ? ORDER BY event_time'
        : 'SELECT * FROM calendar_events WHERE user_id = ? ORDER BY event_date DESC, event_time';
      
      const stmt = this.db.prepare(query);
      const rows = date ? stmt.all(userId, date) : stmt.all(userId);
      
      return rows;
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  saveEvent(event) {
    try {
      if (event.id) {
        // Update existing event
        const keys = Object.keys(event)
          .filter(key => key !== 'id')
          .map(key => `${key} = @${key}`)
          .join(', ');
        
        // Add updated_at
        const updateQuery = `
          UPDATE calendar_events 
          SET ${keys}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = @id
        `;
        
        const updateStmt = this.db.prepare(updateQuery);
        updateStmt.run(event);
        
        // Return updated event
        const getStmt = this.db.prepare('SELECT * FROM calendar_events WHERE id = ?');
        return getStmt.get(event.id);
      } else {
        // Create new event
        const columns = Object.keys(event).join(', ');
        const values = Object.keys(event)
          .map(key => `@${key}`)
          .join(', ');
        
        const insertQuery = `
          INSERT INTO calendar_events (${columns}) 
          VALUES (${values})
        `;
        
        const insertStmt = this.db.prepare(insertQuery);
        const result = insertStmt.run(event);
        
        // Return created event with ID
        const getStmt = this.db.prepare('SELECT * FROM calendar_events WHERE id = ?');
        return getStmt.get(result.lastInsertRowid);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  }

  deleteEvent(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM calendar_events WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // DIARY ENTRIES
  getDiaryEntries(userId, date) {
    try {
      const query = date 
        ? 'SELECT * FROM diary_entries WHERE user_id = ? AND entry_date = ? ORDER BY created_at DESC'
        : 'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY entry_date DESC, created_at DESC';
      
      const stmt = this.db.prepare(query);
      const rows = date ? stmt.all(userId, date) : stmt.all(userId);
      
      return rows;
    } catch (error) {
      console.error('Error getting diary entries:', error);
      return [];
    }
  }

  saveDiaryEntry(entry) {
    try {
      if (entry.id) {
        // Update existing entry
        const keys = Object.keys(entry)
          .filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at')
          .map(key => `${key} = @${key}`)
          .join(', ');
        
        // Add updated_at
        const updateQuery = `
          UPDATE diary_entries 
          SET ${keys}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = @id
        `;
        
        const updateStmt = this.db.prepare(updateQuery);
        updateStmt.run(entry);
        
        // Return updated entry
        const getStmt = this.db.prepare('SELECT * FROM diary_entries WHERE id = ?');
        return getStmt.get(entry.id);
      } else {
        // Create new entry, filtering out created_at and updated_at as they're auto-generated
        const { created_at, updated_at, ...entryData } = entry;
        
        const columns = Object.keys(entryData).join(', ');
        const values = Object.keys(entryData)
          .map(key => `@${key}`)
          .join(', ');
        
        const insertQuery = `
          INSERT INTO diary_entries (${columns}) 
          VALUES (${values})
        `;
        
        const insertStmt = this.db.prepare(insertQuery);
        const result = insertStmt.run(entryData);
        
        // Return created entry with ID
        const getStmt = this.db.prepare('SELECT * FROM diary_entries WHERE id = ?');
        return getStmt.get(result.lastInsertRowid);
      }
    } catch (error) {
      console.error('Error saving diary entry:', error);
      throw error;
    }
  }

  // CHAT OPERATIONS
  getChatHistory(userId, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_messages 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      const rows = stmt.all(userId, limit);
      
      // Convert SQLite boolean (0/1) to JavaScript boolean
      return rows.map(row => ({
        ...row,
        is_ai: !!row.is_ai
      }));
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  saveChatMessage(message, isAi, userId, sessionId) {
    try {
      // If no sessionId, create a session
      let actualSessionId = sessionId;
      
      if (!actualSessionId) {
        const newSessionStmt = this.db.prepare(`
          INSERT INTO chat_sessions (user_id, title)
          VALUES (?, 'New Chat')
        `);
        
        const sessionResult = newSessionStmt.run(userId);
        actualSessionId = sessionResult.lastInsertRowid;
      }
      
      // Insert message
      const stmt = this.db.prepare(`
        INSERT INTO chat_messages (session_id, user_id, is_ai, message)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(actualSessionId, userId, isAi ? 1 : 0, message);
      
      // Return created message
      const getStmt = this.db.prepare('SELECT * FROM chat_messages WHERE id = ?');
      const savedMessage = getStmt.get(result.lastInsertRowid);
      
      // Convert SQLite boolean (0/1) to JavaScript boolean
      return {
        ...savedMessage,
        is_ai: !!savedMessage.is_ai
      };
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }
  }

  clearChatHistory(userId) {
    try {
      // Delete all chat messages for user
      const msgStmt = this.db.prepare('DELETE FROM chat_messages WHERE user_id = ?');
      msgStmt.run(userId);
      
      // Delete all chat sessions for user
      const sessStmt = this.db.prepare('DELETE FROM chat_sessions WHERE user_id = ?');
      sessStmt.run(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  // UTILITY FUNCTIONS
  getStorageStats(userId) {
    try {
      // Count rows in each table
      const tables = ['tasks', 'calendar_events', 'diary_entries', 'chat_messages'];
      const stats = {};
      
      tables.forEach(table => {
        const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE user_id = ?`);
        const result = countStmt.get(userId);
        stats[table] = result.count;
      });
      
      // Add database file path and size
      if (fs.existsSync(this.dbPath)) {
        const stats = fs.statSync(this.dbPath);
        return {
          ...stats,
          database_size: stats.size,
          database_path: this.dbPath
        };
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {};
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('🔒 SQLite database connection closed');
    }
  }
}

module.exports = { LocalDataManager };