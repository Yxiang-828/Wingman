from pydantic import BaseModel
from datetime import date

class TaskBase(BaseModel):
    date: date
    text: str
    time: str = ""  # Add default empty string for time
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    pass

class TaskInDB(TaskBase):
    id: int

    class Config:
        orm_mode = True