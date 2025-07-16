from .context_builder import WingmanContextBuilder
from .personality_manager import WingmanPersonalityManager 
from .chat_coordinator import WingmanChatCoordinator
from .ollama_service import WingmanOllamaService

# Create singleton instance
ollama_service = WingmanOllamaService()

from .core import get_llm_response