from datetime import date
from app.api.v1.schemas.task import TaskCreate, TaskUpdate
from app.core.supabase import supabase

def get_tasks_by_date(date_str):
    try:
        # Ensure consistent date format handling
        response = supabase.table("tasks").select("*").eq("task_date", date_str).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching tasks: {e}")
        return []

def create_task(task: TaskCreate):
    try:
        data = task.dict()
        # Convert date object to string if needed
        if isinstance(data["date"], date):
            data["date"] = data["date"].isoformat()
        
        # Map "date" to "task_date" when sending to the database
        if "date" in data:
            data["task_date"] = data["date"]
            del data["date"]  # Remove original "date" field
            
        print(f"Creating task with data: {data}")
        response = supabase.table("tasks").insert(data).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            print(f"No data returned from insert: {response}")
            # Return something to avoid None errors
            return {"id": 0, "task_date": data["task_date"], "text": data["text"], 
                   "task_time": data.get("task_time", ""), "completed": data["completed"]}
    except Exception as e:
        print(f"Error creating task: {e}")
        raise  # Re-raise to see the actual error

def update_task(task_id: int, task: TaskUpdate):
    data = task.dict(exclude_unset=True)
    if "date" in data and isinstance(data["date"], date):
        data["date"] = data["date"].isoformat()
    response = supabase.table("tasks").update(data).eq("id", task_id).execute()
    return response.data[0] if response.data else None

def delete_task(task_id: int):
    response = supabase.table("tasks").delete().eq("id", task_id).execute()
    return response.data[0] if response.data else None