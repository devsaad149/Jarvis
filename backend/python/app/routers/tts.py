from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import Response
from app.services.tts_service import tts_service
from pydantic import BaseModel

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    voice_id: str = None

@router.post("/speak")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech and return audio file"""
    try:
        audio_content = await tts_service.text_to_speech(
            text=request.text,
            # Use provided voice_id or fall back to env/default in service
        )
        
        if not audio_content:
            raise HTTPException(status_code=500, detail="Failed to generate speech")
            
        return Response(content=audio_content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
