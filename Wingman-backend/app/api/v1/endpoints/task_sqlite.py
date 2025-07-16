"""
Updated Task Endpoints using SQLite
Replaces Supabase-based task operations with SQLite
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
from app.services.sqlite_tasks import SQLiteTaskService
import traceback

router = APIRouter()
task_service = SQLiteTaskService()

@router.get("/tasks", response_model=List[Dict])
def get_tasks(date: str = Query(..., description="Date in format YYYY-MM-DD"), 
              user_id: str = Query(..., description="User ID")):
    """
    Get tasks for a specific date and user using SQLite.
    Date should be in format YYYY-MM-DD (e.g. 2025-07-17)
    """
    try:
        return task_service.get_tasks_by_date(user_id, date)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")

@router.get("/tasks/all")
def get_all_tasks(user_id: str = Query(..., description="User ID")):
    """Get all tasks for a user using SQLite"""
    try:
        return task_service.get_all_tasks(user_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching all tasks: {str(e)}")

@router.get("/tasks/pending")
def get_pending_tasks(user_id: str = Query(..., description="User ID")):
    """Get pending tasks for a user using SQLite"""
    try:
        return task_service.get_pending_tasks(user_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching pending tasks: {str(e)}")

@router.post("/tasks", response_model=Dict)
def create_task_endpoint(task: Dict):
    """Create a new task using SQLite"""
    try:
        print(f"SQLite API: Received create request: {task}")
        
        # Ensure required fields are present
        if not task.get('title'):
            raise HTTPException(status_code=400, detail="Title is required")
        if not task.get('user_id'):
            raise HTTPException(status_code=400, detail="User ID is required")
        
        result = task_service.create_task(task)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create task")
        
        print(f"SQLite API: Task created successfully: {result}")
        return result
    except Exception as e:
        print(f"SQLite API: Error creating task: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.put("/tasks/{task_id}", response_model=Dict)
def update_task_endpoint(task_id: int, updates: Dict):
    """Update a task using SQLite"""
    try:
        print(f"SQLite API: Updating task {task_id} with: {updates}")
        
        result = task_service.update_task(task_id, updates)
        
        if not result:
            raise HTTPException(status_code=404, detail="Task not found or update failed")
        
        print(f"SQLite API: Task updated successfully: {result}")
        return result
    except Exception as e:
        print(f"SQLite API: Error updating task: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")

@router.delete("/tasks/{task_id}")
def delete_task_endpoint(task_id: int):
    """Delete a task using SQLite"""
    try:
        print(f"SQLite API: Deleting task {task_id}")
        
        success = task_service.delete_task(task_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Task not found or delete failed")
        
        print(f"SQLite API: Task deleted successfully")
        return {"success": True, "message": f"Task {task_id} deleted successfully"}
    except Exception as e:
        print(f"SQLite API: Error deleting task: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")

@router.get("/tasks/{task_id}", response_model=Dict)
def get_task_by_id(task_id: int):
    """Get a specific task by ID using SQLite"""
    try:
        result = task_service.get_task_by_id(task_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching task: {str(e)}")

@router.get("/tasks/completed/{date}")
def get_completed_tasks_by_date(date: str, user_id: str = Query(..., description="User ID")):
    """Get completed tasks for a specific date using SQLite"""
    try:
        return task_service.get_completed_tasks(user_id, date)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching completed tasks: {str(e)}")
