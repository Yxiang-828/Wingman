from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    password: str  # 6-digit code
    email: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserInDB(BaseModel):
    id: str
    username: str
    name: str
    email: str
    
    class Config:
        orm_mode = True  # Add this if you need ORM mode