from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging

from app.config import settings
from app.database import init_db
from app.services.scheduler import notification_worker
from app.api.routes_calls import router as calls_router
from app.api.routes_reminders import router as reminders_router
from app.api.routes_transcription import router as transcription_router
from app.api.routes_notifications import router as notifications_router
from app.api.routes_dashboard import router as dashboard_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smart_call_reminder")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database and Background Scheduler
    logger.info("Initializing database tables...")
    init_db()
    logger.info("Starting background notification worker...")
    notification_worker.start()
    yield
    # Shutdown: Stop Background Scheduler
    logger.info("Stopping background notification worker...")
    notification_worker.stop()

app = FastAPI(
    title="Smart Call Reminder API",
    description="Privacy-first call action reminder backend with voice notes, speech-to-text, and web push notifications.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
origins = settings.cors_origins_list
logger.info(f"Configuring CORS for origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(calls_router)
app.include_router(reminders_router)
app.include_router(transcription_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": "Smart Call Reminder",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
