"""Test cache + second call timing."""
import sys, time
sys.path.insert(0, '.')
from services.llm_service import prompt_nim

sys_p = "You are an ATS analyzer. Return JSON: {\"score\": <0-100>, \"status\": \"ok\"}"
usr_p = "Resume: Python developer with 3 years experience in Django, Flask, REST APIs."

# First call (live)
print("Call 1 (live API)...")
t0 = time.perf_counter()
r1 = prompt_nim(sys_p, usr_p, use_cache=True)
t1 = time.perf_counter() - t0
print(f"  Time: {t1:.3f}s | Model: {r1.get('_model', 'mock')} | Cached: {r1.get('_cached', False)}")

# Second call (should hit cache)
print("Call 2 (cache)...")
t0 = time.perf_counter()
r2 = prompt_nim(sys_p, usr_p, use_cache=True)
t2 = time.perf_counter() - t0
print(f"  Time: {t2:.6f}s | Model: {r2.get('_model', 'mock')} | Cached: {r2.get('_cached', False)}")

print(f"\nSpeedup: {t1/t2:.0f}x faster on cache hit")
