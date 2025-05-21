from pydantic import BaseModel, Field
from datetime import date as date_type  # Renamed to avoid conflict
from typing import Optional

class TaskBase(BaseModel):
    # The issue is the conflict between field name 'date' and the imported 'date' type
    task_date: date_type  # Use this name directly instead of aliasing
    text: str
    task_time: Optional[str] = ""  # Use this name directly
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    pass

class TaskInDB(TaskBase):
    id: int
    
    class Config:
        orm_mode = True
        json_encoders = {date_type: lambda v: v.isoformat()}