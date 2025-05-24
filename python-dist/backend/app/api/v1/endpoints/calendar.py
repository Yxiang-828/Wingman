from fastapi import APIRouter, Query, HTTPException
from app.services.calendar import get_events_by_date, create_event, update_event, delete_event
from typing import List
import traceback

router = APIRouter()

@router.get("/calendar", response_model=List[dict])
def get_events(date: str = Query(...), user_id: str = Query(...)):
    try:
        return get_events_by_date(date, user_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)}")

@router.post("/calendar", response_model=dict)
def create_event_endpoint(event: dict):
    try:
        result = create_event(event)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create event, no data returned")
        return result
    except ValueError as e:
        # Handle user validation errors specifically
        if "does not exist" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")

@router.put("/calendar/{event_id}", response_model=dict)
def update_event_endpoint(event_id: int, event: dict):
    try:
        result = update_event(event_id, event)
        if not result:
            # Provide a fallback response
            return {"id": event_id, "message": "Update processed but no data returned"}
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error updating event: {str(e)}"
        )

@router.delete("/calendar/{event_id}", response_model=dict)
def delete_event_endpoint(event_id: int):
    try:
        result = delete_event(event_id)
        if not result:
            return {"id": event_id, "message": "Delete processed but no data returned"}
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting event: {str(e)}")