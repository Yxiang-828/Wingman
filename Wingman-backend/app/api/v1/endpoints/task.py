from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.schemas.task import TaskCreate, TaskUpdate, TaskInDB
from app.services.tasks import task_crud
from typing import List
from datetime import date

router = APIRouter()

@router.get("/tasks/{date}", response_model=List[TaskInDB])
def get_tasks(date: date, db: Session = Depends(get_db)):
    return task_crud.get_tasks_by_date(db, date)

@router.post("/tasks/", response_model=TaskInDB)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    return task_crud.create_task(db, task)

@router.put("/tasks/{task_id}", response_model=TaskInDB)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    return task_crud.update_task(db, task_id, task)

@router.delete("/tasks/{task_id}", response_model=TaskInDB)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    return task_crud.delete_task(db, task_id)