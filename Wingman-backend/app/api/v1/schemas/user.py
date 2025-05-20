from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    password: str  # 6-digit code
    email: str

class UserLogin(BaseModel):
    password: str

class UserInDB(BaseModel):
    id: str
    name: str