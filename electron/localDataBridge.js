const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const { app } = require('electron');

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
        try {
          const schema = fs.readFileSync(schemaPath, 'utf8');
          this.db.exec(schema);
          console.log(`✅ LocalDataManager: Schema loaded from ${schemaPath}`);
          schemaLoaded = true;
          break;
        } catch (error) {
          console.warn(`⚠️ LocalDataManager: Could not load schema from ${schemaPath}:`, error.message);
        }
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
      console.log('🔄 LocalDataManager: Running database migrations...');
      
      // Check if 'failed' column exists in tasks table
      const tableInfo = this.db.prepare("PRAGMA table_info(tasks)").all();
      const hasFailedColumn = tableInfo.some(column => column.name === 'failed');
      
      if (!hasFailedColumn) {
        console.log('📝 LocalDataManager: Adding missing "failed" column to tasks table');
        this.db.exec('ALTER TABLE tasks ADD COLUMN failed BOOLEAN DEFAULT FALSE');
        console.log('✅ LocalDataManager: "failed" column added successfully');
      } else {
        console.log('✅ LocalDataManager: "failed" column already exists');
      }
      
      // ✅ NOW create the failed-related indexes (only after column exists)
      console.log('📝 LocalDataManager: Creating failed-related indexes...');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_failed ON tasks(failed)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(completed, failed)');
      console.log('✅ LocalDataManager: Failed-related indexes created');
      
      console.log('✅ LocalDataManager: Database migrations completed');
      
    } catch (error) {
      console.error('❌ LocalDataManager: Migration error:', error);
      throw error;
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
      // ✅ FIXED: Create tables first
      this.db.exec(createTasksTable);
      this.db.exec(createEventsTable);
      this.db.exec(createDiaryTable);
      this.db.exec(createChatSessionsTable);
      this.db.exec(createChatMessagesTable);
      this.db.exec(createChatHistoryTable);
      
      // ✅ FIXED: Create indexes AFTER tables are created and migrated
      console.log('✅ LocalDataManager: Tables created, now creating indexes...');
      
      // Basic indexes (safe to create)
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_events(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_diary_user_id ON diary_entries(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_diary_date ON diary_entries(entry_date)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp)');
      
      console.log('✅ LocalDataManager: All tables and basic indexes created successfully');
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
          task_time ASC,
          created_at ASC
      `);
      
      const tasks = stmt.all(userId, date);
      
      // ✅ AUTO-DETECT: Check and mark failed tasks for today only
      if (date === new Date().toISOString().split('T')[0]) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        let updatedCount = 0;
        
        // ✅ ADD THE MISSING LOOP:
        tasks.forEach(task => {
          if (!task.completed && !task.failed && task.task_time && 
              task.task_time !== 'All day' && task.task_time < currentTime) {
            
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
      console.log('📥 Raw task data received:', JSON.stringify(task, null, 2));
      
      const sanitizedData = {};
      
      if (task.title !== undefined && task.title !== null) {
        sanitizedData.title = String(task.title);
      } else {
        sanitizedData.title = '';
      }
      
      if (task.task_date !== undefined && task.task_date !== null) {
        sanitizedData.task_date = String(task.task_date);
      } else {
        sanitizedData.task_date = '';
      }
      
      if (task.task_time !== undefined && task.task_time !== null) {
        sanitizedData.task_time = String(task.task_time);
      } else {
        sanitizedData.task_time = '';
      }
      
      if (task.completed !== undefined && task.completed !== null) {
        sanitizedData.completed = Boolean(task.completed) ? 1 : 0;
      } else {
        sanitizedData.completed = 0;
      }
      
      if (task.user_id !== undefined && task.user_id !== null) {
        sanitizedData.user_id = String(task.user_id);
      } else {
        throw new Error('user_id is required');
      }
      
      sanitizedData.task_type = task.task_type ? String(task.task_type) : null;
      sanitizedData.urgency_level = task.urgency_level ? Number(task.urgency_level) : null;
      sanitizedData.status = task.status ? String(task.status) : null;
      sanitizedData.due_date = task.due_date ? String(task.due_date) : null;
      sanitizedData.last_reset_date = task.last_reset_date ? String(task.last_reset_date) : null;
      
      console.log('🧹 Sanitized data for SQLite:', JSON.stringify(sanitizedData, null, 2));
      
      if (task.id && Number(task.id) > 0) {
        // UPDATE OPERATION
        const updateStmt = this.db.prepare(`
          UPDATE tasks SET 
            title = ?,
            task_date = ?,
            task_time = ?,
            completed = ?,
            task_type = ?,
            urgency_level = ?,
            status = ?,
            due_date = ?,
            last_reset_date = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `);
        
        const updateResult = updateStmt.run(
          sanitizedData.title,
          sanitizedData.task_date,
          sanitizedData.task_time,
          sanitizedData.completed,
          sanitizedData.task_type,
          sanitizedData.urgency_level,
          sanitizedData.status,
          sanitizedData.due_date,
          sanitizedData.last_reset_date,
          Number(task.id),
          sanitizedData.user_id
        );
        
        const selectStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const updatedTask = selectStmt.get(Number(task.id));
        return {
          ...updatedTask,
          completed: !!updatedTask.completed
        };
      } else {
        // CREATE OPERATION - FIXED PARAMETER ORDER
        const insertStmt = this.db.prepare(`
          INSERT INTO tasks (
            user_id, title, task_date, task_time, completed,
            task_type, due_date, last_reset_date, urgency_level, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertResult = insertStmt.run(
          sanitizedData.user_id,     // 1
          sanitizedData.title,       // 2
          sanitizedData.task_date,   // 3
          sanitizedData.task_time,   // 4
          sanitizedData.completed,   // 5
          sanitizedData.task_type,   // 6
          sanitizedData.due_date,    // 7
          sanitizedData.last_reset_date, // 8
          sanitizedData.urgency_level,   // 9
          sanitizedData.status       // 10
        );
        
        const selectStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const createdTask = selectStmt.get(insertResult.lastInsertRowid);
        console.log('✅ Task created with ID:', insertResult.lastInsertRowid);
        return {
          ...createdTask,
          completed: !!createdTask.completed
        };
      }
    } catch (error) {
      console.error('❌ SQLite saveTask error:', error);
      console.error('❌ Original task data:', JSON.stringify(task, null, 2));
      throw new Error(`SQLite saveTask failed: ${error.message}`);
    }
  }

  // ✅ FIXED: Complete updateTask implementation that properly handles 'failed' field
  updateTask(id, updates) {
    try {
      console.log(`📝 LocalDataManager: Updating task ${id} with:`, updates);
      
      // Build the SET clause dynamically
      const setClause = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          setClause.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      // Add the ID for WHERE clause
      values.push(id);
      
      const sql = `UPDATE tasks SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      console.log(`🔧 SQL Query:`, sql);
      console.log(`🔧 Values:`, values);
      
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error(`No task found with ID ${id}`);
      }
      
      // Return the updated task
      const getStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
      const updatedTask = getStmt.get(id);
      
      console.log(`✅ Task ${id} updated successfully:`, updatedTask);
      return updatedTask;
      
    } catch (error) {
      console.error(`❌ Error updating task ${id}:`, error);
      throw error;
    }
  }

  // ✅ FIXED: Complete deleteTask implementation
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

  // ✅ FIXED: Complete getEvents implementation
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

  // ✅ FIXED: Complete saveEvent implementation
  saveEvent(event) {
    try {
      console.log('📥 Raw event data received:', JSON.stringify(event, null, 2));
      
      const sanitizedEvent = {};
      
      const allowedFields = ['id', 'user_id', 'title', 'event_date', 'event_time', 'type', 'description'];
      
      allowedFields.forEach(field => {
        if (event[field] !== undefined && event[field] !== null) {
          sanitizedEvent[field] = String(event[field]);
        }
      });
      
      if (sanitizedEvent.id && Number(sanitizedEvent.id) > 0) {
        // UPDATE OPERATION
        const updateStmt = this.db.prepare(`
          UPDATE calendar_events SET 
            title = ?, event_date = ?, event_time = ?, type = ?, description = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `);
        
        updateStmt.run(
          sanitizedEvent.title,
          sanitizedEvent.event_date,
          sanitizedEvent.event_time,
          sanitizedEvent.type,
          sanitizedEvent.description,
          Number(sanitizedEvent.id),
          sanitizedEvent.user_id
        );
        
        const selectStmt = this.db.prepare('SELECT * FROM calendar_events WHERE id = ?');
        return selectStmt.get(Number(sanitizedEvent.id));
      } else {
        // CREATE OPERATION
        const insertStmt = this.db.prepare(`
          INSERT INTO calendar_events (
            user_id, title, event_date, event_time, type, description
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertStmt.run(
          sanitizedEvent.user_id,
          sanitizedEvent.title,
          sanitizedEvent.event_date,
          sanitizedEvent.event_time,
          sanitizedEvent.type,
          sanitizedEvent.description
        );
        
        const getStmt = this.db.prepare('SELECT * FROM calendar_events WHERE id = ?');
        const createdEvent = getStmt.get(result.lastInsertRowid);
        
        console.log('✅ Event created with ID:', result.lastInsertRowid);
        return createdEvent;
      }
    } catch (error) {
      console.error('❌ SQLite saveEvent error:', error);
      console.error('❌ Original event data:', JSON.stringify(event, null, 2));
      throw new Error(`SQLite saveEvent failed: ${error.message}`);
    }
  }

  // ✅ FIXED: Complete deleteEvent implementation
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

  // ✅ FIXED: Complete getDiaryEntries implementation
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

  // ✅ FIXED: Complete saveDiaryEntry implementation
  saveDiaryEntry(entry) {
    try {
      console.log('📥 Raw diary entry received:', JSON.stringify(entry, null, 2));
      
      const sanitizedEntry = {};
      
      const allowedFields = ['id', 'user_id', 'entry_date', 'title', 'content', 'mood'];
      
      allowedFields.forEach(field => {
        if (entry[field] !== undefined && entry[field] !== null) {
          sanitizedEntry[field] = String(entry[field]);
        }
      });
      
      console.log('🧹 Sanitized diary entry for SQLite:', JSON.stringify(sanitizedEntry, null, 2));
      
      if (sanitizedEntry.id && Number(sanitizedEntry.id) > 0) {
        // UPDATE OPERATION
        const updateStmt = this.db.prepare(`
          UPDATE diary_entries SET 
            entry_date = ?, title = ?, content = ?, mood = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `);
        
        updateStmt.run(
          sanitizedEntry.entry_date,
          sanitizedEntry.title,
          sanitizedEntry.content,
          sanitizedEntry.mood,
          Number(sanitizedEntry.id),
          sanitizedEntry.user_id
        );
        
        const selectStmt = this.db.prepare('SELECT * FROM diary_entries WHERE id = ?');
        return selectStmt.get(Number(sanitizedEntry.id));
      } else {
        // CREATE OPERATION
        const insertStmt = this.db.prepare(`
          INSERT INTO diary_entries (
            user_id, entry_date, title, content, mood
          ) VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = insertStmt.run(
          sanitizedEntry.user_id,
          sanitizedEntry.entry_date,
          sanitizedEntry.title,
          sanitizedEntry.content,
          sanitizedEntry.mood
        );
        
        const getStmt = this.db.prepare('SELECT * FROM diary_entries WHERE id = ?');
        const createdEntry = getStmt.get(result.lastInsertRowid);
        
        console.log('✅ Diary entry created with ID:', result.lastInsertRowid);
        return createdEntry;
      }
    } catch (error) {
      console.error('❌ SQLite saveDiaryEntry error:', error);
      console.error('❌ Original entry data:', JSON.stringify(entry, null, 2));
      throw new Error(`SQLite saveDiaryEntry failed: ${error.message}`);
    }
  }

  // ✅ FIXED: Complete getChatHistory implementation
  getChatHistory(userId, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_history 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      const rows = stmt.all(userId, limit);
      return rows.map(row => ({
        ...row,
        is_ai: !!row.is_ai
      })).reverse();
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  // ✅ FIXED: Complete saveChatMessage implementation
  saveChatMessage(message, isAi, userId, sessionId) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO chat_history (user_id, is_ai, message)
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(userId, isAi ? 1 : 0, message);
      
      return {
        id: result.lastInsertRowid,
        user_id: userId,
        is_ai: isAi,
        message: message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }
  }

  // ✅ FIXED: Complete clearChatHistory implementation
  clearChatHistory(userId) {
    try {
      const stmt = this.db.prepare('DELETE FROM chat_history WHERE user_id = ?');
      stmt.run(userId);
      return { success: true };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  // ✅ FIXED: Complete getStorageStats implementation
  getStorageStats(userId) {
    try {
      const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?').get(userId);
      const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM calendar_events WHERE user_id = ?').get(userId);
      const diaryCount = this.db.prepare('SELECT COUNT(*) as count FROM diary_entries WHERE user_id = ?').get(userId);
      const chatCount = this.db.prepare('SELECT COUNT(*) as count FROM chat_history WHERE user_id = ?').get(userId);
      
      return {
        tasks: taskCount.count,
        events: eventCount.count,
        diary_entries: diaryCount.count,
        chat_messages: chatCount.count,
        database_path: this.dbPath
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { tasks: 0, events: 0, diary_entries: 0, chat_messages: 0 };
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = { LocalDataManager };