"""
SQLite-based Chat Service  
Replaces Supabase-based chat operations with direct SQLite access
"""

from typing import List, Dict, Optional
from datetime import datetime
from app.services.sqlite_base import SQLiteBaseService

class SQLiteChatService(SQLiteBaseService):
    """
    SQLite-based chat history operations
    """
    
    def save_message(self, user_id: str, message: str, is_ai: bool = False, timestamp: Optional[str] = None) -> Optional[Dict]:
        """Save a chat message"""
        if not timestamp:
            timestamp = datetime.now().isoformat()
        
        query = """
            INSERT INTO chat_history (user_id, message, is_ai, timestamp)
            VALUES (?, ?, ?, ?)
        """
        
        params = (user_id, message, is_ai, timestamp)
        
        message_id = self.execute_insert(query, params)
        
        if message_id:
            return self.get_message_by_id(message_id)
        
        return None
    
    def get_message_by_id(self, message_id: int) -> Optional[Dict]:
        """Get a chat message by ID"""
        query = """
            SELECT id, user_id, message, is_ai, timestamp
            FROM chat_history 
            WHERE id = ?
        """
        
        results = self.execute_query(query, (message_id,))
        return results[0] if results else None
    
    def get_messages(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get chat messages for a user"""
        query = """
            SELECT id, user_id, message, is_ai, timestamp
            FROM chat_history 
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        """
        
        results = self.execute_query(query, (user_id, limit))
        
        # Return in chronological order (oldest first)
        return list(reversed(results))
    
    def get_recent_messages(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent chat messages for building AI context"""
        query = """
            SELECT message, is_ai, timestamp
            FROM chat_history 
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        """
        
        results = self.execute_query(query, (user_id, limit))
        
        # Return in chronological order for context building
        return list(reversed(results))
    
    def clear_chat_history(self, user_id: str) -> bool:
        """Clear all chat history for a user"""
        query = "DELETE FROM chat_history WHERE user_id = ?"
        return self.execute_update(query, (user_id,))
    
    def delete_message(self, message_id: int) -> bool:
        """Delete a specific chat message"""
        query = "DELETE FROM chat_history WHERE id = ?"
        return self.execute_update(query, (message_id,))
    
    def search_messages(self, user_id: str, search_term: str) -> List[Dict]:
        """Search chat messages by content"""
        query = """
            SELECT id, user_id, message, is_ai, timestamp
            FROM chat_history 
            WHERE user_id = ? AND message LIKE ?
            ORDER BY timestamp DESC
        """
        
        search_pattern = f"%{search_term}%"
        return self.execute_query(query, (user_id, search_pattern))
    
    def get_message_count(self, user_id: str) -> int:
        """Get total message count for a user"""
        query = "SELECT COUNT(*) as count FROM chat_history WHERE user_id = ?"
        
        results = self.execute_query(query, (user_id,))
        return results[0]['count'] if results else 0
    
    def get_conversation_stats(self, user_id: str) -> Dict:
        """Get conversation statistics for a user"""
        query = """
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN is_ai = 1 THEN 1 END) as ai_messages,
                COUNT(CASE WHEN is_ai = 0 THEN 1 END) as user_messages,
                MIN(timestamp) as first_message,
                MAX(timestamp) as last_message
            FROM chat_history 
            WHERE user_id = ?
        """
        
        results = self.execute_query(query, (user_id,))
        return results[0] if results else {
            'total_messages': 0,
            'ai_messages': 0,
            'user_messages': 0,
            'first_message': None,
            'last_message': None
        }
