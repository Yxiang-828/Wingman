from datetime import date
from app.core.supabase import supabase

def get_events_by_date(date_value, user_id):
    # Accepts string or date
    if isinstance(date_value, date):
        date_value = date_value.isoformat()
        
    # Filter by both date and user_id
    response = supabase.table("calendar_events").select("*").eq("event_date", date_value).eq("user_id", user_id).execute()
    
    # Transform response to add 'date' field for frontend
    result = []
    for event in response.data:
        event_copy = dict(event)
        # Add date and time fields for frontend
        event_copy["date"] = event_copy["event_date"]
        event_copy["time"] = event_copy.get("event_time", "")
        result.append(event_copy)
    
    return result

def create_event(event):
    data = dict(event)
    
    # Make sure user_id is provided
    if "user_id" not in data:
        raise ValueError("user_id is required")
    
    # Frontend sends 'date' but DB needs 'event_date'
    if "date" in data:
        data["event_date"] = data["date"]
        del data["date"]
    
    # Frontend sends 'time' but DB needs 'event_time'
    if "time" in data:
        data["event_time"] = data["time"]
        del data["time"]
        
    if isinstance(data.get("event_date"), date):
        data["event_date"] = data["event_date"].isoformat()
        
    response = supabase.table("calendar_events").insert(data).execute()
    
    if response.data and len(response.data) > 0:
        event_data = response.data[0]
        # Add date and time for frontend consistency
        event_data["date"] = event_data["event_date"]
        event_data["time"] = event_data.get("event_time", "")
        return event_data
    return None

def update_event(event_id: int, event):
    data = dict(event)
    
    # Map between frontend and DB field names
    if "date" in data:
        data["event_date"] = data["date"]
        del data["date"]
        
    if "time" in data:
        data["event_time"] = data["time"]
        del data["time"]
        
    if isinstance(data.get("event_date"), date):
        data["event_date"] = data["event_date"].isoformat()
        
    response = supabase.table("calendar_events").update(data).eq("id", event_id).execute()
    
    if response.data and len(response.data) > 0:
        event_data = response.data[0]
        # Add date and time for frontend consistency
        event_data["date"] = event_data["event_date"]
        event_data["time"] = event_data.get("event_time", "")
        return event_data
    return None

def delete_event(event_id: int):
    response = supabase.table("calendar_events").delete().eq("id", event_id).execute()
    if response.data and len(response.data) > 0:
        event_data = response.data[0]
        # Add date and time for frontend consistency
        event_data["date"] = event_data["event_date"]
        event_data["time"] = event_data.get("event_time", "")
        return event_data
    return None