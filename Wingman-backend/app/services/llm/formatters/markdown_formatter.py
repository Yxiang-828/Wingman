"""
Markdown Formatter - Formats data as general markdown content
"""

from typing import Dict, List, Any, Optional
from .data_formatter import DataFormatter

class MarkdownFormatter(DataFormatter):
    """
    Formats database results as markdown content with headers, lists, and emphasis
    Provides flexible markdown formatting for various data types
    """
    
    def format(self, data: List[Dict], title: Optional[str] = None) -> str:
        """
        Format data as markdown content
        
        Args:
            data: List of dictionaries containing the data
            title: Optional title for the content
            
        Returns:
            Formatted markdown content string
        """
        if not data:
            return self.format_empty()
        
        markdown_lines = []
        
        # Add title if provided
        if title:
            markdown_lines.append(f"# {title}")
            markdown_lines.append("")
        
        # Format each item
        for i, item in enumerate(data, 1):
            # Add item header
            if len(data) > 1:
                markdown_lines.append(f"## Item {i}")
                markdown_lines.append("")
            
            # Format item content
            for key, value in item.items():
                formatted_key = self._format_key(key)
                formatted_value = self._format_value(value)
                markdown_lines.append(f"**{formatted_key}:** {formatted_value}")
            
            # Add separator between items
            if i < len(data):
                markdown_lines.append("")
                markdown_lines.append("---")
                markdown_lines.append("")
        
        return "\n".join(markdown_lines)
    
    def format_empty(self, message: str = "No data available") -> str:
        """
        Format empty result message
        
        Args:
            message: Custom message for empty results
            
        Returns:
            Formatted empty message
        """
        return f"*{message}*"
    
    def format_list(self, data: List[Dict], title: Optional[str] = None) -> str:
        """
        Format data as markdown list
        
        Args:
            data: List of dictionaries containing the data
            title: Optional title for the list
            
        Returns:
            Formatted markdown list string
        """
        if not data:
            return self.format_empty()
        
        markdown_lines = []
        
        # Add title if provided
        if title:
            markdown_lines.append(f"# {title}")
            markdown_lines.append("")
        
        # Format as list
        for item in data:
            primary_field = self._get_primary_field(item)
            if primary_field:
                markdown_lines.append(f"- {primary_field}")
            else:
                # Fallback to first key-value pair
                first_key = next(iter(item.keys()))
                markdown_lines.append(f"- {item[first_key]}")
        
        return "\n".join(markdown_lines)
    
    def _format_key(self, key: str) -> str:
        """
        Format dictionary key as readable label
        
        Args:
            key: Raw dictionary key
            
        Returns:
            Formatted key string
        """
        # Convert snake_case to Title Case
        formatted = key.replace("_", " ").title()
        
        # Handle special cases
        replacements = {
            "Task Date": "Date",
            "Task Time": "Time",
            "Task Type": "Type",
            "Urgency Level": "Priority",
            "Entry Date": "Date",
            "Event Date": "Date",
            "Event Time": "Time",
            "User Id": "User"
        }
        
        return replacements.get(formatted, formatted)
    
    def _format_value(self, value: Any) -> str:
        """
        Format dictionary value with special handling
        
        Args:
            value: Value to format
            
        Returns:
            Formatted value string
        """
        if value is None or value == "":
            return "*Not specified*"
        
        # Handle boolean values
        if isinstance(value, bool):
            return "✅ Yes" if value else "❌ No"
        
        # Handle status-like fields
        if isinstance(value, (int, str)):
            str_value = str(value).lower()
            
            # Status formatting
            if str_value in ["completed", "done", "finished", "1"]:
                return "✅ **Completed**"
            elif str_value in ["failed", "error", "cancelled"]:
                return "❌ **Failed**"
            elif str_value in ["pending", "todo", "waiting", "0"]:
                return "⏳ **Pending**"
            elif str_value in ["high", "urgent", "critical"]:
                return "🔴 **High Priority**"
            elif str_value in ["medium", "normal"]:
                return "🟡 **Medium Priority**"
            elif str_value in ["low", "minor"]:
                return "🟢 **Low Priority**"
        
        # Default formatting
        return self._sanitize_value(value)
    
    def _get_primary_field(self, item: Dict) -> Optional[str]:
        """
        Get the primary field from an item for list formatting
        
        Args:
            item: Dictionary item
            
        Returns:
            Primary field value or None
        """
        # Priority order for primary fields
        primary_fields = ["title", "name", "task_title", "event_title", "content", "description"]
        
        for field in primary_fields:
            if field in item and item[field]:
                return str(item[field])
        
        return None
