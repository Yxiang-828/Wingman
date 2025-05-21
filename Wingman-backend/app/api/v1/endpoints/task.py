from fastapi import APIRouter, HTTPException, Query
from app.api.v1.schemas.task import TaskCreate, TaskUpdate, TaskInDB
from app.tasks.task import get_tasks_by_date, create_task, update_task, delete_task
from typing import List
import traceback

router = APIRouter()

@router.get("/tasks", response_model=List[dict])
def get_tasks(date: str = Query(..., description="Date in format YYYY-MM-DD"), 
              user_id: str = Query(..., description="User ID")):
    """
    Get tasks for a specific date and user.
    Date should be in format YYYY-MM-DD (e.g. 2025-05-21)
    """
    try:
        return get_tasks_by_date(date, user_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")

@router.post("/tasks", response_model=dict)
def create_task_endpoint(task: dict):
    try:
        return create_task(task)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.put("/tasks/{task_id}", response_model=dict)
def update_task_endpoint(task_id: int, task: dict):
    try:
        result = update_task(task_id, task)
        if not result:
            # Provide a fallback response
            return {"id": task_id, "message": "Update processed but no data returned"}
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error updating task: {str(e)}"
        )

@router.delete("/tasks/{task_id}", response_model=dict)
def delete_task_endpoint(task_id: int):
    try:
        return delete_task(task_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")