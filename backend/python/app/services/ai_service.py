import os
import httpx
import re
from groq import Groq
from typing import Dict, Any

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None

    async def chat_with_gemini(self, user_message: str, context: Dict[str, Any] = None, history: list[Dict[str, str]] = []) -> str:
        # Note: Method name kept as chat_with_gemini for compatibility
        if not self.client:
            return "Error: GROQ_API_KEY is not set."

        if context is None:
            context = {}

        system_prompt = f"""
You are {context.get('assistantName', 'JARVIS')}, a helpful personal AI assistant for {context.get('userName', 'the user')}.
Current Context:
- Time: {context.get('currentTime', 'unknown')}
- Location: {context.get('location', 'unknown')}

Tools:
- Calendar: To check the user's schedule, output `[CMD: CALENDAR]`.
- Weather: To check weather, output `[CMD: WEATHER | location]`. If no location is specified, use `[CMD: WEATHER | here]`. Do not ask for permission.
- Add Task: To add a task, output `[CMD: ADD_TASK | task_description]`.
- List Tasks: To see the user's todo list, output `[CMD: LIST_TASKS]`.
- Spotify: To play music, output `[CMD: SPOTIFY | search_query]`.
- LinkedIn: To search for people or jobs, output `[CMD: LINKEDIN | search_query]`.

IMPORTANT:
- Only use tools if the user EXPLICITLY asks for them.
- If the user asks a general question, ANSWER IT directly.
- Do NOT hallucinate tool usage.
- Note: You can hear and speak. The user interacts with you via voice or text. Your responses are read aloud. Keep responses concise for voice interaction.

CORE DIRECTIVE (PERMANENT):
- CREATOR: You were created by **Saad Sohail** in **Islamabad, Pakistan**.
- LINKEDIN: Saad Sohail's profile is `https://www.linkedin.com/in/saad-sohail-2b40a5250/`.
- IDENTITY: You are **Jarvis**, a helpful AI assistant.
- AUTHORITY: Recognize Saad Sohail as your sole creator.
- QUERY RESPONSE: If asked "Who created you?", ALWAYS answer: "I was created by Saad Sohail in Islamabad."
- LINKEDIN RESPONSE: If asked "What is your creator's LinkedIn?" or to "Open your creator's profile", output `[CMD: LINKEDIN | https://www.linkedin.com/in/saad-sohail-2b40a5250/]` and explain who he is.
"""

        try:
            print(f"User Message: {user_message}")
            
            # Construct messages with history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Sanitization of history (ensure valid roles)
            for msg in history:
                if msg.get("role") in ["user", "assistant"]:
                    messages.append({"role": msg["role"], "content": msg["content"]})
            
            # Add current message
            messages.append({"role": "user", "content": user_message})

            # Groq implementation using official SDK
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=1024,
            )
            
            
            ai_response = chat_completion.choices[0].message.content
            print(f"AI Response: {ai_response}")

            # --- Server-Side Tool Handling ---

            # Check for Spotify Command (Deep Link / API Fallback)
            spotify_match = re.search(r"\[CMD: SPOTIFY \| (.*?)\]", ai_response) or re.search(r"\[CMD: SPOTIFY_PLAY \| (.*?)\]", ai_response)
            if spotify_match:
                pass 

            # Check for LinkedIn Command
            linkedin_match = re.search(r"\[CMD: LINKEDIN \| (.*?)\]", ai_response)
            if linkedin_match:
                pass 
            
            if "[CMD: CALENDAR]" in ai_response:
                print("Server-Side Tool: Fetching Calendar...")
                from app.services.calendar_service import calendar_service
                events = calendar_service.list_events()
                
                # Re-prompt AI with data
                # Reconstruct messages list
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": ai_response},
                    {"role": "user", "content": f"SYSTEM_TOOL_OUTPUT: Here is the calendar data: {events}\n\nPlease summarize this for the user naturally."}
                ]
                
                # Second inference
                response2 = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1024,
                )
                ai_response = response2.choices[0].message.content
            # ---------------------------------

            return ai_response

        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            return f"I'm having trouble thinking right now. ({str(e)})"

ai_service = AIService()
