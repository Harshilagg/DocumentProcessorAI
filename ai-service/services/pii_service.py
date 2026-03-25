import re
from logger import logger

def scan_pii_patterns(text: str):
    """Regex-based PII pattern matching for universal formats."""
    text_clean = text.replace("\n", " ")
    
    patterns = {
        "email": re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text_clean),
        "phone": re.findall(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text_clean),
        "aadhaar": re.findall(r"\b\d{4}\s\d{4}\s\d{4}\b", text_clean),
        "pan": re.findall(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", text_clean),
        "passport": re.findall(r"\b[A-Z][0-9]{7}\b", text_clean),
    }
    
    logger.info(f"[DocuAI] PII Pattern Scan found matches.")
    return patterns # Return dictionary of lists for frontend category mapping
