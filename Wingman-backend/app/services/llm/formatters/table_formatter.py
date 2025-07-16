"""
Markdown Table Formatter - Formats data as markdown tables
"""

from typing import Dict, List, Any, Optional
from .data_formatter import DataFormatter

class MarkdownTableFormatter(DataFormatter):
    """
    Formats database results as professional markdown tables
    Handles status formatting, date formatting, and responsive design
    """
    
    def format(self, data: List[Dict], title: Optional[str] = None) -> str:
        """
        Format data as markdown table
        
        Args:
            data: List of dictionaries containing the data
            title: Optional title for the table
            
        Returns:
            Formatted markdown table string
        """
        if not data:
            return self.format_empty()
        
        # Get all unique keys from all dictionaries
        all_keys = set()
        for item in data:
            all_keys.update(item.keys())
        
        # Convert to sorted list for consistent column order
        columns = sorted(list(all_keys))
        
        # Build markdown table
        markdown_lines = []
        
        # Add title if provided
        if title:
            markdown_lines.append(f"## {title}")
            markdown_lines.append("")
        
        # Create header row
        header = "| " + " | ".join(self._format_header(col) for col in columns) + " |"
        markdown_lines.append(header)
        
        # Create separator row
        separator = "| " + " | ".join("---" for _ in columns) + " |"
        markdown_lines.append(separator)
        
        # Create data rows
        for item in data:
            row = "| " + " | ".join(self._format_cell(item.get(col, "")) for col in columns) + " |"
            markdown_lines.append(row)
        
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
    
    def _format_header(self, header: str) -> str:
        """
        Format column header with proper capitalization
        
        Args:
            header: Raw column header
            
        Returns:
            Formatted header string
        """
        # Convert snake_case to Title Case
        formatted = header.replace("_", " ").title()
        
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
    
    def _format_cell(self, value: Any) -> str:
        """
        Format individual cell value with special handling
        
        Args:
            value: Cell value to format
            
        Returns:
            Formatted cell string
        """
        if value is None or value == "":
            return "-"
        
        # Handle boolean values
        if isinstance(value, bool):
            return "✅ Yes" if value else "❌ No"
        
        # Handle status-like fields
        if isinstance(value, (int, str)):
            str_value = str(value).lower()
            
            # Status formatting
            if str_value in ["completed", "done", "finished", "1"]:
                return "✅ Completed"
            elif str_value in ["failed", "error", "cancelled"]:
                return "❌ Failed"
            elif str_value in ["pending", "todo", "waiting", "0"]:
                return "⏳ Pending"
            elif str_value in ["high", "urgent", "critical"]:
                return "🔴 High"
            elif str_value in ["medium", "normal"]:
                return "🟡 Medium"
            elif str_value in ["low", "minor"]:
                return "🟢 Low"
        
        # Default formatting with sanitization
        return self._sanitize_value(value)
