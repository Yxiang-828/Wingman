import os
from supabase import create_client, Client
from app.core.config import settings
import logging
import traceback

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize supabase connection
try:
    logger.info(f"Initializing Supabase client with URL: {settings.SUPABASE_URL[:20]}...")
    
    # Check if credentials are available
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError("Supabase URL or key missing in environment variables")
    
    # Basic version with minimal parameters
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # Test connection with a simple query
    try:
        test = supabase.from_('users').select('id').limit(1).execute()
        logger.info(f"Supabase connection test successful")
    except Exception as test_error:
        logger.warning(f"Supabase connection test query failed: {str(test_error)}")
        raise ValueError(f"Could not connect to Supabase: {str(test_error)}")
    
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Provide a fake client for development/testing
    from unittest.mock import MagicMock
    
    # Create a mock that behaves like the supabase client
    mock_data = []
    
    class MockExecute:
        def __init__(self):
            self.data = []
    
    class MockTable:
        def select(self, *args):
            return self
        
        def eq(self, *args):
            return self
        
        def limit(self, *args):
            return self
            
        def insert(self, *args):
            return self
            
        def execute(self):
            result = MockExecute()
            return result
    
    supabase = MagicMock()
    supabase.table.return_value = MockTable()
    supabase.from_.return_value = MockTable()
    
    logger.warning("Using mock Supabase client due to initialization error")

def get_supabase_client():
    """Return the Supabase client instance."""
    return supabase