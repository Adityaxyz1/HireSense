"""Quick smoke test — calls prompt_nim() and measures response time."""
import sys, time
sys.path.insert(0, '.')
from services.llm_service import prompt_nim

print("Testing prompt_nim() with a simple ATS prompt...")
t0 = time.perf_counter()

result = prompt_nim(
    "You are an ATS analyzer. Return JSON: {\"score\": <0-100>, \"status\": \"ok\"}",
    "Resume: Python developer with 3 years experience in Django, Flask, REST APIs.",
    use_cache=False  # Force live API call
)

elapsed = time.perf_counter() - t0
print(f"\nResult: {result}")
print(f"Time: {elapsed:.1f}s")
print(f"Model: {result.get('_model', 'mock')}")
print(f"Mocked: {result.get('mocked', False)}")
