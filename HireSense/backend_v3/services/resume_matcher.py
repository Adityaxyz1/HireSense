# services/resume_matcher.py
"""
Resume ↔ JD matcher utilizing NVIDIA NIM LLM.
Optimized with truncated input and streamlined prompt.
"""

from services.llm_service import prompt_nim_async
import json

async def match_resume_to_jd(resume_text: str, jd_text: str) -> dict:
    """
    Full analysis: semantic score, keyword coverage, and final matched score.
    """
    if not resume_text.strip() or not jd_text.strip():
        return {
            "semantic_score": 0, "keyword_coverage": 0, "final_score": 0,
            "matched_keywords": [], "missing_keywords": [], "extra_keywords": [],
            "resume_keywords": [], "jd_keywords": []
        }

    system_prompt = '''You are an expert AI recruiting engine. Compare the resume against the job description.
Think carefully about semantic fit and keyword alignment, then respond ONLY with valid JSON (no explanation, no markdown fences):
{"semantic_score":<0-100>,"keyword_coverage":<0-100>,"final_score":<0-100>,"matched_keywords":[...],"missing_keywords":[...],"extra_keywords":[...],"resume_keywords":[...],"jd_keywords":[...]}
Limit keyword arrays to 3-5 items each for brevity.'''

    # Optimized truncation for maximum speed
    user_prompt = f"Resume:\n{resume_text[:2000]}\n\nJob Description:\n{jd_text[:2000]}\n\nReturn the fit analysis JSON."
    
    # Direct await of the async engine
    response = await prompt_nim_async(system_prompt, user_prompt)
    
    # Handle failures — when the LLM is unavailable (all racers failed or no
    # API keys), DO NOT return the fabricated random scores from the mock
    # fallback. Return a zeroed, explicitly-degraded result so callers can
    # surface "temporarily unavailable" instead of persisting fake numbers.
    if "error" in response or response.get("mocked"):
        return {
            "semantic_score": 0, "keyword_coverage": 0, "final_score": 0,
            "matched_keywords": [], "missing_keywords": [], "extra_keywords": [],
            "resume_keywords": [], "jd_keywords": [],
            "degraded": True,
        }

    return response
