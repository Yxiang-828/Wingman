from app.core.supabase import get_supabase_client
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)
supabase = get_supabase_client()

def get_user_by_username_and_password(username: str, password: str):
    """
    Get a user by username and password.
    """
    try:
        logger.info(f"Attempting to find user with username: {username}")
        
        # Support both older and newer Supabase client versions
        try:
            # Try newer style first (table method)
            response = supabase.table("users").select("*").eq("username", username).eq("password", password).execute()
        except Exception:
            # Fall back to older style (from_ method)
            response = supabase.from_("users").select("*").eq("username", username).eq("password", password).execute()
        
        # Log information about the response
        if hasattr(response, 'data'):
            logger.info(f"Found {len(response.data)} matching users")
            
            if response.data and len(response.data) > 0:
                return response.data[0]
        else:
            logger.warning("Supabase response doesn't have data attribute")
        
        return None
    except Exception as e:
        logger.error(f"Error in get_user_by_username_and_password: {str(e)}")
        return None

def create_user(user_data):
    """
    Create a new user.
    """
    try:
        # Ensure we have required fields
        if not all(k in user_data for k in ['name', 'email', 'password']):
            logger.error("Missing required user fields")
            return None
        
        # Add uuid if not provided
        if 'id' not in user_data:
            user_data['id'] = str(uuid.uuid4())
        
        # Add username if not provided
        if 'username' not in user_data or not user_data['username']:
            user_data['username'] = user_data['email'].split('@')[0]
        
        # Add timestamps
        now = datetime.now().isoformat()
        user_data['created_at'] = now
        user_data['updated_at'] = now
        
        logger.info(f"Creating user with username: {user_data['username']}")
        
        # Support both older and newer Supabase client versions
        try:
            # Try newer style first
            response = supabase.table("users").insert(user_data).execute()
        except Exception:
            # Fall back to older style
            response = supabase.from_("users").insert(user_data).execute()
        
        if hasattr(response, 'data') and response.data:
            logger.info(f"User created: {response.data[0]['id']}")
            return response.data[0]
        else:
            logger.warning("User creation response doesn't have data")
            return None
    except Exception as e:
        logger.error(f"Error in create_user: {str(e)}")
        return None

def update_user(user_id: str, name: str = None):
    update_data = {}
    if name: update_data["name"] = name
    response = supabase.table("users").update(update_data).eq("id", user_id).execute()
    return response.data[0] if response.data else None

def verify_user_exists(user_id: str) -> bool:
    """Check if a user exists in the database"""
    try:
        response = supabase.table("users").select("id").eq("id", user_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error verifying user: {e}")
        return False