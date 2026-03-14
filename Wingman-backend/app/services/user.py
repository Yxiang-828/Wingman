import logging
import uuid
from datetime import datetime, timezone
from app.services.sqlite_base import SQLiteBaseService

logger = logging.getLogger(__name__)

class SQLiteUserService(SQLiteBaseService):
    def __init__(self):
        super().__init__()
        self._ensure_users_table()

    def _ensure_users_table(self):
        query = '''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT,
            name TEXT,
            password TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_synced_at TEXT
        )
        '''
        self.execute_update(query)

    def get_user_by_username_and_password(self, username, password):
        query = "SELECT * FROM users WHERE username = ? AND password = ?"
        results = self.execute_query(query, (username, password))
        return results[0] if results else None

    def check_username_availability(self, username):
        query = "SELECT id FROM users WHERE username = ?"
        results = self.execute_query(query, (username,))
        return len(results) == 0

    def create_user(self, user_data):
        # Check if username exists
        if not self.check_username_availability(user_data['username']):
            return {'error': 'username_taken', 'message': f"Username {user_data['username']} is already in use"}

        query = '''
        INSERT INTO users (id, username, email, name, password, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        '''
        now = datetime.now(timezone.utc).isoformat()
        
        user_id = user_data.get('id', str(uuid.uuid4()))
        success = self.execute_update(query, (
            user_id,
            user_data['username'],
            user_data.get('email', ''),
            user_data.get('name', ''),
            user_data['password'],
            now,
            now
        ))

        if success:
            return self.get_user_by_id(user_id)
        return None

    def get_user_by_id(self, user_id):
        query = "SELECT * FROM users WHERE id = ?"
        results = self.execute_query(query, (user_id,))
        return results[0] if results else None

    def delete_user(self, user_id):
        query = "DELETE FROM users WHERE id = ?"
        return self.execute_update(query, (user_id,))

user_service = SQLiteUserService()

def get_user_by_username_and_password(username, password):
    return user_service.get_user_by_username_and_password(username, password)

def create_user(user_data):
    return user_service.create_user(user_data)

def check_username_availability(username):
    return user_service.check_username_availability(username)

def delete_user(user_id):
    return {"success": user_service.delete_user(user_id)}
