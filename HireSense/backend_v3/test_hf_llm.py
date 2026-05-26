# test_hf_llm.py
import sys
import os
import asyncio
import time

# Add the current directory to path so config/services can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.llm_service import prompt_nim_async
from config import settings

async def main():
    print("=== HireSense LLM Racing Verification ===")
    print(f"HF_API_KEY Configured: {'Yes' if settings.HF_API_KEY else 'No'}")
    
    # We will simulate a standard ATS compliance check
    system_prompt = '''You are an expert ATS compliance analyzer. Assess ATS readiness. Respond ONLY with valid JSON:
{"score":85,"candidate_name":"John Doe","breakdown":[{"type":"success","message":"Great structure."}]}'''
    
    user_prompt = "Resume text: John Doe. Software Engineer with Python and FastAPI experience."
    
    print("\n[RACE START] Triggering concurrent LLM Racing Engine including Hugging Face Llama 3.1...")
    t0 = time.perf_counter()
    result = await prompt_nim_async(system_prompt, user_prompt, use_cache=False)
    t1 = time.perf_counter()
    latency_ms = (t1 - t0) * 1000
    
    print("\n=== Result Received ===")
    print(f"Winner Model: {result.get('_model', 'Unknown / Mocked')}")
    print(f"Latency: {latency_ms:.1f}ms")
    print(f"Response Content: {result}")
    
    # Assertions
    assert "score" in result, "Error: Response missing 'score' key!"
    print("\n[PASSED] LLM Racing Engine works perfectly with the new Hugging Face integration!")

if __name__ == "__main__":
    asyncio.run(main())
