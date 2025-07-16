# =============================================================================
# WINGMAN COMMAND PARSER
# Maps slash commands
# =============================================================================

import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from .function_executor import WingmanFunctionExecutor

class WingmanCommandParser:
    """
    Clean command parser that follows the manual exactly
    """
    
    # Class-level pagination state (shared across all instances)
    _last_query_data = None
    _current_page = 0
    
    def __init__(self):
        self.function_executor = WingmanFunctionExecutor()
        
        # Instance variables for display limits
        self.max_display = 50  # Default for most content
        
        # Table mapping
        self.TABLE_MAP = {
            '/t': 'tasks',
            '/e': 'calendar_events', 
            '/d': 'diary_entries',
            '/u': 'users'
        }
        
        # Month mapping
        self.MONTH_MAP = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
            '01': '01', '02': '02', '03': '03', '04': '04',
            '05': '05', '06': '06', '07': '07', '08': '08',
            '09': '09', '10': '10', '11': '11', '12': '12'
        }
        
    def execute_command(self, command: str, user_id: str = "default-user-123") -> Dict[str, Any]:
        """Main entry point - returns properly formatted response"""
        try:
            # Special command to show manual
            if command.strip().lower() in ['/help', '/manual', '/commands']:
                return self._show_manual()
            
            # Handle /more command for pagination
            if command.strip().lower() == '/more':
                return self._handle_more_command()
            
            # Parse command
            parts = command.strip().split()
            if len(parts) < 1:
                return self._error("Empty command")
            
            # Handle /u special case (can be standalone)
            if parts[0] == '/u':
                return self._handle_users_command(parts, user_id)
            
            # Regular commands need at least 3 parts: /table /filter param
            if len(parts) < 3:
                return self._error("Invalid command structure. Format: /{table} /{filter} {parameter}")
            
            table_selector = parts[0]
            filter_type = parts[1]
            filter_parameter = parts[2]
            options = parts[3:] if len(parts) > 3 else []
            
            # Validate table
            if table_selector not in self.TABLE_MAP:
                return self._error("invalid_table", f"Invalid table. Use: {list(self.TABLE_MAP.keys())}")
            
            table = self.TABLE_MAP[table_selector]
            
            # Route based on filter type
            return self._route_filter(table, filter_type, filter_parameter, options, user_id)
            
        except Exception as e:
            return self._error("command_parse_error", f"Parse error: {str(e)}")
    
    def _handle_users_command(self, parts: List[str], user_id: str) -> Dict[str, Any]:
        """Handle special users commands"""
        if len(parts) == 1:
            # /u -> does nothing, show error
            return self._error("incomplete_command", "/u requires a column. Use: /u /username, /u /email, etc.")
        elif len(parts) == 2 and parts[1] in ['/username', '/email', '/name', '/password', '/created']:
            # /u /column -> specific column for current user
            column = parts[1][1:]  # Remove leading /
            result = self.function_executor.query_items('users', 'column', column, user_id)
            
            # For single column queries, format differently
            return self._format_single_column_result(result, column)
        else:
            return self._error("command_parse_error", "Invalid users command. Use: /u /{column} where column is username, email, name, password, or created")
    
    def _format_single_column_result(self, result: Dict[str, Any], column: str) -> Dict[str, Any]:
        """Format result for single column user queries - clean and performant"""
        if result['success']:
            count = result.get('count', 0)
            formatted_response = f"Found {count} user {column}"
            
            if count > 0:
                formatted_response += f"\n\nShowing {count} of {count} results:\n\n"
                
                # Create clean single-column table
                column_header = column.upper()
                table = f"| {column_header} |\n"
                table += f"|{''.join(['-' for _ in range(len(column_header) + 2)])}|\n"
                
                for item in result['data']:
                    value = item.get(column, '-') or '-'
                    table += f"| {value} |\n"
                
                formatted_response += table
            
            return {
                'success': True,
                'mode': 'command',
                'response': formatted_response,
                'formatted_response': formatted_response,
                'command_executed': f"user {column}",
                'function_calls': [{'function': 'query_executed', 'parameters': f"user {column}"}],
                'record_count': count,
                'data': result['data'],
                'count': count
            }
        else:
            error_msg = result.get('error', 'Command execution failed')
            return {
                'success': False,
                'mode': 'command_error',
                'response': f"Error: {error_msg}",
                'formatted_response': f"Error: {error_msg}",
                'command_executed': f"user {column}",
                'function_calls': [],
                'record_count': 0,
                'error': error_msg
            }
    
    def _route_filter(self, table: str, filter_type: str, filter_parameter: str, options: List[str], user_id: str) -> Dict[str, Any]:
        """Route to appropriate filter handler"""
        # Extract limit from options
        limit = self._extract_limit(options)
        
        try:
            if filter_type == '/m':
                return self._handle_month_filter(table, filter_parameter, limit, user_id)
            elif filter_type == '/d':
                return self._handle_day_filter(table, filter_parameter, limit, user_id)
            elif filter_type == '/st':
                return self._handle_status_filter(table, filter_parameter, limit, user_id)
            elif filter_type == '/ty':
                return self._handle_type_filter(table, filter_parameter, limit, user_id)
            elif filter_type == '/s':
                return self._handle_search_filter(table, filter_parameter, limit, user_id)
            elif filter_type == '/l':
                return self._handle_limit_filter(table, filter_parameter, user_id)
            else:
                return self._error("invalid_filter", f"Invalid filter type: {filter_type}")
        except Exception as e:
            return self._error("execution_error", f"Filter execution failed: {str(e)}")
    
    def _handle_month_filter(self, table: str, month: str, limit: Optional[int], user_id: str) -> Dict[str, Any]:
        """Handle month filter"""
        if month not in self.MONTH_MAP:
            return self._error("invalid_month", f"Invalid month: {month}")
        
        month_num = self.MONTH_MAP[month]
        year = datetime.now().year
        start_date = f"{year}-{month_num}-01"
        
        # Calculate end date
        if month_num == '02':
            last_day = '28' if year % 4 != 0 else '29'
        elif month_num in ['04', '06', '09', '11']:
            last_day = '30'
        else:
            last_day = '31'
        end_date = f"{year}-{month_num}-{last_day}"
        
        result = self.function_executor.query_items_range(table, start_date, end_date, user_id)
        
        # Apply limit if specified
        if limit and result['success'] and result['data']:
            result['data'] = result['data'][:limit]
            result['count'] = len(result['data'])
        
        return self._format_result(result, f"{table} for {month}")
    
    def _handle_day_filter(self, table: str, day: str, limit: Optional[int], user_id: str) -> Dict[str, Any]:
        """Handle day filter"""
        today = datetime.now()
        
        if day == 'today':
            target_date = today.strftime('%Y-%m-%d')
        elif day == 'yest':
            target_date = (today - timedelta(days=1)).strftime('%Y-%m-%d')
        elif day == 'tom':
            target_date = (today + timedelta(days=1)).strftime('%Y-%m-%d')
        elif re.match(r'^\d{4}-\d{2}-\d{2}$', day):
            target_date = day
        elif re.match(r'^\d{2}-\d{2}$', day):
            target_date = f"{today.year}-{day}"
        elif re.match(r'^\d{1,2}$', day):
            target_date = f"{today.year}-{today.month:02d}-{int(day):02d}"
        else:
            return self._error("invalid_date", f"Invalid day format: {day}")
        
        # Use range query for single day
        result = self.function_executor.query_items_range(table, target_date, target_date, user_id)
        
        if limit and result['success'] and result['data']:
            result['data'] = result['data'][:limit]
            result['count'] = len(result['data'])
        
        return self._format_result(result, f"{table} for {day}")
    
    def _handle_status_filter(self, table: str, status: str, limit: Optional[int], user_id: str) -> Dict[str, Any]:
        """Handle status filter"""
        if table == 'tasks':
            if status == 'pending':
                result = self.function_executor.query_items(table, 'status', 'pending', user_id)
            elif status == 'completed':
                result = self.function_executor.query_items(table, 'completed', '1', user_id)
            elif status == 'failed':
                result = self.function_executor.query_items(table, 'failed', '1', user_id)
            else:
                return self._error("invalid_status", f"Invalid task status: {status}")
        elif table == 'calendar_events':
            if status == 'upcoming':
                today = datetime.now().strftime('%Y-%m-%d')
                result = self.function_executor.query_items(table, 'event_date_gte', today, user_id)
            elif status == 'past':
                today = datetime.now().strftime('%Y-%m-%d')
                result = self.function_executor.query_items(table, 'event_date_lt', today, user_id)
            else:
                return self._error("invalid_status", f"Invalid event status: {status}")
        else:
            return self._error("invalid_combination", f"Status filter not supported for {table}")
        
        if limit and result['success'] and result['data']:
            result['data'] = result['data'][:limit]
            result['count'] = len(result['data'])
        
        return self._format_result(result, f"{table} with status {status}")
    
    def _handle_type_filter(self, table: str, type_value: str, limit: Optional[int], user_id: str) -> Dict[str, Any]:
        """Handle type filter"""
        if table == 'calendar_events':
            if type_value not in ['Work', 'Meeting', 'Reminder']:
                return self._error("invalid_type", f"Invalid event type: {type_value}")
            result = self.function_executor.query_items(table, 'type', type_value, user_id)
        elif table == 'diary_entries':
            if type_value not in ['happy', 'excited', 'neutral', 'sad', 'anxious']:
                return self._error("invalid_type", f"Invalid mood: {type_value}")
            result = self.function_executor.query_items(table, 'mood', type_value, user_id)
        else:
            return self._error("invalid_combination", f"Type filter not supported for {table}")
        
        if limit and result['success'] and result['data']:
            result['data'] = result['data'][:limit]
            result['count'] = len(result['data'])
        
        return self._format_result(result, f"{table} with type {type_value}")
    
    def _handle_search_filter(self, table: str, search_term: str, limit: Optional[int], user_id: str) -> Dict[str, Any]:
        """Handle search filter"""
        result = self.function_executor.query_items(table, 'text_search', search_term, user_id)
        
        if limit and result['success'] and result['data']:
            result['data'] = result['data'][:limit]
            result['count'] = len(result['data'])
        
        return self._format_result(result, f"{table} search for '{search_term}'")
    
    def _handle_limit_filter(self, table: str, limit_str: str, user_id: str) -> Dict[str, Any]:
        """Handle limit-only filter"""
        try:
            limit = int(limit_str)
            if limit < 1 or limit > 100:
                return self._error("invalid_limit", "Limit must be 1-100")
            
            result = self.function_executor.query_items(table, 'limit', str(limit), user_id)
            return self._format_result(result, f"{table} (limit {limit})")
        except ValueError:
            return self._error("invalid_limit", f"Invalid limit: {limit_str}")
    
    def _extract_limit(self, options: List[str]) -> Optional[int]:
        """Extract limit from options like ['/l', '20']"""
        try:
            if '/l' in options:
                idx = options.index('/l')
                if idx + 1 < len(options):
                    limit = int(options[idx + 1])
                    if 1 <= limit <= 100:
                        return limit
        except (ValueError, IndexError):
            pass
        return None
    
    def _show_manual(self) -> Dict[str, Any]:
        """Show the command manual"""
        import os
        try:
            manual_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'WINGMAN_COMMAND_GUIDE.md')
            with open(manual_path, 'r', encoding='utf-8') as f:
                manual_content = f.read()
            
            # full guide
            formatted_manual = f"📖 **WINGMAN COMMAND GUIDE**\n\n{manual_content}"
            
            return {
                'success': True,
                'mode': 'command',
                'response': formatted_manual,
                'formatted_response': formatted_manual,
                'command_executed': "show manual",
                'function_calls': [],
                'record_count': 1
            }
        except Exception as e:
            return {
                'success': False,
                'mode': 'command_error',
                'response': f"Error loading manual: {str(e)}",
                'formatted_response': f"Error loading manual: {str(e)}",
                'error': 'manual_load_error',
                'command_executed': "show manual",
                'function_calls': [],
                'record_count': 0
            }
    
    def _handle_more_command(self) -> Dict[str, Any]:
        """Handle /more command for pagination"""
        if not WingmanCommandParser._last_query_data:
            return self._error("no_previous_query", "No previous query to paginate. Run a query first.")
        
        data = WingmanCommandParser._last_query_data['data']
        description = WingmanCommandParser._last_query_data['description']
        is_diary = WingmanCommandParser._last_query_data['is_diary']
        total_count = len(data)
        
        max_display = 15 if is_diary else 50
        start_idx = (WingmanCommandParser._current_page + 1) * max_display
        
        if start_idx >= total_count:
            return self._error("no_more_results", "No more results to display.")
        
        end_idx = min(start_idx + max_display, total_count)
        page_data = data[start_idx:end_idx]
        WingmanCommandParser._current_page += 1
        
        formatted_response = f"Showing results {start_idx + 1}-{end_idx} of {total_count} {description}"
        formatted_response += f"\n\n"
        
        # Format as markdown table
        table_content = self._format_as_table(page_data)
        formatted_response += table_content
        
        # Check if there are still more results
        if end_idx < total_count:
            remaining = total_count - end_idx
            formatted_response += f"\n... and {remaining} more results available.\n"
            formatted_response += f"Type '/more' to see the next {min(remaining, max_display)} results."
        
        return {
            'success': True,
            'mode': 'command',
            'response': formatted_response,
            'formatted_response': formatted_response,
            'command_executed': f"show more {description}",
            'function_calls': [{'function': 'pagination', 'parameters': f'page {WingmanCommandParser._current_page + 1}'}],
            'record_count': len(page_data)
        }
    
    def _format_result(self, result: Dict[str, Any], description: str) -> Dict[str, Any]:
        """Format result with required fields"""
        if result['success']:
            count = result.get('count', 0)
            formatted_response = f"Found {count} {description}"
            if count > 0:
                # Determine display limit based on content type
                is_diary = 'diary' in description.lower()
                max_display = 15 if is_diary else 50
                display_count = min(count, max_display)
                
                # Store pagination data for /more command
                WingmanCommandParser._last_query_data = {
                    'data': result['data'],
                    'description': description,
                    'is_diary': is_diary
                }
                WingmanCommandParser._current_page = 0  # Reset to first page
                
                formatted_response += f"\n\nShowing {display_count} of {count} results:\n\n"
                
                # Format as markdown table
                table_content = self._format_as_table(result['data'][:display_count])
                formatted_response += table_content
                
                # If there are more results, prompt user
                if count > max_display:
                    remaining = count - max_display
                    formatted_response += f"\n\n... and {remaining} more results available.\n"
                    formatted_response += f"Type '/more' to see the next {min(remaining, max_display)} results."
            
            return {
                'success': True,
                'mode': 'command',
                'response': formatted_response,
                'formatted_response': formatted_response,  # Required field
                'command_executed': description,
                'function_calls': [{'function': 'query_executed', 'parameters': description}],
                'record_count': count,
                'data': result['data'],
                'count': count
            }
        else:
            error_msg = result.get('error', 'Command execution failed')
            return {
                'success': False,
                'mode': 'command_error',
                'response': f"Error: {error_msg}",
                'formatted_response': f"Error: {error_msg}",  # Required field
                'command_executed': description,
                'function_calls': [],
                'record_count': 0,
                'error': error_msg
            }
    
    def _format_as_table(self, data: List[Dict[str, Any]]) -> str:
        """Format data as clean, performant markdown table"""
        if not data:
            return "No data to display."
        
        # Determine table type and columns based on first item
        first_item = data[0]
        excluded_fields = {'created_at', 'updated_at', 'id', 'user_id'}
        
        if 'title' in first_item:
            # Tasks, Events, Diary entries
            if 'task_date' in first_item:
                # Tasks - Clean, simple format
                table = "| Title | Date | Time | Status | Type |\n"
                table += "|-------|------|------|--------|------|\n"
                
                for item in data:
                    title = item.get('title', 'Untitled')
                    date = item.get('task_date', '-')
                    time = item.get('task_time', '-')
                    
                    # Simple status without emojis for performance
                    if item.get('completed'):
                        status = 'Completed'
                    elif item.get('failed'):
                        status = 'Failed'
                    else:
                        status = 'Pending'
                    
                    task_type = item.get('task_type', '-') or '-'
                    
                    table += f"| {title} | {date} | {time} | {status} | {task_type} |\n"
                    
            elif 'event_date' in first_item:
                # Events - Full content display
                table = "| Title | Date | Time | Type | Description |\n"
                table += "|-------|------|------|------|-------------|\n"
                
                for item in data:
                    title = item.get('title', 'Untitled')
                    date = item.get('event_date', '-')
                    time = item.get('event_time', '-')
                    event_type = item.get('type', '-') or '-'
                    desc = item.get('description', '-') or '-'
                    
                    table += f"| {title} | {date} | {time} | {event_type} | {desc} |\n"
                    
            elif 'entry_date' in first_item:
                # Diary entries - Full content display
                table = "| Title | Date | Mood | Content |\n"
                table += "|-------|------|------|--------|\n"
                
                for item in data:
                    title = item.get('title', 'Untitled')
                    date = item.get('entry_date', '-')
                    mood = item.get('mood', '-') or '-'
                    content = item.get('content', '-') or '-'
                    
                    table += f"| {title} | {date} | {mood} | {content} |\n"
            else:
                # Generic title-based table
                table = "| Title | Details |\n"
                table += "|-------|--------|\n"
                
                for item in data:
                    title = item.get('title', 'Untitled')
                    details = str(item)
                    table += f"| {title} | {details} |\n"
                
        elif 'username' in first_item:
            # Users - Clean format
            table = "| Username | Email | Name |\n"
            table += "|----------|-------|------|\n"
            
            for item in data:
                username = item.get('username', '-') or '-'
                email = item.get('email', '-') or '-'
                name = item.get('name', '-') or '-'
                
                table += f"| {username} | {email} | {name} |\n"
                
        else:
            # Generic table - show all non-excluded fields with full content
            visible_fields = [k for k in first_item.keys() if k not in excluded_fields]
            
            # Create header
            table = "| " + " | ".join(visible_fields) + " |\n"
            table += "|" + "|".join(['------' for _ in visible_fields]) + "|\n"
            
            # Add rows with full content
            for item in data:
                row_values = []
                for field in visible_fields:
                    value = str(item.get(field, '-') or '-')
                    row_values.append(value)
                table += "| " + " | ".join(row_values) + " |\n"
        
        return table
    
    def _format_item(self, item: Dict[str, Any]) -> str:
        """Format a single item for display with all relevant fields"""
        # Exclude system fields
        excluded_fields = {'created_at', 'updated_at', 'id'}
        
        # Format based on item type
        if 'title' in item:
            # Tasks, Events, Diary entries
            formatted = f"**{item['title']}**"
            
            # Add relevant fields based on what's available
            details = []
            
            # Date/Time info
            if 'task_date' in item and item['task_date']:
                details.append(f"Date: {item['task_date']}")
            if 'event_date' in item and item['event_date']:
                details.append(f"Date: {item['event_date']}")
            if 'entry_date' in item and item['entry_date']:
                details.append(f"Date: {item['entry_date']}")
            
            if 'task_time' in item and item['task_time']:
                details.append(f"Time: {item['task_time']}")
            if 'event_time' in item and item['event_time']:
                details.append(f"Time: {item['event_time']}")
            
            # Status info
            if 'completed' in item and item['completed']:
                details.append("✅ Completed")
            elif 'failed' in item and item['failed']:
                details.append("❌ Failed")
            elif 'status' in item and item['status']:
                details.append(f"Status: {item['status']}")
            
            # Type/Category info
            if 'type' in item and item['type']:
                details.append(f"Type: {item['type']}")
            if 'mood' in item and item['mood']:
                details.append(f"Mood: {item['mood']}")
            if 'task_type' in item and item['task_type']:
                details.append(f"Type: {item['task_type']}")
            
            # Description/Content
            if 'description' in item and item['description']:
                desc = item['description'][:100] + '...' if len(item['description']) > 100 else item['description']
                details.append(f"Description: {desc}")
            if 'content' in item and item['content']:
                content = item['content'][:100] + '...' if len(item['content']) > 100 else item['content']
                details.append(f"Content: {content}")
            
            if details:
                formatted += f" | {' | '.join(details)}"
                
        elif 'username' in item:
            # Users
            formatted = f"**{item['username']}**"
            details = []
            
            if 'email' in item and item['email']:
                details.append(f"Email: {item['email']}")
            if 'name' in item and item['name']:
                details.append(f"Name: {item['name']}")
                
            if details:
                formatted += f" | {' | '.join(details)}"
                
        elif 'message' in item:
            # Chat/Messages
            formatted = item['message'][:100] + '...' if len(item.get('message', '')) > 100 else item.get('message', '')
            
        else:
            # Fallback: show all non-excluded fields
            formatted = ""
            for key, value in item.items():
                if key not in excluded_fields and value:
                    formatted += f"{key}: {value} | "
            formatted = formatted.rstrip(' | ') or 'Unknown'
        
        return formatted
    
    def _error(self, error_type: str, message: str = "") -> Dict[str, Any]:
        """Return standardized error response"""
        full_message = f"Command error: {error_type}"
        if message:
            full_message += f" - {message}"
        
        return {
            'success': False,
            'mode': 'command_error',
            'response': full_message,
            'formatted_response': full_message,  # Required field
            'error': error_type,
            'message': message,
            'command_executed': None,
            'function_calls': [],
            'record_count': 0,
            'data': [],
            'count': 0
        }
