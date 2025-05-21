from datetime import date
from app.api.v1.schemas.task import TaskCreate, TaskUpdate
from app.core.supabase import supabase
from app.services.user import verify_user_exists
import traceback

def get_tasks_by_date(date_str, user_id):
    try:
        # Filter by both date and user_id
        response = supabase.table("tasks").select("*").eq("task_date", date_str).eq("user_id", user_id).execute()
        
        # Transform response to add 'date' field for frontend
        result = []
        for task in response.data:
            task_copy = dict(task)
            # Add date and time fields for frontend
            task_copy["date"] = task_copy["task_date"]
            task_copy["time"] = task_copy.get("task_time", "")
            result.append(task_copy)
        
        return result
    except Exception as e:
        traceback.print_exc()
        print(f"Error fetching tasks: {e}")
        return []

def create_task(task):
    try:
        data = dict(task)
        
        # Make sure user_id is provided
        if "user_id" not in data:
            raise ValueError("user_id is required")
            
        # Verify user exists - CRITICAL STEP
        if not verify_user_exists(data["user_id"]):
            raise ValueError(f"User with ID {data['user_id']} does not exist in the users table")
        
        # Frontend sends 'date' but DB needs 'task_date'
        if "date" in data and "task_date" not in data:
            data["task_date"] = data["date"]
            del data["date"]
        
        # Frontend sends 'time' but DB needs 'task_time'
        if "time" in data and "task_time" not in data:
            data["task_time"] = data["time"]
            del data["time"]
            
        # Convert date object to string if needed
        if isinstance(data.get("task_date"), date):
            data["task_date"] = data["task_date"].isoformat()
            
        print(f"Creating task with data: {data}")
        response = supabase.table("tasks").insert(data).execute()
        
        if response.data and len(response.data) > 0:
            task_data = response.data[0]
            # Add date and time for frontend consistency
            task_data["date"] = task_data["task_date"]
            task_data["time"] = task_data.get("task_time", "")
            return task_data
        else:
            print(f"No data returned from insert: {response}")
            # Return a fallback object
            return {
                "id": 0, 
                "text": data["text"],
                "date": data["task_date"],
                "time": data.get("task_time", ""),
                "completed": data.get("completed", False)
            }
    except Exception as e:
        traceback.print_exc()
        print(f"Error creating task: {e}")
        raise

def update_task(task_id: int, task: dict):
    try:
        data = dict(task)
        
        # Remove the id field as it's an identity column
        if "id" in data:
            del data["id"]
        
        # Map between frontend and DB field names
        if "date" in data:
            data["task_date"] = data["date"]
            del data["date"]
            
        if "time" in data:
            data["task_time"] = data["time"]
            del data["time"]
            
        if isinstance(data.get("task_date"), date):
            data["task_date"] = data["task_date"].isoformat()
            
        print(f"Updating task {task_id} with data: {data}")
        # Execute the update query
        response = supabase.table("tasks").update(data).eq("id", task_id).execute()
        
        # If no data returned, fetch the updated task
        if not response.data or len(response.data) == 0:
            get_response = supabase.table("tasks").select("*").eq("id", task_id).execute()
            if get_response.data and len(get_response.data) > 0:
                task_data = get_response.data[0]
                # Add date and time for frontend consistency
                task_data["date"] = task_data["task_date"]
                task_data["time"] = task_data.get("task_time", "")
                return task_data
            
            # If still no data, return a basic success response
            return {
                "id": task_id,
                "message": "Task updated successfully",
                "date": data.get("task_date", ""),
                "time": data.get("task_time", ""),
                "completed": data.get("completed", False)
            }
        
        # Process normal response
        task_data = response.data[0]
        # Add date and time for frontend consistency
        task_data["date"] = task_data["task_date"]
        task_data["time"] = task_data.get("task_time", "")
        return task_data
    except Exception as e:
        print(f"Error in update_task: {e}")
        # Return a meaningful error response instead of None
        return {
            "id": task_id,
            "error": str(e),
            "message": "Failed to update task"
        }

def delete_task(task_id: int):
    response = supabase.table("tasks").delete().eq("id", task_id).execute()
    if response.data and len(response.data) > 0:
        task_data = response.data[0]
        # Add date and time for frontend consistency
        task_data["date"] = task_data["task_date"]
        task_data["time"] = task_data.get("task_time", "")
        return task_data
    return None