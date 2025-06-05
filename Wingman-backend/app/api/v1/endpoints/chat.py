from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.services.llm.context_builder import WingmanContextBuilder
from app.services.llm.ollama_service import WingmanOllamaService

router = APIRouter()

# Request/Response models
class ChatRequest(BaseModel):
    user_id: str
    message: str
    date: Optional[str] = None
    model: Optional[str] = None  # Add model selection

class ChatResponse(BaseModel):
    response: str
    success: bool
    model_used: Optional[str] = None
    processing_time: Optional[float] = None
    context_used: bool = False
    fallback_used: bool = False

class OllamaStatusResponse(BaseModel):
    status: str
    available: bool
    models: list = []
    recommended_model: Optional[str] = None
    system_info: dict = {}
    error: Optional[str] = None

ollama_service = WingmanOllamaService()

@router.post("/", response_model=ChatResponse)
async def send_chat_message(request: ChatRequest):
    """
    Send a message to Wingman AI and get a response with context
    """
    try:
        # Build context from user data
        context_builder = WingmanContextBuilder()
        context = context_builder.build_context(
            user_id=request.user_id,
            message=request.message,
            date=request.date
        )
        
        # Use user's preferred model or fall back to recommended
        preferred_model = request.model
        if not preferred_model:
            # Get system recommendation
            status = await ollama_service.check_ollama_status()
            preferred_model = status.get("recommended_model", "llama3.2:1b")
        
        # Generate AI response with specified model
        result = await ollama_service.generate_response(
            prompt=request.message,
            context=context,
            model=preferred_model
        )
        
        if result["success"]:
            return ChatResponse(
                response=result["response"],
                success=True,
                model_used=result.get("model_used", preferred_model),
                processing_time=result.get("processing_time"),
                context_used=result.get("context_used", False),
                fallback_used=False
            )
        else:
            # Use fallback response
            return ChatResponse(
                response=result["fallback_response"],
                success=False,
                model_used=preferred_model,
                fallback_used=True,
                context_used=bool(context)
            )
            
    except Exception as e:
        # Emergency fallback
        fallback_msg = "I'm having trouble connecting to the AI service right now. Please try again in a moment!"
        return ChatResponse(
            response=fallback_msg,
            success=False,
            fallback_used=True
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

# ✅ NEW: Missing endpoints that were causing 500 errors
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