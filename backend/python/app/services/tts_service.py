import os
import httpx
from typing import Optional

class TTSService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "JDbTsn84hlYSFan9luFg")
        self.api_url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
    
    async def text_to_speech(self, text: str, model_id: str = "eleven_monolingual_v1") -> Optional[bytes]:
        """Convert text to speech using ElevenLabs API"""
        if not self.api_key:
            print("Error: ELEVENLABS_API_KEY is not set.")
            return None
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.content
            except Exception as e:
                print(f"ElevenLabs TTS Error: {str(e)}")
                return None

tts_service = TTSService()
