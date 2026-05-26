# test_match_hang.py
import sys
import os
import asyncio
import time

# Add the current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.resume_matcher import match_resume_to_jd
from services.embedding_engine import generate_embedding
from config import settings

async def main():
    print("=== Start Match Hang Diagnosis ===")
    
    resume_text = "John Doe. Software Engineer with 5 years experience in Python, FastAPI, and Postgres."
    jd_text = "Looking for a Software Engineer with Python and FastAPI skills."
    
    # Step 1: Test Embedding Generation
    print("\n[Step 1] Testing generate_embedding for JD...")
    t0 = time.perf_counter()
    try:
        vector = generate_embedding(jd_text)
        print(f"-> Success! Vector length: {len(vector)} generated in {(time.perf_counter() - t0)*1000:.1f}ms")
    except Exception as e:
        print(f"-> Failed! Error: {e}")

    # Step 2: Test LLM Matching
    print("\n[Step 2] Testing match_resume_to_jd...")
    t0 = time.perf_counter()
    try:
        result = await match_resume_to_jd(resume_text, jd_text)
        print(f"-> Success! Final result: {result}")
        print(f"Completed in {(time.perf_counter() - t0):.1f}s")
    except Exception as e:
        print(f"-> Failed! Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
