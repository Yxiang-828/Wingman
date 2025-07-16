from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.services.llm.context_builder import WingmanContextBuilder
from app.services.llm.ollama_service import WingmanOllamaService
from app.services.llm.function_executor import WingmanFunctionExecutor
from app.services.llm.chat_coordinator import WingmanChatCoordinator
from app.services.sqlite_chat import SQLiteChatService

router = APIRouter()

# Request/Response models
class ChatRequest(BaseModel):
    user_id: str
    message: str
    date: Optional[str] = None
    model: Optional[str] = None
    session_id: Optional[int] = None

class ChatResponse(BaseModel):
    response: str
    success: bool
    model_used: Optional[str] = None
    processing_time: Optional[float] = None
    context_used: bool = False
    fallback_used: bool = False
    session_id: Optional[int] = None
    
    # Simplified fields for two-mode system
    mode: Optional[str] = None  # "command", "preloaded", "error"
    command_executed: Optional[str] = None  # For command mode
    function_calls: Optional[List[Dict[str, Any]]] = []
    record_count: Optional[int] = None

class OllamaStatusResponse(BaseModel):
    status: str
    available: bool
    models: list = []
    recommended_model: Optional[str] = None
    system_info: dict = {}
    error: Optional[str] = None

ollama_service = WingmanOllamaService()
coordinator = WingmanChatCoordinator()
chat_service = SQLiteChatService()

@router.post("/", response_model=ChatResponse)
async def send_chat_message(request: ChatRequest):
    """
    Send a message to Wingman AI with SIMPLE ROUTING SYSTEM
    
    Two modes only:
    1. Slash commands (/{table} /{filter} {param}) → Direct command execution
    2. Everything else → Preloaded chat mode
    
    No more confirmation or search phases - just commands and chat
    """
    try:
        # Save user message FIRST so it's included in chat history
        chat_service.save_message(
            user_id=request.user_id,
            message=request.message,
            is_ai=False,
            timestamp=datetime.now().isoformat()
        )
        
        # NOW get chat history for context (includes the message we just saved)
        chat_history = []
        try:
            # Get more messages and ensure they include the just-saved user message
            messages = chat_service.get_messages(request.user_id, limit=20)
            chat_history = [
                {
                    "message": msg["message"],
                    "is_ai": msg["is_ai"],
                    "timestamp": msg["timestamp"]
                }
                for msg in messages
            ]
            print(f"🔍 Chat history fetched: {len(chat_history)} messages")
            if chat_history:
                # Print last few messages for debugging
                for i, msg in enumerate(chat_history[-3:]):
                    sender = "AI" if msg["is_ai"] else "User"
                    print(f"🔍 Message {len(chat_history)-3+i+1}: [{sender}] {msg['message'][:50]}...")
        except Exception as e:
            print(f"⚠️  Could not fetch chat history: {e}")
            chat_history = []
        
        # Process message through Chat Coordinator
        result = coordinator.process_message(
            user_id=request.user_id,
            message=request.message,
            current_theme=None,  # Auto-sync from database
            chat_history=chat_history
        )
        
        if result["success"]:
            # Check if it's a command result (already formatted)
            if result["type"] == "command_result" or result["type"] == "command_error":
                response_text = result["response"]
            
            # Check if it's conversation context (needs LLM processing)
            elif result["type"] == "conversation":
                # Send context to LLM for natural response
                try:
                    llm_result = await ollama_service.generate_response(
                        prompt=request.message,
                        context=result["response"],  # This is the personality context
                        model=request.model
                    )
                    
                    if llm_result["success"]:
                        response_text = llm_result["response"]
                    else:
                        # LLM failed, use fallback
                        personality_name = result.get("personality", "Wingman")
                        response_text = f"Hello! I'm {personality_name}, your AI assistant. How can I help you today? ✨"
                        
                except Exception as e:
                    print(f"LLM Error: {e}")
                    personality_name = result.get("personality", "Wingman")
                    response_text = f"Hello! I'm {personality_name}, your AI assistant. How can I help you today? ✨"
            
            else:
                # Unknown type, use fallback
                response_text = "Hello! How can I help you today?"
            
            # Save AI response only (user message already saved)
            chat_service.save_message(
                user_id=request.user_id,
                message=response_text,
                is_ai=True,
                timestamp=datetime.now().isoformat()
            )
            
            return ChatResponse(
                response=response_text,
                success=True,
                model_used=result.get("model_used"),
                processing_time=result.get("processing_time"),
                context_used=result.get("context_used", True),
                fallback_used=result.get("fallback_used", False),
                session_id=request.session_id,
                mode=result.get("mode"),
                command_executed=result.get("command_executed"),
                function_calls=result.get("function_calls", []),
                record_count=result.get("record_count")
            )
        else:
            # Fallback response
            fallback_response = result.get("response", "I'm having trouble right now. Please try again!")
            
            # Save AI fallback response only (user message already saved)
            chat_service.save_message(
                user_id=request.user_id,
                message=fallback_response,
                is_ai=True,
                timestamp=datetime.now().isoformat()
            )
            
            return ChatResponse(
                response=fallback_response,
                success=False,
                model_used=result.get("model_used"),
                fallback_used=True,
                context_used=result.get("context_used", True),
                session_id=request.session_id,
                mode=result.get("mode", "error"),
                function_calls=[],
                record_count=0
            )
            
    except Exception as e:
        print(f"❌ Error in send_chat_message: {e}")
        
        # Emergency fallback
        fallback_msg = "I'm having trouble connecting to the AI service right now. Please try again in a moment!"
        
        try:
            # Save AI emergency response only (user message already saved)
            chat_service.save_message(
                user_id=request.user_id,
                message=fallback_msg,
                is_ai=True,
                timestamp=datetime.now().isoformat()
            )
        except:
            pass
        
        return ChatResponse(
            response=fallback_msg,
            success=False,
            fallback_used=True,
            session_id=request.session_id,
            mode="error",
            function_calls=[],
            record_count=0
        )

@router.get("/status", response_model=OllamaStatusResponse)
async def get_chat_status():
    """
    Get Ollama service status and system information
    """
    try:
        # Check Ollama status
        status = await ollama_service.check_ollama_status()
        
        # Get system info
        system_info = ollama_service.get_system_info()
        
        return OllamaStatusResponse(
            status=status.get("status", "unknown"),
            available=status.get("available", False),
            models=status.get("models", []),
            recommended_model=status.get("recommended_model"),
            system_info=system_info,
            error=status.get("error")
        )
        
    except Exception as e:
        return OllamaStatusResponse(
            status="error",
            available=False,
            error=str(e)
        )

@router.post("/pull-model")
async def pull_model(request: dict):
    """
    Download/pull a specific Ollama model
    """
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
            
        result = await ollama_service.pull_model(model_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_available_models():
    """
    Get list of available models and system recommendations
    """
    try:
        system_info = ollama_service.get_system_info()
        return {
            "models": ollama_service.models,
            "system_info": system_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Missing endpoints that were causing 500 errors
@router.delete("/delete-model/{model_name}")
async def delete_model(model_name: str):
    """Delete a model from Ollama"""
    try:
        result = await ollama_service.delete_model(model_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/downloaded-models")
async def get_downloaded_models():
    """Get list of downloaded models from Ollama"""
    try:
        models = await ollama_service.get_downloaded_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download-progress/{model_name}")
async def get_download_progress(model_name: str):
    """Get download progress for a model"""
    try:
        progress = await ollama_service.get_download_progress(model_name)
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))