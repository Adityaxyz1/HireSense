from typing import Dict, Any

def get_risk_level(final_score: float) -> str:
    if final_score >= 0.8:
        return "Low"
    elif final_score >= 0.5:
        return "Medium"
    return "High"

def compute_final_score(semantic: float, skill: float, exp: float, strength: float, fair_mode: bool) -> float:
    """
    Weights the sub-scores into a final match score.
    Follows Graduate Project Documentation Pattern:
    - 40% Semantic Similarity
    - 30% Skill Overlap
    - 20% Experience Fit
    - 10% Resume Strength
    """
    # Normalize strength if it's 0-100 to 0.0-1.0
    s_norm = strength / 100.0 if strength > 1.0 else strength

    if fair_mode:
        # In Fair mode, we de-emphasize direct experience in favor of semantic skills
        return (semantic * 0.55) + (skill * 0.35) + (s_norm * 0.10)
    
    return (semantic * 0.40) + (skill * 0.30) + (exp * 0.20) + (s_norm * 0.10)
