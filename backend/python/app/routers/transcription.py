from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional
import os

router = APIRouter()

# In a real implementation, this would call the Whisper service
@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = "en"
):
    """
    Transcribe audio using Groq Whisper.
    """
    try:
        from app.services.ai_service import ai_service
        
        if not ai_service.client:
             raise HTTPException(status_code=500, detail="Groq client not initialized")

        # Read file content into memory
        file_content = await audio.read()
        
        # Send directly to Groq without saving to disk
        transcription = ai_service.client.audio.transcriptions.create(
            file=(audio.filename, file_content),
            model="whisper-large-v3-turbo",
            response_format="json",
            language="en",
            temperature=0.0
        )

        print(f"Transcribed: {transcription.text}")
        return {
            "success": True,
            "transcription": transcription.text,
            "language": language
        }
    except Exception as e:
        error_msg = f"Transcription Error: {str(e)}"
        print(error_msg)
        # Verify if it's an API Key issue
        if "401" in str(e):
             raise HTTPException(status_code=500, detail="Groq API Key Invalid or Missing on Vercel")
        raise HTTPException(status_code=500, detail=str(e))
