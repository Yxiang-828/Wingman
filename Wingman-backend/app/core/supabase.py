from app.core.config import settings
from supabase import create_client
import os

# Add debug print to check connection parameters
print(f"Connecting to Supabase URL: {settings.SUPABASE_URL}")
# Don't print the full key, just first/last few chars for verification
print(f"Using key starting with: {settings.SUPABASE_KEY[:5]}...{settings.SUPABASE_KEY[-5:]}")

# Create a Supabase client using your settings
try:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    # Test the connection
    response = supabase.table("tasks").select("count", count="exact").execute()
    print(f"Supabase connection successful. Found {response.count} tasks.")
except Exception as e:
    import traceback
    print(f"Supabase connection failed: {e}")
    traceback.print_exc()
    # Provide a fallback for development
    from unittest.mock import MagicMock
    supabase = MagicMock()
    # Mock the table method to return a chain of methods
    mock_table = MagicMock()
    mock_chain = MagicMock()
    mock_chain.execute.return_value.data = []
    mock_table.select.return_value = mock_chain
    mock_table.insert.return_value = mock_chain
    mock_table.update.return_value = mock_chain
    mock_table.delete.return_value = mock_chain
    supabase.table.return_value = mock_table