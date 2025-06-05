import httpx
import psutil
import asyncio
import json
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
            }
        }
    
    async def check_ollama_status(self) -> Dict[str, Any]:
        """Check if Ollama is running and available"""
        try:
            response = await self.client.get(f"{self.ollama_url}/api/tags")
            if response.status_code == 200:
                models_data = response.json()
                available_models = [model.get("name", "") for model in models_data.get("models", [])]
                return {
                    "status": "running",
                    "available": True,
                    "models": available_models,
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
            
            if total_ram_gb >= 12:
                return "deepseek-r1:7b"
            elif total_ram_gb >= 8:
                return "llama3.2:3b"
            else:
                return "deepseek-r1:1.5b"
        except:
            return "llama3.2:1b"  # Safe fallback
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information for model recommendations"""
        try:
            memory = psutil.virtual_memory()
            total_ram_gb = memory.total / (1024**3)
            
            return {
                "total_ram_gb": round(total_ram_gb, 1),
                "available_ram_gb": round(memory.available / (1024**3), 1),
                "recommended_model": self._get_recommended_model(),
                "can_run_3b": total_ram_gb >= 4,
                "can_run_1b": total_ram_gb >= 2
            }
        except Exception as e:
            return {
                "total_ram_gb": 8.0,
                "available_ram_gb": 4.0,
                "recommended_model": "llama3.2:1b",
                "can_run_3b": True,
                "can_run_1b": True,
                "error": str(e)
            }
    
    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Download/pull a model from Ollama"""
        try:
            response = await self.client.post(
                f"{self.ollama_url}/api/pull",
                json={"name": model_name},
                timeout=300.0  # 5 minutes for download
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "message": f"Successfully started download of {model_name}",
                    "model": model_name
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to pull model: HTTP {response.status_code}",
                    "model": model_name
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error pulling model {model_name}: {str(e)}",
                "model": model_name
            }
    
    async def generate_response(
        self, 
        prompt: str, 
        context: str = "", 
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate AI response using Ollama"""
        
        if not model:
            model = self._get_recommended_model()
        
        # Build the full prompt with context
        full_prompt = self._build_prompt(prompt, context)
        
        try:
            start_time = datetime.now()
            
            response = await self.client.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": full_prompt,
                    "stream": False
                },
                timeout=30.0
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "response": result.get("response", "No response generated"),
                    "model_used": model,
                    "processing_time": processing_time,
                    "context_used": bool(context)
                }
            else:
                return {
                    "success": False,
                    "fallback_response": self._fallback_response(prompt),
                    "model_used": model,
                    "processing_time": processing_time
                }
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "fallback_response": f"I'm taking a bit longer to think about that. {self._fallback_response(prompt)}",
                "model_used": model,
                "error": "timeout"
            }
        except Exception as e:
            return {
                "success": False,
                "fallback_response": self._fallback_response(prompt),
                "model_used": model,
                "error": str(e)
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
- Keep responses under 500 words unless more detail is specifically requested

"""
        
        if context:
            full_prompt = f"{system_prompt}\nUser's Current Data:\n{context}\n\nUser Message: {user_message}\n\nResponse:"
        else:
            full_prompt = f"{system_prompt}\nUser Message: {user_message}\n\nResponse:"
        
        return full_prompt
    
    def _fallback_response(self, prompt: str) -> str:
        """Generate fallback response when Ollama is unavailable"""
        prompt_lower = prompt.lower()
        
        # Smart fallback responses based on keywords
        if any(word in prompt_lower for word in ['task', 'todo', 'work']):
            return "I'd love to help you with your tasks! While my AI brain is taking a quick break, you can check your task list in the sidebar or add new tasks using the quick-add feature."
        
        elif any(word in prompt_lower for word in ['calendar', 'schedule', 'event']):
            return "Perfect timing to check your schedule! While I'm reconnecting to my smart features, you can view your calendar and upcoming events in the Calendar section."
        
        elif any(word in prompt_lower for word in ['diary', 'mood', 'feel']):
            return "I appreciate you wanting to share your thoughts! While my AI is offline, feel free to write in your diary - I'll be able to give you insights once I'm back online."
        
        elif any(word in prompt_lower for word in ['hello', 'hi', 'hey']):
            return "Hello there! Your loyal Wingman is here, though my AI brain is taking a quick coffee break. I'm still ready to help you navigate the app and manage your productivity!"
        
        else:
            return "I'm having a brief moment of digital confusion, but your faithful Wingman is still here! Try rephrasing your request or explore the app while I get my AI circuits back online."
    
    async def close(self):
        """Clean up resources"""
        await self.client.aclose()
    
    async def delete_model(self, model_name: str) -> Dict[str, Any]:
        """Delete a model from Ollama"""
        try:
            print(f"Attempting to delete model: {model_name}")
            response = await self.client.request(
                "DELETE",
                f"{self.ollama_url}/api/delete",
                json={"name": model_name}
            )
            
            if response.status_code == 200:
                print(f"Successfully deleted model: {model_name}")
                return {"success": True, "message": f"Model {model_name} deleted successfully"}
            else:
                error_msg = f"Failed to delete model: HTTP {response.status_code}"
                print(f"{error_msg}")
                return {"success": False, "error": error_msg}
        except Exception as e:
            print(f"Error deleting model {model_name}: {e}")
            return {"success": False, "error": str(e)}

    async def get_downloaded_models(self) -> List[Dict]:
        """Get list of downloaded models from Ollama"""
        try:
            print("Fetching downloaded models from Ollama...")
            response = await self.client.get(f"{self.ollama_url}/api/tags")
            
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                print(f"Found {len(models)} models in Ollama")
                return models
            else:
                print(f"Failed to fetch models, status: {response.status_code}")
                return []
        except Exception as e:
            print(f"Error getting downloaded models: {e}")
            return []

    async def get_download_progress(self, model_name: str) -> Dict[str, Any]:
        """Get download progress for a model"""
        try:
            print(f"Checking download progress for: {model_name}")
            
            # Check if model is currently being downloaded via Ollama
            try:
                # Try to get download status from Ollama
                response = await self.client.get(f"{self.ollama_url}/api/ps")
                if response.status_code == 200:
                    data = response.json()
                    # Check if any models are currently downloading
                    for model in data.get("models", []):
                        if model.get("name") == model_name and model.get("status") == "downloading":
                            return {
                                "progress": model.get("percent_complete", 0),
                                "status": "downloading",
                                "download_speed_mbps": model.get("download_speed", 0),
                                "estimated_time_remaining": model.get("eta", 0),
                                "size_downloaded": model.get("completed_bytes", 0),
                                "total_size": model.get("total_bytes", 0)
                            }
            except:
                pass
            
            # Check if model is already downloaded
            models = await self.get_downloaded_models()
            if any(m.get('name') == model_name for m in models):
                return {
                    "progress": 100,
                    "status": "completed",
                    "download_speed_mbps": 0,
                    "estimated_time_remaining": 0,
                    "size_downloaded": 0,
                    "total_size": 0
                }
            else:
                return {
                   "progress": 50,  # Show some progress during download
                   "status": "downloading",
                    "download_speed_mbps": 0,
                    "estimated_time_remaining": 0,
                    "size_downloaded": 0,
                    "total_size": 0
                }
        except Exception as e:
            print(f"Error checking download progress for {model_name}: {e}")
            return {
                "progress": 0,
                "status": "error",
                "download_speed_mbps": 0,
                "estimated_time_remaining": 0,
                "size_downloaded": 0,
                "total_size": 0
            }