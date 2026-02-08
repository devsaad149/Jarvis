from fastapi import HTTPException, Header
import firebase_admin
from firebase_admin import credentials, auth
import os

# Initialize Firebase
def init_firebase():
    if not firebase_admin._apps:
        # In production, use the service account key
        # service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        # if service_account_path and os.path.exists(service_account_path):
        #     cred = credentials.Certificate(service_account_path)
        #     firebase_admin.initialize_app(cred)
        # else:
        #     firebase_admin.initialize_app()
        firebase_admin.initialize_app()

async def verify_firebase_token(authorization: str = Header(None)) -> str:
    """Verify Firebase ID token and return user ID"""
    if not authorization or not authorization.startswith("Bearer "):
        # For development, we might allow bypassing this if configured
        if os.getenv("SKIP_AUTH") == "true":
            return "dev_user"
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.split("Bearer ")[1]
    
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        print(f"Auth Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")
