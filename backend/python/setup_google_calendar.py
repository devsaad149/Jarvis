
import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Scopes required
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']

def main():
    print("--- Google Calendar Setup ---")
    
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        print("ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found in .env")
        print("Please edit .env and add your matching credentials.")
        return

    # Create a flow from client config
    flow = InstalledAppFlow.from_client_config(
        {
            "installed": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        SCOPES
    )

    # Run local server flow
    print("\nLaunching browser to authorize...")
    # Using fixed port 8080 to ensure stability
    creds = flow.run_local_server(port=8080)

    print("\n--- Authorization Successful ---")
    print(f"Refresh Token: {creds.refresh_token}")
    
    print(f"Refresh Token: {creds.refresh_token}")
    
    # Save to .env programmatically
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    token_saved = False
    for line in lines:
        if line.startswith('GOOGLE_REFRESH_TOKEN='):
            new_lines.append(f'GOOGLE_REFRESH_TOKEN={creds.refresh_token}\n')
            token_saved = True
        else:
            new_lines.append(line)
    
    if not token_saved:
        new_lines.append(f'\nGOOGLE_REFRESH_TOKEN={creds.refresh_token}\n')
    
    with open(env_path, 'w') as f:
        f.writelines(new_lines)

    print("\n✅ Token saved to .env automatically.")
    print("Restarting backend...")


if __name__ == '__main__':
    main()
