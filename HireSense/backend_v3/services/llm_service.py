# services/llm_service.py
"""
Multi-Model LLM Racing Engine for HireSense (Fully Async).

Strategy:
  - Fires requests to 1–3 NVIDIA NIM models concurrently using AsyncOpenAI
  - Returns the FIRST valid JSON response (fastest wins)
  - Validates response structure before accepting
  - Falls back to heuristic mock engine if all models fail
  - In-memory cache ensures repeat prompts are instant (~0ms)
"""
import json
import time
import hashlib
import asyncio
import logging
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger("hiresense.llm")

# ── Model Registry ─────────────────────────────────────────────
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"

MODEL_REGISTRY = []

# Primary: Meta Llama 3.1 8B Instruct — fast and reliable
if settings.NVIDIA_NIM_API_KEY_DEEPSEEK: # Keep the key setting name
    MODEL_REGISTRY.append({
        "name": "Llama-3.1-8B-Primary",
        "model_id": "meta/llama-3.1-8b-instruct",
        "api_key": settings.NVIDIA_NIM_API_KEY_DEEPSEEK,
        "base_url": NIM_BASE_URL,
        "timeout": 15.0,
        "priority": 1,
    })

# Secondary: Extremely fast runner (Meta Llama 3.2 3B Instruct)
if settings.NVIDIA_NIM_API_KEY_META:
    MODEL_REGISTRY.append({
        "name": "Llama-3.2-3B-Speed",
        "model_id": "meta/llama-3.2-3b-instruct",
        "api_key": settings.NVIDIA_NIM_API_KEY_META,
        "base_url": NIM_BASE_URL,
        "timeout": 10.0,
        "priority": 2,
    })

# Tertiary: Backup runner (Meta Llama 3.2 1B Instruct)
if settings.NVIDIA_NIM_API_KEY_GEMMA:
    # Use Llama 3.2 1B as Gemma 2 9B is EOL and Gemma 3 takes too long to cold start
    MODEL_REGISTRY.append({
        "name": "Llama-3.2-1B-Speed",
        "model_id": "meta/llama-3.2-1b-instruct",
        "api_key": settings.NVIDIA_NIM_API_KEY_GEMMA,
        "base_url": NIM_BASE_URL,
        "timeout": 8.0,
        "priority": 3,
    })

# Hugging Face Serverless: Meta Llama 3.1 8B Instruct (High accuracy cloud runner)
if settings.HF_API_KEY:
    MODEL_REGISTRY.append({
        "name": "Llama-3.1-8B-HF-Serverless",
        "model_id": "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "api_key": settings.HF_API_KEY,
        "base_url": "https://api-inference.huggingface.co/v1",
        "timeout": 12.0,
        "priority": 1,
    })

# Build AsyncOpenAI clients
import httpx
_clients: dict[str, AsyncOpenAI] = {}
for _m in MODEL_REGISTRY:
    # Pass custom headers for Hugging Face to wait for model download on cold starts
    is_hf = "api-inference.huggingface.co" in _m["base_url"]
    hf_headers = {"X-Wait-For-Model": "true"} if is_hf else None
    
    # For Hugging Face, use a fast-connect timeout (1.5s) to fail-fast if DNS is blocked
    client_timeout = httpx.Timeout(_m["timeout"], connect=1.5) if is_hf else _m["timeout"]
    
    _clients[_m["name"]] = AsyncOpenAI(
        api_key=_m["api_key"],
        base_url=_m["base_url"],
        timeout=client_timeout,
        max_retries=0,  # Fast fail: do not retry slow or rate-limited NIM racers in the racing engine!
        default_headers=hf_headers
    )


_num_models = len(MODEL_REGISTRY)
print(f"[OK] LLM Racing Engine (Async): {_num_models} model(s) registered")

# ── Cache ──────────────────────────────────────────────────────
_llm_cache: dict[str, dict] = {}
_MAX_CACHE_SIZE = 200

def _cache_key(system_prompt: str, user_prompt: str) -> str:
    raw = (system_prompt + "|||" + user_prompt).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def _cache_result(key: str, result: dict):
    global _llm_cache
    if len(_llm_cache) >= _MAX_CACHE_SIZE:
        oldest_key = next(iter(_llm_cache))
        del _llm_cache[oldest_key]
    _llm_cache[key] = result.copy()

def _parse_llm_response(response_text: str) -> dict | None:
    text = response_text.strip()
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            inner = parts[1]
            if inner.lower().startswith("json"): inner = inner[4:]
            text = inner.strip()
        else:
            text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None

# ── Core Async Engine ──────────────────────────────────────────

async def _call_single_model(model_cfg: dict, sys: str, user: str) -> dict | None:
    name = model_cfg["name"]
    client = _clients.get(name)
    if not client: return None

    t0 = time.perf_counter()
    try:
        # Use low temperature for speed and consistency, and enforce strict API-level timeout
        completion = await client.chat.completions.create(
            model=model_cfg["model_id"],
            messages=[{"role": "system", "content": sys}, {"role": "user", "content": user}],
            temperature=0.01,
            max_tokens=800, # Sufficient for matching JSON
            timeout=model_cfg["timeout"],
        )

        elapsed = time.perf_counter() - t0
        raw = completion.choices[0].message.content.strip()
        result = _parse_llm_response(raw)

        if result:
            # Validate schema to ensure small models didn't hallucinate a wrong JSON format
            if "semantic_score" in result or "score" in result:
                result["_model"] = name
                result["_latency_ms"] = round(elapsed * 1000)
                print(f"  >> {name} -> {elapsed:.1f}s (winner)")
                return result
            else:
                print(f"  xx {name} -> {elapsed:.1f}s (schema invalid: {list(result.keys())[:3]})")
                return None
        return None
    except Exception as e:
        elapsed = time.perf_counter() - t0
        # Only print error if it's not a common timeout
        if "timeout" not in str(e).lower():
            print(f"  xx {name} -> {elapsed:.1f}s (error: {type(e).__name__})")
        return None

async def prompt_nim_async(system_prompt: str, user_prompt: str, use_cache: bool = True) -> dict:
    """
    Primary async interface for the racing engine.
    Returns the fastest valid response from the registered models.
    """
    key = None
    if use_cache:
        key = _cache_key(system_prompt, user_prompt)
        if key in _llm_cache:
            cached = _llm_cache[key].copy()
            cached["_cached"] = True
            return cached

    FORCE_MOCK = getattr(settings, "MOCK_AI", False)
    if not MODEL_REGISTRY or FORCE_MOCK:
        return _generate_mock_fallback(system_prompt, user_prompt)

    print(f"  [RACE] Racing {len(MODEL_REGISTRY)} models...")
    
    # Create tasks for all models
    tasks = [
        asyncio.create_task(_call_single_model(m, system_prompt, user_prompt))
        for m in MODEL_REGISTRY
    ]

    # Return first valid result using as_completed
    winner = None
    try:
        # 15s absolute cut-off for the race runner
        for completed_task in asyncio.as_completed(tasks, timeout=15):
            try:
                result = await completed_task
                if result:
                    winner = result
                    # Cancel other tasks
                    for t in tasks:
                        if not t.done(): t.cancel()
                    break
            except Exception:
                continue
    except asyncio.TimeoutError:
        print("  [WARN] Race timed out - falling back to mock")

    if winner:
        if use_cache and key: _cache_result(key, winner)
        return winner

    # All failed or timed out -> Mock fallback
    res = _generate_mock_fallback(system_prompt, user_prompt, error="All racers failed")
    if use_cache and key: _cache_result(key, res)
    return res

def prompt_nim(system_prompt: str, user_prompt: str, use_cache: bool = True) -> dict:
    """
    Sync wrapper for the async engine.
    Used for legacy sync callers.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Already in an event loop (FastAPI) — use a separate thread for the race
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, prompt_nim_async(system_prompt, user_prompt, use_cache)).result()
        else:
            return asyncio.run(prompt_nim_async(system_prompt, user_prompt, use_cache))
    except Exception:
        return asyncio.run(prompt_nim_async(system_prompt, user_prompt, use_cache))

def _generate_mock_fallback(sys: str, user: str, error: str = None) -> dict:
    import random
    is_ats = "ATS" in sys or "compliance" in sys
    if is_ats:
        return {"score": random.randint(72, 89), "candidate_name": None, "breakdown": [], "mocked": True, "api_error": error}
    else:
        score = random.randint(68, 92)
        return {"semantic_score": score + 2.4, "keyword_coverage": score - 4.1, "final_score": score, "matched_keywords": ["Python"], "missing_keywords": [], "extra_keywords": [], "resume_keywords": [], "jd_keywords": [], "mocked": True, "api_error": error}
