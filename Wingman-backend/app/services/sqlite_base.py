"""
SQLite Base Service for Wingman Backend
Provides unified SQLite database access for all backend services
"""

import sqlite3
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

class SQLiteBaseService:
    """
    Base service for SQLite operations
    Provides common database utilities for all Wingman services
    """
    
    def __init__(self):
        self.db_path = self._get_database_path()
        self._ensure_database_exists()
    
    def _get_database_path(self) -> str:
        """Get the SQLite database path"""
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
    
    def _ensure_database_exists(self):
        """Ensure database exists and is initialized"""
        if not os.path.exists(self.db_path):
            # Initialize database using existing schema
            from app.services.llm.database_init import init_local_database
            init_local_database(self.db_path)
    
    def get_connection(self):
        """Get SQLite database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dicts
        return conn
    
    def execute_query(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute SELECT query and return results"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            print(f"SQLite query error: {e}")
            return []
    
    def execute_insert(self, query: str, params: tuple = ()) -> Optional[int]:
        """Execute INSERT query and return last row ID"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"SQLite insert error: {e}")
            return None
    
    def execute_update(self, query: str, params: tuple = ()) -> bool:
        """Execute UPDATE/DELETE query and return success"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"SQLite update error: {e}")
            return False
