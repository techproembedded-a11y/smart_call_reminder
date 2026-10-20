from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from app.services.transcription_service import validate_and_save_audio, transcribe_audio_file
from app.services.reminder_extractor import extract_reminder_details
from app.schemas.transcription import TranscriptionResponse, SmartExtractionRequest, SmartExtractionResponse

router = APIRouter(prefix="/api", tags=["Voice & Extraction"])

@router.post("/transcription", response_model=TranscriptionResponse)
async def upload_and_transcribe_audio(file: UploadFile = File(...)):
    """
    Accepts audio file (webm, wav, mp3, m4a, ogg, max 25MB).
    Transcribes audio via configured STT provider (Groq Whisper or OpenAI Whisper).
    Audio file is securely purged immediately after processing.
    """
    temp_file_path = await validate_and_save_audio(file)
    try:
        result = await transcribe_audio_file(temp_file_path)
        return TranscriptionResponse(
            text=result.get("text", ""),
            provider=result.get("provider", "unconfigured"),
            language=result.get("language"),
            duration_seconds=result.get("duration_seconds"),
            status=result.get("status", "success"),
            message=result.get("message")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post("/extract-reminder", response_model=SmartExtractionResponse)
async def extract_reminder_from_text(payload: SmartExtractionRequest):
    """
    Extracts actionable task title, priority tier, and due date from Tamil/Tanglish/English voice notes.
    Resolves relative dates against the client's local reference datetime and timezone.
    """
    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty")

    extracted = await extract_reminder_details(
        transcript=payload.transcript,
        phone_number=payload.phone_number,
        call_datetime=payload.call_datetime,
        timezone_str=payload.timezone or "Asia/Kolkata"
    )

    return SmartExtractionResponse(
        task_title=extracted["task_title"],
        phone_number=extracted.get("phone_number"),
        due_datetime=extracted["due_datetime"],
        priority=extracted["priority"],
        confidence=extracted["confidence"],
        notes=extracted.get("notes"),
        explanation=extracted.get("explanation")
    )
