# services/llm_service.py
import json
import hashlib
from openai import OpenAI
from config import settings

# NVIDIA NIM Endpoint & Model — 8B is 5-8x faster than 70B for structured JSON tasks
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
NIM_MODEL = "meta/llama-3.1-8b-instruct"

# Security: validate key exists before creating client
if not settings.NVIDIA_NIM_API_KEY:
    print("WARNING: NVIDIA_NIM_API_KEY is not set. AI features will return fallback responses.")
    client = None
else:
    client = OpenAI(
        api_key=settings.NVIDIA_NIM_API_KEY,
        base_url=NIM_BASE_URL,
        timeout=10.0  # Fast timeout — fail quickly, fall back to heuristics
    )

# ── In-memory LLM response cache ──────────────────────────────
# Keyed on hash of (system_prompt + user_prompt) → parsed JSON dict
_llm_cache: dict[str, dict] = {}
_MAX_CACHE_SIZE = 100

def _cache_key(system_prompt: str, user_prompt: str) -> str:
    """Create a deterministic cache key from the prompts."""
    raw = (system_prompt + "|||" + user_prompt).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def prompt_nim(system_prompt: str, user_prompt: str, use_cache: bool = True) -> dict:
    """
    Sends a prompt to NVIDIA NIM LLM expecting a structured JSON response.
    Returns the parsed JSON dict. Uses a robust Mocking Engine if API is unavailable.
    Includes in-memory caching to avoid redundant API calls.
    """
    # Check cache first
    if use_cache:
        key = _cache_key(system_prompt, user_prompt)
        if key in _llm_cache:
            return _llm_cache[key].copy()

    # Check for environmental override or missing client
    FORCE_MOCK = getattr(settings, "MOCK_AI", False)
    
    if client is None or FORCE_MOCK:
        # RETURN REALISTIC MOCK DATA (Heuristic Engine)
        result = _generate_mock_fallback(system_prompt, user_prompt)
        if use_cache:
            _cache_result(key, result)
        return result
    
    try:
        completion = client.chat.completions.create(
            model=NIM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=800  # JSON responses are ~300-500 tokens, 800 is ample
        )
        response_text = completion.choices[0].message.content.strip()
        # Strip markdown code fences robustly (```json, ``` json, or plain ```)
        if "```" in response_text:
            parts = response_text.split("```")
            if len(parts) >= 3:
                inner = parts[1]
                if inner.lower().startswith("json"):
                    inner = inner[4:]
                response_text = inner.strip()
            else:
                response_text = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(response_text)
        if use_cache:
            _cache_result(key, result)
        return result
    except json.JSONDecodeError as e:
        print(f"JSON parse error from NVIDIA NIM: {e}. Falling back to Mock Engine.")
        return _generate_mock_fallback(system_prompt, user_prompt, error=str(e))
    except Exception as e:
        print(f"Error querying NVIDIA NIM API: {e}. Falling back to Mock Engine.")
        return _generate_mock_fallback(system_prompt, user_prompt, error=str(e))


def _cache_result(key: str, result: dict):
    """Store result in LRU-style cache with size limit."""
    global _llm_cache
    if len(_llm_cache) >= _MAX_CACHE_SIZE:
        # Evict oldest entry (first inserted)
        oldest_key = next(iter(_llm_cache))
        del _llm_cache[oldest_key]
    _llm_cache[key] = result.copy()


def _generate_mock_fallback(sys: str, user: str, error: str = None) -> dict:
    """
    Simulates high-quality LLM output for ATS and Matching flows.
    Ensures the demo remains functional even without connectivity.
    """
    import random
    
    # Identify context (ATS Scan vs Matcher)
    is_ats = "ATS" in sys or "compliance" in sys
    
    if is_ats:
        score = random.randint(72, 89)
        return {
            "score": score,
            "candidate_name": "Candidate",
            "breakdown": [
                {"type": "success", "message": "Contact information is correctly formatted and parsed."},
                {"type": "success", "message": "Standard structural headers (Education, Experience) detected."},
                {"type": "warning", "message": "Limited quantifiable metrics found in recent job roles."},
                {"type": "warning", "message": "Word count is slightly below the optimal range for this seniority level."},
                {"type": "success", "message": "File parsing clarity is high with minimal OCR noise."}
            ],
            "mocked": True,
            "api_error": error
        }
    else:
        # Matcher fallback
        score = random.randint(68, 92)
        return {
            "semantic_score": score + 2.4,
            "keyword_coverage": score - 4.1,
            "final_score": score,
            "matched_keywords": ["Python", "Problem Solving", "Teamwork", "Agile", "SQL"],
            "missing_keywords": ["Kubernetes", "Redis", "Cloud Architecture"],
            "extra_keywords": ["Project Management", "UI Design"],
            "resume_keywords": ["Python", "SQL", "Agile", "Teamwork"],
            "jd_keywords": ["Python", "Kubernetes", "Redis", "SQL"],
            "mocked": True,
            "api_error": error
        }
