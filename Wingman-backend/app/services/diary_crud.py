from datetime import date
from app.core.supabase import supabase
import traceback

def get_entries_by_date(user_id, entry_id=None, date_value=None):
    """
    Get diary entries for a user, optionally filtered by date or entry ID
    """
    try:
        # Start with a base query for the user
        query = supabase.table("diary_entries").select("*").eq("user_id", user_id)
        
        # Add date filter if provided
        if date_value:
            if isinstance(date_value, date):
                date_value = date_value.isoformat()
            query = query.eq("entry_date", date_value)
        
        # Add ID filter if provided
        if entry_id:
            query = query.eq("id", entry_id)
        
        # Execute the query
        response = query.execute()
        
        # Transform response to add 'date' field for frontend
        result = []
        for entry in response.data:
            entry_copy = dict(entry)
            # Add date field for frontend
            entry_copy["date"] = entry_copy["entry_date"]
            result.append(entry_copy)
        
        return result
    except Exception as e:
        traceback.print_exc()
        print(f"Error in get_entries_by_date: {e}")
        raise

def create_entry(entry):
    try:
        data = dict(entry)
        
        # Verify user_id is provided
        if "user_id" not in data:
            raise ValueError("user_id is required")
        
        # Frontend sends 'date' but DB needs 'entry_date'
        if "date" in data:
            data["entry_date"] = data["date"]
            del data["date"]
            
        if isinstance(data.get("entry_date"), date):
            data["entry_date"] = data["entry_date"].isoformat()
            
        print(f"Creating diary entry with data: {data}")
        response = supabase.table("diary_entries").insert(data).execute()
        
        if response.data and len(response.data) > 0:
            entry_data = response.data[0]
            # Add date field for frontend consistency
            entry_data["date"] = entry_data["entry_date"]
            return entry_data
        
        print("Error: No data returned from diary entry creation")
        return None
    except Exception as e:
        traceback.print_exc()
        print(f"Error creating diary entry: {e}")
        raise

def update_entry(entry_id, entry):
    try:
        data = dict(entry)
        
        # Map between frontend and DB field names
        if "date" in data:
            data["entry_date"] = data["date"]
            del data["date"]
            
        if isinstance(data.get("entry_date"), date):
            data["entry_date"] = data["entry_date"].isoformat()
            
        response = supabase.table("diary_entries").update(data).eq("id", entry_id).execute()
        
        if response.data and len(response.data) > 0:
            entry_data = response.data[0]
            # Add date field for frontend consistency
            entry_data["date"] = entry_data["entry_date"]
            return entry_data
        return None
    except Exception as e:
        traceback.print_exc()
        print(f"Error updating diary entry: {e}")
        raise

def delete_entry(entry_id):
    try:
        response = supabase.table("diary_entries").delete().eq("id", entry_id).execute()
        if response.data and len(response.data) > 0:
            entry_data = response.data[0]
            # Add date field for frontend consistency
            entry_data["date"] = entry_data["entry_date"]
            return entry_data
        return None
    except Exception as e:
        traceback.print_exc()
        print(f"Error deleting diary entry: {e}")
        raise