from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class DiaryEntryBase(BaseModel):
    title: str
    content: str
    mood: Optional[str] = None
    date: str

class DiaryEntryCreate(DiaryEntryBase):
    user_id: str

class DiaryEntryUpdate(DiaryEntryBase):
    title: Optional[str] = None
    content: Optional[str] = None
    user_id: Optional[str] = None

class DiaryEntryResponse(DiaryEntryBase):
    id: int
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None