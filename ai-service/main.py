import os
import sys

# DEBUG: Instant unbuffered output for Hugging Face logs
print(">>> [Hugging Face] AI Service Container Initialization Started <<<", flush=True)

# CRITICAL: Prevent Deadlocks
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import uuid
import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from logger import logger
from config import validate_config, Config

# Note: Service imports moved inside task function below to prevent startup hang

# Global configuration status
config_error = None
try:
    validate_config()
    logger.info("Configuration validated successfully.")
except EnvironmentError as ee:
    config_error = str(ee)
    logger.error(f"Configuration Warning: {config_error}. Service will start but processing may fail.")

app = FastAPI(title="DocuAI Inteligience Service", version="1.0.0")

class ProcessRequest(BaseModel):
    docId: str
    fileUrl: str

@app.get("/")
async def root():
    """Root endpoint for Render health check."""
    return {"status": "active", "service": "DocuAI Intelligence"}

@app.get("/health")
async def health_check():
    """Service self-monitoring endpoint."""
    return {
        "status": "ok" if not config_error else "unconfigured",
        "service": "docuai",
        "error": config_error,
        "pipeline": "universal"
    }

async def docuai_processing_task(doc_id: str, file_url: str):
    """Orchestrates download -> Smart Extraction -> AI -> Firestore."""
    # LATE IMPORTS to ensure server starts instantly and passes health checks
    from utils.s3_utils import download_s3_file
    from utils.db_utils import update_document_results, mark_document_failed
    from services.extraction_service import smart_extraction_pipeline
    from services.ai_service import extract_structured_data
    from services.pii_service import scan_pii_patterns
    
    import time
    start_time = time.time()
    
    # Robust extension detection
    from urllib.parse import urlparse
    parsed_url = urlparse(file_url)
    ext = os.path.splitext(parsed_url.path)[1].lower() or ".pdf"
    temp_file = f"temp_{uuid.uuid4().hex}_{doc_id}{ext}"
    
    logger.info(f"[DocuAI] Task [START] for {doc_id}. Type hint: {ext}")
    
    try:
        # 1. Download
        download_s3_file(file_url, temp_file)
        
        # 2. Smart Extraction (Hybrid: Digital vs Scanned)
        ext_start = time.time()
        text = smart_extraction_pipeline(temp_file)
        ext_time = time.time() - ext_start
        
        # 3. AI Universal Analysis
        ai_start = time.time()
        ai_result = extract_structured_data(text)
        ai_time = time.time() - ai_start
        
        # 4. PII Detection
        pii_list = scan_pii_patterns(text)
        
        # 5. Final Assembly
        final_result = {
            "type": ai_result.get("type", "Document"),
            "data": ai_result.get("data", {}),
            "pii": {
                "ai_detected": ai_result.get("pii_detected", []),
                "patterns": pii_list # Merged result for backend
            },
            "stats": {
                "ext_seconds": round(ext_time, 2),
                "ai_seconds": round(ai_time, 2),
                "total_seconds": round(time.time() - start_time, 2)
            },
            "confidence": ai_result.get("confidence", "medium")
        }
        
        # 6. Update Firestore
        update_document_results(doc_id, final_result)
        logger.info(f"[DocuAI] Task [SUCCESS] in {final_result['stats']['total_seconds']}s")
        
    except Exception as pipe_err:
        logger.error(f"[DocuAI] Task [FAILURE]: {str(pipe_err)}")
        mark_document_failed(doc_id, str(pipe_err))
        
    finally:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception: pass

@app.post("/process")
async def process_document(request: ProcessRequest, background_tasks: BackgroundTasks):
    """API Endpoint to trigger the AI pipeline asynchronously."""
    logger.info(f"API Request received for docId: {request.docId}")
    background_tasks.add_task(docuai_processing_task, request.docId, request.fileUrl)
    return {"status": "processing_started", "docId": request.docId}

if __name__ == "__main__":
    import uvicorn
    # Hugging Face usually expects port 7860
    port = int(os.environ.get("PORT", 7860))
    logger.info(f"Starting DocuAI Intelligence Service on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
