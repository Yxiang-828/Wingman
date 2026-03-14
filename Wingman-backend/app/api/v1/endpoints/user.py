from fastapi import APIRouter, HTTPException, Depends
from app.api.v1.schemas.user import UserCreate, UserResponse, UserLogin
from app.services.user import create_user, get_user_by_username_and_password, delete_user, check_username_availability
from datetime import datetime, timezone
import uuid
import logging

router = APIRouter(prefix="/user", tags=["user"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=UserResponse)
def register_user(user_data: UserCreate):
    try:
        user_data_dict = user_data.dict()
        user_data_dict["id"] = str(uuid.uuid4())

        created_user = create_user(user_data_dict)

        if not created_user:
            raise HTTPException(status_code=500, detail="Failed to create user")

        if isinstance(created_user, dict) and "error" in created_user:
            raise HTTPException(status_code=409, detail=created_user)

        return created_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
def login(user_data: UserLogin):
    try:
        user = get_user_by_username_and_password(user_data.username, user_data.password)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        dummy_token = f"local_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{user['id']}"
        
        return {
            "token": dummy_token,
            "user": user,
            "message": "Login successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-username/{username}")
def check_username(username: str):
    is_available = check_username_availability(username)
    return {"available": is_available}

@router.delete("/delete-account/{user_id}")
def delete_account(user_id: str):
    try:
        result = delete_user(user_id)
        if result and result.get("success"):
            return {"message": f"User {user_id} deleted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete user")
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "api": "connected",
        "database": "sqlite_local",
        "auth": "local_only",
        "mode": "offline"
    }

@router.post("/sync")
def sync_user(user_data: dict):
    # Dummy sync endpoint since we are offline only now
    try:
        created_user = create_user(user_data)
        return {"status": "synced locally", "user": created_user}
    except Exception as e:
        logger.error(f"Error syncing user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
