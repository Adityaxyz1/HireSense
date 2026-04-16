import re

def extract_years(text: str) -> int:
    """Regex based heuristic to find total years of experience."""
    matches = re.findall(r'(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:experience|exp)', text.lower())
    if matches:
         return max([int(m) for m in matches])
    return 0

def calculate_experience_score(resume_text: str, jd_text: str) -> float:
    """Calculates score based on years of experience matched to JD."""
    resume_exp = extract_years(resume_text)
    jd_exp = extract_years(jd_text) or 3 # default required to 3
    
    # Simple algorithm
    if resume_exp >= jd_exp:
        return 1.0
    elif resume_exp == 0:
        return 0.2
    
    return resume_exp / jd_exp
