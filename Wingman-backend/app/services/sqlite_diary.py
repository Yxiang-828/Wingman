"""
SQLite-based Diary Service
Replaces Supabase-based diary operations with direct SQLite access
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.services.sqlite_base import SQLiteBaseService

class SQLiteDiaryService(SQLiteBaseService):
    """
    SQLite-based diary entry operations
    """
    
    def get_entries_by_date(self, user_id: str, entry_id: Optional[int] = None, date_value: Optional[str] = None) -> List[Dict]:
        """Get diary entries for a user, optionally filtered by date or entry ID"""
        
        # Start with base query
        query = """
            SELECT id, user_id, entry_date, title, content, mood,
                   created_at, updated_at
            FROM diary_entries 
            WHERE user_id = ?
        """
        params = [user_id]
        
        # Add filters
        if date_value:
            query += " AND entry_date = ?"
            params.append(date_value)
        
        if entry_id:
            query += " AND id = ?"
            params.append(str(entry_id))  # Convert to string for consistency
        
        query += " ORDER BY entry_date DESC, created_at DESC"
        
        results = self.execute_query(query, tuple(params))
        
        # Add compatibility fields for frontend
        for entry in results:
            entry["date"] = entry["entry_date"]
        
        return results
    
    def get_all_entries(self, user_id: str) -> List[Dict]:
        """Get all diary entries for a user"""
        query = """
            SELECT id, user_id, entry_date, title, content, mood,
                   created_at, updated_at
            FROM diary_entries 
            WHERE user_id = ?
            ORDER BY entry_date DESC, created_at DESC
        """
        
        return self.execute_query(query, (user_id,))
    
    def create_entry(self, entry_data: Dict) -> Optional[Dict]:
        """Create a new diary entry"""
        query = """
            INSERT INTO diary_entries (user_id, entry_date, title, content, mood)
            VALUES (?, ?, ?, ?, ?)
        """
        
        params = (
            entry_data.get('user_id'),
            entry_data.get('entry_date', datetime.now().strftime('%Y-%m-%d')),
            entry_data.get('title', ''),
            entry_data.get('content', ''),
            entry_data.get('mood', '')
        )
        
        entry_id = self.execute_insert(query, params)
        
        if entry_id:
            return self.get_entry_by_id(entry_id)
        
        return None
    
    def get_entry_by_id(self, entry_id: int) -> Optional[Dict]:
        """Get a diary entry by ID"""
        query = """
            SELECT id, user_id, entry_date, title, content, mood,
                   created_at, updated_at
            FROM diary_entries 
            WHERE id = ?
        """
        
        results = self.execute_query(query, (entry_id,))
        return results[0] if results else None
    
    def update_entry(self, entry_id: int, updates: Dict) -> Optional[Dict]:
        """Update a diary entry"""
        # Build dynamic update query
        update_fields = []
        params = []
        
        allowed_fields = ['entry_date', 'title', 'content', 'mood']
        
        for field in allowed_fields:
            if field in updates:
                update_fields.append(f"{field} = ?")
                params.append(updates[field])
        
        if not update_fields:
            return self.get_entry_by_id(entry_id)
        
        # Add updated_at timestamp
        update_fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        
        # Add entry_id for WHERE clause
        params.append(entry_id)
        
        query = f"""
            UPDATE diary_entries 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        
        success = self.execute_update(query, tuple(params))
        
        if success:
            return self.get_entry_by_id(entry_id)
        
        return None
    
    def delete_entry(self, entry_id: int) -> bool:
        """Delete a diary entry"""
        query = "DELETE FROM diary_entries WHERE id = ?"
        return self.execute_update(query, (entry_id,))
    
    def get_recent_entries(self, user_id: str, days: int = 7) -> List[Dict]:
        """Get recent diary entries within specified days"""
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        query = """
            SELECT id, user_id, entry_date, title, content, mood,
                   created_at, updated_at
            FROM diary_entries 
            WHERE user_id = ? AND entry_date >= ?
            ORDER BY entry_date DESC, created_at DESC
        """
        
        return self.execute_query(query, (user_id, start_date))
    
    def get_entries_by_mood(self, user_id: str, mood: str) -> List[Dict]:
        """Get diary entries filtered by mood"""
        query = """
            SELECT id, user_id, entry_date, title, content, mood,
                   created_at, updated_at
            FROM diary_entries 
            WHERE user_id = ? AND mood = ?
            ORDER BY entry_date DESC, created_at DESC
        """
        
        return self.execute_query(query, (user_id, mood))
    
    def search_entries(self, user_id: str, search_term: str) -> List[Dict]:
        """Search diary entries by title or content"""
        query = """
            SELECT id, user_id, entry_date, title, content, mood,
                   created_at, updated_at
            FROM diary_entries 
            WHERE user_id = ? AND (
                title LIKE ? OR content LIKE ?
            )
            ORDER BY entry_date DESC, created_at DESC
        """
        
        search_pattern = f"%{search_term}%"
        return self.execute_query(query, (user_id, search_pattern, search_pattern))
