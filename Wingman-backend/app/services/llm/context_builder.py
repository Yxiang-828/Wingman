import os
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json

class WingmanContextBuilder:
    """
    INTELLIGENT context builder that gives Wingman AI FULL access to user data
    """
    
    def __init__(self):
        self.db_path = self._get_user_db_path()
        
    def build_context(self, user_id: str, message: str, date: str = None) -> str:
        """Build comprehensive context with CHAT HISTORY + DATABASE ACCESS"""
        
        current_date = date or datetime.now().strftime('%Y-%m-%d')
        
        # Get actual user data from database
        chat_history = self._get_recent_chat_history(user_id, limit=10)
        today_tasks = self._get_tasks_for_date(user_id, current_date)
        today_events = self._get_events_for_date(user_id, current_date)
        recent_diary = self._get_recent_diary_entries(user_id, days=3)
        
        context = f"""
WINGMAN AI CONTEXT - FULL USER DATA ACCESS
==========================================

USER ID: {user_id}
CURRENT DATE: {current_date}
CURRENT QUERY: "{message}"

CHAT HISTORY (Last 10 messages):
{self._format_chat_history(chat_history)}

TODAY'S TASKS ({current_date}):
{self._format_tasks(today_tasks)}

TODAY'S EVENTS ({current_date}):
{self._format_events(today_events)}

RECENT DIARY ENTRIES (Last 3 days):
{self._format_diary_entries(recent_diary)}

DATABASE ACCESS FUNCTIONS AVAILABLE:
- get_tasks(date) → Returns tasks for specific date
- get_tasks_range(start_date, end_date) → Returns tasks in range
- get_pending_tasks() → Returns all incomplete tasks
- get_completed_tasks(date) → Returns completed tasks for date
- get_events(date) → Returns events for specific date
- get_diary_entries(date) → Returns diary for specific date
- get_chat_history(limit) → Returns recent chat messages

INSTRUCTIONS:
1. You have access to the user's COMPLETE chat history and data
2. Reference previous conversations when relevant
3. If user asks "what did we discuss about X", search the chat history
4. Provide comprehensive, detailed responses (NO TOKEN LIMITS)
5. Use actual data from database to provide specific, helpful answers
6. Remember context from previous messages in this conversation

RESPONSE GUIDELINES:
- Reference specific tasks, events, or diary entries when relevant
- Continue conversations naturally using chat history
- Be thorough and analytical like a true personal assistant
- Show actual data in tables or organized lists when helpful
"""
        
        return context

    def _get_user_db_path(self):
        """Get the user database path"""
        import os
        from pathlib import Path
        
        # Try multiple common locations for Wingman database
        possible_paths = [
            os.path.expanduser("~/AppData/Roaming/wingman/wingman-data/wingman.db"),
            os.path.expanduser("~/wingman-data/wingman.db"),
            "./wingman.db"
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        # Default to first path for creation
        db_path = possible_paths[0]
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        return db_path

    def _get_recent_chat_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent chat history from database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT message, is_ai, timestamp 
                    FROM chat_history 
                    WHERE user_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (user_id, limit))
                
                messages = cursor.fetchall()
                # Reverse to get chronological order
                return [dict(msg) for msg in reversed(messages)]
                
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return []

    def _get_tasks_for_date(self, user_id: str, date: str) -> List[Dict]:
        """Get tasks for specific date"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT title, task_time, completed, failed, task_type, urgency_level
                    FROM tasks 
                    WHERE user_id = ? AND task_date = ?
                    ORDER BY task_time ASC
                """, (user_id, date))
                
                return [dict(task) for task in cursor.fetchall()]
                
        except Exception as e:
            print(f"Error getting tasks: {e}")
            return []

    def _get_events_for_date(self, user_id: str, date: str) -> List[Dict]:
        """Get events for specific date"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT title, event_time, type, description
                    FROM calendar_events 
                    WHERE user_id = ? AND event_date = ?
                    ORDER BY event_time ASC
                """, (user_id, date))
                
                return [dict(event) for event in cursor.fetchall()]
                
        except Exception as e:
            print(f"Error getting events: {e}")
            return []

    def _get_recent_diary_entries(self, user_id: str, days: int = 3) -> List[Dict]:
        """Get recent diary entries"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
                
                cursor.execute("""
                    SELECT entry_date, title, content, mood
                    FROM diary_entries 
                    WHERE user_id = ? AND entry_date >= ?
                    ORDER BY entry_date DESC
                """, (user_id, start_date))
                
                return [dict(entry) for entry in cursor.fetchall()]
                
        except Exception as e:
            print(f"Error getting diary entries: {e}")
            return []

    def _format_chat_history(self, chat_history: List[Dict]) -> str:
        """Format chat history for context"""
        if not chat_history:
            return "No previous chat history."
        
        formatted = []
        for msg in chat_history:
            sender = "AI" if msg['is_ai'] else "USER"
            timestamp = msg['timestamp']
            message = msg['message']
            formatted.append(f"[{timestamp}] {sender}: {message}")
        
        return "\n".join(formatted)

    def _format_tasks(self, tasks: List[Dict]) -> str:
        """Format tasks for context"""
        if not tasks:
            return "No tasks for today."
        
        formatted = []
        for task in tasks:
            status = "✅ COMPLETED" if task.get('completed') else "❌ FAILED" if task.get('failed') else "⏳ PENDING"
            time_str = f" at {task.get('task_time', 'No time')}" if task.get('task_time') else ""
            formatted.append(f"- {task['title']}{time_str} [{status}]")
        
        return "\n".join(formatted)

    def _format_events(self, events: List[Dict]) -> str:
        """Format events for context"""
        if not events:
            return "No events for today."
        
        formatted = []
        for event in events:
            time_str = f" at {event.get('event_time', 'No time')}" if event.get('event_time') else ""
            type_str = f" ({event['type']})" if event.get('type') else ""
            formatted.append(f"- {event['title']}{time_str}{type_str}")
        
        return "\n".join(formatted)

    def _format_diary_entries(self, entries: List[Dict]) -> str:
        """Format diary entries for context"""
        if not entries:
            return "No recent diary entries."
        
        formatted = []
        for entry in entries:
            mood_str = f" [Mood: {entry['mood']}]" if entry.get('mood') else ""
            content_preview = entry.get('content', '')[:100] + "..." if entry.get('content') and len(entry.get('content', '')) > 100 else entry.get('content', '')
            formatted.append(f"- {entry['entry_date']}: {entry.get('title', 'Untitled')}{mood_str}\n  {content_preview}")
        
        return "\n".join(formatted)