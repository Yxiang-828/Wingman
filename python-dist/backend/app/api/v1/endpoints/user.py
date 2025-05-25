from fastapi import APIRouter, HTTPException, Depends
from app.api.v1.schemas.user import UserCreate, UserResponse, UserLogin
from app.services.user import create_user, get_user_by_username_and_password
import uuid

router = APIRouter(prefix="/user", tags=["user"])

@router.post("/register", response_model=UserResponse)
def register_user(user_data: UserCreate):
    try:
        # Generate UUID for new user
        user_data_dict = user_data.dict()
        user_data_dict["id"] = str(uuid.uuid4())
        
        # Create user in database
        created_user = create_user(user_data_dict)
        
        if not created_user:
            raise HTTPException(
                status_code=500, 
                detail="Failed to create user")
        
        return created_user
    except Exception as e:
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
    
    return user