from fastapi import APIRouter, Query, HTTPException
from app.services.calendar import get_events_by_date, create_event, update_event, delete_event
from typing import List

router = APIRouter()

@router.get("/calendar", response_model=List[dict])
def get_events(date: str = Query(...), user_id: str = Query(...)):
    try:
        return get_events_by_date(date, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)}")

@router.post("/calendar", response_model=dict)
def create_event_endpoint(event: dict):
    try:
        return create_event(event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")

@router.put("/calendar/{event_id}", response_model=dict)
def update_event_endpoint(event_id: int, event: dict):
    return update_event(event_id, event)

@router.delete("/calendar/{event_id}", response_model=dict)
def delete_event_endpoint(event_id: int):
    return delete_event(event_id)