from pydantic import BaseModel
from typing import Optional
from datetime import date

class DiaryBase(BaseModel):
    entry_date: date
    title: str
    content: str
    mood: Optional[str] = None

class DiaryCreate(DiaryBase):
    user_id: str

class DiaryUpdate(DiaryBase):
    entry_date: Optional[date] = None
    title: Optional[str] = None
    content: Optional[str] = None

class DiaryInDB(DiaryBase):
    id: int
    user_id: str
    
    class Config:
        orm_mode = True