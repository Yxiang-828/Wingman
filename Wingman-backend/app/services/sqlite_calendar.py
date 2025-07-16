"""
SQLite-based Calendar Service
Replaces Supabase-based calendar operations with direct SQLite access
"""

from typing import List, Dict, Optional
from datetime import datetime
from app.services.sqlite_base import SQLiteBaseService

class SQLiteCalendarService(SQLiteBaseService):
    """
    SQLite-based calendar event operations
    """
    
    def get_events_by_date(self, user_id: str, date_str: str) -> List[Dict]:
        """Get events for a specific date and user"""
        query = """
            SELECT id, user_id, title, event_date, event_time, type, description,
                   created_at, updated_at
            FROM calendar_events 
            WHERE user_id = ? AND event_date = ?
            ORDER BY event_time ASC, created_at ASC
        """
        
        results = self.execute_query(query, (user_id, date_str))
        
        # Add compatibility fields for frontend
        for event in results:
            event["date"] = event["event_date"]
            event["time"] = event.get("event_time", "")
        
        return results
    
    def get_all_events(self, user_id: str) -> List[Dict]:
        """Get all events for a user"""
        query = """
            SELECT id, user_id, title, event_date, event_time, type, description,
                   created_at, updated_at
            FROM calendar_events 
            WHERE user_id = ?
            ORDER BY event_date DESC, event_time ASC
        """
        
        return self.execute_query(query, (user_id,))
    
    def create_event(self, event_data: Dict) -> Optional[Dict]:
        """Create a new calendar event"""
        query = """
            INSERT INTO calendar_events (user_id, title, event_date, event_time, type, description)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        
        params = (
            event_data.get('user_id'),
            event_data.get('title'),
            event_data.get('event_date', ''),
            event_data.get('event_time', ''),
            event_data.get('type', 'general'),
            event_data.get('description', '')
        )
        
        event_id = self.execute_insert(query, params)
        
        if event_id:
            return self.get_event_by_id(event_id)
        
        return None
    
    def get_event_by_id(self, event_id: int) -> Optional[Dict]:
        """Get an event by ID"""
        query = """
            SELECT id, user_id, title, event_date, event_time, type, description,
                   created_at, updated_at
            FROM calendar_events 
            WHERE id = ?
        """
        
        results = self.execute_query(query, (event_id,))
        return results[0] if results else None
    
    def update_event(self, event_id: int, updates: Dict) -> Optional[Dict]:
        """Update a calendar event"""
        # Build dynamic update query
        update_fields = []
        params = []
        
        allowed_fields = ['title', 'event_date', 'event_time', 'type', 'description']
        
        for field in allowed_fields:
            if field in updates:
                update_fields.append(f"{field} = ?")
                params.append(updates[field])
        
        if not update_fields:
            return self.get_event_by_id(event_id)
        
        # Add updated_at timestamp
        update_fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        
        # Add event_id for WHERE clause
        params.append(event_id)
        
        query = f"""
            UPDATE calendar_events 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        
        success = self.execute_update(query, tuple(params))
        
        if success:
            return self.get_event_by_id(event_id)
        
        return None
    
    def delete_event(self, event_id: int) -> bool:
        """Delete a calendar event"""
        query = "DELETE FROM calendar_events WHERE id = ?"
        return self.execute_update(query, (event_id,))
    
    def get_events_in_range(self, user_id: str, start_date: str, end_date: str) -> List[Dict]:
        """Get events within a date range"""
        query = """
            SELECT id, user_id, title, event_date, event_time, type, description,
                   created_at, updated_at
            FROM calendar_events 
            WHERE user_id = ? AND event_date >= ? AND event_date <= ?
            ORDER BY event_date ASC, event_time ASC
        """
        
        return self.execute_query(query, (user_id, start_date, end_date))
    
    def get_upcoming_events(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get upcoming events for a user"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        query = """
            SELECT id, user_id, title, event_date, event_time, type, description,
                   created_at, updated_at
            FROM calendar_events 
            WHERE user_id = ? AND event_date >= ?
            ORDER BY event_date ASC, event_time ASC
            LIMIT ?
        """
        
        return self.execute_query(query, (user_id, today, limit))
