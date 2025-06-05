const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const { app, ipcMain } = require('electron');

class LocalDataManager {
  constructor() {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'wingman-data');
    
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
    this.db.pragma('foreign_keys = ON');
    
    const schemaPaths = [
      path.join(__dirname, '..', 'src', 'storage', 'schema.sql'),
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, '..', 'schema.sql')
    ];
    
    let schemaLoaded = false;
    
    for (const schemaPath of schemaPaths) {
      if (fs.existsSync(schemaPath)) {
        console.log(`📋 LocalDataManager: Loading schema from ${schemaPath}`);
        const schema = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schema);
        schemaLoaded = true;
        break;
      }
    }
    
    if (!schemaLoaded) {
      console.log('⚠️ LocalDataManager: No schema file found, creating tables inline');
      this.createTablesInline();
    }

    // ✅ CRITICAL: Add migration to ensure 'failed' column exists
    this.migrateDatabase();
  }

  // ✅ NEW: Database migration method
  migrateDatabase() {
    try {
      // Check if 'failed' column exists in tasks table
      const tableInfo = this.db.prepare("PRAGMA table_info(tasks)").all();
      const hasFailedColumn = tableInfo.some(column => column.name === 'failed');
      
      if (!hasFailedColumn) {
        console.log('🔄 LocalDataManager: Adding failed column to tasks table');
        this.db.exec('ALTER TABLE tasks ADD COLUMN failed BOOLEAN DEFAULT FALSE');
      }

      // Ensure downloaded_models table exists
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

      // Ensure user_settings table exists
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

      // Ensure chat_quick_prompts table exists
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
      console.error('❌ LocalDataManager: Migration error:', error);
    }
  }

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
      console.log('✅ LocalDataManager: Tables created inline successfully');
    } catch (error) {
      console.error('❌ LocalDataManager: Error creating tables inline:', error);
      throw error;
    }
  }

  // ✅ FIXED: Complete getTasks implementation
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
      
      // ✅ ENHANCED: Auto-mark overdue tasks as failed
      if (tasks.length > 0) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        let updatedCount = 0;
        
        tasks.forEach(task => {
          // Only check tasks for today or past dates
          if (task.task_date <= currentDate && 
              !task.completed && !task.failed && task.task_time && 
              task.task_time !== 'All day' && task.task_time <= currentTime) {  // ✅ CHANGED: <= instead of <
            
            // Mark as failed in database
            const updateStmt = this.db.prepare(`
              UPDATE tasks 
              SET failed = TRUE, updated_at = datetime('now') 
              WHERE id = ?
            `);
            updateStmt.run(task.id);
            
            // Update in memory
            task.failed = true;
            updatedCount++;
          }
        });
        
        if (updatedCount > 0) {
          console.log(`⏰ getTasks: Auto-marked ${updatedCount} tasks as failed for ${date}`);
        }
      }
      
      return tasks;
      
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  // ✅ FIXED: Complete saveTask implementation with correct parameter order
  saveTask(task) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO tasks (user_id, title, task_date, task_time, completed, failed, task_type, due_date, urgency_level, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const result = stmt.run(
        task.user_id,
        task.title,
        task.task_date,
        task.task_time || null,
        task.completed || false,
        task.failed || false,
        task.task_type || null,
        task.due_date || null,
        task.urgency_level || null,
        task.status || null
      );
      
      console.log(`✅ saveTask: Task "${task.title}" saved with ID ${result.lastInsertRowid}`);
      return { id: result.lastInsertRowid, success: true };
      
    } catch (error) {
      console.error('❌ saveTask error:', error);
      throw error;
    }
  }

  // ✅ FIXED: Complete updateTask implementation that properly handles 'failed' field
  updateTask(id, updates) {
    try {
      const allowedFields = ['title', 'task_date', 'task_time', 'completed', 'failed', 'task_type', 'due_date', 'urgency_level', 'status'];
      const updateFields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updateFields.push('updated_at = datetime(\'now\')');
      values.push(id);
      
      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `);
      
      const result = stmt.run(...values);
      
      if (result.changes > 0) {
        console.log(`✅ updateTask: Task ${id} updated successfully`);
        return { success: true, changes: result.changes };
      } else {
        console.log(`⚠️ updateTask: No task found with ID ${id}`);
        return { success: false, error: 'Task not found' };
      }
      
    } catch (error) {
      console.error('❌ updateTask error:', error);
      throw error;
    }
  }

  // ✅ FIXED: Complete deleteTask implementation
  deleteTask(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes > 0) {
        console.log(`✅ deleteTask: Task ${id} deleted successfully`);
        return { success: true, deleted: true };
      } else {
        console.log(`⚠️ deleteTask: No task found with ID ${id}`);
        return { success: false, error: 'Task not found' };
      }
      
    } catch (error) {
      console.error('❌ deleteTask error:', error);
      throw error;
    }
  }

  // ✅ FIXED: Complete getEvents implementation
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

  // ✅ FIXED: Complete saveEvent implementation
  saveEvent(event) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO calendar_events (user_id, title, event_date, event_time, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const result = stmt.run(
        event.user_id,
        event.title,
        event.event_date,
        event.event_time || null,
        event.type || null,
        event.description || null
      );
      
      return { id: result.lastInsertRowid, success: true };
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  }

  // ✅ FIXED: Complete deleteEvent implementation
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

  // ✅ FIXED: Complete getDiaryEntries implementation
  getDiaryEntries(userId, date) {
    try {
      if (date) {
        const stmt = this.db.prepare(`
          SELECT * FROM diary_entries 
          WHERE user_id = ? AND entry_date = ? 
          ORDER BY created_at DESC
        `);
        return stmt.all(userId, date);
      } else {
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

  // ✅ FIXED: Complete saveDiaryEntry implementation
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

  // ✅ ENHANCED: Chat session management
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

  // ✅ ENHANCED: Save chat message with session support
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

  // ✅ ENHANCED: Get chat history with session info
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

  // ✅ NEW: Get chat sessions
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

  // ✅ NEW: Get messages for specific session
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

  // ✅ FIXED: Complete getStorageStats implementation
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

  // ✅ NEW: Quick Prompts CRUD operations
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

  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ LocalDataManager: Database connection closed');
    }
  }
}

module.exports = { LocalDataManager };