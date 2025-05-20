from fastapi import APIRouter, HTTPException
from app.api.v1.schemas.task import TaskCreate, TaskUpdate, TaskInDB
from app.tasks.task import get_tasks_by_date, create_task, update_task, delete_task
from typing import List
from datetime import date
import traceback

router = APIRouter()

@router.get("/tasks", response_model=List[TaskInDB])
def get_tasks(date: str):
    result = get_tasks_by_date(date)
    return result or []  # Always return a list

@router.post("/tasks", response_model=TaskInDB)
def create_task_endpoint(task: TaskCreate):
    try:
        return create_task(task)
    except Exception as e:
        traceback.print_exc()  # Print the full traceback
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.put("/tasks/{task_id}", response_model=TaskInDB)
def update_task_endpoint(task_id: int, task: TaskUpdate):
    return update_task(task_id, task)

@router.delete("/tasks/{task_id}", response_model=TaskInDB)
def delete_task_endpoint(task_id: int):
    return delete_task(task_id)