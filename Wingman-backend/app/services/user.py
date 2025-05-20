from app.core.supabase import supabase
from app.api.v1.schemas.user import UserCreate

def create_user(user: UserCreate):
    response = supabase.table("users").insert(user.dict()).execute()
    return response.data[0] if response.data else None

def get_user_by_password(password: str):
    response = supabase.table("users").select("*").eq("password", password).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None

def update_user(user_id: str, name: str = None):
    update_data = {}
    if name: update_data["name"] = name
    response = supabase.table("users").update(update_data).eq("id", user_id).execute()
    return response.data[0] if response.data else None