# WINGMAN RESPONSE FORMATTER
#--------------------------------------
# Ensures Ollama LLM responses are properly structured and formatted

import re
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

class ResponseFormatter:
    """
    Formats raw LLM responses into structured, readable format
    with proper paragraphs, tables, and consistent styling
    """
    
    def __init__(self):
        self.table_patterns = {
            'tasks': r'(?i)tasks?|todo|to-do',
            'events': r'(?i)events?|calendar|schedule|appointment',
            'summary': r'(?i)summary|overview|report'
        }
    
    def format_response(self, raw_response: str, context_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Clean formatting with thinking section extraction
        """
        # Extract thinking section if present
        thinking_content, main_response = self._extract_thinking_section(raw_response)
        
        # Clean and format the main response
        cleaned_text = self._clean_text(main_response)
        formatted_paragraphs = self._format_paragraphs(cleaned_text)
        
        # Check if response already has tables
        has_existing_tables = self._contains_tables(cleaned_text)
        
        return {
            "formatted_text": formatted_paragraphs,
            "thinking": thinking_content,  # Add thinking section
            "tables": {},  # Empty - no hardcoded tables
            "structured_data": {},  # Empty - no forcing structure
            "metadata": {
                "formatted_at": datetime.now().isoformat(),
                "has_tables": has_existing_tables,
                "has_thinking": bool(thinking_content),
                "paragraph_count": len(formatted_paragraphs.split('\n\n'))
            }
        }
    
    def _response_needs_tables(self, response_text: str, structured_data: Dict) -> bool:
        """Check if the response would benefit from adding tables"""
        # Only add tables if:
        # 1. We have structured data to display
        # 2. The response mentions tasks/events but doesn't have them formatted
        # 3. The response is asking for or about data organization
        
        has_data = bool(structured_data.get('tasks') or structured_data.get('events'))
        mentions_data = any(word in response_text.lower() for word in ['task', 'event', 'schedule', 'overview'])
        is_data_response = 'overview' in response_text.lower() or 'summary' in response_text.lower()
        
        return has_data and (mentions_data or is_data_response)
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text formatting"""
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        
        # Fix common formatting issues
        text = text.strip()
        
        # Ensure proper sentence spacing
        text = re.sub(r'\.([A-Z])', r'. \1', text)
        
        return text
    
    def _contains_tables(self, text: str) -> bool:
        """Check if the text already contains markdown tables"""
        # Look for markdown table patterns - more comprehensive detection
        # Pattern 1: Table with separator row
        pattern1 = r'\|.*\|.*\n\|[-:\s|]*\|'
        # Pattern 2: Multiple consecutive lines with pipes (table rows)
        pattern2 = r'(\|.*\|.*\n){2,}'
        # Pattern 3: Specific task table headers (any level)
        pattern3 = r'#{1,6} .*Tasks Overview|#{1,6} .*Events Schedule'
        
        return bool(re.search(pattern1, text) or 
                   re.search(pattern2, text) or 
                   re.search(pattern3, text))
    
    def _format_paragraphs(self, text: str) -> str:
        """Format text into proper paragraphs while PRESERVING all markdown formatting"""
        # DON'T modify the text structure - just clean up excessive whitespace
        # This preserves **bold**, *italic*, ## headers, and | tables |
        
        # Remove only excessive whitespace, preserve markdown syntax
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple blank lines -> double line break
        text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces/tabs -> single space
        text = text.strip()
        
        # Do not modify capitalization or punctuation - let markdown through unchanged
        return text
    
    def _extract_structured_data(self, text: str, context_data: Optional[Dict]) -> Dict[str, List]:
        """Extract structured data from text and context"""
        structured = {
            "tasks": [],
            "events": [],
            "summaries": []
        }
        
        # If context data is provided, use it for structured display
        if context_data:
            if 'tasks' in context_data:
                structured['tasks'] = self._format_tasks_data(context_data['tasks'])
            
            if 'events' in context_data:
                structured['events'] = self._format_events_data(context_data['events'])
        
        return structured
    
    def _format_tasks_data(self, tasks_data) -> List[Dict]:
        """Format tasks data for table display"""
        if not tasks_data:
            return []
        
        formatted_tasks = []
        for task in tasks_data:
            formatted_task = {
                "title": task.get('title', 'Untitled Task'),
                "date": task.get('task_date', 'No date'),
                "time": task.get('task_time', 'No time'),
                "status": "✅ Completed" if task.get('completed') else 
                         "❌ Failed" if task.get('failed') else "⏳ Pending"
            }
            formatted_tasks.append(formatted_task)
        
        return formatted_tasks
    
    def _format_events_data(self, events_data) -> List[Dict]:
        """Format events data for table display"""
        if not events_data:
            return []
        
        formatted_events = []
        for event in events_data:
            formatted_event = {
                "title": event.get('title', 'Untitled Event'),
                "date": event.get('event_date', 'No date'),
                "time": event.get('event_time', 'No time'),
                "type": event.get('type', 'general').title(),
                "description": event.get('description', 'No description')[:50] + '...' if len(event.get('description', '')) > 50 else event.get('description', 'No description')
            }
            formatted_events.append(formatted_event)
        
        return formatted_events
    
    def _generate_tables(self, structured_data: Dict) -> Dict[str, str]:
        """Generate formatted tables from structured data"""
        tables = {}
        
        # Generate tasks table
        if structured_data.get('tasks'):
            tables['tasks'] = self._create_tasks_table(structured_data['tasks'])
        
        # Generate events table
        if structured_data.get('events'):
            tables['events'] = self._create_events_table(structured_data['events'])
        
        return tables
    
    def _create_tasks_table(self, tasks: List[Dict]) -> str:
        """Create a formatted tasks table (no priority column)"""
        if not tasks:
            return ""
        
        # Table header
        table = "## 📋 Tasks Overview\n\n"
        table += "| Task | Date | Time | Status |\n"
        table += "|------|------|------|--------|\n"
        
        # Table rows
        for task in tasks:
            table += f"| {task['title']} | {task['date']} | {task['time']} | {task['status']} |\n"
        
        return table
    
    def _create_events_table(self, events: List[Dict]) -> str:
        """Create a formatted events table"""
        if not events:
            return ""
        
        # Table header
        table = "## 📅 Events Schedule\n\n"
        table += "| Event | Date | Time | Type | Description |\n"
        table += "|-------|------|------|------|-------------|\n"
        
        # Table rows
        for event in events:
            table += f"| {event['title']} | {event['date']} | {event['time']} | {event['type']} | {event['description']} |\n"
        
        return table
    
    
    
    def create_structured_prompt(self, user_message: str, context_data: Dict, personality: Dict) -> str:
        """Create SIMPLE, EFFECTIVE prompts for small models"""
        
        # Simple, direct instruction
        prompt = f"""You are a helpful AI assistant. 

Use markdown formatting when helpful:
- **bold** for important points
- ## headers for sections
- | tables | when | showing | data |
- Keep responses clear and relevant

User: {user_message}

Respond naturally and helpfully."""
        
        return prompt

    def _analyze_user_intent(self, message: str) -> str:
        """Analyze what type of response the user is looking for"""
        message_lower = message.lower()
        
        # Data/information requests
        if any(word in message_lower for word in ['show', 'list', 'what are', 'display', 'overview', 'summary', 'tasks', 'events']):
            return "data_request"
        
        # Questions/help requests
        elif any(word in message_lower for word in ['how', 'why', 'what is', 'can you', 'help', 'explain']):
            return "question"
        
        # Casual conversation
        elif any(word in message_lower for word in ['hello', 'hi', 'hey', 'thanks', 'ok', 'cool', 'nice', 'haha']):
            return "conversation"
        
        # Default to general
        return "general"

    def _build_context_info(self, context_data: Dict, needs_data: bool) -> str:
        """Build relevant context information for the prompt"""
        if not context_data or not needs_data:
            return ""
        
        info_parts = []
        
        if context_data.get('tasks'):
            task_count = len(context_data['tasks'])
            completed = len([t for t in context_data['tasks'] if t.get('completed')])
            info_parts.append(f"TASKS AVAILABLE: {task_count} total ({completed} completed)")
        
        if context_data.get('events'):
            event_count = len(context_data['events'])
            info_parts.append(f"EVENTS AVAILABLE: {event_count} scheduled")
        
        if info_parts:
            return f"\nAVAILABLE DATA:\n" + "\n".join(f"- {info}" for info in info_parts)
        
        return ""
    
    def _should_show_data_tables(self, user_message: str, context_data: Dict) -> bool:
        """Determine if the user is asking for data that should be displayed in tables"""
        # Keywords that suggest user wants to see data
        data_keywords = [
            'tasks', 'todo', 'list', 'show', 'what', 'schedule', 'events', 
            'calendar', 'pending', 'completed', 'failed', 'overview', 
            'status', 'summary', 'today', 'tomorrow', 'this week'
        ]
        
        # Casual/greeting keywords that definitely don't need tables
        casual_keywords = [
            'hello', 'hi', 'hey', 'haha', 'lol', 'weird', 'thanks', 
            'cool', 'nice', 'ok', 'okay', 'yeah', 'yep', 'nope'
        ]
        
        message_lower = user_message.lower()
        
        # If it's clearly casual conversation, don't show tables
        if any(casual in message_lower for casual in casual_keywords):
            return False
        
        # If user is asking for data and we have data to show, show tables
        if any(keyword in message_lower for keyword in data_keywords):
            return bool(context_data and (context_data.get('tasks') or context_data.get('events')))
        
        # Default to no tables for unclear requests
        return False
    
    def _extract_thinking_section(self, text: str) -> tuple[Optional[str], str]:
        """Extract thinking section from response text"""
        
        # Look for <think>...</think> tags
        think_pattern = r'<think>(.*?)</think>'
        match = re.search(think_pattern, text, re.DOTALL | re.IGNORECASE)
        
        if match:
            thinking_content = match.group(1).strip()
            # Remove the thinking section from main response
            main_response = re.sub(think_pattern, '', text, flags=re.DOTALL | re.IGNORECASE).strip()
            return thinking_content, main_response
        
        return None, text

class OllamaResponseProcessor:
    """
    Processes Ollama responses and integrates with the formatter
    """
    
    def __init__(self):
        self.formatter = ResponseFormatter()
    
    def process_ollama_response(self, raw_response: str, context_data: Dict, personality: Dict) -> Dict:
        """
        Process raw Ollama response into structured format
        """
        # Format the response
        formatted_response = self.formatter.format_response(raw_response, context_data)
        
        # Add conversation metadata
        formatted_response['conversation_metadata'] = {
            "model_used": context_data.get('model_name', 'unknown'),
            "personality_applied": personality.get('communication_style', 'casual'),
            "context_types": list(context_data.keys()) if context_data else [],
            "response_length": len(raw_response),
            "processing_timestamp": datetime.now().isoformat()
        }
        
        return formatted_response
    
    def create_display_response(self, processed_response: Dict) -> str:
        """
        Create final display response combining text and tables
        Only add tables if they're not already embedded in the formatted text
        """
        display_parts = []
        
        # Add formatted text
        formatted_text = processed_response.get('formatted_text', '')
        if formatted_text:
            display_parts.append(formatted_text)
        
        # Only add tables if they're not already in the formatted text
        if processed_response.get('tables'):
            for table_name, table_content in processed_response['tables'].items():
                if table_content:
                    # Check if table is already embedded in the formatted text
                    table_header = "## 📋 Tasks Overview" if table_name == 'tasks' else "## 📅 Events Schedule"
                    if table_header not in formatted_text:
                        display_parts.append('\n' + table_content)
        
        return '\n\n'.join(display_parts)
