from .context_builder import WingmanContextBuilder
from .ollama_service import WingmanOllamaService

# Create singleton instance
ollama_service = WingmanOllamaService()

from .core import get_llm_response