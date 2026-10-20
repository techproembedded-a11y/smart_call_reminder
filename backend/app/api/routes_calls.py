from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.call_record import CallRecord
from app.schemas.call_record import CallRecordCreate, CallRecordUpdate, CallRecordResponse

router = APIRouter(prefix="/api/calls", tags=["Calls"])

@router.get("", response_model=List[CallRecordResponse])
def get_call_records(
    phone: Optional[str] = Query(None, description="Filter by phone number"),
    date_from: Optional[datetime] = Query(None, description="Filter calls from this datetime"),
    date_to: Optional[datetime] = Query(None, description="Filter calls up to this datetime"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(CallRecord)
    if phone:
        query = query.filter(CallRecord.phone_number.contains(phone.strip()))
    if date_from:
        query = query.filter(CallRecord.call_datetime >= date_from)
    if date_to:
        query = query.filter(CallRecord.call_datetime <= date_to)
    
    records = query.order_by(CallRecord.call_datetime.desc()).offset(skip).limit(limit).all()
    return records

@router.post("", response_model=CallRecordResponse, status_code=201)
def create_call_record(payload: CallRecordCreate, db: Session = Depends(get_db)):
    call_dt = payload.call_datetime or datetime.now(timezone.utc)
    record = CallRecord(
        phone_number=payload.phone_number,
        call_datetime=call_dt
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/{call_id}", response_model=CallRecordResponse)
def get_call_record(call_id: int, db: Session = Depends(get_db)):
    record = db.query(CallRecord).filter(CallRecord.id == call_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Call record not found")
    return record

@router.patch("/{call_id}", response_model=CallRecordResponse)
def update_call_record(call_id: int, payload: CallRecordUpdate, db: Session = Depends(get_db)):
    record = db.query(CallRecord).filter(CallRecord.id == call_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Call record not found")
    
    if payload.phone_number is not None:
        record.phone_number = payload.phone_number
    if payload.call_datetime is not None:
        record.call_datetime = payload.call_datetime
    
    db.commit()
    db.refresh(record)
    return record

@router.delete("/{call_id}", status_code=204)
def delete_call_record(call_id: int, db: Session = Depends(get_db)):
    record = db.query(CallRecord).filter(CallRecord.id == call_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Call record not found")
    db.delete(record)
    db.commit()
    return None
