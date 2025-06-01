from app.core.supabase import get_supabase_client
import logging
import uuid
from datetime import datetime, timezone

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
        if not all(k in user_data for k in ['username', 'email', 'password']):
            logger.error("Missing required user fields")
            return None
        
        # Add uuid if not provided
        if 'id' not in user_data:
            user_data['id'] = str(uuid.uuid4())
        
        # Validate that username is provided - don't auto-generate from email
        if 'username' not in user_data or not user_data['username'].strip():
            logger.error("Username is required and cannot be empty")
            return None
        
        # Username availability is already checked by frontend before calling this function
        # No need to double-check here to avoid race conditions and timing issues
        
        # Add timestamps with proper timezone
        now = datetime.now(timezone.utc).isoformat()
        user_data['created_at'] = now
        user_data['updated_at'] = now
        
        logger.info(f"Creating user with username: '{user_data['username']}'")
        logger.info(f"User data keys: {list(user_data.keys())}")
        logger.info(f"User data (without password): {dict((k, v) for k, v in user_data.items() if k != 'password')}")
        
        # Double-check username availability right before insert to catch race conditions
        logger.info(f"Double-checking username availability before insert...")
        username_still_available = check_username_availability(user_data['username'])
        logger.info(f"Username '{user_data['username']}' is still available: {username_still_available}")
        
        if not username_still_available:
            logger.warning(f"Username '{user_data['username']}' was taken between frontend check and backend insert (race condition)")
            return {
                "error": "username_taken",
                "message": f"Username '{user_data['username']}' was taken during registration. Please try a different username."
            }
        
        # Support both older and newer Supabase client versions
        try:
            # Try newer style first
            response = supabase.table("users").insert(user_data).execute()
        except Exception as e:
            logger.error(f"Insert failed with newer style: {str(e)}")
            error_msg = str(e).lower()
            
            # Handle specific unique constraint violations (username or email conflicts)
            # Be more specific about what constitutes a username conflict
            if ("unique" in error_msg and "username" in error_msg) or \
               ("duplicate" in error_msg and "username" in error_msg) or \
               ("already exists" in error_msg and "username" in error_msg) or \
               ("violates unique constraint" in error_msg and "username" in error_msg):
                logger.warning(f"Username conflict during creation (race condition): {str(e)}")
                return {
                    "error": "username_taken",
                    "message": f"Username '{user_data['username']}' was taken during registration. Please try a different username."
                }
            
            # Try fall back to older style for other errors (not username conflicts)
            try:
                logger.info("Trying older style insert method")
                response = supabase.from_("users").insert(user_data).execute()
            except Exception as e2:
                logger.error(f"Insert failed with older style too: {str(e2)}")
                error_msg2 = str(e2).lower()
                
                # Handle unique constraint violations in older style too - be specific about username
                if ("unique" in error_msg2 and "username" in error_msg2) or \
                   ("duplicate" in error_msg2 and "username" in error_msg2) or \
                   ("already exists" in error_msg2 and "username" in error_msg2) or \
                   ("violates unique constraint" in error_msg2 and "username" in error_msg2):
                    logger.warning(f"Username conflict during creation (older style, race condition): {str(e2)}")
                    return {
                        "error": "username_taken", 
                        "message": f"Username '{user_data['username']}' was taken during registration. Please try a different username."
                    }
                
                # If it's not a username constraint violation, it's a different error
                logger.error(f"Non-username related error during user creation: {str(e2)}")
                return None
        
        if hasattr(response, 'data') and response.data:
            created_user = response.data[0]
            logger.info(f"✅ User successfully created!")
            logger.info(f"Created user ID: {created_user.get('id')}")
            logger.info(f"Created user username: {created_user.get('username')}")
            logger.info(f"Created user timestamps - created_at: {created_user.get('created_at')}, updated_at: {created_user.get('updated_at')}")
            return created_user
        else:
            logger.warning("❌ User creation response doesn't have data")
            logger.warning(f"Response type: {type(response)}")
            logger.warning(f"Response hasattr data: {hasattr(response, 'data')}")
            if hasattr(response, 'data'):
                logger.warning(f"Response data: {response.data}")
            return None
    except Exception as e:
        logger.error(f"Error in create_user: {str(e)}")
        return None

def update_user(user_id: str, name: str | None = None):
    update_data = {}
    if name: 
        update_data["name"] = name
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
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

def delete_user(user_id: str) -> bool:
    """
    Delete a user from the Supabase database.
    This will permanently remove the user account from Supabase.
    """
    try:
        logger.info(f"Starting user deletion process for user: {user_id}")
        
        # First verify the user exists
        user_exists_before = verify_user_exists(user_id)
        logger.info(f"User {user_id} exists before deletion: {user_exists_before}")
        
        if not user_exists_before:
            logger.warning(f"User {user_id} does not exist, cannot delete")
            return False
        
        # Delete user from Supabase users table
        logger.info(f"Executing delete operation for user {user_id}")
        
        # Support both older and newer Supabase client versions
        response = None
        try:
            # Try newer style first
            logger.info("Attempting delete with newer Supabase client style")
            response = supabase.table("users").delete().eq("id", user_id).execute()
            logger.info(f"Delete response (newer style): {response}")
        except Exception as e1:
            logger.warning(f"Newer style failed: {e1}, trying older style")
            # Fall back to older style
            try:
                response = supabase.from_("users").delete().eq("id", user_id).execute()
                logger.info(f"Delete response (older style): {response}")
            except Exception as e2:
                logger.error(f"Both delete styles failed. Newer: {e1}, Older: {e2}")
                return False
        
        # Check if deletion was successful
        logger.info(f"Delete response type: {type(response)}")
        logger.info(f"Delete response has data attr: {hasattr(response, 'data')}")
        
        if hasattr(response, 'data'):
            logger.info(f"Delete response data: {response.data}")
            logger.info(f"Delete response data length: {len(response.data) if response.data else 'None'}")
            
            # Verify deletion by checking if user still exists
            user_exists_after = verify_user_exists(user_id)
            logger.info(f"User {user_id} exists after deletion: {user_exists_after}")
            
            if not user_exists_after:
                logger.info(f"User {user_id} successfully deleted from Supabase (verified by re-check)")
                return True
            else:
                logger.error(f"User {user_id} still exists after deletion attempt")
                return False
        else:
            logger.warning("Supabase delete response doesn't have data attribute")
            # Check if user still exists to confirm deletion
            user_exists_after = verify_user_exists(user_id)
            logger.info(f"User {user_id} exists after deletion (no data attr): {user_exists_after}")
            return not user_exists_after
            
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def check_username_availability(username: str) -> bool:
    """
    Check if a username is available in Supabase.
    Returns True if available, False if taken.
    """
    try:
        logger.info(f"Checking username availability for: '{username}'")
        
        # Support both older and newer Supabase client versions
        try:
            logger.info("Using newer style Supabase client")
            response = supabase.table("users").select("username").eq("username", username).execute()
        except Exception as e:
            logger.info(f"Newer style failed ({str(e)}), trying older style")
            response = supabase.from_("users").select("username").eq("username", username).execute()
        
        if hasattr(response, 'data'):
            found_users = len(response.data)
            is_available = found_users == 0
            logger.info(f"Username '{username}' search returned {found_users} matching users")
            logger.info(f"Username '{username}' availability: {'AVAILABLE' if is_available else 'TAKEN'}")
            
            if not is_available and response.data:
                logger.info(f"Existing users with username '{username}': {response.data}")
            
            return is_available
        else:
            logger.warning("Supabase response doesn't have data attribute")
            logger.warning(f"Response type: {type(response)}")
            logger.warning(f"Response: {response}")
            return False
    except Exception as e:
        logger.error(f"Error checking username availability for '{username}': {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

