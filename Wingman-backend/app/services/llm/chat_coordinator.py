"""
WINGMAN CHAT COORDINATOR - Simple Implementation
===============================================

Coordinates the simple chat flow:
1. Preloaded context (today's data + chat history)
2. Personality integration (theme-synchronized)
3. Slash command routing (/t, /e, /d, /u commands)
4. Clean LLM responses
"""

import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

from .context_builder import WingmanContextBuilder
from .personality_manager import WingmanPersonalityManager
from .command_parser import WingmanCommandParser
from .formatters.table_formatter import MarkdownTableFormatter


class WingmanChatCoordinator:
    """
    Simple Chat Coordinator - Preloaded + Personality + Slash Commands
    """
    
    def __init__(self):
        self.context_builder = WingmanContextBuilder()
        self.personality_manager = WingmanPersonalityManager()
        self.command_parser = WingmanCommandParser()
        self.table_formatter = MarkdownTableFormatter()
        
    def process_message(self, user_id: str, message: str, current_theme: Optional[str] = None, 
                       chat_history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Process user message with personality-aware context
        
        Args:
            user_id: User identifier
            message: User's message
            current_theme: Current UI theme for personality sync (if None, will be fetched from database)
            chat_history: Recent chat history
            
        Returns:
            Dict with response data and metadata
        """
        
        # Auto-sync theme from database if not provided
        if current_theme is None:
            current_theme = self.context_builder.get_user_theme(user_id)
            
        # Check if it's a slash command first
        if message.strip().startswith('/'):
            return self._handle_slash_command(user_id, message, current_theme)
        
        # Regular conversation - build personality-aware context for LLM
        return self._handle_conversation(user_id, message, current_theme, chat_history)
    
    def _handle_slash_command(self, user_id: str, message: str, theme: str) -> Dict[str, Any]:
        """Handle slash commands (/t, /e, /d, etc.)"""
        
        try:
            # Parse and execute the command
            result = self.command_parser.execute_command(message, user_id)
            
            if result['success']:
                # Use the pre-formatted response from command parser (already includes markdown table)
                formatted_response = result.get('response', result.get('formatted_response', ''))
                
                # Add personality wrapper around the pre-formatted content
                personality_response = self._add_personality_wrapper(formatted_response, theme)
                
                return {
                    'success': True,
                    'response': personality_response,
                    'type': 'command_result',
                    'command': message,
                    'data': result.get('data', [])
                }
            else:
                # Command failed - personality-aware error
                error_response = self._format_command_error(result, theme)
                
                return {
                    'success': False,
                    'response': error_response,
                    'type': 'command_error',
                    'command': message,
                    'error': result.get('error', 'Unknown error')
                }
                
        except Exception as e:
            # Exception handling with personality
            error_response = self._format_exception_error(str(e), theme)
            
            return {
                'success': False,
                'response': error_response,
                'type': 'system_error',
                'command': message,
                'error': str(e)
            }
    
    def _handle_conversation(self, user_id: str, message: str, theme: str, 
                           chat_history: Optional[List[Dict]]) -> Dict[str, Any]:
        """Handle regular conversation with personality"""
        
        try:
            # Build personality-enhanced context
            context = self._build_personality_context(user_id, theme, chat_history)
            
            return {
                'success': True,
                'response': context,  # This will be sent to LLM
                'type': 'conversation',
                'theme': theme,
                'personality': self.personality_manager.get_current_personality()['name'],
                'context_type': 'preloaded_with_personality'
            }
            
        except Exception as e:
            return {
                'success': False,
                'response': f"Error building context: {str(e)}",
                'type': 'context_error',
                'error': str(e)
            }
    
    def _build_personality_context(self, user_id: str, theme: str, 
                                 chat_history: Optional[List[Dict]]) -> str:
        """Build personality-enhanced context for LLM"""
        
        # Sync personality with theme
        self.personality_manager.sync_theme(theme)
        
        # Get base context from context builder
        base_context = self.context_builder.build_context(
            user_id=user_id,
            current_theme=theme,
            chat_history=chat_history
        )
        
        # Get today's data for personality interpretation
        current_date = datetime.now().strftime('%Y-%m-%d')
        today_tasks = self.context_builder._get_tasks_for_date(user_id, current_date)
        today_events = self.context_builder._get_events_for_date(user_id, current_date)
        recent_diary = self.context_builder._get_recent_diary_entries(user_id)
        
        today_data = {
            'tasks': today_tasks,
            'events': today_events,
            'diary': recent_diary
        }
        
        # Get personality context
        chat_context = "\n".join([msg.get('message', '') for msg in (chat_history or [])[-3:]])
        personality_context = self.personality_manager.get_personality_context(
            theme=theme,
            today_data=today_data,
            chat_context=chat_context
        )
        
        # Combine base context with personality
        enhanced_context = f"""{base_context}

PERSONALITY ENHANCEMENT:
{personality_context}

RESPONSE GUIDELINES:
- Respond naturally in conversation with the user
- Use your {theme} personality consistently
- Reference preloaded data when relevant
- Maintain conversation flow from chat history
- Be authentic to your personality traits
- For database access, remind users to use slash commands like /t, /e, /d
- DO NOT execute database functions - only use preloaded knowledge"""

        return enhanced_context
    
    def _add_personality_wrapper(self, formatted_content: str, theme: str) -> str:
        """Add personality wrapper around pre-formatted content"""
        
        # Get personality-specific wrappers
        personality_wrappers = {
            'light': f"Here's what I found! ✨\n\n{formatted_content}\n\nHope this helps brighten your day!",
            'dark': f"{formatted_content}",  # Dark theme keeps it clean
            'yandere': f"I found exactly what you needed... 💖\n\n{formatted_content}\n\nI'll always find what you're looking for.",
            'kuudere': f"{formatted_content}\n\nNot that I went out of my way to format it nicely.",
            'dandere': f"I... I found this for you... 🌸\n\n{formatted_content}\n\nI hope it's helpful...",
            'tsundere': f"{formatted_content}\n\nIt's not like I spent extra time organizing it for you! 😤"
        }
        
        return personality_wrappers.get(theme, formatted_content)
    
    def _format_command_response(self, result: Dict[str, Any], theme: str) -> str:
        """Format command results with personality"""
        
        data = result.get('data', [])
        command_type = result.get('command_type', 'unknown')
        
        # Get personality-specific formatting
        personality = self.personality_manager.personalities[theme]
        
        # Base response formatting
        if not data:
            no_data_responses = {
                'light': "No results found, but that's okay! ✨ Maybe try a different search?",
                'dark': "Query returned empty. Adjust parameters.",
                'yandere': "Nothing found... but don't worry, I'll keep searching for you. 💖",
                'kuudere': "No data returned. Not that I expected much anyway.",
                'dandere': "I... I couldn't find anything... sorry... 🌸",
                'tsundere': "No results? It's not like I didn't try hard! Maybe your search was bad! 😤"
            }
            return no_data_responses.get(theme, "No results found.")
        
        # Format the actual data
        formatted_data = self._format_data_by_type(data, command_type, theme)
        
        # Add personality wrapper
        personality_wrappers = {
            'light': f"Here's what I found! ✨\n\n{formatted_data}\n\nHope this helps brighten your day!",
            'dark': f"Data retrieved:\n\n{formatted_data}",
            'yandere': f"I found exactly what you needed... 💖\n\n{formatted_data}\n\nI'll always find what you're looking for.",
            'kuudere': f"Your requested data:\n\n{formatted_data}\n\nNot that I went out of my way to format it nicely.",
            'dandere': f"I... I found this for you... 🌸\n\n{formatted_data}\n\nI hope it's helpful...",
            'tsundere': f"Here's your data! Don't think I spent extra time organizing it! 😤\n\n{formatted_data}\n\nIt's not like I care if it helps you!"
        }
        
        return personality_wrappers.get(theme, f"Results:\n\n{formatted_data}")
    
    def _format_data_by_type(self, data: List[Dict], command_type: str, theme: str) -> str:
        """Format data based on type and personality"""
        
        if command_type == 'tasks':
            return self._format_tasks_data(data, theme)
        elif command_type == 'events':
            return self._format_events_data(data, theme)
        elif command_type == 'diary':
            return self._format_diary_data(data, theme)
        else:
            return self._format_generic_data(data, theme)
    
    def _format_tasks_data(self, tasks: List[Dict], theme: str) -> str:
        """Format tasks with personality using markdown table"""
        
        if not tasks:
            return "No tasks found."
        
        # Use markdown table formatter for the data
        table_content = self.table_formatter.format(tasks, title=None)
        
        # Add personality wrapper around the table
        personality_wrappers = {
            'light': f"Here are your tasks! ✨\n\n{table_content}\n\nYou've got this!",
            'dark': f"Task list:\n\n{table_content}",
            'yandere': f"All your tasks... I'll help you with every single one 💖\n\n{table_content}\n\nLet me know if you need anything.",
            'kuudere': f"Your task schedule:\n\n{table_content}\n\nNot that I expect you to complete them all.",
            'dandere': f"I... I made a nice table for your tasks... 🌸\n\n{table_content}\n\nPlease don't overwork yourself...",
            'tsundere': f"Here are your tasks! Don't procrastinate! 😤\n\n{table_content}\n\nIt's not like I care if you finish them!"
        }
        
        return personality_wrappers.get(theme, f"Tasks:\n\n{table_content}")
    
    def _format_events_data(self, events: List[Dict], theme: str) -> str:
        """Format events with personality using markdown table"""
        
        if not events:
            return "No events found."
        
        # Use markdown table formatter for the data
        table_content = self.table_formatter.format(events, title=None)
        
        # Add personality wrapper around the table
        personality_wrappers = {
            'light': f"Here are your events! ✨\n\n{table_content}\n\nHope you have wonderful experiences!",
            'dark': f"Event schedule:\n\n{table_content}",
            'yandere': f"I found all your events... 💖\n\n{table_content}\n\nI'll make sure nothing interferes with your plans.",
            'kuudere': f"Your event list:\n\n{table_content}\n\nNot that I care about your social calendar.",
            'dandere': f"I... I organized your events for you... 🌸\n\n{table_content}\n\nI hope everything goes well...",
            'tsundere': f"Here's your event schedule! Don't expect me to remind you! 😤\n\n{table_content}\n\nIt's not like I want you to have fun!"
        }
        
        return personality_wrappers.get(theme, f"Events:\n\n{table_content}")
    
    def _format_diary_data(self, diary: List[Dict], theme: str) -> str:
        """Format diary entries with personality using markdown table"""
        
        if not diary:
            return "No diary entries found."
        
        # Use markdown table formatter for the data
        table_content = self.table_formatter.format(diary, title=None)
        
        # Add personality wrapper around the table
        personality_wrappers = {
            'light': f"Here are your diary entries! ✨\n\n{table_content}\n\nLooks like you've been reflecting well!",
            'dark': f"Diary entries:\n\n{table_content}",
            'yandere': f"I found all your precious thoughts... 💖\n\n{table_content}\n\nI love reading about your days.",
            'kuudere': f"Your diary records:\n\n{table_content}\n\nNot that I'm interested in your personal thoughts.",
            'dandere': f"I... I organized your diary entries... 🌸\n\n{table_content}\n\nI hope you don't mind me reading them...",
            'tsundere': f"Here's your diary! Stop being so sentimental! 😤\n\n{table_content}\n\nIt's not like I enjoy reading your feelings!"
        }
        
        return personality_wrappers.get(theme, f"Diary:\n\n{table_content}")
    
    def _format_generic_data(self, data: List[Dict], theme: str) -> str:
        """Format generic data with personality"""
        
        if not data:
            return "No data found."
        
        # Simple JSON formatting with personality touches
        formatted_json = json.dumps(data, indent=2)
        
        personality_wrappers = {
            'light': f"Here's the data in a readable format! ✨\n```json\n{formatted_json}\n```",
            'dark': f"Raw data:\n```json\n{formatted_json}\n```",
            'yandere': f"All the data you requested... 💖\n```json\n{formatted_json}\n```",
            'kuudere': f"Data formatted efficiently:\n```json\n{formatted_json}\n```",
            'dandere': f"I... organized this for you... 🌸\n```json\n{formatted_json}\n```",
            'tsundere': f"Your data! Don't expect this formatting every time! 😤\n```json\n{formatted_json}\n```"
        }
        
        return personality_wrappers.get(theme, formatted_json)
    
    def _format_command_error(self, result: Dict[str, Any], theme: str) -> str:
        """Format command errors with personality"""
        
        error_msg = result.get('error', 'Unknown error')
        
        error_responses = {
            'light': f"Oops! Something went wrong: {error_msg} ✨ Don't worry, we'll figure it out!",
            'dark': f"Error: {error_msg}",
            'yandere': f"Something went wrong... but I'll fix it for you: {error_msg} 💖",
            'kuudere': f"Error occurred: {error_msg}. Not that I'm concerned.",
            'dandere': f"I'm sorry... there was an error: {error_msg} 🌸",
            'tsundere': f"Error! It's not my fault: {error_msg} 😤"
        }
        
        return error_responses.get(theme, f"Error: {error_msg}")
    
    def _format_exception_error(self, error: str, theme: str) -> str:
        """Format system exceptions with personality"""
        
        exception_responses = {
            'light': f"Something unexpected happened, but don't worry! ✨ Error: {error}",
            'dark': f"System exception: {error}",
            'yandere': f"An error occurred... but I'll protect you from it: {error} 💖",
            'kuudere': f"System error: {error}. Typical.",
            'dandere': f"I'm sorry... something broke: {error} 🌸",
            'tsundere': f"System error! Don't blame me: {error} 😤"
        }
        
        return exception_responses.get(theme, f"System error: {error}")
    
    def get_theme_status(self) -> Dict[str, Any]:
        """Get current theme and personality status"""
        current_personality = self.personality_manager.get_current_personality()
        
        return {
            'current_theme': self.personality_manager.current_theme,
            'personality_name': current_personality['name'],
            'traits': current_personality['traits'],
            'available_themes': list(self.personality_manager.personalities.keys())
        }
