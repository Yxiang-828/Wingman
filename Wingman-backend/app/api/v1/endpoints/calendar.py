from fastapi import APIRouter, Query
from app.services.calendar import get_events_by_date, create_event, update_event, delete_event
from typing import List
from datetime import date

router = APIRouter()

@router.get("/calendar", response_model=List[dict])  # Change this to match tasks format
def get_events(date: str = Query(..., description="Date to get events for")):
    result = get_events_by_date(date)
    return result or []  # Always return a list

# Keep your other routes the same
@router.post("/calendar", response_model=dict)
def create_event_endpoint(event: dict):
    return create_event(event)

@router.put("/calendar/{event_id}", response_model=dict)
def update_event_endpoint(event_id: int, event: dict):
    return update_event(event_id, event)

@router.delete("/calendar/{event_id}", response_model=dict)
def delete_event_endpoint(event_id: int):
    return delete_event(event_id)