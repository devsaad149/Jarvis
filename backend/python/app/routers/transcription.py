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
        # Save temp file
        temp_filename = f"temp_{audio.filename}"
        with open(temp_filename, "wb") as buffer:
            buffer.write(await audio.read())

        from app.services.ai_service import ai_service
        
        if not ai_service.client:
             raise HTTPException(status_code=500, detail="Groq client not initialized")

        with open(temp_filename, "rb") as file:
            transcription = ai_service.client.audio.transcriptions.create(
                file=(temp_filename, file.read()),
                model="whisper-large-v3",
                response_format="json",
                language="en",
                temperature=0.0
            )

        # Cleanup
        os.remove(temp_filename)

        print(f"Transcribed: {transcription.text}")
        return {
            "success": True,
            "transcription": transcription.text,
            "language": language
        }
    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        error_msg = f"Transcription Error: {str(e)}"
        print(error_msg)
        with open("last_error.txt", "w") as f:
            f.write(error_msg)
        raise HTTPException(status_code=500, detail=str(e))
