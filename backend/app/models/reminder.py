from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    call_record_id = Column(Integer, ForeignKey("call_records.id", ondelete="CASCADE"), nullable=True, index=True)
    task_title = Column(String(255), nullable=False)
    voice_text = Column(Text, nullable=True)
    due_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    timezone = Column(String(64), nullable=False, default="Asia/Kolkata")
    
    # Priority values: emergency, due_today, 2_day, 3_day, 5_day, completed
    priority = Column(String(32), nullable=False, default="due_today", index=True)
    
    completed = Column(Boolean, nullable=False, default=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    call_record = relationship("CallRecord", back_populates="reminders")
    notification_jobs = relationship(
        "NotificationJob",
        back_populates="reminder",
        cascade="all, delete-orphan",
        order_by="NotificationJob.scheduled_at.asc()"
    )
