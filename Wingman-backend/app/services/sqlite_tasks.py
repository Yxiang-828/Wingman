"""
SQLite-based Task Service
Replaces Supabase-based task operations with direct SQLite access
"""

from typing import List, Dict, Optional
from datetime import datetime
from app.services.sqlite_base import SQLiteBaseService

class SQLiteTaskService(SQLiteBaseService):
    """
    SQLite-based task operations
    """
    
    def get_tasks_by_date(self, user_id: str, date_str: str) -> List[Dict]:
        """Get tasks for a specific date and user"""
        query = """
            SELECT id, user_id, title, task_date, task_time, completed, failed, 
                   created_at, updated_at, task_type, status, recurring_id
            FROM tasks 
            WHERE user_id = ? AND task_date = ?
            ORDER BY task_time ASC, created_at ASC
        """
        
        results = self.execute_query(query, (user_id, date_str))
        
        # Add compatibility fields for frontend
        for task in results:
            task["date"] = task["task_date"]
            task["time"] = task.get("task_time", "")
        
        return results
    
    def get_all_tasks(self, user_id: str) -> List[Dict]:
        """Get all tasks for a user"""
        query = """
            SELECT id, user_id, title, task_date, task_time, completed, failed,
                   created_at, updated_at, task_type, status, recurring_id
            FROM tasks 
            WHERE user_id = ?
            ORDER BY task_date DESC, task_time ASC
        """
        
        return self.execute_query(query, (user_id,))
    
    def create_task(self, task_data: Dict) -> Optional[Dict]:
        """Create a new task"""
        query = """
            INSERT INTO tasks (user_id, title, task_date, task_time, completed, failed, task_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            task_data.get('user_id'),
            task_data.get('title'),
            task_data.get('task_date', ''),
            task_data.get('task_time', ''),
            task_data.get('completed', False),
            task_data.get('failed', False),
            task_data.get('task_type', '')
        )
        
        task_id = self.execute_insert(query, params)
        
        if task_id:
            # Return the created task
            return self.get_task_by_id(task_id)
        
        return None
    
    def get_task_by_id(self, task_id: int) -> Optional[Dict]:
        """Get a task by ID"""
        query = """
            SELECT id, user_id, title, task_date, task_time, completed, failed,
                   created_at, updated_at, task_type, status, recurring_id
            FROM tasks 
            WHERE id = ?
        """
        
        results = self.execute_query(query, (task_id,))
        return results[0] if results else None
    
    def update_task(self, task_id: int, updates: Dict) -> Optional[Dict]:
        """Update a task"""
        # Build dynamic update query
        update_fields = []
        params = []
        
        allowed_fields = ['title', 'task_date', 'task_time', 'completed', 'failed', 'task_type', 'status']
        
        for field in allowed_fields:
            if field in updates:
                update_fields.append(f"{field} = ?")
                params.append(updates[field])
        
        if not update_fields:
            return self.get_task_by_id(task_id)
        
        # Add updated_at timestamp
        update_fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        
        # Add task_id for WHERE clause
        params.append(task_id)
        
        query = f"""
            UPDATE tasks 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        
        success = self.execute_update(query, tuple(params))
        
        if success:
            return self.get_task_by_id(task_id)
        
        return None
    
    def delete_task(self, task_id: int) -> bool:
        """Delete a task"""
        query = "DELETE FROM tasks WHERE id = ?"
        return self.execute_update(query, (task_id,))
    
    def get_pending_tasks(self, user_id: str) -> List[Dict]:
        """Get all pending (not completed) tasks for a user"""
        query = """
            SELECT id, user_id, title, task_date, task_time, completed, failed,
                   created_at, updated_at, task_type, status, recurring_id
            FROM tasks 
            WHERE user_id = ? AND completed = FALSE AND failed = FALSE
            ORDER BY task_date ASC, task_time ASC
        """
        
        return self.execute_query(query, (user_id,))
    
    def get_completed_tasks(self, user_id: str, date_str: Optional[str] = None) -> List[Dict]:
        """Get completed tasks for a user, optionally filtered by date"""
        if date_str:
            query = """
                SELECT id, user_id, title, task_date, task_time, completed, failed,
                       created_at, updated_at, task_type, status, recurring_id
                FROM tasks 
                WHERE user_id = ? AND completed = TRUE AND task_date = ?
                ORDER BY task_date DESC, task_time ASC
            """
            return self.execute_query(query, (user_id, date_str))
        else:
            query = """
                SELECT id, user_id, title, task_date, task_time, completed, failed,
                       created_at, updated_at, task_type, status, recurring_id
                FROM tasks 
                WHERE user_id = ? AND completed = TRUE
                ORDER BY task_date DESC, task_time ASC
            """
            return self.execute_query(query, (user_id,))
