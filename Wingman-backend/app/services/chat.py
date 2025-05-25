from app.core.supabase import supabase
from app.services.llm import get_llm_response

def save_message(user_id, message, timestamp):
    response = supabase.table("chat_history").insert({
        "user_id": user_id,
        "message": message,
        "timestamp": timestamp
    }).execute()
    return response.data[0] if response.data else None

def get_messages(user_id):
    response = supabase.table("chat_history").select("*").eq("user_id", user_id).order("timestamp").execute()
    return response.data