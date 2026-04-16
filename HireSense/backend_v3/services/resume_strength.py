import re

def compute_strength(text: str) -> int:
    """
    Computes an arbitrary overall resume strength score between 0-100
    based on length, structure, and presence of numbers (metrics).
    """
    score = 50 # Base score

    # Length heuristics
    words = len(re.split(r'\s+', text))
    if words > 300: score += 10
    if words > 600: score += 10
    
    # Presence of impact numbers
    metrics = len(re.findall(r'\b\d+%\b', text))
    score += (metrics * 5)
    
    return min(100, score)
