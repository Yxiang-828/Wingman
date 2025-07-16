"""
WINGMAN CONTEXT BUILDER
===============================================

FUNCTIONALITY:
1. Preloaded content as knowledge base (today's tasks/events + recent diary)
2. Chat history for conversational context
3. Simple prompt generation for LLM
4. NO database search - only slash commands for data access

DESIGN:
- Clean, focused implementation
- Only essential methods
- Performance optimized
- Theme-ready for personality system
"""

import os
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class WingmanContextBuilder:
    """
    Simple Context Builder - Preloaded Content + Chat History Only
    """
    
    def __init__(self):
        self.db_path = self._get_user_db_path()
        
        # Limits for performance
        self.MAX_CHAT_HISTORY = 10
        self.MAX_DAILY_ITEMS = 8
        self.MAX_DIARY_DAYS = 3
        
    def build_context(self, user_id: str, current_theme: str = "light", chat_history: Optional[List[Dict]] = None) -> str:
        """
        Build simple context with preloaded data + chat history
        
        Args:
            user_id: User identifier
            current_theme: Theme for personality (light, dark, yandere, kuudere, dandere, tsundere)
            chat_history: Recent chat messages
            
        Returns:
            Formatted context string for LLM
        """
        
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        # Get chat history if not provided
        if chat_history is None:
            chat_history = self._get_recent_chat_history(user_id)
        
        # Get preloaded data
        user_info = self._get_user_info(user_id)
        today_tasks = self._get_tasks_for_date(user_id, current_date)
        today_events = self._get_events_for_date(user_id, current_date)
        recent_diary = self._get_recent_diary_entries(user_id)
        
        # Build context
        return self._format_context(
            current_date=current_date,
            theme=current_theme,
            user_info=user_info,
            tasks=today_tasks,
            events=today_events,
            diary=recent_diary,
            chat_history=chat_history
        )
    
    def _format_context(self, current_date: str, theme: str, user_info: Dict,
                       tasks: List[Dict], events: List[Dict], diary: List[Dict], chat_history: List[Dict]) -> str:
        """Format all data into LLM context - SIMPLIFIED for natural conversation"""
        
        # Format user info for LLM
        user_section = self._format_user_section(user_info)
        
        # Only include chat history for conversation flow
        chat_section = self._format_chat_section(chat_history)
        
        # Minimal personality note
        personality_note = self._get_personality_note(theme)
        
        # Only include relevant data conditionally
        relevant_sections = []
        if tasks and len(tasks) > 0:
            relevant_sections.append(self._format_tasks_section(tasks, current_date))
        if events and len(events) > 0:
            relevant_sections.append(self._format_events_section(events, current_date))
        if diary and len(diary) > 0:
            relevant_sections.append(self._format_diary_section(diary))
        
        context_data = "\n".join(relevant_sections) if relevant_sections else "No schedule data available"
        
        context = f"""You are Wingman, a helpful AI assistant. Today is {current_date}.
{personality_note}

{user_section}

{chat_section}

Available context data (only reference if relevant):
{context_data}

Respond naturally to the user's message."""

        return context.strip()
    
    def _get_personality_note(self, theme: str) -> str:
        """Get personality note for current theme"""
        personalities = {
            "light": "PERSONALITY: Bright, optimistic, encouraging, and warm",
            "dark": "PERSONALITY: Analytical, direct, efficient, and mysterious", 
            "yandere": "PERSONALITY: Intensely devoted, protective, observant, and caring",
            "kuudere": "PERSONALITY: Cool, logical, professional, gradually warming",
            "dandere": "PERSONALITY: Gentle, shy, soft-spoken, but deeply caring",
            "tsundere": "PERSONALITY: Initially distant, but caring underneath"
        }
        return personalities.get(theme, "PERSONALITY: Helpful and friendly")
    
    def _format_tasks_section(self, tasks: List[Dict], date: str) -> str:
        """Format tasks section"""
        if not tasks:
            return f"📋 TODAY'S TASKS ({date}): No tasks scheduled"
        
        formatted_tasks = []
        for task in tasks[:self.MAX_DAILY_ITEMS]:
            status = "✅ COMPLETED" if task.get('completed') else "❌ FAILED" if task.get('failed') else "⏳ PENDING"
            time_str = f" at {task.get('task_time', 'no time')}"
            formatted_tasks.append(f"   • {task['title']}{time_str} [{status}]")
        
        return f"📋 TODAY'S TASKS ({date}):\n" + "\n".join(formatted_tasks)
    
    def _format_events_section(self, events: List[Dict], date: str) -> str:
        """Format events section"""
        if not events:
            return f"📅 TODAY'S EVENTS ({date}): No events scheduled"
        
        formatted_events = []
        for event in events[:self.MAX_DAILY_ITEMS]:
            time_str = f" at {event.get('event_time', 'no time')}"
            type_str = f" ({event.get('type', 'event')})" if event.get('type') else ""
            formatted_events.append(f"   • {event['title']}{time_str}{type_str}")
        
        return f"📅 TODAY'S EVENTS ({date}):\n" + "\n".join(formatted_events)
    
    def _format_diary_section(self, diary: List[Dict]) -> str:
        """Format diary section"""
        if not diary:
            return "📓 RECENT DIARY: No recent entries"
        
        formatted_diary = []
        for entry in diary[:3]:  # Last 3 entries
            date = entry.get('entry_date', entry.get('date', 'Unknown'))
            content = entry.get('content', '')
            preview = content[:100] + "..." if len(content) > 100 else content
            mood_str = f" [Mood: {entry['mood']}]" if entry.get('mood') else ""
            formatted_diary.append(f"   • {date}: {preview}{mood_str}")
        
        return "📓 RECENT DIARY:\n" + "\n".join(formatted_diary)
    
    def _format_chat_section(self, chat_history: List[Dict]) -> str:
        """Format chat section with improved recent message handling"""
        if not chat_history:
            return "💬 CHAT CONTEXT: No previous conversation"
        
        # Get the last 8 messages for context (4 exchanges)
        recent_messages = chat_history[-8:] if len(chat_history) > 8 else chat_history
        
        formatted_chat = []
        for msg in recent_messages:
            sender = "🤖 AI" if msg.get('is_ai') else "👤 User"
            message = msg.get('message', '')
            # Show full message for recent context, not truncated
            formatted_chat.append(f"   {sender}: {message}")
        
        return "💬 RECENT CONVERSATION:\n" + "\n".join(formatted_chat)
    
    def _format_user_section(self, user_info: Dict) -> str:
        """Format user information section"""
        if not user_info:
            return "USER: Unknown user"
        
        username = user_info.get('username', 'Unknown')
        return f"USER: {username}"
    
    # === DATABASE HELPERS ===
    
    def _get_user_db_path(self) -> str:
        """Get user database path"""
        return os.path.expanduser("~/AppData/Roaming/wingman/wingman-data/wingman.db")
    
    def get_user_theme(self, user_id: str) -> str:
        """Get current theme from user_settings table"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT theme 
                    FROM user_settings 
                    WHERE user_id = ?
                """, (user_id,))
                
                result = cursor.fetchone()
                return result['theme'] if result else 'light'
                
        except Exception as e:
            print(f"Error getting user theme: {e}")
            return 'light'
    
    def _get_recent_chat_history(self, user_id: str) -> List[Dict]:
        """Get recent chat history"""
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
                """, (user_id, self.MAX_CHAT_HISTORY))
                
                messages = cursor.fetchall()
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
                    SELECT title, task_time, completed, failed, task_type, status
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
    
    def _get_recent_diary_entries(self, user_id: str) -> List[Dict]:
        """Get recent diary entries"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                start_date = (datetime.now() - timedelta(days=self.MAX_DIARY_DAYS)).strftime('%Y-%m-%d')
                
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
    
    def _get_user_info(self, user_id: str) -> Dict:
        """Get user information for LLM context"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT username, email, created_at
                    FROM users 
                    WHERE id = ?
                """, (user_id,))
                
                result = cursor.fetchone()
                return dict(result) if result else {}
                
        except Exception as e:
            print(f"Error getting user info: {e}")
            return {}
