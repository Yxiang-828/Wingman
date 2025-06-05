import httpx
import asyncio
import json
import psutil
import platform
from typing import Dict, Any, Optional, List
from datetime import datetime

class WingmanOllamaService:
    """
    Core Ollama integration service for Wingman AI
    """
    
    def __init__(self):
        self.ollama_url = "http://localhost:11434"
        self.current_model = None
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # ✅ EXPANDED: Model configurations with DeepSeek
        self.models = {
            # Llama models
            "llama3.2:1b": {
                "name": "llama3.2:1b",
                "size": "1.3GB",
                "ram_required": 2,
                "description": "Compact model for low-resource systems",
                "provider": "Meta"
            },
            "llama3.2:3b": {
                "name": "llama3.2:3b", 
                "size": "2.0GB",
                "ram_required": 4,
                "description": "Balanced model for most systems",
                "provider": "Meta"
            },
            "llama3.2:8b": {
                "name": "llama3.2:8b",
                "size": "4.9GB", 
                "ram_required": 8,
                "description": "Advanced model for complex tasks",
                "provider": "Meta"
            },
            # ✅ NEW: DeepSeek models
            "deepseek-r1:1.5b": {
                "name": "deepseek-r1:1.5b",
                "size": "0.9GB",
                "ram_required": 2,
                "description": "Fast reasoning model, excellent for coding and math",
                "provider": "DeepSeek"
            },
            "deepseek-r1:7b": {
                "name": "deepseek-r1:7b",
                "size": "4.1GB",
                "ram_required": 6,
                "description": "Advanced reasoning model with superior logic",
                "provider": "DeepSeek"
            },
            "deepseek-r1:14b": {
                "name": "deepseek-r1:14b",
                "size": "8.2GB",
                "ram_required": 12,
                "description": "Top-tier reasoning model for complex problems",
                "provider": "DeepSeek"
            },
            "deepseek-r1:32b": {
                "name": "deepseek-r1:32b",
                "size": "18.9GB",
                "ram_required": 20,
                "description": "Elite reasoning model for advanced research",
                "provider": "DeepSeek"
            }
        }
    
    async def check_ollama_status(self) -> Dict[str, Any]:
        """Check if Ollama is running and available"""
        try:
            response = await self.client.get(f"{self.ollama_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                return {
                    "status": "running",
                    "available": True,
                    "models": [model["name"] for model in models],
                    "recommended_model": self._get_recommended_model()
                }
            else:
                return {"status": "error", "available": False, "error": f"HTTP {response.status_code}"}
        except httpx.ConnectError:
            return {"status": "not_running", "available": False, "error": "Ollama not running"}
        except Exception as e:
            return {"status": "error", "available": False, "error": str(e)}
    
    def _get_recommended_model(self) -> str:
        """Determine best model based on system RAM"""
        try:
            total_ram_gb = psutil.virtual_memory().total / (1024**3)
            
            if total_ram_gb >= 16:
                return "llama3.2:3b"
            elif total_ram_gb >= 8:
                return "llama3.2:3b"  # 3B can run on 8GB
            else:
                return "llama3.2:1b"
        except:
            return "llama3.2:1b"  # Safe fallback
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information for model recommendations"""
        try:
            memory = psutil.virtual_memory()
            return {
                "total_ram_gb": round(memory.total / (1024**3), 1),
                "available_ram_gb": round(memory.available / (1024**3), 1),
                "cpu_count": psutil.cpu_count(),
                "platform": platform.system(),
                "recommended_model": self._get_recommended_model(),
                "can_run_3b": memory.total >= 8 * (1024**3),
                "can_run_1b": memory.total >= 2 * (1024**3)
            }
        except Exception as e:
            return {"error": str(e), "recommended_model": "llama3.2:1b"}
    
    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Download/pull a model from Ollama"""
        try:
            response = await self.client.post(
                f"{self.ollama_url}/api/pull",
                json={"name": model_name},
                timeout=300.0  # 5 minutes for model download
            )
            
            if response.status_code == 200:
                return {"success": True, "model": model_name}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def generate_response(
        self, 
        prompt: str, 
        context: str = "", 
        model: str = None
    ) -> Dict[str, Any]:
        """Generate AI response using Ollama"""
        
        if not model:
            model = self.current_model or self._get_recommended_model()
        
        # Build the full prompt with context
        full_prompt = self._build_prompt(prompt, context)
        
        try:
            start_time = datetime.now()
            
            response = await self.client.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40
                    }
                },
                timeout=60.0
            )
            
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "response": result.get("response", "").strip(),
                    "model_used": model,
                    "processing_time": processing_time,
                    "context_used": bool(context)
                }
            else:
                return {
                    "success": False,
                    "error": f"Ollama API error: HTTP {response.status_code}",
                    "fallback_response": self._fallback_response(prompt)
                }
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Request timed out",
                "fallback_response": self._fallback_response(prompt)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback_response": self._fallback_response(prompt)
            }
    
    def _build_prompt(self, user_message: str, context: str) -> str:
        """Build the complete prompt with context"""
        system_prompt = """You are Wingman, a helpful AI assistant built into a productivity app. You help users manage their tasks, calendar, diary, and provide motivational support.

Key guidelines:
- Be concise but helpful
- Reference the user's actual data when relevant
- Provide actionable suggestions
- Be encouraging and supportive
- If asked about specific tasks or events, refer to the context provided
- Keep responses under 200 words unless more detail is specifically requested

"""
        
        if context:
            full_prompt = f"{system_prompt}\nContext about the user:\n{context}\n\nUser: {user_message}\nWingman:"
        else:
            full_prompt = f"{system_prompt}\nUser: {user_message}\nWingman:"
        
        return full_prompt
    
    def _fallback_response(self, prompt: str) -> str:
        """Generate fallback response when Ollama is unavailable"""
        prompt_lower = prompt.lower()
        
        # Smart fallback responses based on keywords
        if any(word in prompt_lower for word in ['task', 'todo', 'work']):
            return "I'd love to help with your tasks! It looks like there might be a connection issue with the AI service. You can still manage your tasks using the main interface."
        
        elif any(word in prompt_lower for word in ['calendar', 'schedule', 'event']):
            return "I can help you stay organized! While the AI service is temporarily unavailable, you can check your calendar and add events using the main interface."
        
        elif any(word in prompt_lower for word in ['diary', 'mood', 'feel']):
            return "Reflection is important! Even though the AI assistant is temporarily unavailable, you can still write in your diary to track your thoughts and mood."
        
        elif any(word in prompt_lower for word in ['hello', 'hi', 'hey']):
            return "Hello! I'm your Wingman assistant. The AI service is temporarily unavailable, but I'm still here to help you navigate the app!"
        
        else:
            return "I'm here to help! The AI service is temporarily unavailable, but you can still use all the app features. Try asking me again in a moment!"
    
    async def close(self):
        """Clean up resources"""
        await self.client.aclose()

# Singleton instance
ollama_service = WingmanOllamaService()