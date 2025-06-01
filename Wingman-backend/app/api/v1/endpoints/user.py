from fastapi import APIRouter, HTTPException, Depends
from app.api.v1.schemas.user import UserCreate, UserResponse, UserLogin
from app.services.user import create_user, get_user_by_username_and_password, delete_user, check_username_availability
from app.core.supabase import get_supabase_client
from datetime import datetime, timezone
import uuid

supabase = get_supabase_client()
from datetime import datetime, timezone

router = APIRouter(prefix="/user", tags=["user"])

@router.post("/register", response_model=UserResponse)
def register_user(user_data: UserCreate):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"🚀 Registration request for username: '{user_data.username}'")
        
        # Generate UUID for new user
        user_data_dict = user_data.dict()
        user_data_dict["id"] = str(uuid.uuid4())
        
        logger.info(f"Generated UUID: {user_data_dict['id']}")
        
        # Create user in database
        logger.info("Calling create_user service...")
        created_user = create_user(user_data_dict)
        
        logger.info(f"create_user returned: {type(created_user)}")
        
        if not created_user:
            logger.error("create_user returned None/False")
            raise HTTPException(
                status_code=500, 
                detail="Failed to create user - service returned null")
        
        # Check if response contains error (username taken)
        if isinstance(created_user, dict) and "error" in created_user:
            logger.warning(f"create_user returned error: {created_user}")
            if created_user["error"] == "username_taken":
                logger.warning(f"Username conflict detected: {created_user['message']}")
                raise HTTPException(
                    status_code=409,
                    detail=created_user
                )
            else:
                logger.error(f"Unknown error from create_user: {created_user}")
                raise HTTPException(
                    status_code=500,
                    detail=created_user
                )
        
        logger.info(f"✅ User registration successful for username: '{user_data.username}'")
        # Return raw data - let Pydantic handle filtering in response_model
        return created_user
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error during registration: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error creating user: {str(e)}")

@router.post("/login", response_model=UserResponse)
def login_user(login_data: UserLogin):
    user = get_user_by_username_and_password(login_data.username, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Invalid username or password")
    
    # Return raw data - let Pydantic handle filtering in response_model
    return user

@router.delete("/delete-account/{user_id}")
def delete_user_account(user_id: str):
    """
    Delete a user account permanently from Supabase.
    This will remove the user from the Supabase users table.
    Local SQLite data should be deleted separately by the client.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Received delete account request for user: {user_id}")
        
        # Attempt to delete user from Supabase
        logger.info(f"Calling delete_user service for user: {user_id}")
        success = delete_user(user_id)
        logger.info(f"delete_user service returned: {success}")
        
        if not success:
            logger.error(f"User deletion failed for user: {user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"User {user_id} not found or could not be deleted")
        
        logger.info(f"User {user_id} successfully deleted from Supabase")
        return {
            "success": True,
            "message": f"User account {user_id} successfully deleted from Supabase",
            "user_id": user_id
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error deleting user account {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting user account: {str(e)}")

@router.get("/check-username/{username}")
def check_username(username: str):
    """
    Check if a username is available.
    Returns availability status and suggestions if taken.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"🔍 Username availability check for: '{username}'")
        is_available = check_username_availability(username)
        
        if is_available:
            logger.info(f"✅ Username '{username}' is AVAILABLE")
            return {
                "available": True,
                "username": username,
                "message": "Username is available"
            }
        else:
            logger.info(f"❌ Username '{username}' is TAKEN")
            return {
                "available": False,
                "username": username,
                "message": "Username is already taken. Please choose a different username."
            }
    except Exception as e:
        logger.error(f"❌ Error checking username '{username}': {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error checking username: {str(e)}")

@router.get("/health")
def health_check():
    """
    Health check endpoint for backend and Supabase connectivity.
    """
    try:
        # Test Supabase connection
        response = supabase.table("users").select("id").limit(1).execute()
        
        if hasattr(response, 'data'):
            return {
                "status": "online",
                "backend": "healthy",
                "supabase": "connected",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            return {
                "status": "offline", 
                "backend": "healthy",
                "supabase": "disconnected",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    except Exception as e:
        return {
            "status": "offline",
            "backend": "healthy", 
            "supabase": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@router.post("/sync", response_model=UserResponse)
def sync_user(user_data: UserCreate):
    """
    Sync user to Supabase - bypasses username checking since UUID is unique
    Used for offline-to-online sync without conflicts
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"🔄 Sync request for username: '{user_data.username}'")
        
        # Use existing UUID if provided, otherwise generate new one
        user_data_dict = user_data.dict()
        if "id" not in user_data_dict:
            user_data_dict["id"] = str(uuid.uuid4())
        
        logger.info(f"Using UUID: {user_data_dict['id']}")
        
        # Add timestamps
        now = datetime.now(timezone.utc).isoformat()
        user_data_dict['created_at'] = now
        user_data_dict['updated_at'] = now
        
        logger.info(f"Syncing user to Supabase (bypasses username checking and relies on UUID uniqueness)...")
        
        # Direct insert to Supabase - UUID handles uniqueness
        try:
            response = supabase.table("users").insert(user_data_dict).execute()
        except Exception as e:
            # Try older style if newer fails
            logger.info("Trying older style insert method")
            response = supabase.from_("users").insert(user_data_dict).execute()
        
        if hasattr(response, 'data') and response.data:
            created_user = response.data[0]
            logger.info(f"✅ User sync successful for username: '{user_data.username}', UUID: {created_user.get('id')}")
            return created_user
        else:
            logger.error("❌ Sync failed - no data in response")
            raise HTTPException(
                status_code=500, 
                detail="Failed to sync user to cloud")
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error during sync: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error syncing user: {str(e)}")