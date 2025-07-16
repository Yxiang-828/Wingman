def get_llm_response(prompt: str) -> str:
    return f"Wingman says: {prompt[::-1]}" 