from datetime import date
from app.core.supabase import supabase

def get_events_by_date(date_value):
    # Accepts string or date
    if isinstance(date_value, date):
        date_value = date_value.isoformat()
    response = supabase.table("calendar_events").select("*").eq("date", date_value).execute()
    return response.data

def create_event(event):
    data = dict(event)
    if "date" in data and isinstance(data["date"], date):
        data["date"] = data["date"].isoformat()
    response = supabase.table("calendar_events").insert(data).execute()
    return response.data[0] if response.data else None

def update_event(event_id: int, event):
    data = dict(event)
    if "date" in data and isinstance(data["date"], date):
        data["date"] = data["date"].isoformat()
    response = supabase.table("calendar_events").update(data).eq("id", event_id).execute()
    return response.data[0] if response.data else None

def delete_event(event_id: int):
    response = supabase.table("calendar_events").delete().eq("id", event_id).execute()
    return response.data[0] if response.data else None