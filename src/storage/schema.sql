-- Tasks table (matches Supabase tasks exactly)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,  -- Will store UUID as string
    title TEXT NOT NULL,
    task_date TEXT,         -- ISO format: YYYY-MM-DD
    task_time TEXT,         -- ISO format: HH:MM:SS
    completed BOOLEAN DEFAULT FALSE,
    failed BOOLEAN DEFAULT FALSE,  -- ✅ CRITICAL: Task failure status
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    task_type TEXT,
    due_date TEXT,          -- ISO format: YYYY-MM-DD
    last_reset_date TEXT,   -- ISO format: YYYY-MM-DD  
    urgency_level INTEGER,  -- Changed from TEXT to INTEGER to match Supabase
    status TEXT
);

-- Calendar Events table (matches Supabase calendar_events exactly)
CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,  -- Will store UUID as string
    title TEXT NOT NULL,
    event_date TEXT,        -- ISO format: YYYY-MM-DD
    event_time TEXT,        -- ISO format: HH:MM:SS
    type TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Diary Entries table (matches Supabase diary_entries exactly)
CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,  -- Will store UUID as string
    entry_date TEXT,        -- ISO format: YYYY-MM-DD
    title TEXT,
    content TEXT,
    mood TEXT,              -- Will store mood_scale values as TEXT
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chat Sessions table (matches Supabase chat_sessions exactly)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,  -- Will store UUID as string
    title TEXT,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages table (matches Supabase chat_messages exactly)
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,     -- Foreign key to chat_sessions
    user_id TEXT NOT NULL,  -- Will store UUID as string
    is_ai BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Chat History table (matches Supabase chat_history exactly)  
CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,  -- Will store UUID as string
    message TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    is_ai BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_failed ON tasks(failed);  -- ✅ NEW: Index for failed column
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(completed, failed);  -- ✅ UPDATED: Combined status index
CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_diary_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_date ON diary_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);