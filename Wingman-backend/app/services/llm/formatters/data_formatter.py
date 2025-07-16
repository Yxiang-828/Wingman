"""
Data Formatter - Base class for formatting database results
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional

class DataFormatter(ABC):
    """
    Abstract base class for all data formatters
    Provides consistent interface for formatting database results
    """
    
    @abstractmethod
    def format(self, data: List[Dict], title: Optional[str] = None) -> str:
        """
        Format data into the desired output format
        
        Args:
            data: List of dictionaries containing the data to format
            title: Optional title for the formatted output
            
        Returns:
            Formatted string representation of the data
        """
        pass
    
    @abstractmethod
    def format_empty(self, message: str = "No data available") -> str:
        """
        Format empty result set
        
        Args:
            message: Custom message for empty results
            
        Returns:
            Formatted empty result message
        """
        pass
    
    def _sanitize_value(self, value: Any) -> str:
        """
        Sanitize individual values for safe display
        
        Args:
            value: Value to sanitize
            
        Returns:
            Sanitized string representation
        """
        if value is None:
            return ""
        
        if isinstance(value, bool):
            return "Yes" if value else "No"
        
        if isinstance(value, (int, float)):
            return str(value)
        
        # Convert to string and escape special characters
        return str(value).replace("|", "\\|").replace("\n", " ").replace("\r", "")
