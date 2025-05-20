from pydantic import BaseModel
from datetime import date

class DiaryBase(BaseModel):
    date: date
    title: str
    content: str
    mood: str = "neutral"

class DiaryCreate(DiaryBase):
    pass

class DiaryUpdate(DiaryBase):
    pass

class DiaryInDB(DiaryBase):
    id: int

    class Config:
        orm_mode = True