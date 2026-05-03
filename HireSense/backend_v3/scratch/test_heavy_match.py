# scratch/test_heavy_match.py
import asyncio
import time
import sys
import os

# Add parent dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.llm_service import prompt_nim_async

async def main():
    print("Testing HEAVY match prompt (simulating 6000 chars context)...")

    # Large context simulation
    resume = "John Doe, Senior Software Engineer. Experience: 10 years at Google, Meta, Amazon. Skills: Python, Java, AWS, React, Distributed Systems..." * 10
    jd = "Senior Software Engineer. Requirements: 8+ years experience, expert Python, cloud infra, scalable systems..." * 10

    sys_p = "You are an expert recruiter. Compare the resume to the JD and return JSON with scores."
    user_p = f"Resume:\n{resume}\n\nJD:\n{jd}\n\nReturn JSON fit analysis."

    t0 = time.perf_counter()
    res = await prompt_nim_async(sys_p, user_p, use_cache=False)
    elapsed = time.perf_counter() - t0

    print(f"\nFinal Result: {res}")
    print(f"Total Time: {elapsed:.2f}s")
    print(f"Model Winner: {res.get('_model', 'Unknown')}")
    print(f"Latency reported: {res.get('_latency_ms', 0)}ms")

if __name__ == "__main__":
    asyncio.run(main())
