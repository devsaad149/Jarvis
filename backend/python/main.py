from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

# Import routers
from app.routers import health, transcription, tts
from app.services.ai_service import ai_service

app = FastAPI(
    title="JARVIS Backend API",
    description="Backend services for JARVIS AI Assistant",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(transcription.router, prefix="/api", tags=["Transcription"])

# --- Spotify Routes (Inline for simplicity) ---
@app.get("/api/spotify/login")
async def spotify_login():
    url = spotify_service.get_login_url()
    if not url:
        return {"error": "Spotify credentials not configured."}
    return RedirectResponse(url)

@app.get("/api/spotify/callback")
async def spotify_callback(code: str):
    success = await spotify_service.get_token_from_code(code)
    if success:
        return "Spotify Connected Successfully! You can close this tab."
    return "Failed to connect Spotify."
# ----------------------------------------------
app.include_router(tts.router, prefix="/api/tts", tags=["Text-to-Speech"])

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[list[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    success: bool

@app.get("/")
async def root():
    return {
        "message": "JARVIS Backend API",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint for AI conversations"""
    try:
        response = await ai_service.chat_with_gemini(request.message, request.context or {}, request.history)
        return ChatResponse(response=response, success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

