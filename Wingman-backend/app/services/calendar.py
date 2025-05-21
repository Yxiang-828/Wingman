from datetime import date
from app.core.supabase import supabase
from app.services.user import verify_user_exists
import traceback

def get_events_by_date(date_value, user_id):
    try:
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
    except Exception as e:
        traceback.print_exc()
        print(f"Error in get_events_by_date: {e}")
        return []

def create_event(event):
    try:
        data = dict(event)
        
        # Make sure user_id is provided
        if "user_id" not in data:
            raise ValueError("user_id is required")
            
        # Verify user exists - CRITICAL STEP
        if not verify_user_exists(data["user_id"]):
            raise ValueError(f"User with ID {data['user_id']} does not exist in the users table")
        
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
            
        print(f"Creating event with data: {data}")
        response = supabase.table("calendar_events").insert(data).execute()
        
        if response.data and len(response.data) > 0:
            event_data = response.data[0]
            # Add date and time for frontend consistency
            event_data["date"] = event_data["event_date"]
            event_data["time"] = event_data.get("event_time", "")
            return event_data
            
        # Add an explicit fallback return value
        print("No data returned from calendar event insert")
        return {
            "id": 0,
            "title": data.get("title", ""),
            "date": data.get("event_date", ""),
            "time": data.get("event_time", ""),
            "type": data.get("type", ""),
            "description": data.get("description", "")
        }
    except Exception as e:
        traceback.print_exc()
        print(f"Error in create_event: {e}")
        raise

def update_event(event_id: int, event):
    try:
        data = dict(event)
        
        # Remove the id field as it's an identity column and can't be updated
        if "id" in data:
            del data["id"]
        
        # Map between frontend and DB field names
        if "date" in data:
            data["event_date"] = data["date"]
            del data["date"]
            
        if "time" in data:
            data["event_time"] = data["time"]
            del data["time"]
            
        if isinstance(data.get("event_date"), date):
            data["event_date"] = data["event_date"].isoformat()
        
        print(f"Updating event {event_id} with data: {data}")
        # Execute the update query
        response = supabase.table("calendar_events").update(data).eq("id", event_id).execute()
        
        # If no data returned, fetch the updated event
        if not response.data or len(response.data) == 0:
            get_response = supabase.table("calendar_events").select("*").eq("id", event_id).execute()
            if get_response.data and len(get_response.data) > 0:
                event_data = get_response.data[0]
                # Add date and time for frontend consistency
                event_data["date"] = event_data["event_date"]
                event_data["time"] = event_data.get("event_time", "")
                return event_data
            
            # If still no data, return a basic success response
            return {
                "id": event_id,
                "message": "Event updated successfully",
                "date": data.get("event_date", ""),
                "time": data.get("event_time", "")
            }
        
        # Process normal response
        event_data = response.data[0]
        # Add date and time for frontend consistency
        event_data["date"] = event_data["event_date"]
        event_data["time"] = event_data.get("event_time", "")
        return event_data
    except Exception as e:
        print(f"Error in update_event: {e}")
        # Return a meaningful error response instead of None
        return {
            "id": event_id,
            "error": str(e),
            "message": "Failed to update event"
        }

def delete_event(event_id: int):
    response = supabase.table("calendar_events").delete().eq("id", event_id).execute()
    if response.data and len(response.data) > 0:
        event_data = response.data[0]
        # Add date and time for frontend consistency
        event_data["date"] = event_data["event_date"]
        event_data["time"] = event_data.get("event_time", "")
        return event_data
    return None