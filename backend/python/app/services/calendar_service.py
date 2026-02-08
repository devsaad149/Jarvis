
import os
import datetime
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

load_dotenv()

class GoogleCalendarService:
    def __init__(self):
        self.creds = None
        self.service = None
        self.setup_creds()

    def setup_creds(self):
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        refresh_token = os.getenv('GOOGLE_REFRESH_TOKEN')

        if not all([client_id, client_secret, refresh_token]):
            print("Google Calendar credentials missing.")
            return

        self.creds = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )

    def get_service(self):
        if not self.creds: 
            return None
        
        if not self.creds.valid:
            if self.creds.expired and self.creds.refresh_token:
                try:
                    self.creds.refresh(Request())
                except Exception as e:
                    print(f"Error refreshing creds: {e}")
                    return None
        
        if not self.service:
            self.service = build('calendar', 'v3', credentials=self.creds)
        
        return self.service

    def list_events(self, max_results=5):
        service = self.get_service()
        if not service:
            return "Calendar service not available."

        now = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
        try:
            events_result = service.events().list(
                calendarId='primary', timeMin=now,
                maxResults=max_results, singleEvents=True,
                orderBy='startTime'
            ).execute()
            events = events_result.get('items', [])

            if not events:
                return "No upcoming events found."

            event_list = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                summary = event['summary']
                event_list.append(f"{start}: {summary}")
            
            return "\n".join(event_list)
        except Exception as e:
            return f"Error fetching events: {str(e)}"

calendar_service = GoogleCalendarService()
