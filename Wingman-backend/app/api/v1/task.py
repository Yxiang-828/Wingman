from pydantic import BaseModel
from datetime import date

class TaskBase(BaseModel):
    date: date
    text: str
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    pass

class TaskInDB(TaskBase):
    id: int

    class Config:
        orm_mode = True