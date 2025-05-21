from fastapi import APIRouter, HTTPException, Query
from app.api.v1.schemas.task import TaskCreate, TaskUpdate, TaskInDB
from app.tasks.task import get_tasks_by_date, create_task, update_task, delete_task
from typing import List
from datetime import date
import traceback

router = APIRouter()

@router.get("/tasks", response_model=List[TaskInDB])
def get_tasks(date: str = Query(...)):
    result = get_tasks_by_date(date)
    # Transform the data to match expected schema
    transformed = []
    for task in result:
        task_copy = dict(task)
        # Move task_date to date for API consistency
        if "task_date" in task_copy:
            task_copy["date"] = task_copy["task_date"]
            # del task_copy["task_date"]  # Optional - keep both fields
        transformed.append(task_copy)
    return transformed

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