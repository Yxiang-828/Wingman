from app.core.config import settings
from supabase import create_client
import os

# Create Supabase client using credentials from settings
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_supabase_client():
    """Return a configured Supabase client."""
    return supabase