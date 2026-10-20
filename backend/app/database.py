from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings
import os

# Normalize PostgreSQL database URL if needed (e.g. Render / Heroku prefix postgres:// -> postgresql://)
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models here so that metadata contains all tables
    from app.models.call_record import CallRecord  # noqa: F401
    from app.models.reminder import Reminder        # noqa: F401
    from app.models.notification import PushSubscription, NotificationJob  # noqa: F401
    
    Base.metadata.create_all(bind=engine)
