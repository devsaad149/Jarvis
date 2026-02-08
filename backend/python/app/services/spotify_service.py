import os
import urllib.parse
import httpx
from fastapi import HTTPException

# Spotify API Endpoints
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"

class SpotifyService:
    def __init__(self):
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = "http://localhost:8000/api/spotify/callback"
        self.scope = "user-modify-playback-state user-read-playback-state"
        self.access_token = None
        self.refresh_token = None
        
        # Load tokens from file if exist (simple persistence)
        self._load_tokens()

    def _load_tokens(self):
        try:
            if os.path.exists("spotify_tokens.txt"):
                with open("spotify_tokens.txt", "r") as f:
                    lines = f.readlines()
                    if len(lines) >= 2:
                        self.access_token = lines[0].strip()
                        self.refresh_token = lines[1].strip()
        except Exception:
            pass

    def _save_tokens(self):
        with open("spotify_tokens.txt", "w") as f:
            f.write(f"{self.access_token}\n{self.refresh_token}")

    def get_login_url(self):
        if not self.client_id:
            return None
        
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": self.scope,
            "show_dialog": "true"
        }
        return f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}"

    async def get_token_from_code(self, code: str):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get token")
            
            data = response.json()
            self.access_token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")
            self._save_tokens()
            return True

    async def _refresh_access_token(self):
        if not self.refresh_token:
            return False
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                if "refresh_token" in data:
                    self.refresh_token = data.get("refresh_token")
                self._save_tokens()
                return True
            return False

    async def _make_request(self, method, endpoint, json=None, params=None):
        if not self.access_token:
            raise HTTPException(status_code=401, detail="Not authenticated with Spotify")

        url = f"{SPOTIFY_API_BASE_URL}/{endpoint}"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.request(method, url, headers=headers, json=json, params=params)
            
            if response.status_code == 401:
                # Token expired, refresh and retry
                if await self._refresh_access_token():
                    headers["Authorization"] = f"Bearer {self.access_token}"
                    response = await client.request(method, url, headers=headers, json=json, params=params)
                else:
                    raise HTTPException(status_code=401, detail="Spotify token expired and refresh failed")
            
            return response

    async def play_music(self, query: str):
        # 1. Search for item
        search_res = await self._make_request("GET", "search", params={"q": query, "type": "track", "limit": 1})
        if search_res.status_code != 200:
            return "Failed to search Spotify."
        
        search_data = search_res.json()
        tracks = search_data.get("tracks", {}).get("items", [])
        if not tracks:
            return f"No tracks found for {query}"
        
        track_uri = tracks[0]["uri"]
        track_name = tracks[0]["name"]
        
        # 2. Play it
        play_res = await self._make_request("PUT", "me/player/play", json={"uris": [track_uri]})
        
        if play_res.status_code == 204:
            return f"Playing {track_name} on active device."
        elif play_res.status_code == 404:
            return "No active Spotify device found. Please open Spotify on your device."
        else:
            return f"Error playing music: {play_res.text}"

    async def pause_music(self):
        res = await self._make_request("PUT", "me/player/pause")
        if res.status_code == 204:
            return "Paused playback."
        return "Failed to pause or already paused."

    async def skip_next(self):
        res = await self._make_request("POST", "me/player/next")
        if res.status_code == 204:
            return "Skipped to next track."
        return "Failed to skip."

# Singleton instance
spotify_service = SpotifyService()
