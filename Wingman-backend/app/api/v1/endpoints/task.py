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
        print(f"Backend API: Received create request: {task}")
        
        # ✅ VALIDATION: Ensure required fields are present
        if not task.get('title'):
            raise HTTPException(status_code=400, detail="Title is required")
        if not task.get('user_id'):
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # ✅ FIX: Database expects 'title' field (not 'text')
        task_data = {
            'title': task['title'],  # ✅ CHANGED: was task.get('text')
            'task_date': task.get('task_date', ''),
            'task_time': task.get('task_time', ''),
            'completed': task.get('completed', False),
            'user_id': task['user_id']
        }
        
        result = create_task(task_data)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create task")
        
        print(f"Backend API: Task created successfully: {result}")
        return result
    except Exception as e:
        print(f"Backend API: Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.put("/tasks/{task_id}", response_model=dict)
def update_task_endpoint(task_id: int, task: dict):
    try:
        print(f"Backend API: Received update request for task {task_id}")
        print(f"Backend API: Task data: {task}")
        
        # ✅ ENSURE: title field is handled correctly
        if 'text' in task and 'title' not in task:
            # Handle legacy requests that might still send 'text'
            task['title'] = task.pop('text')
        
        result = update_task(task_id, task)
        
        if not result:
            print(f"Backend API: No result returned from update_task")
            return {"id": task_id, "message": "Update processed but no data returned"}
        
        print(f"Backend API: Task updated successfully: {result}")
        return result
    except Exception as e:
        traceback.print_exc()
        print(f"Backend API: Error updating task: {str(e)}")
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