from typing import Any
from fastapi.responses import JSONResponse

class CustomJSONResponse(JSONResponse):
    """
    Custom JSON response that doesn't rely on orjson or ujson.
    Uses the standard library json instead.
    """
    media_type = "application/json"

    def render(self, content: Any) -> bytes:
        import json
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")