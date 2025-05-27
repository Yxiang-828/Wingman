from datetime import date
from app.api.v1.schemas.task import TaskCreate, TaskUpdate
from app.core.supabase import supabase
from app.services.user import verify_user_exists
import traceback

def get_tasks_by_date(date_str, user_id):
    try:
        # Filter by both date and user_id
        response = supabase.table("tasks").select("*").eq("task_date", date_str).eq("user_id", user_id).execute()
        
        # ✅ CRITICAL FIX: Database has 'title' field, send as-is
        result = []
        for task in response.data:
            task_copy = dict(task)
            # Add date and time fields for frontend compatibility only
            task_copy["date"] = task_copy["task_date"]
            task_copy["time"] = task_copy.get("task_time", "")
            # ✅ Keep 'title' as-is - no field mapping needed
            result.append(task_copy)
        
        return result
    except Exception as e:
        traceback.print_exc()
        print(f"Error fetching tasks: {e}")
        return []

def create_task(task_data: dict):
    try:
        print(f"Backend Service: create_task called with: {task_data}")
        
        # ✅ VALIDATION: Ensure required fields
        if not task_data.get('title'):
            raise ValueError("Title is required")
        if not task_data.get('user_id'):
            raise ValueError("User ID is required")
            
        # Verify user exists
        if not verify_user_exists(task_data["user_id"]):
            raise ValueError(f"User with ID {task_data['user_id']} does not exist")
        
        # ✅ Map frontend to database fields
        db_data = {
            'title': task_data['title'],  # ✅ Database expects 'title'
            'task_date': task_data.get('task_date', ''),
            'task_time': task_data.get('task_time', ''),
            'completed': task_data.get('completed', False),
            'user_id': task_data['user_id']
        }
        
        # Handle frontend 'date' field
        if 'date' in task_data and 'task_date' not in task_data:
            db_data['task_date'] = task_data['date']
            
        # Handle frontend 'time' field
        if 'time' in task_data and 'task_time' not in task_data:
            db_data['task_time'] = task_data['time']
        
        print(f"Creating task with data: {db_data}")
        response = supabase.table("tasks").insert(db_data).execute()
        
        if response.data and len(response.data) > 0:
            task = response.data[0]
            # Add frontend compatibility fields
            task["date"] = task["task_date"]
            task["time"] = task.get("task_time", "")
            return task
        else:
            print("Backend Service: No data returned from insert")
            return None
    except Exception as e:
        print(f"Backend Service: Error creating task: {str(e)}")
        raise e

def update_task(task_id: int, task: dict):
    try:
        print(f"Backend Service: update_task called for ID {task_id}")
        data = dict(task)
        
        # Remove the id field as it's an identity column
        if "id" in data:
            del data["id"]
        
        # ✅ Map frontend to database fields
        if "date" in data:
            data["task_date"] = data["date"]
            del data["date"]
            
        if "time" in data:
            data["task_time"] = data["time"]
            del data["time"]
            
        # ✅ Keep 'title' as-is since database expects 'title'
        
        # Execute the update query
        response = supabase.table("tasks").update(data).eq("id", task_id).execute()
        
        # If no data returned, fetch the updated task
        if not response.data or len(response.data) == 0:
            get_response = supabase.table("tasks").select("*").eq("id", task_id).execute()
            if get_response.data and len(get_response.data) > 0:
                task_data = get_response.data[0]
                # Add frontend compatibility fields
                task_data["date"] = task_data["task_date"]
                task_data["time"] = task_data.get("task_time", "")
                return task_data
            
            # Fallback response
            return {
                "id": task_id,
                "message": "Task updated successfully",
                "task_date": data.get("task_date", ""),
                "task_time": data.get("task_time", ""),
                "completed": data.get("completed", False),
                "title": data.get("title", "")  # ✅ Keep as 'title'
            }
        
        # Process normal response
        task_data = response.data[0]
        # Add frontend compatibility fields
        task_data["date"] = task_data["task_date"]
        task_data["time"] = task_data.get("task_time", "")
        print(f"Backend Service: Returning updated task: {task_data}")
        return task_data
    except Exception as e:
        print(f"Backend Service: Error in update_task: {str(e)}")
        traceback.print_exc()
        return {
            "id": task_id,
            "error": str(e),
            "message": "Failed to update task"
        }

def delete_task(task_id: int):
    response = supabase.table("tasks").delete().eq("id", task_id).execute()
    if response.data and len(response.data) > 0:
        task_data = response.data[0]
        # Add frontend compatibility fields
        task_data["date"] = task_data["task_date"]
        task_data["time"] = task_data.get("task_time", "")
        return task_data
    return None