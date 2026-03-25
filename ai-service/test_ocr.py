import sys
import os
from time import time

# Add ai-service to path
sys.path.append("/Users/rohitaggarwal/Rolling_Arrays/ai-service")

from services.extraction_service import smart_extraction_pipeline

# Path to the certificate image
test_img = "/Users/rohitaggarwal/Rolling_Arrays/ai-service/test_4k.png"

print(f"--- Document Processing Test ---")
print(f"Target: {os.path.basename(test_img)}")

start = time()
try:
    result = smart_extraction_pipeline(test_img)
    duration = time() - start
    
    print(f"\n[SUCCESS] Completed in {round(duration, 2)}s")
    print(f"Characters Extracted: {len(result)}")
    print(f"First 100 chars: {result[:100]}...")
except Exception as e:
    print(f"\n[FAILURE] {e}")
