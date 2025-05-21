from datetime import date
from app.api.v1.schemas.task import TaskCreate, TaskUpdate
from app.core.supabase import supabase

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
        print(f"Error fetching tasks: {e}")
        return []

def create_task(task):
    try:
        data = dict(task)
        
        # Make sure user_id is provided
        if "user_id" not in data:
            raise ValueError("user_id is required")
            
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
            return None
    except Exception as e:
        print(f"Error creating task: {e}")
        raise

def update_task(task_id: int, task: TaskUpdate):
    try:
        data = task.dict(exclude_unset=True)
        
        # Map between frontend and DB field names
        if "date" in data:
            data["task_date"] = data["date"]
            del data["date"]
            
        if "time" in data:
            data["task_time"] = data["time"]
            del data["time"]
            
        if "task_date" in data and isinstance(data["task_date"], date):
            data["task_date"] = data["task_date"].isoformat()
            
        response = supabase.table("tasks").update(data).eq("id", task_id).execute()
        
        if response.data and len(response.data) > 0:
            task_data = response.data[0]
            # Add date and time for frontend consistency
            task_data["date"] = task_data["task_date"]
            task_data["time"] = task_data.get("task_time", "")
            return task_data
        return None
    except Exception as e:
        print(f"Error updating task: {e}")
        return None

def delete_task(task_id: int):
    response = supabase.table("tasks").delete().eq("id", task_id).execute()
    if response.data and len(response.data) > 0:
        task_data = response.data[0]
        # Add date and time for frontend consistency
        task_data["date"] = task_data["task_date"]
        task_data["time"] = task_data.get("task_time", "")
        return task_data
    return None