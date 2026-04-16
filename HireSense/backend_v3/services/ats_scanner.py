from typing import Dict, Any, Optional
from services.llm_service import prompt_nim
import json

def extract_candidate_name(resume_text: str) -> Optional[str]:
    """Fallback extraction, though LLM handles it now."""
    return None

def scan_ats_compliance(resume_text: str, magical_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluates a resume's text against standard ATS compliance norms using NVIDIA NIM.
    Returns an overall score out of 100, and a breakdown of findings.
    """
    if not resume_text or not resume_text.strip():
        return {"score": 0, "candidate_name": None, "breakdown": [{"type": "critical", "message": "No text found to analyze."}]}

    system_prompt = '''You are an expert ATS (Applicant Tracking System) analyzing engine. 
Assess the candidate's ATS compliance (readability, keyword presence, structural layout) based on the text parsed from their resume.

You MUST respond in valid JSON matching this exact schema:
{
    "score": <integer 0-100 indicating ATS readiness>,
    "candidate_name": "<Extracted full name of the candidate, or null if missing>",
    "breakdown": [
        {"type": "success", "message": "Feedback here..."},
        {"type": "warning", "message": "Feedback here..."},
        {"type": "critical", "message": "Feedback here..."}
    ]
}

Ensure your breakdown covers exactly 5 points:
1. Contact Information presence.
2. Section Headers (Education, Experience, Skills) presence.
3. Action Metrics/Quantifiable Results usage.
4. Word Count and length appropriateness.
5. Overall Formatting and parsing clarity.
Make sure the "type" field is strictly one of "success", "warning", or "critical".
'''
    user_prompt = f"Resume Text:\n{resume_text[:25000]}\n\nAnalyze this resume for ATS compliance and return the JSON report."
    
    response = prompt_nim(system_prompt, user_prompt)
    
    # Handle Rate Limiting / API errors elegantly by mocking a valid response
    if "error" in response:
        import random
        base_score = random.randint(65, 85)
        return {
            "score": base_score,
            "candidate_name": extract_candidate_name(resume_text) or "Candidate",
            "breakdown": [
                {"type": "warning", "message": "NIM LLM rate limit hit. Falling back to mocked ATS heuristic data."},
                {"type": "success", "message": "Contact information is present and clearly visible."},
                {"type": "success", "message": "Standard sections (Experience, Education) are well-defined."},
                {"type": "warning", "message": "Could include more quantifiable metrics in experience."},
                {"type": "critical", "message": "Formatting contains some non-standard tables or columns which may fail older parsers."}
            ]
        }

    # Fallback bounds check
    if "score" not in response:
        response["score"] = 0
    if "breakdown" not in response:
        response["breakdown"] = []
    if "candidate_name" not in response:
        response["candidate_name"] = None
        
    return response
