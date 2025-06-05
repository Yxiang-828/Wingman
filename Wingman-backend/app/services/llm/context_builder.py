import os
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
import json
import re

class WingmanContextBuilder:
    """
    INTELLIGENT context builder that makes Wingman AI truly smart
    """
    
    def __init__(self, db_path: Optional[str] = None):
        if db_path:
            self.db_path = db_path
        else:
            self.db_path = self._find_user_database()
        
        # ✅ SMART: Context analysis patterns
        self.search_patterns = {
            'temporal': ['yesterday', 'last week', 'last month', 'ago', 'before', 'after', 'since'],
            'task_related': ['task', 'todo', 'work', 'project', 'deadline', 'complete', 'finish'],
            'event_related': ['meeting', 'appointment', 'event', 'schedule', 'calendar'],
            'mood_related': ['feel', 'mood', 'emotion', 'think', 'reflect', 'diary'],
            'search_queries': ['find', 'search', 'look for', 'show me', 'what did', 'when did']
        }
    
    def _find_user_database(self) -> str:
        possible_paths = [
            os.path.expanduser("~/AppData/Roaming/wingman/wingman-data/wingman.db"),
            os.path.expanduser("~/AppData/Roaming/Wingman/wingman-data/wingman.db"),
            "./wingman.db"
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        default_path = os.path.expanduser("~/AppData/Roaming/wingman/wingman-data/wingman.db")
        os.makedirs(os.path.dirname(default_path), exist_ok=True)
        return default_path
    
    def build_context(self, user_id: str, message: str, date: Optional[str] = None) -> str:
        """
        🧠 INTELLIGENT context building with smart search capabilities
        """
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                # ✅ SMART: Analyze what the user is actually asking for
                analysis = self._analyze_user_intent(message)
                context_parts = []
                
                # ✅ COMPACT: Basic info
                context_parts.append(f"Date: {date} | User: {user_id[:8]}...")
                
                # ✅ INTELLIGENT: Build context based on actual user need
                if analysis['is_search_query']:
                    search_results = self._perform_intelligent_search(conn, user_id, message, analysis)
                    if search_results:
                        context_parts.append(search_results)
                
                if analysis['wants_temporal_data']:
                    temporal_data = self._get_temporal_context(conn, user_id, message, analysis)
                    if temporal_data:
                        context_parts.append(temporal_data)
                
                if analysis['wants_current_status']:
                    current_status = self._get_current_status(conn, user_id, date)
                    if current_status:
                        context_parts.append(current_status)
                
                if analysis['wants_patterns']:
                    pattern_data = self._get_pattern_analysis(conn, user_id, analysis)
                    if pattern_data:
                        context_parts.append(pattern_data)
                
                # ✅ SMART: Always include recent relevant activity
                recent_activity = self._get_recent_relevant_activity(conn, user_id, analysis)
                if recent_activity:
                    context_parts.append(recent_activity)
                
                return "\n\n".join(context_parts)
                
        except Exception as e:
            print(f"Error building context: {e}")
            return f"Date: {date} | User: {user_id[:8]}...\nNote: Context temporarily unavailable."
    
    def _analyze_user_intent(self, message: str) -> Dict[str, Any]:
        """
        🧠 SMART: Deep analysis of what the user actually wants
        """
        msg_lower = message.lower()
        
        analysis = {
            'original_message': message,
            'is_search_query': False,
            'wants_temporal_data': False,
            'wants_current_status': False,
            'wants_patterns': False,
            'search_terms': [],
            'time_references': [],
            'data_types': []
        }
        
        # ✅ DETECT: Search intentions
        if any(pattern in msg_lower for pattern in self.search_patterns['search_queries']):
            analysis['is_search_query'] = True
            analysis['search_terms'] = self._extract_search_terms(message)
        
        # ✅ DETECT: Temporal references
        if any(pattern in msg_lower for pattern in self.search_patterns['temporal']):
            analysis['wants_temporal_data'] = True
            analysis['time_references'] = self._extract_time_references(message)
        
        # ✅ DETECT: Current status requests
        if any(word in msg_lower for word in ['today', 'now', 'current', 'status', 'what do i have']):
            analysis['wants_current_status'] = True
        
        # ✅ DETECT: Pattern analysis requests
        if any(word in msg_lower for word in ['how often', 'usually', 'pattern', 'trend', 'habit']):
            analysis['wants_patterns'] = True
        
        # ✅ DETECT: Data types being requested
        if any(word in msg_lower for word in self.search_patterns['task_related']):
            analysis['data_types'].append('tasks')
        if any(word in msg_lower for word in self.search_patterns['event_related']):
            analysis['data_types'].append('events')
        if any(word in msg_lower for word in self.search_patterns['mood_related']):
            analysis['data_types'].append('diary')
        
        return analysis
    
    def _perform_intelligent_search(self, conn: sqlite3.Connection, user_id: str, message: str, analysis: Dict) -> Optional[str]:
        """
        🔍 SMART: Perform intelligent search across all user data
        """
        search_results = []
        search_terms = analysis['search_terms']
        
        if not search_terms:
            return None
        
        # ✅ SEARCH: Tasks with smart matching
        if 'tasks' in analysis['data_types'] or not analysis['data_types']:
            task_results = self._search_tasks(conn, user_id, search_terms)
            if task_results:
                search_results.append(task_results)
        
        # ✅ SEARCH: Events with smart matching
        if 'events' in analysis['data_types'] or not analysis['data_types']:
            event_results = self._search_events(conn, user_id, search_terms)
            if event_results:
                search_results.append(event_results)
        
        # ✅ SEARCH: Diary entries with smart matching
        if 'diary' in analysis['data_types'] or not analysis['data_types']:
            diary_results = self._search_diary(conn, user_id, search_terms)
            if diary_results:
                search_results.append(diary_results)
        
        # ✅ SEARCH: Chat history for context
        chat_results = self._search_chat_history(conn, user_id, search_terms)
        if chat_results:
            search_results.append(chat_results)
        
        if search_results:
            return f"🔍 SEARCH RESULTS:\n" + "\n".join(search_results)
        
        return None
    
    def _search_tasks(self, conn: sqlite3.Connection, user_id: str, search_terms: List[str]) -> Optional[str]:
        """
        🎯 SMART: Search tasks with relevance ranking
        """
        try:
            search_query = " OR ".join([f"title LIKE '%{term}%'" for term in search_terms])
            
            cursor = conn.execute(f"""
                SELECT title, task_date, completed, failed, urgency_level, task_time
                FROM tasks 
                WHERE user_id = ? AND ({search_query})
                ORDER BY task_date DESC, urgency_level DESC
                LIMIT 10
            """, (user_id,))
            
            tasks = cursor.fetchall()
            if not tasks:
                return None
            
            results = ["📋 TASKS FOUND:"]
            for task in tasks:
                status = "✅" if task['completed'] else "❌" if task['failed'] else "⏳"
                urgency = "🔥" if task['urgency_level'] and task['urgency_level'] >= 3 else ""
                time_info = f" at {task['task_time']}" if task['task_time'] else ""
                results.append(f"  {status} {urgency}{task['title']} ({task['task_date']}{time_info})")
            
            return "\n".join(results)
            
        except Exception as e:
            print(f"Error searching tasks: {e}")
            return None
    
    def _search_events(self, conn: sqlite3.Connection, user_id: str, search_terms: List[str]) -> Optional[str]:
        """
        📅 SMART: Search events with context
        """
        try:
            search_query = " OR ".join([f"title LIKE '%{term}%' OR description LIKE '%{term}%'" for term in search_terms])
            
            cursor = conn.execute(f"""
                SELECT title, event_date, event_time, type, description
                FROM calendar_events 
                WHERE user_id = ? AND ({search_query})
                ORDER BY event_date DESC
                LIMIT 10
            """, (user_id,))
            
            events = cursor.fetchall()
            if not events:
                return None
            
            results = ["📅 EVENTS FOUND:"]
            for event in events:
                time_info = f" at {event['event_time']}" if event['event_time'] else ""
                type_info = f" [{event['type']}]" if event['type'] else ""
                results.append(f"  • {event['title']} ({event['event_date']}{time_info}){type_info}")
                if event['description']:
                    results.append(f"    Note: {event['description'][:100]}...")
            
            return "\n".join(results)
            
        except Exception as e:
            print(f"Error searching events: {e}")
            return None
    
    def _search_diary(self, conn: sqlite3.Connection, user_id: str, search_terms: List[str]) -> Optional[str]:
        """
        📝 SMART: Search diary entries with mood context
        """
        try:
            search_query = " OR ".join([f"title LIKE '%{term}%' OR content LIKE '%{term}%'" for term in search_terms])
            
            cursor = conn.execute(f"""
                SELECT entry_date, title, content, mood
                FROM diary_entries 
                WHERE user_id = ? AND ({search_query})
                ORDER BY entry_date DESC
                LIMIT 5
            """, (user_id,))
            
            entries = cursor.fetchall()
            if not entries:
                return None
            
            results = ["📝 DIARY ENTRIES:"]
            for entry in entries:
                mood_emoji = self._mood_to_emoji(entry['mood'])
                title = entry['title'] or "Untitled"
                content_preview = entry['content'][:100] + "..." if len(entry['content']) > 100 else entry['content']
                results.append(f"  {mood_emoji} {title} ({entry['entry_date']})")
                results.append(f"    {content_preview}")
            
            return "\n".join(results)
            
        except Exception as e:
            print(f"Error searching diary: {e}")
            return None
    
    def _search_chat_history(self, conn: sqlite3.Connection, user_id: str, search_terms: List[str]) -> Optional[str]:
        """
        💬 SMART: Search previous conversations for context
        """
        try:
            search_query = " OR ".join([f"message LIKE '%{term}%'" for term in search_terms])
            
            cursor = conn.execute(f"""
                SELECT message, is_ai, timestamp
                FROM chat_history 
                WHERE user_id = ? AND ({search_query})
                ORDER BY timestamp DESC
                LIMIT 5
            """, (user_id,))
            
            messages = cursor.fetchall()
            if not messages:
                return None
            
            results = ["💬 PREVIOUS CONVERSATIONS:"]
            for msg in messages:
                speaker = "🤖" if msg['is_ai'] else "👤"
                date_str = msg['timestamp'][:10] if msg['timestamp'] else "Unknown"
                message_preview = msg['message'][:80] + "..." if len(msg['message']) > 80 else msg['message']
                results.append(f"  {speaker} {message_preview} ({date_str})")
            
            return "\n".join(results)
            
        except Exception as e:
            print(f"Error searching chat history: {e}")
            return None
    
    def _get_temporal_context(self, conn: sqlite3.Connection, user_id: str, message: str, analysis: Dict) -> Optional[str]:
        """
        ⏰ SMART: Get data based on temporal references (yesterday, last week, etc.)
        """
        time_refs = analysis['time_references']
        if not time_refs:
            return None
        
        # ✅ SMART: Calculate date ranges based on natural language
        date_ranges = []
        for ref in time_refs:
            date_range = self._parse_time_reference(ref)
            if date_range:
                date_ranges.append(date_range)
        
        if not date_ranges:
            return None
        
        # ✅ QUERY: Get data for those time periods
        temporal_data = []
        for start_date, end_date in date_ranges:
            period_data = self._get_period_data(conn, user_id, start_date, end_date)
            if period_data:
                temporal_data.append(period_data)
        
        if temporal_data:
            return f"⏰ TEMPORAL DATA:\n" + "\n".join(temporal_data)
        
        return None
    
    def _get_current_status(self, conn: sqlite3.Connection, user_id: str, date: str) -> Optional[str]:
        """
        📊 SMART: Get comprehensive current status
        """
        try:
            status_parts = []
            
            # ✅ TODAY'S TASKS
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN failed = 1 THEN 1 ELSE 0 END) as failed
                FROM tasks 
                WHERE user_id = ? AND task_date = ?
            """, (user_id, date))
            
            task_stats = cursor.fetchone()
            if task_stats and task_stats['total'] > 0:
                pending = task_stats['total'] - task_stats['completed'] - task_stats['failed']
                status_parts.append(f"📋 Tasks: {task_stats['completed']}✅ {pending}⏳ {task_stats['failed']}❌")
            
            # ✅ TODAY'S EVENTS
            cursor = conn.execute("""
                SELECT COUNT(*) as event_count
                FROM calendar_events 
                WHERE user_id = ? AND event_date = ?
            """, (user_id, date))
            
            event_count = cursor.fetchone()['event_count']
            if event_count > 0:
                status_parts.append(f"📅 Events: {event_count} scheduled")
            
            # ✅ RECENT MOOD
            cursor = conn.execute("""
                SELECT mood, entry_date
                FROM diary_entries 
                WHERE user_id = ?
                ORDER BY entry_date DESC, created_at DESC
                LIMIT 1
            """, (user_id,))
            
            recent_mood = cursor.fetchone()
            if recent_mood:
                mood_emoji = self._mood_to_emoji(recent_mood['mood'])
                status_parts.append(f"💭 Recent mood: {mood_emoji} {recent_mood['mood']} ({recent_mood['entry_date']})")
            
            if status_parts:
                return f"📊 CURRENT STATUS ({date}):\n" + "\n".join([f"  {part}" for part in status_parts])
            
            return None
            
        except Exception as e:
            print(f"Error getting current status: {e}")
            return None
    
    def _get_pattern_analysis(self, conn: sqlite3.Connection, user_id: str, analysis: Dict) -> Optional[str]:
        """
        📈 SMART: Analyze patterns and trends in user data
        """
        try:
            patterns = []
            
            # ✅ TASK COMPLETION PATTERNS
            cursor = conn.execute("""
                SELECT 
                    strftime('%w', task_date) as day_of_week,
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks
                FROM tasks 
                WHERE user_id = ? AND task_date >= date('now', '-30 days')
                GROUP BY day_of_week
                ORDER BY day_of_week
            """, (user_id,))
            
            task_patterns = cursor.fetchall()
            if task_patterns:
                day_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                best_day = max(task_patterns, key=lambda x: x['completed_tasks'] / x['total_tasks'] if x['total_tasks'] > 0 else 0)
                if best_day['total_tasks'] > 0:
                    completion_rate = (best_day['completed_tasks'] / best_day['total_tasks']) * 100
                    patterns.append(f"🎯 Best productivity day: {day_names[int(best_day['day_of_week'])]} ({completion_rate:.0f}% completion)")
            
            # ✅ MOOD PATTERNS
            cursor = conn.execute("""
                SELECT mood, COUNT(*) as count
                FROM diary_entries 
                WHERE user_id = ? AND entry_date >= date('now', '-30 days')
                GROUP BY mood
                ORDER BY count DESC
                LIMIT 1
            """, (user_id,))
            
            mood_pattern = cursor.fetchone()
            if mood_pattern:
                mood_emoji = self._mood_to_emoji(mood_pattern['mood'])
                patterns.append(f"💭 Dominant mood: {mood_emoji} {mood_pattern['mood']} ({mood_pattern['count']} entries)")
            
            if patterns:
                return f"📈 PATTERNS (Last 30 days):\n" + "\n".join([f"  {pattern}" for pattern in patterns])
            
            return None
            
        except Exception as e:
            print(f"Error getting patterns: {e}")
            return None
    
    def _get_recent_relevant_activity(self, conn: sqlite3.Connection, user_id: str, analysis: Dict) -> Optional[str]:
        """
        🔄 SMART: Get recent activity relevant to current conversation
        """
        try:
            # ✅ LAST 3 DAYS OF ACTIVITY
            cursor = conn.execute("""
                SELECT 'task' as type, title as content, task_date as date, completed, failed
                FROM tasks 
                WHERE user_id = ? AND task_date >= date('now', '-3 days')
                UNION ALL
                SELECT 'event' as type, title as content, event_date as date, NULL, NULL
                FROM calendar_events 
                WHERE user_id = ? AND event_date >= date('now', '-3 days')
                ORDER BY date DESC
                LIMIT 5
            """, (user_id, user_id))
            
            activities = cursor.fetchall()
            if not activities:
                return None
            
            results = ["🔄 RECENT ACTIVITY:"]
            for activity in activities:
                if activity['type'] == 'task':
                    status = "✅" if activity['completed'] else "❌" if activity['failed'] else "⏳"
                    results.append(f"  {status} Task: {activity['content']} ({activity['date']})")
                else:
                    results.append(f"  📅 Event: {activity['content']} ({activity['date']})")
            
            return "\n".join(results)
            
        except Exception as e:
            print(f"Error getting recent activity: {e}")
            return None
    
    # ✅ HELPER METHODS
    def _extract_search_terms(self, message: str) -> List[str]:
        """Extract meaningful search terms from user message"""
        # Remove common words and extract meaningful terms
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'me', 'my', 'what', 'when', 'where', 'how', 'show', 'find', 'search', 'look', 'did'}
        words = re.findall(r'\b\w+\b', message.lower())
        return [word for word in words if len(word) > 2 and word not in stop_words]
    
    def _extract_time_references(self, message: str) -> List[str]:
        """Extract time references from user message"""
        time_patterns = [
            r'yesterday', r'last week', r'last month', r'last year',
            r'\d+ days? ago', r'\d+ weeks? ago', r'\d+ months? ago',
            r'before \w+', r'after \w+', r'since \w+'
        ]
        
        references = []
        for pattern in time_patterns:
            matches = re.findall(pattern, message.lower())
            references.extend(matches)
        
        return references
    
    def _parse_time_reference(self, ref: str) -> Optional[tuple]:
        """Convert time reference to date range"""
        today = datetime.now().date()
        
        if 'yesterday' in ref:
            yesterday = today - timedelta(days=1)
            return (yesterday.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d'))
        elif 'last week' in ref:
            week_ago = today - timedelta(days=7)
            return (week_ago.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d'))
        elif 'last month' in ref:
            month_ago = today - timedelta(days=30)
            return (month_ago.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d'))
        
        # Add more patterns as needed
        return None
    
    def _get_period_data(self, conn: sqlite3.Connection, user_id: str, start_date: str, end_date: str) -> Optional[str]:
        """Get data for a specific time period"""
        try:
            # Query data for the period
            cursor = conn.execute("""
                SELECT 'task' as type, title, task_date as date, completed, failed
                FROM tasks 
                WHERE user_id = ? AND task_date BETWEEN ? AND ?
                UNION ALL
                SELECT 'event' as type, title, event_date as date, NULL, NULL
                FROM calendar_events 
                WHERE user_id = ? AND event_date BETWEEN ? AND ?
                ORDER BY date DESC
                LIMIT 10
            """, (user_id, start_date, end_date, user_id, start_date, end_date))
            
            data = cursor.fetchall()
            if not data:
                return None
            
            results = [f"📅 Period {start_date} to {end_date}:"]
            for item in data:
                if item['type'] == 'task':
                    status = "✅" if item['completed'] else "❌" if item['failed'] else "⏳"
                    results.append(f"  {status} {item['title']} ({item['date']})")
                else:
                    results.append(f"  📅 {item['title']} ({item['date']})")
            
            return "\n".join(results)
            
        except Exception as e:
            print(f"Error getting period data: {e}")
            return None
    
    def _mood_to_emoji(self, mood: str) -> str:
        """Convert mood text to emoji"""
        mood_map = {
            'happy': '😊', 'sad': '😢', 'excited': '🤩', 'angry': '😠',
            'anxious': '😰', 'relaxed': '😌', 'neutral': '😐',
            'productive': '💪', 'tired': '😴', 'motivated': '🔥'
        }
        return mood_map.get(mood.lower() if mood else 'neutral', '😐')

# Test function
def test_smart_context_builder():
    """Test the smart context builder"""
    try:
        builder = WingmanContextBuilder()
        
        # Test different query types
        test_queries = [
            "What tasks did I complete yesterday?",
            "Show me my meetings this week",
            "How am I feeling lately?",
            "What's my status today?",
            "Find anything about project work"
        ]
        
        for query in test_queries:
            print(f"\n🧠 Testing: {query}")
            context = builder.build_context("test-user", query)
            print(f"📝 Context: {context[:200]}...")
            
    except Exception as e:
        print(f"Context builder test failed: {e}")

if __name__ == "__main__":
    test_smart_context_builder()