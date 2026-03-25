import firebase_admin
from firebase_admin import credentials, firestore
from config import Config
from logger import logger

# Initialize Firebase on import (singleton pattern)
if not firebase_admin._apps:
    creds = credentials.Certificate({
        "type": "service_account",
        "project_id": Config.FIREBASE_PROJECT_ID,
        "private_key": Config.FIREBASE_PRIVATE_KEY,
        "client_email": Config.FIREBASE_CLIENT_EMAIL,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    })
    firebase_admin.initialize_app(creds)

db = firestore.client()

def update_document_results(doc_id: str, final_result: dict):
    """Updates Firestore with final AI results and processed status."""
    try:
        db.collection("documents").document(doc_id).update({
            "status": "processed",
            "result": final_result
        })
        logger.info(f"Firestore status [processed] for document: {doc_id}")
    except Exception as e:
        logger.error(f"Firestore update failed for {doc_id}: {str(e)}")
        raise e

def mark_document_failed(doc_id: str, error_msg: str):
    """Gracefully marks a document as failed in Firestore."""
    try:
        db.collection("documents").document(doc_id).update({
            "status": "failed",
            "error": str(error_msg)
        })
        logger.warning(f"Firestore status [failed] for document: {doc_id}")
    except Exception as e:
        logger.error(f"Firestore failure update error for {doc_id}: {str(e)}")
