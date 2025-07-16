# ENHANCED CHAT ENDPOINT - DEMO OF THREE-PHASE SYSTEM
# ===================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.services.enhanced_chat_service import EnhancedChatService

router = APIRouter()

class EnhancedChatRequest(BaseModel):
    user_id: str
    message: str
    model: Optional[str] = "llama3.2:3b"
    date: Optional[str] = None
    include_debug_info: Optional[bool] = False

class EnhancedChatResponse(BaseModel):
    # Core response
    response: str
    success: bool
    
    # Phase information
    phase: str  # "preloaded", "confirmation", "search"
    data_source: str  # "preloaded", "database", "none", "error"
    confirmation_required: bool
    
    # Technical details
    model_used: Optional[str] = None
    processing_time: Optional[float] = None
    function_calls_executed: List[Dict[str, Any]] = []
    
    # Debug information (optional)
    debug_info: Optional[Dict[str, Any]] = None

enhanced_chat_service = EnhancedChatService()

@router.post("/enhanced", response_model=EnhancedChatResponse)
async def enhanced_chat_message(request: EnhancedChatRequest):
    """
    DEMO: Enhanced chat with three-phase response system
    
    Phase 1 (Preloaded): "What are my tasks for today?" → Uses preloaded data
    Phase 2 (Confirmation): "What did I do on March 15th?" → Asks permission to search
    Phase 3 (Search): "Yes" (after confirmation) → Executes database functions
    """
    try:
        # Process message through enhanced system
        result = await enhanced_chat_service.process_message(
            user_id=request.user_id,
            message=request.message,
            model=request.model or "llama3.2:3b",
            date=request.date
        )
        
        # Prepare debug info if requested
        debug_info = None
        if request.include_debug_info:
            debug_info = {
                "query_analysis": enhanced_chat_service.analyze_query_complexity(request.message),
                "chat_history_length": len(await enhanced_chat_service.get_conversation_context(request.user_id, 5)),
                "timestamp": datetime.now().isoformat(),
                "context_mode_used": result.get("phase"),
                "raw_result": result
            }
        
        return EnhancedChatResponse(
            response=result.get("response", "Sorry, I couldn't process your request."),
            success=result.get("success", False),
            phase=result.get("phase", "unknown"),
            data_source=result.get("data_source", "unknown"),
            confirmation_required=result.get("confirmation_required", False),
            model_used=result.get("model_used"),
            processing_time=result.get("processing_time"),
            function_calls_executed=result.get("function_calls_executed", []),
            debug_info=debug_info
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced chat processing failed: {str(e)}"
        )

@router.get("/analyze/{user_id}")
async def analyze_user_conversation(user_id: str, limit: int = 10):
    """
    Analyze recent conversation for debugging
    """
    try:
        chat_history = await enhanced_chat_service.get_conversation_context(user_id, limit)
        
        return {
            "user_id": user_id,
            "conversation_length": len(chat_history),
            "recent_messages": chat_history,
            "analysis": {
                "last_ai_message": next((msg for msg in reversed(chat_history) if msg.get('is_ai')), None),
                "last_user_message": next((msg for msg in reversed(chat_history) if not msg.get('is_ai')), None),
                "confirmation_pending": any("check your database" in msg.get('message', '').lower() 
                                         for msg in chat_history if msg.get('is_ai')),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Conversation analysis failed: {str(e)}"
        )

@router.post("/test-query")
async def test_query_analysis(message: str):
    """
    Test how a query would be analyzed (without executing)
    """
    try:
        analysis = enhanced_chat_service.analyze_query_complexity(message)
        
        # Also test the context mode determination (simulate empty chat history)
        context_mode = enhanced_chat_service.context_builder._determine_context_mode(message, [])
        
        return {
            "query": message,
            "complexity_analysis": analysis,
            "predicted_context_mode": context_mode,
            "would_need_confirmation": context_mode == "confirmation",
            "would_search_database": context_mode == "search",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Query analysis failed: {str(e)}"
        )
