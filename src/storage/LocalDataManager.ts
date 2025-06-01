import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Import your existing types
import type { Task } from '../api/Task';
import type { CalendarEvent } from '../api/Calendar';

// Define interfaces for other data types that match your schema
export interface DiaryEntry {
  id: number;
  user_id: string;
  entry_date: string;
  title: string;
  content: string;
  mood: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  user_id: string;
  session_id?: number;
  is_ai: boolean;
  message: string;
  timestamp: string;
  updated_at: string;
}

export interface ChatSession {
  id: number;
  user_id: string;
  title?: string;
  started_at: string;
  updated_at: string;
}

export class LocalDataManager {
  private db!: Database.Database; // Use definite assignment assertion
  private dbPath: string;

  constructor() {
    // Get user data directory from Electron
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'wingman-data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.join(dataDir, 'wingman.db');
    this.initializeDatabase(); // This sets this.db
    
    console.log(`📦 LocalDataManager initialized: ${this.dbPath}`);
  }

  private initializeDatabase(): void {
    this.db = new Database(this.dbPath); // Initialize here
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Read and execute schema from our schema.sql file
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    try {
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schema);
        console.log('✅ Database schema loaded from schema.sql');
      } else {
        // Fallback: create tables inline if schema.sql not found
        this.createTablesInline();
        console.log('⚠️ schema.sql not found, created tables inline');
      }
    } catch (error) {
      console.error('❌ Error loading schema:', error);
      this.createTablesInline();
    }
  }

  private createTablesInline(): void {
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

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
      CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);
      CREATE INDEX IF NOT EXISTS idx_diary_user_id ON diary_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
    `);
  }

  // ✅ TASK OPERATIONS (matching your existing Task interface)
  getTasks(userId: string, date?: string): Task[] {
    try {
      const query = date 
        ? 'SELECT * FROM tasks WHERE user_id = ? AND task_date = ? ORDER BY created_at DESC'
        : 'SELECT * FROM tasks WHERE user_id = ? ORDER BY task_date DESC, created_at DESC';
      
      const stmt = this.db.prepare(query);
      const rows = date ? stmt.all(userId, date) : stmt.all(userId);
      
      return (rows as any[]).map(row => ({
        id: row.id,
        title: row.title,
        task_date: row.task_date,
        task_time: row.task_time,
        completed: Boolean(row.completed),
        user_id: row.user_id,
        // Optional fields from your schema
        task_type: row.task_type,
        due_date: row.due_date,
        last_reset_date: row.last_reset_date,
        urgency_level: row.urgency_level,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  saveTask(task: Omit<Task, 'id'> | Task): Task {
    try {
      if ('id' in task && task.id) {
        // Update existing task
        const stmt = this.db.prepare(`
          UPDATE tasks SET 
            title = ?, task_date = ?, task_time = ?, completed = ?,
            task_type = ?, due_date = ?, urgency_level = ?, status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `);
        
        stmt.run(
          task.title,
          task.task_date,
          task.task_time || '',
          task.completed ? 1 : 0,
          task.task_type || null,
          task.due_date || null,
          task.urgency_level || null,
          task.status || null,
          task.id,
          task.user_id
        );
        
        return task as Task;
      } else {
        // Create new task
        const stmt = this.db.prepare(`
          INSERT INTO tasks (
            user_id, title, task_date, task_time, completed,
            task_type, due_date, last_reset_date, urgency_level, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
          task.user_id,
          task.title,
          task.task_date,
          task.task_time || '',
          task.completed ? 1 : 0,
          task.task_type || null,
          task.due_date || null,
          task.last_reset_date || null,
          task.urgency_level || null,
          task.status || null
        );
        
        return {
          ...task,
          id: Number(result.lastInsertRowid)
        } as Task;
      }
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  }

  updateTask(id: number, updates: Partial<Task>): Task | null {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'user_id')
        .map(key => `${key} = ?`)
        .join(', ');
      
      if (!setClause) {
        throw new Error('No valid fields to update');
      }
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'user_id')
        .map(key => {
          const value = updates[key as keyof Task];
          return typeof value === 'boolean' ? (value ? 1 : 0) : value;
        });
      
      const stmt = this.db.prepare(`
        UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      stmt.run(...values, id);
      
      // Return updated task
      const getStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
      const row = getStmt.get(id) as any;
      
      if (row) {
        return {
          id: row.id,
          title: row.title,
          task_date: row.task_date,
          task_time: row.task_time,
          completed: Boolean(row.completed),
          user_id: row.user_id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  deleteTask(id: number): void {
    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // ✅ CALENDAR EVENT OPERATIONS (matching your existing CalendarEvent interface)
  getEvents(userId: string, date?: string): CalendarEvent[] {
    try {
      const query = date 
        ? 'SELECT * FROM calendar_events WHERE user_id = ? AND event_date = ? ORDER BY event_time'
        : 'SELECT * FROM calendar_events WHERE user_id = ? ORDER BY event_date DESC, event_time';
      
      const stmt = this.db.prepare(query);
      const rows = date ? stmt.all(userId, date) : stmt.all(userId);
      
      return (rows as any[]).map(row => ({
        id: row.id,
        title: row.title,
        event_date: row.event_date,
        event_time: row.event_time,
        type: row.type,
        description: row.description,
        user_id: row.user_id
      }));
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  saveEvent(event: Omit<CalendarEvent, 'id'> | CalendarEvent): CalendarEvent {
    try {
      if ('id' in event && event.id) {
        // Update existing event
        const stmt = this.db.prepare(`
          UPDATE calendar_events SET 
            title = ?, event_date = ?, event_time = ?, type = ?, description = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `);
        
        stmt.run(
          event.title,
          event.event_date,
          event.event_time || '',
          event.type || '',
          event.description || '',
          event.id,
          event.user_id
        );
        
        return event as CalendarEvent;
      } else {
        // Create new event
        const stmt = this.db.prepare(`
          INSERT INTO calendar_events (
            user_id, title, event_date, event_time, type, description
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
          event.user_id,
          event.title,
          event.event_date,
          event.event_time || '',
          event.type || '',
          event.description || ''
        );
        
        return {
          ...event,
          id: Number(result.lastInsertRowid)
        } as CalendarEvent;
      }
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  }

  deleteEvent(id: number): void {
    try {
      const stmt = this.db.prepare('DELETE FROM calendar_events WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // ✅ CHAT OPERATIONS (perfect for your Ollama integration!)
  getChatHistory(userId: string, limit: number = 50): ChatMessage[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_messages 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      const rows = stmt.all(userId, limit) as any[];
      return rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        session_id: row.session_id,
        is_ai: Boolean(row.is_ai),
        message: row.message,
        timestamp: row.timestamp,
        updated_at: row.updated_at
      })).reverse(); // Most recent last for chat display
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  saveChatMessage(message: string, isAi: boolean, userId: string, sessionId?: number): ChatMessage {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO chat_messages (user_id, session_id, is_ai, message)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(userId, sessionId || null, isAi ? 1 : 0, message);
      
      return {
        id: Number(result.lastInsertRowid),
        user_id: userId,
        session_id: sessionId,
        is_ai: isAi,
        message: message,
        timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }
  }

  clearChatHistory(userId: string): void {
    try {
      const stmt = this.db.prepare('DELETE FROM chat_messages WHERE user_id = ?');
      stmt.run(userId);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  // ✅ DIARY OPERATIONS
  getDiaryEntries(userId: string, date?: string): DiaryEntry[] {
    try {
      const query = date 
        ? 'SELECT * FROM diary_entries WHERE user_id = ? AND entry_date = ? ORDER BY created_at DESC'
        : 'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY entry_date DESC, created_at DESC';
      
      const stmt = this.db.prepare(query);
      return date ? stmt.all(userId, date) as DiaryEntry[] : stmt.all(userId) as DiaryEntry[];
    } catch (error) {
      console.error('Error getting diary entries:', error);
      return [];
    }
  }

  saveDiaryEntry(entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'> | DiaryEntry): DiaryEntry {
    try {
      if ('id' in entry && entry.id) {
        // Update existing entry
        const stmt = this.db.prepare(`
          UPDATE diary_entries SET 
            title = ?, content = ?, mood = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `);
        
        stmt.run(entry.title, entry.content, entry.mood, entry.id, entry.user_id);
        return entry as DiaryEntry;
      } else {
        // Create new entry
        const stmt = this.db.prepare(`
          INSERT INTO diary_entries (user_id, entry_date, title, content, mood)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
          entry.user_id,
          entry.entry_date,
          entry.title,
          entry.content,
          entry.mood
        );
        
        return {
          ...entry,
          id: Number(result.lastInsertRowid),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as DiaryEntry;
      }
    } catch (error) {
      console.error('Error saving diary entry:', error);
      throw error;
    }
  }

  // ✅ UTILITY METHODS
  getStorageStats(userId: string): any {
    try {
      const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?').get(userId) as any;
      const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM calendar_events WHERE user_id = ?').get(userId) as any;
      const diaryCount = this.db.prepare('SELECT COUNT(*) as count FROM diary_entries WHERE user_id = ?').get(userId) as any;
      const chatCount = this.db.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE user_id = ?').get(userId) as any;
      
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

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Export singleton instance
export const localDataManager = new LocalDataManager();