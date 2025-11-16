# app/core/config.py
import os
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

# For production/secure environments, load the Base64 encoded JSON content.
# This is the PREFERRED method.
FIREBASE_CREDENTIALS_BASE64 = os.getenv("FIREBASE_CREDENTIALS_BASE64")

# For local dev, this file path will be used as a FALLBACK if the Base64 var is not set.
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./serviceAccountKey.json")

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")
FIRESTORE_LOCATION = os.getenv("FIRESTORE_LOCATION", "asia-south1")
