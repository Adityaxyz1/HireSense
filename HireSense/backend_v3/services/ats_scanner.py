from typing import Dict, Any, Optional
from services.llm_service import prompt_nim
import json
import re

def extract_candidate_name(resume_text: str) -> Optional[str]:
    """Fast regex extraction of candidate name from first few lines."""
    lines = resume_text.strip().split('\n')[:5]
    for line in lines:
        line = line.strip()
        # Skip empty, email, phone, url lines
        if not line or '@' in line or re.search(r'\d{3}[\-\.\s]?\d{3}', line):
            continue
        if re.match(r'^https?://', line) or re.match(r'^www\.', line):
            continue
        # Likely a name if it's 2-4 words, all alpha
        words = line.split()
        if 2 <= len(words) <= 4 and all(w.isalpha() or w == '.' for w in words):
            return line
    return None


def _heuristic_ats_score(resume_text: str) -> Dict[str, Any]:
    """
    Fast local heuristic ATS analysis — no LLM needed.
    Used as fallback when LLM is slow/unavailable, AND as a speed boost.
    """
    text = resume_text.strip()
    breakdown = []
    score = 0

    # 1. Contact Info (20 pts)
    has_email = bool(re.search(r'[\w\.\+\-]+@[\w\-]+\.[\w\.\-]+', text))
    has_phone = bool(re.search(r'[\+]?[\d\s\-\(\)]{7,15}', text))
    contact_pts = 0
    if has_email: contact_pts += 10
    if has_phone: contact_pts += 10
    score += contact_pts
    if contact_pts >= 15:
        breakdown.append({"type": "success", "message": "Contact information (email/phone) is present and clearly formatted."})
    elif contact_pts > 0:
        breakdown.append({"type": "warning", "message": "Partial contact info found — ensure both email and phone are included."})
    else:
        breakdown.append({"type": "critical", "message": "No contact information detected. Add email and phone number."})

    # 2. Section Headers (20 pts)
    headers_found = 0
    for h in ['experience', 'education', 'skills', 'projects', 'summary', 'objective', 'certifications', 'work history', 'professional']:
        if re.search(r'\b' + h + r'\b', text.lower()):
            headers_found += 1
    header_pts = min(20, headers_found * 5)
    score += header_pts
    if header_pts >= 15:
        breakdown.append({"type": "success", "message": f"Standard section headers detected ({headers_found} sections found)."})
    elif header_pts > 0:
        breakdown.append({"type": "warning", "message": f"Only {headers_found} standard sections found. Consider adding Experience, Education, Skills."})
    else:
        breakdown.append({"type": "critical", "message": "No standard section headers found. ATS systems rely on these for parsing."})

    # 3. Action Metrics (20 pts)
    metrics_count = len(re.findall(r'\d+%|\$[\d,]+|\d+\+?\s*(?:years|clients|projects|team|members)', text.lower()))
    action_verbs = len(re.findall(r'\b(?:led|managed|developed|designed|implemented|achieved|increased|reduced|improved|delivered|launched|created|built|optimized)\b', text.lower()))
    action_pts = min(20, (metrics_count * 3) + (action_verbs * 2))
    score += action_pts
    if action_pts >= 15:
        breakdown.append({"type": "success", "message": f"Strong use of quantifiable metrics and action verbs ({metrics_count} metrics, {action_verbs} action verbs)."})
    elif action_pts > 0:
        breakdown.append({"type": "warning", "message": f"Limited quantifiable metrics ({metrics_count} found). Add more numbers and percentages to demonstrate impact."})
    else:
        breakdown.append({"type": "critical", "message": "No quantifiable metrics or action verbs detected. This significantly reduces ATS scoring."})

    # 4. Word Count (20 pts)
    words = len(text.split())
    if 300 <= words <= 1200:
        word_pts = 20
        breakdown.append({"type": "success", "message": f"Word count ({words} words) is within the optimal range for ATS parsing."})
    elif 200 <= words < 300 or 1200 < words <= 1500:
        word_pts = 12
        breakdown.append({"type": "warning", "message": f"Word count ({words} words) is slightly outside the optimal 300-1200 range."})
    else:
        word_pts = 5
        breakdown.append({"type": "critical", "message": f"Word count ({words} words) is {'too low' if words < 200 else 'too high'} for effective ATS parsing."})
    score += word_pts

    # 5. Formatting (20 pts)
    has_bullets = bool(re.search(r'[•\-\*]', text))
    line_count = len(text.split('\n'))
    has_reasonable_lines = 10 < line_count < 200
    fmt_pts = 0
    if has_bullets: fmt_pts += 10
    if has_reasonable_lines: fmt_pts += 10
    score += fmt_pts
    if fmt_pts >= 15:
        breakdown.append({"type": "success", "message": "Document formatting is clean with proper structure and bullet points."})
    elif fmt_pts > 0:
        breakdown.append({"type": "warning", "message": "Formatting could be improved — use consistent bullet points and clear line breaks."})
    else:
        breakdown.append({"type": "critical", "message": "Formatting issues detected — document may not parse correctly in ATS systems."})

    name = extract_candidate_name(resume_text)

    return {
        "score": min(100, score),
        "candidate_name": name,
        "breakdown": breakdown,
    }


def scan_ats_compliance(resume_text: str, magical_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluates a resume's text against standard ATS compliance norms.
    Uses fast local heuristics first, then enhances with LLM if available.
    Returns an overall score out of 100, and a breakdown of findings.
    """
    if not resume_text or not resume_text.strip():
        return {"score": 0, "candidate_name": None, "breakdown": [{"type": "critical", "message": "No text found to analyze."}]}

    # FAST PATH: Always compute heuristic score first (< 50ms)
    heuristic_result = _heuristic_ats_score(resume_text)

    # Try LLM enhancement (with tight timeout via llm_service)
    system_prompt = '''You are an ATS compliance analyzer. Assess ATS readiness from resume text.
Respond ONLY with valid JSON:
{"score":<0-100>,"candidate_name":"<name or null>","breakdown":[{"type":"success|warning|critical","message":"..."}]}
Cover exactly 5 points: 1) Contact Info 2) Section Headers 3) Action Metrics 4) Word Count 5) Formatting.'''

    # Truncate aggressively — 3000 chars is enough for ATS analysis
    user_prompt = f"Resume:\n{resume_text[:3000]}\nReturn the ATS JSON report."
    
    response = prompt_nim(system_prompt, user_prompt)
    
    # If LLM returned valid data, use it (it's higher quality)
    if response and "error" not in response and response.get("score", 0) > 0:
        # Prefer LLM candidate name if available
        if not response.get("candidate_name"):
            response["candidate_name"] = heuristic_result.get("candidate_name")
        if "breakdown" not in response or not response["breakdown"]:
            response["breakdown"] = heuristic_result["breakdown"]
        return response

    # Otherwise return the fast heuristic result
    return heuristic_result
