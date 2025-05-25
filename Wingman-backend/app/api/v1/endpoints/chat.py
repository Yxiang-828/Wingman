from fastapi import APIRouter
from app.services.chat import save_message, get_messages
from app.services.llm import get_llm_response

router = APIRouter()

@router.get("/chat/{user_id}")
def get_chat_history(user_id: str):
    return get_messages(user_id)

@router.post("/chat/")
def post_message(user_id: str, message: str, timestamp: str):
    # Save user message
    user_msg = save_message(user_id, message, timestamp)
    # Get LLM response
    llm_response = get_llm_response(message)
    # Save LLM response (sender: "wingman")
    save_message(user_id, llm_response, timestamp)
    return {"response": llm_response}