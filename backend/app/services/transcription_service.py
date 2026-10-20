import os
import shutil
import logging
from typing import Optional, Dict, Any
from pathlib import Path
import httpx
from fastapi import UploadFile, HTTPException
from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a", ".ogg"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

def ensure_upload_dir() -> Path:
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path

async def validate_and_save_audio(file: UploadFile) -> Path:
    filename = file.filename or "recording.webm"
    ext = os.path.splitext(filename)[1].lower()
    if not ext:
        ext = ".webm"
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    upload_path = ensure_upload_dir()
    temp_filename = f"upload_{os.urandom(8).hex()}{ext}"
    temp_file_path = upload_path / temp_filename

    size = 0
    with open(temp_file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 64):
            size += len(chunk)
            if size > MAX_FILE_SIZE_BYTES:
                buffer.close()
                if temp_file_path.exists():
                    os.remove(temp_file_path)
                raise HTTPException(
                    status_code=400,
                    detail="Audio file exceeds the maximum allowed size of 25MB."
                )
            buffer.write(chunk)

    return temp_file_path

async def transcribe_audio_file(file_path: Path) -> Dict[str, Any]:
    """
    Transcribes audio using configured backend STT provider (Groq Whisper or OpenAI Whisper).
    If no API key is provided, provides helpful setup instructions.
    Deletes the temporary file after transcription unless RETAIN_AUDIO_FILES is set to True.
    """
    provider = settings.TRANSCRIPTION_PROVIDER
    groq_key = settings.GROQ_API_KEY
    openai_key = settings.OPENAI_API_KEY

    result: Dict[str, Any] = {
        "text": "",
        "provider": "none",
        "status": "success",
        "language": None,
        "duration_seconds": None,
        "message": None
    }

    try:
        # Determine provider
        if (provider in ("auto", "groq")) and groq_key:
            # Use Groq Whisper (supports Tamil, English, multilingual whisper-large-v3)
            logger.info("Transcribing audio via Groq Whisper API (whisper-large-v3)...")
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(file_path, "rb") as f:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {groq_key}"},
                        files={"file": (file_path.name, f, "audio/webm")},
                        data={
                            "model": "whisper-large-v3",
                            "temperature": "0.0"
                        }
                    )
                if response.status_code == 200:
                    data = response.json()
                    result["text"] = data.get("text", "").strip()
                    result["provider"] = "groq"
                    result["language"] = data.get("language", "auto")
                else:
                    logger.error(f"Groq API error {response.status_code}: {response.text}")
                    raise HTTPException(status_code=502, detail=f"Groq STT failed: {response.text}")

        elif (provider in ("auto", "openai")) and openai_key:
            # Use OpenAI Whisper
            logger.info("Transcribing audio via OpenAI Whisper API (whisper-1)...")
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(file_path, "rb") as f:
                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {openai_key}"},
                        files={"file": (file_path.name, f, "audio/webm")},
                        data={"model": "whisper-1"}
                    )
                if response.status_code == 200:
                    data = response.json()
                    result["text"] = data.get("text", "").strip()
                    result["provider"] = "openai"
                else:
                    logger.error(f"OpenAI API error {response.status_code}: {response.text}")
                    raise HTTPException(status_code=502, detail=f"OpenAI STT failed: {response.text}")

        else:
            # No API key configured
            logger.warning("No speech-to-text API keys found (GROQ_API_KEY or OPENAI_API_KEY).")
            result["provider"] = "unconfigured"
            result["text"] = "Voice note recorded. Speech-to-text API key is not configured in backend .env. Please configure GROQ_API_KEY or OPENAI_API_KEY, or type/edit your note manually."
            result["message"] = "Add GROQ_API_KEY (free at console.groq.com) or OPENAI_API_KEY to backend .env for instant automatic Tamil/English speech-to-text transcription."

    finally:
        # Privacy policy: purge audio file immediately unless explicitly retained
        if not settings.RETAIN_AUDIO_FILES:
            try:
                if file_path.exists():
                    os.remove(file_path)
                    logger.info(f"Purged temporary audio recording {file_path.name} as per privacy policy.")
            except Exception as e:
                logger.warning(f"Could not remove temp audio file {file_path}: {e}")

    return result
