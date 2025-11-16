# app/core/firebase.py
import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, auth, firestore
from app.core.config import GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_CREDENTIALS_BASE64

# Initialize Firebase Admin only once
if not firebase_admin._apps:
    cred = None
    # Prioritize the secure Base64 environment variable
    if FIREBASE_CREDENTIALS_BASE64:
        try:
            decoded_creds = base64.b64decode(FIREBASE_CREDENTIALS_BASE64)
            creds_json = json.loads(decoded_creds)
            cred = credentials.Certificate(creds_json)
            print("[INFO] Firebase initialized securely from environment variable.")
        except Exception as e:
            # If the Base64 variable is invalid, the app will fail loudly. This is intentional.
            raise ValueError(f"Invalid FIREBASE_CREDENTIALS_BASE64: {e}")
    # Fallback to the local file path method for convenience
    elif GOOGLE_APPLICATION_CREDENTIALS:
        try:
            cred = credentials.Certificate(GOOGLE_APPLICATION_CREDENTIALS)
            print(f"[INFO] Firebase initialized from local file: {GOOGLE_APPLICATION_CREDENTIALS}.")
        except Exception as e:
            raise ValueError(f"Could not initialize Firebase from file path: {e}")
    else:
        raise ValueError("Firebase credentials not found.")

    firebase_admin.initialize_app(cred)

# Expose auth and firestore client for use in other files
firebase_auth = auth
db = firestore.client()

print("[INFO] Firestore client imported from core.firebase")
