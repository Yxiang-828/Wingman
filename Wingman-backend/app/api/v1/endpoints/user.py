from fastapi import APIRouter, HTTPException
from app.api.v1.schemas.user import UserCreate, UserLogin, UserInDB
from app.services.user import create_user, get_user_by_password, update_user

router = APIRouter()

@router.post("/user/register", response_model=UserInDB)
def register(user: UserCreate):
    existing = get_user_by_password(user.password)
    if existing:
        raise HTTPException(status_code=400, detail="Password already in use")
    return create_user(user)

@router.post("/user/login", response_model=UserInDB)
def login(login: UserLogin):
    user = get_user_by_password(login.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid password")
    return user

@router.put("/user/{user_id}", response_model=UserInDB)
def update_profile(user_id: str, name: str = None):
    return update_user(user_id, name)