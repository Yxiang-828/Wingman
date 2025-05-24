from fastapi import APIRouter, HTTPException
from app.api.v1.schemas.user import UserCreate, UserLogin, UserInDB
from app.services.user import create_user, get_user_by_username_and_password, update_user, verify_user_exists

router = APIRouter()

@router.post("/register", response_model=UserInDB)
def register(user: UserCreate):
    # You should check if username exists first
    return create_user(user)

@router.post("/login", response_model=UserInDB)
def login(login: UserLogin):
    user = get_user_by_username_and_password(login.username, login.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user

@router.put("/{user_id}", response_model=UserInDB)
def update_profile(user_id: str, name: str = None):
    return update_user(user_id, name)

@router.get("/verify", response_model=bool)
def verify_user(id: str):
    """Verify if a user ID is valid"""
    exists = verify_user_exists(id)
    if not exists:
        raise HTTPException(status_code=404, detail="User not found")
    return True