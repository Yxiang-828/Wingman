"""
This script patches FastAPI to work without orjson.
Run this before starting the application if using Python 3.13+.
"""
import sys
import json
import types

# Create a fake orjson module
orjson = types.ModuleType('orjson')

# Add core functions
def dumps(obj, **kwargs):
    return json.dumps(obj).encode('utf-8')

def loads(obj):
    if isinstance(obj, bytes):
        obj = obj.decode('utf-8')
    return json.loads(obj)

# Add required options
orjson.OPT_NON_STR_KEYS = 0 # type: ignore
orjson.OPT_SERIALIZE_NUMPY = 0 # type: ignore
orjson.dumps = dumps # type: ignore
orjson.loads = loads # type: ignore

# Add to sys.modules
sys.modules['orjson'] = orjson
print("Fake orjson module created successfully")