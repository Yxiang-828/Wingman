# =============================================================================
# WINGMAN FUNCTION EXECUTOR
# =============================================================================

import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple
import re
import os
from pathlib import Path

class WingmanFunctionExecutor:
    """
    Database query executor with comprehensive edge case handling
    """
    
    def __init__(self):
        self.db_path = self._get_user_db_path()
        self.MAX_RESULTS = 100  # Hard limit
        self.DEFAULT_LIMIT = 50  # Soft limit for "all" queries

        # Based on database
        self.VALID_TABLES = {
            'tasks': {
                'columns': ['id', 'user_id', 'title', 'task_date', 'task_time', 
                          'completed', 'failed', 'created_at', 'updated_at', 
                          'task_type', 'due_date', 'last_reset_date', 'status', 'recurring_id'],
                'searchable': ['title', 'task_type'],
                'filterable': ['status', 'task_type', 'task_date', 'due_date', 'completed', 'failed'],
                'date_columns': ['task_date', 'due_date', 'last_reset_date', 'created_at', 'updated_at']
            },
            'calendar_events': {
                'columns': ['id', 'user_id', 'title', 'event_date', 'event_time', 
                          'type', 'description', 'created_at', 'updated_at'],
                'searchable': ['title', 'description'],
                'filterable': ['type', 'event_date'],
                'date_columns': ['event_date', 'created_at', 'updated_at']
            },
            'diary_entries': {
                'columns': ['id', 'user_id', 'entry_date', 'title', 'content',
                          'mood', 'created_at', 'updated_at'],
                'searchable': ['title', 'content'],
                'filterable': ['mood', 'entry_date'],
                'date_columns': ['entry_date', 'created_at', 'updated_at']
            },
            'users': {
                'columns': ['id', 'username', 'email', 'name', 'password', 'created_at', 'updated_at'],
                'searchable': ['username', 'email', 'name'],
                'filterable': ['created_at', 'updated_at'],
                'date_columns': ['created_at', 'updated_at']
            }
        }
        
        # 2 query functions
        self.available_functions = {
            'query_items': self.query_items,
            'query_items_range': self.query_items_range
        }

    def _validate_table(self, table: str) -> bool:
        """Validate table name against whitelist"""
        return table in self.VALID_TABLES

    def _validate_user_id(self, user_id: str) -> bool:
        """Validate user ID format"""
        if not user_id or not isinstance(user_id, str):
            return False
        # Basic validation - alphanumeric, dashes, underscores
        return re.match(r'^[a-zA-Z0-9_-]+$', user_id) is not None

    def _validate_date(self, date_str: str) -> Tuple[bool, Optional[str]]:
        """Validate and normalize date string"""
        if not date_str:
            return False, None
            
        try:
            # Try multiple date formats
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
                try:
                    dt = datetime.strptime(str(date_str), fmt)
                    return True, dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            return False, None
        except Exception:
            return False, None

    def _validate_date_range(self, start_date: str, end_date: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Validate date range"""
        start_valid, start_norm = self._validate_date(start_date)
        end_valid, end_norm = self._validate_date(end_date)
        
        if not start_valid or not end_valid:
            return False, None, None
        
        try:
            start_dt = datetime.strptime(start_norm, '%Y-%m-%d')
            end_dt = datetime.strptime(end_norm, '%Y-%m-%d')
            
            # Ensure start <= end
            if start_dt > end_dt:
                start_norm, end_norm = end_norm, start_norm
            
            # Limit range to 1 year maximum
            if (end_dt - start_dt).days > 365:
                end_norm = (start_dt + timedelta(days=365)).strftime('%Y-%m-%d')
            
            return True, start_norm, end_norm
        except Exception:
            return False, None, None

    def _sanitize_text_input(self, text: str) -> str:
        """Sanitize text input for SQL injection prevention"""
        if not text:
            return ""
        # Remove potentially dangerous characters, keep safe ones
        safe_text = re.sub(r'[^\w\s\-\.\@]', '', str(text))
        return safe_text.strip()[:100]  # Limit length

    def _build_filter_clause(self, table: str, filter_type: str, filter_value: str, user_id: str) -> Tuple[str, List[Any]]:
        """Build WHERE clause with parameters - Enhanced for command parser"""
        # Special handling for users table - no user_id filtering
        if table == 'users':
            base_clause = "WHERE 1=1"
            params = []
        else:
            base_clause = "WHERE user_id = ?"
            params = [user_id]
        
        # Always filter by user first
        if filter_type == 'limit':
            try:
                limit = min(int(filter_value), self.MAX_RESULTS)
            except ValueError:
                limit = self.DEFAULT_LIMIT
            return f"{base_clause} ORDER BY created_at DESC LIMIT ?", params + [limit]
        
        # Status filters with manual logic
        elif filter_type == 'status':
            if table == 'tasks':
                if filter_value == 'pending':
                    return f"{base_clause} AND completed = 0 AND failed = 0", params
                elif filter_value == 'completed':
                    return f"{base_clause} AND completed = 1", params
                elif filter_value == 'failed':
                    return f"{base_clause} AND failed = 1", params
                elif filter_value == 'overdue':
                    today = datetime.now().strftime('%Y-%m-%d')
                    return f"{base_clause} AND task_date < ? AND completed = 0 AND failed = 0", params + [today]
            
        # Date filters for status (upcoming/past)
        elif filter_type == 'date_filter':
            if '>=' in filter_value:
                field, date_val = filter_value.split('>=')
                return f"{base_clause} AND {field} >= ?", params + [date_val]
            elif '<' in filter_value:
                field, date_val = filter_value.split('<')
                return f"{base_clause} AND {field} < ?", params + [date_val]
        
        # Type filters
        elif filter_type == 'type' and table == 'calendar_events':
            event_type = self._sanitize_text_input(filter_value)
            return f"{base_clause} AND type = ?", params + [event_type]
        
        elif filter_type == 'mood' and table == 'diary_entries':
            mood = self._sanitize_text_input(filter_value)
            return f"{base_clause} AND mood = ?", params + [mood]
        
        # Column selector for users table - special handling
        elif filter_type == 'column' and table == 'users':
            if filter_value in ['username', 'email', 'name', 'password', 'created_at']:
                # For users table column query, find the current user by user_id
                return f"WHERE id = ? LIMIT 1", [user_id]
        
        elif filter_type == 'task_type' and table == 'tasks':
            task_type = self._sanitize_text_input(filter_value)
            return f"{base_clause} AND task_type = ?", params + [task_type]
        
        elif filter_type == 'date':
            is_valid, normalized_date = self._validate_date(filter_value)
            if is_valid:
                date_col = self.VALID_TABLES[table]['date_columns'][0]  # Primary date column
                return f"{base_clause} AND {date_col} = ?", params + [normalized_date]
        
        elif filter_type == 'text_search':
            search_term = f"%{self._sanitize_text_input(filter_value)}%"
            searchable_cols = self.VALID_TABLES[table]['searchable']
            
            # Build OR clause for all searchable columns
            search_conditions = []
            for col in searchable_cols:
                search_conditions.append(f"{col} LIKE ?")
                params.append(search_term)
            
            if search_conditions:
                search_clause = " OR ".join(search_conditions)
                return f"{base_clause} AND ({search_clause})", params
        
        # Fallback: return base clause with default limit
        return f"{base_clause} ORDER BY created_at DESC LIMIT ?", params + [self.DEFAULT_LIMIT]

    def query_items(self, table: str, filter_type: str, filter_value: str, user_id: str) -> Dict[str, Any]:
        """
        MODULAR FUNCTION 1: Single filter queries with comprehensive validation
        """
        try:
            # Validate inputs
            if not self._validate_table(table):
                return {
                    'success': False,
                    'error': 'invalid_table',
                    'message': f'Invalid table: {table}. Valid tables: {list(self.VALID_TABLES.keys())}',
                    'data': [],
                    'count': 0
                }

        
            if not self._validate_user_id(user_id):
                return {
                    'success': False,
                    'error': 'invalid_user_id', 
                    'message': 'Invalid user ID format',
                    'data': [],
                    'count': 0
                }

            # Build query
            where_clause, params = self._build_filter_clause(table, filter_type, filter_value, user_id)

            # Special handling for users table column queries
            if table == 'users' and filter_type == 'column':
                select_clause = f"SELECT {filter_value}"
                query = f"{select_clause} FROM {table} {where_clause}"
            else:
                query = f"SELECT * FROM {table} {where_clause}"

            # Execute query
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()

                cursor.execute(query, params)

                rows = cursor.fetchall()
                results = [dict(row) for row in rows]

                # Apply hard limit
                if len(results) > self.MAX_RESULTS:
                    results = results[:self.MAX_RESULTS]

                return {
                    'success': True,
                    'data': results,
                    'count': len(results),
                    'table': table,
                    'filter_applied': f"{filter_type}={filter_value}",
                    'user_id': user_id,
                    'query_type': 'single_filter'
                }

        except sqlite3.Error as e:
            return {
                'success': False,
                'error': 'database_error',
                'message': f'Database error: {str(e)}',
                'data': [],
                'count': 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': 'unexpected_error',
                'message': f'Unexpected error: {str(e)}',
                'data': [],
                'count': 0
            }

    def query_items_range(self, table: str, start_date: str, end_date: str, user_id: str) -> Dict[str, Any]:
        """
        MODULAR FUNCTION 2: Date range queries with comprehensive validation
        """
        try:
            # Validate inputs
            if not self._validate_table(table):
                return {
                    'success': False,
                    'error': 'invalid_table',
                    'message': f'Invalid table: {table}',
                    'data': [],
                    'count': 0
                }
            
            if not self._validate_user_id(user_id):
                return {
                    'success': False,
                    'error': 'invalid_user_id',
                    'message': 'Invalid user ID format',
                    'data': [],
                    'count': 0
                }
            
            # Validate date range
            range_valid, start_norm, end_norm = self._validate_date_range(start_date, end_date)
            if not range_valid:
                return {
                    'success': False,
                    'error': 'invalid_date_range',
                    'message': 'Invalid date range format',
                    'data': [],
                    'count': 0
                }
            
            # Build range query
            date_column = self.VALID_TABLES[table]['date_columns'][0]  # Primary date column
            query = f"SELECT * FROM {table} WHERE user_id = ? AND {date_column} BETWEEN ? AND ? ORDER BY {date_column} DESC, created_at DESC"
            params = [user_id, start_norm, end_norm]
            
            # Execute query
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                results = [dict(row) for row in rows]
                
                # Apply hard limit
                if len(results) > self.MAX_RESULTS:
                    results = results[:self.MAX_RESULTS]
                
                return {
                    'success': True,
                    'data': results,
                    'count': len(results),
                    'table': table,
                    'date_range': f"{start_norm} to {end_norm}",
                    'user_id': user_id,
                    'query_type': 'date_range'
                }
                
        except sqlite3.Error as e:
            return {
                'success': False,
                'error': 'database_error',
                'message': f'Database error: {str(e)}',
                'data': [],
                'count': 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': 'unexpected_error',
                'message': f'Unexpected error: {str(e)}',
                'data': [],
                'count': 0
            }

    def parse_and_execute_functions(self, llm_response: str, user_id: str) -> Tuple[str, List[Dict]]:
        """
        Parse function calls from LLM response and execute them
        Returns: (formatted_results, function_metadata)
        """
        
        function_calls = self._extract_function_calls(llm_response)
        if not function_calls:
            return "No function calls found in the response.", []
        
        all_results = []
        executed_functions = []
        
        for func_call in function_calls:
            try:
                result = self._execute_function(func_call, user_id)
                if result['success']:
                    all_results.extend(result['data'])
                    executed_functions.append({
                        'function': func_call['function'],
                        'parameters': func_call['parameters'],
                        'result_count': result['count'],
                        'success': True
                    })
                else:
                    executed_functions.append({
                        'function': func_call['function'],
                        'parameters': func_call['parameters'],
                        'error': result['message'],
                        'success': False
                    })
            except Exception as e:
                executed_functions.append({
                    'function': func_call['function'],
                    'parameters': func_call['parameters'],
                    'error': str(e),
                    'success': False
                })
        
        # Format results for display
        formatted_results = self._format_results(all_results, function_calls[0]['function'], function_calls[0]['parameters'])
        
        return formatted_results, executed_functions

    def _extract_function_calls(self, text: str) -> List[Dict]:
        """Extract function calls from LLM response"""
        pattern = r'FUNCTION_CALL:\s*(\w+)\((.*?)\)'
        matches = re.findall(pattern, text)
        
        function_calls = []
        for match in matches:
            function_name = match[0]
            parameters_str = match[1]
            
            # Parse parameters
            parameters = self._parse_parameters(parameters_str)
            
            function_calls.append({
                'function': function_name,
                'parameters': parameters,
                'raw_call': f"FUNCTION_CALL: {function_name}({parameters_str})"
            })
        
        return function_calls

    def _parse_parameters(self, params_str: str) -> Dict:
        """Parse function parameters from string"""
        params_str = params_str.strip()
        if not params_str:
            return {}
        
        # Handle quoted parameters
        param_pattern = r"'([^']*)'|\"([^\"]*)\"|(\w+)"
        matches = re.findall(param_pattern, params_str)
        
        params = []
        for match in matches:
            # Get the non-empty group
            param = match[0] or match[1] or match[2]
            if param:
                params.append(param)
        
        # Map to function parameter names
        if len(params) >= 4:
            return {
                'table': params[0],
                'filter_type': params[1], 
                'filter_value': params[2],
                'user_id': params[3]
            }
        elif len(params) >= 3 and 'range' in params_str:
            return {
                'table': params[0],
                'start_date': params[1],
                'end_date': params[2],
                'user_id': params[3] if len(params) > 3 else 'default-user-123' # Default user ID if not provided (When i am testing)
            }
        
        return {}

    def _execute_function(self, func_call: Dict, user_id: str) -> Dict[str, Any]:
        """Execute a single function call"""
        function_name = func_call['function']
        parameters = func_call['parameters']
        
        if function_name == 'query_items':
            return self.query_items(
                table=parameters.get('table', 'tasks'),
                filter_type=parameters.get('filter_type', 'limit'),
                filter_value=parameters.get('filter_value', '50'),
                user_id=parameters.get('user_id', user_id)
            )
        elif function_name == 'query_items_range':
            return self.query_items_range(
                table=parameters.get('table', 'tasks'),
                start_date=parameters.get('start_date', '2025-01-01'),
                end_date=parameters.get('end_date', '2025-12-31'),
                user_id=parameters.get('user_id', user_id)
            )
        else:
            return {
                'success': False,
                'error': 'unknown_function',
                'message': f'Unknown function: {function_name}',
                'data': [],
                'count': 0
            }

    def _format_results(self, results: List[Dict], function_name: str, params: Dict) -> str:
        """Format query results for display"""
        if not results:
            return "No data found for your query."
        
        table = params.get('table', 'unknown')
        
        if table == 'tasks':
            return self._format_tasks(results)
        elif table == 'calendar_events':
            return self._format_events(results)
        elif table == 'diary_entries':
            return self._format_diary_entries(results)
        else:
            return f"Found {len(results)} items."

    def _format_tasks(self, tasks: List[Dict]) -> str:
        """Format task results"""
        if not tasks:
            return "No tasks found."
        
        formatted = f"Found {len(tasks)} task(s):\n\n"
        for task in tasks:
            status = "✅" if task.get('completed') else "📋"
            formatted += f"{status} {task.get('title', 'Untitled')}\n"
            formatted += f"   📅 {task.get('task_date', 'No date')}"
            if task.get('task_time'):
                formatted += f" at {task.get('task_time')}"
            if task.get('task_type'):
                formatted += f" ({task.get('task_type')})"
            formatted += "\n\n"
        
        return formatted

    def _format_events(self, events: List[Dict]) -> str:
        """Format event results"""
        if not events:
            return "No events found."
        
        formatted = f"Found {len(events)} event(s):\n\n"
        for event in events:
            formatted += f"🗓️ {event.get('title', 'Untitled Event')}\n"
            formatted += f"   📅 {event.get('event_date', 'No date')}"
            if event.get('event_time'):
                formatted += f" at {event.get('event_time')}"
            if event.get('type'):
                formatted += f" ({event.get('type')})"
            formatted += "\n\n"
        
        return formatted

    def _format_diary_entries(self, entries: List[Dict]) -> str:
        """Format diary entry results"""
        if not entries:
            return "No diary entries found."
        
        formatted = f"Found {len(entries)} diary entr{'ies' if len(entries) > 1 else 'y'}:\n\n"
        for entry in entries:
            mood_emoji = {"happy": "😊", "sad": "😢", "excited": "🎉", "calm": "😌"}.get(entry.get('mood', ''), "💭")
            formatted += f"{mood_emoji} {entry.get('title', 'Untitled Entry')}\n"
            formatted += f"   📅 {entry.get('entry_date', 'No date')}"
            if entry.get('mood'):
                formatted += f" (Mood: {entry.get('mood')})"
            formatted += "\n\n"
        
        return formatted

    def _get_user_db_path(self):
        """Get the user's database path"""
        return os.path.join(os.path.expanduser("~"), "AppData", "Roaming", "wingman", "wingman-data", "wingman.db")
