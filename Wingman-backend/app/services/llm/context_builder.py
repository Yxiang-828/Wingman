import os
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
import json

class WingmanContextBuilder:
    """
    Builds intelligent context from user's SQLite data for AI conversations
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """Initialize with SQLite database path"""
        if db_path:
            self.db_path = db_path
        else:
            # Default to Electron's userData path structure
            self.db_path = self._find_user_database()
    
    def _find_user_database(self) -> str:
        """Locate the Electron SQLite database"""
        # Try common Electron userData locations
        possible_paths = [
            # Development path
            os.path.expanduser("~/AppData/Roaming/wingman/wingman-data/wingman.db"),
            # Production path  
            os.path.expanduser("~/AppData/Roaming/Wingman/wingman-data/wingman.db"),
            # Fallback for testing
            "./wingman.db"
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        # Create a default path if none exists
        default_path = os.path.expanduser("~/AppData/Roaming/wingman/wingman-data/wingman.db")
        os.makedirs(os.path.dirname(default_path), exist_ok=True)
        return default_path
    
    def build_context(self, user_id: str, message: str, date: Optional[str] = None) -> str:
        """
        Build comprehensive context for AI from user's data
        
        Args:
            user_id: User identifier
            message: Current user message (for intent analysis)
            date: Target date (defaults to today)
            
        Returns:
            Formatted context string for AI
        """
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row  # Enable dict-like access
                
                # Analyze user intent to determine relevant context
                intent = self._analyze_intent(message)
                
                context_parts = []
                
                # Always include basic user info
                context_parts.append(f"User ID: {user_id}")
                context_parts.append(f"Current Date: {date}")
                context_parts.append(f"User Message: {message}")
                
                # Build context based on intent
                if intent['wants_tasks'] or intent['general_query']:
                    tasks_context = self._get_tasks_context(conn, user_id, date)
                    if tasks_context:
                        context_parts.append(tasks_context)
                
                if intent['wants_schedule'] or intent['general_query']:
                    events_context = self._get_events_context(conn, user_id, date)
                    if events_context:
                        context_parts.append(events_context)
                
                if intent['wants_reflection'] or intent['general_query']:
                    diary_context = self._get_diary_context(conn, user_id)
                    if diary_context:
                        context_parts.append(diary_context)
                
                # Always include recent conversation
                chat_context = self._get_chat_context(conn, user_id)
                if chat_context:
                    context_parts.append(chat_context)
                
                return "\n\n".join(context_parts)
                
        except Exception as e:
            print(f"Error building context: {e}")
            return f"User ID: {user_id}\nCurrent Date: {date}\nUser Message: {message}\n\nNote: Context data temporarily unavailable."
    
    def _analyze_intent(self, message: str) -> Dict[str, bool]:
        """Simple intent analysis from user message"""
        msg_lower = message.lower()
        
        return {
            'wants_tasks': any(word in msg_lower for word in [
                'task', 'todo', 'complete', 'pending', 'work', 'do', 'finish', 'done'
            ]),
            'wants_schedule': any(word in msg_lower for word in [
                'schedule', 'calendar', 'event', 'meeting', 'appointment', 'time', 'when'
            ]),
            'wants_reflection': any(word in msg_lower for word in [
                'diary', 'mood', 'feel', 'think', 'reflect', 'journal', 'emotion'
            ]),
            'general_query': len(msg_lower.split()) <= 3 or any(word in msg_lower for word in [
                'how', 'what', 'help', 'status', 'summary', 'overview'
            ])
        }
    
    def _get_tasks_context(self, conn: sqlite3.Connection, user_id: str, date: str) -> Optional[str]:
        """Get today's tasks context"""
        try:
            cursor = conn.execute("""
                SELECT title, completed, failed, urgency_level, task_time
                FROM tasks 
                WHERE user_id = ? AND task_date = ?
                ORDER BY 
                    CASE WHEN task_time IS NULL OR task_time = '' THEN 1 ELSE 0 END,
                    task_time ASC
            """, (user_id, date))
            
            tasks = cursor.fetchall()
            if not tasks:
                return None
            
            pending = [t for t in tasks if not t['completed'] and not t['failed']]
            completed = [t for t in tasks if t['completed']]
            failed = [t for t in tasks if t['failed']]
            
            context = [f"=== TODAY'S TASKS ({date}) ==="]
            
            if pending:
                context.append(f"📋 PENDING ({len(pending)}):")
                for task in pending[:5]:  # Limit to 5 most important
                    urgency = "🔥" if task['urgency_level'] and task['urgency_level'] >= 3 else ""
                    time_str = f" at {task['task_time']}" if task['task_time'] else ""
                    context.append(f"  • {urgency}{task['title']}{time_str}")
            
            if completed:
                context.append(f"✅ COMPLETED ({len(completed)}):")
                for task in completed[:3]:  # Show recent completions
                    context.append(f"  • {task['title']}")
            
            if failed:
                context.append(f"❌ FAILED ({len(failed)}):")
                for task in failed[:3]:
                    context.append(f"  • {task['title']}")
            
            return "\n".join(context)
            
        except Exception as e:
            print(f"Error getting tasks context: {e}")
            return None
    
    def _get_events_context(self, conn: sqlite3.Connection, user_id: str, date: str) -> Optional[str]:
        """Get today's calendar events context"""
        try:
            cursor = conn.execute("""
                SELECT title, event_time, type, description
                FROM calendar_events 
                WHERE user_id = ? AND event_date = ?
                ORDER BY event_time ASC
            """, (user_id, date))
            
            events = cursor.fetchall()
            if not events:
                return None
            
            context = [f"=== TODAY'S SCHEDULE ({date}) ==="]
            
            for event in events:
                time_str = f"{event['event_time']} - " if event['event_time'] else ""
                type_str = f"[{event['type']}] " if event['type'] else ""
                context.append(f"📅 {time_str}{type_str}{event['title']}")
                if event['description']:
                    context.append(f"    📝 {event['description'][:100]}...")
            
            return "\n".join(context)
            
        except Exception as e:
            print(f"Error getting events context: {e}")
            return None
    
    def _get_diary_context(self, conn: sqlite3.Connection, user_id: str) -> Optional[str]:
        """Get recent diary entries context"""
        try:
            cursor = conn.execute("""
                SELECT entry_date, title, content, mood
                FROM diary_entries 
                WHERE user_id = ?
                ORDER BY entry_date DESC, created_at DESC
                LIMIT 3
            """, (user_id,))
            
            entries = cursor.fetchall()
            if not entries:
                return None
            
            context = ["=== RECENT REFLECTIONS ==="]
            
            for entry in entries:
                mood_emoji = {"happy": "😊", "sad": "😢", "neutral": "😐", "excited": "🤩", "anxious": "😰"}.get(entry['mood'], "💭")
                context.append(f"{mood_emoji} {entry['entry_date']}: {entry['title']}")
                if entry['content']:
                    # Include snippet of content
                    snippet = entry['content'][:150] + "..." if len(entry['content']) > 150 else entry['content']
                    context.append(f"    \"{snippet}\"")
            
            return "\n".join(context)
            
        except Exception as e:
            print(f"Error getting diary context: {e}")
            return None
    
    def _get_chat_context(self, conn: sqlite3.Connection, user_id: str) -> Optional[str]:
        """Get recent chat history context"""
        try:
            cursor = conn.execute("""
                SELECT message, is_ai, timestamp
                FROM chat_history 
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT 10
            """, (user_id,))
            
            messages = cursor.fetchall()
            if not messages:
                return None
            
            context = ["=== RECENT CONVERSATION ==="]
            
            # Reverse to show chronological order
            for msg in reversed(messages):
                speaker = "🤖 Wingman" if msg['is_ai'] else "👤 You"
                # Truncate long messages
                text = msg['message'][:100] + "..." if len(msg['message']) > 100 else msg['message']
                context.append(f"{speaker}: {text}")
            
            return "\n".join(context)
            
        except Exception as e:
            print(f"Error getting chat context: {e}")
            return None
    
    def build_context_llm(self, user_input: str, history: Optional[List[Dict[str, Any]]] = None) -> str:
        """Build context for LLM with proper None handling"""
        
        # Handle None history
        if history is None:
            history = []
        
        context_parts = []
        
        # Add system context
        system_context = self._get_system_context()
        if system_context:  # Check if not None and not empty
            context_parts.append(system_context)
        
        # Add conversation history
        if history:  # Check if history exists and is not empty
            history_context = self._format_history(history)
            if history_context:
                context_parts.append(history_context)
        
        # Add current user input
        context_parts.append(f"User: {user_input}")
        
        return "\n\n".join(context_parts)
    
    def _get_system_context(self) -> Optional[str]:
        """Get system context with proper None handling"""
        try:
            return "You are Wingman, a helpful AI assistant."
        except Exception:
            return None
    
    def _format_history(self, history: List[Dict[str, Any]]) -> Optional[str]:
        """Format conversation history with proper None handling"""
        if not history:
            return None
        
        try:
            formatted_messages = []
            for message in history:
                if message and isinstance(message, dict):
                    role = message.get('role', 'unknown')
                    content = message.get('content', '')
                    if content:  # Only add if content exists
                        formatted_messages.append(f"{role.capitalize()}: {content}")
            
            return "\n".join(formatted_messages) if formatted_messages else None
        except Exception:
            return None

# Test function for development
def test_context_builder() -> None:
    """Test the context builder with sample data"""
    try:
        builder = WingmanContextBuilder()
        context = builder.build_context("test-user", "How am I doing today?")
        print("=== CONTEXT BUILDER TEST ===")
        print(context)
        print("=== END TEST ===")
    except Exception as e:
        print(f"Context builder test failed: {e}")

if __name__ == "__main__":
    test_context_builder()