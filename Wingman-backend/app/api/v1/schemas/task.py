from pydantic import BaseModel, Field
from datetime import date as date_type
from typing import Optional

class TaskBase(BaseModel):
    task_date: date_type  # Match database column name
    text: str
    task_time: Optional[str] = ""  # Match database column name
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    pass

class TaskInDB(TaskBase):
    id: int
    
    class Config:
        orm_mode = True  # Already using the correct style for v1.10.x