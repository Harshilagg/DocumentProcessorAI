from groq import Groq
import json
import re
from config import Config
from logger import logger

# Initialize Groq
groq_client = Groq(api_key=Config.GROQ_API_KEY)

def detect_document_hint(text: str):
    """Rule-based keyword detection for fast classification hint."""
    text_lower = text.lower()
    
    if "government of india" in text_lower or "आधार" in text or "unique identification" in text_lower:
        return "Identity Document (Aadhaar Card)"
    if "permanent account number" in text_lower or "income tax department" in text_lower:
        return "Identity Document (PAN Card)"
    if "republic of india" in text_lower or "passport" in text_lower or "भारत" in text_lower or "ind_ " in text_lower:
        return "Identity Document (Passport)"
    if "education" in text_lower and ("experience" in text_lower or "projects" in text_lower or "skills" in text_lower):
        return "Resume / CV"
    if "invoice" in text_lower or "bill to" in text_lower or "tax invoice" in text_lower:
        return "Financial Document (Invoice)"
    if "certificate" in text_lower or "provisional" in text_lower:
        return "Certificate"
        
    return "Unknown Document"

def extract_structured_data(text: str):
    """Universal Extraction Layer with Hybrid Classification."""
    
    # 1. Text Normalization
    clean_text = re.sub(r'\s+', ' ', text).strip()
    
    # 2. Rule-based Hint
    classification_hint = detect_document_hint(clean_text)
    logger.info(f"[DocuAI] Classification Hint: {classification_hint}")

    # 3. LLM Extraction (Structured JSON)
    prompt = f"""
    You are an advanced Document Intelligence AI. Analyze the following OCR/Extracted text.
    
    HINT: This document appears to be a '{classification_hint}'.
    
    DOCUMENT TEXT:
    \"\"\"
    {clean_text[:6000]} 
    \"\"\"
    
    GOAL:
    1. Identify the EXACT type of document.
    2. Extract Name, Date of Birth/Date, and Primary ID/Document Number.
    3. Detect all PII (Personally Identifiable Information).
    4. Provide a confidence score.
    
    JSON FORMAT (STRICT):
    {{
        "type": "Name of Document Type",
        "data": {{
            "name": "Extracted Name",
            "dob": "Extracted DOB/Date",
            "document_number": "Extracted Number"
        }},
        "pii_detected": ["List of sensitive entries"],
        "confidence": "high | medium | low"
    }}
    """
    
    try:
        logger.info("Universal LLM Analysis initiated...")
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=Config.GROQ_MODEL,
            response_format={"type": "json_object"},
            timeout=25.0
        )
        
        result = json.loads(completion.choices[0].message.content)
        logger.info(f"LLM extraction complete. Type: {result.get('type')} ({result.get('confidence')})")
        return result
        
    except Exception as e:
        logger.error(f"[AI Service] LLM Extraction failed/timeout: {str(e)}")
        return {
            "type": classification_hint,
            "data": {"name": None, "date": None, "document_no": None},
            "pii_detected": [],
            "confidence": "low"
        }
