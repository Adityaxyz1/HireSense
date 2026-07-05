import re

# Power verbs to replace weak verbs
WEAK_TO_STRONG = {
    "worked on": "engineered",
    "worked with": "collaborated with",
    "helped": "facilitated",
    "made": "developed",
    "did": "executed",
    "was responsible for": "spearheaded",
    "handled": "managed",
    "used": "leveraged",
    "built": "architected",
    "fixed": "resolved",
    "improved": "optimized",
    "managed": "directed",
    "created": "designed and implemented",
    "wrote": "authored",
    "tested": "validated",
    "set up": "established",
    "looked at": "analyzed",
    "got": "achieved",
    "ran": "orchestrated",
    "started": "initiated",
    "changed": "transformed",
    "added": "integrated",
    "moved": "migrated",
    "found": "identified",
    "talked to": "consulted with",
}

# ATS-friendly enhancements
ENHANCEMENT_PHRASES = {
    "team": "cross-functional team",
    "project": "high-impact project",
    "app": "production-grade application",
    "website": "web platform",
    "code": "scalable codebase",
    "bug": "critical defect",
    "bugs": "critical defects",
    "feature": "key feature",
    "database": "database infrastructure",
    "server": "server infrastructure",
    "api": "RESTful API",
    "ui": "user interface",
    "ux": "user experience",
    "speed": "performance",
    "fast": "high-performance",
}


def rewrite_text(original_text: str, mode: str = "ats") -> dict:
    """
    Rewrites resume text using heuristic-based improvements.
    
    Modes:
    - 'ats': ATS-optimized (keyword density, action verbs)
    - 'impact': Impact-focused (quantification, results-oriented)
    - 'technical': Technical depth (specificity, tech terminology)
    """
    text = original_text.strip()
    if not text:
        return {"rewritten": "", "changes": [], "score_before": 0, "score_after": 0}

    changes = []
    rewritten = text

    # 1. Replace weak verbs with power verbs
    for weak, strong in WEAK_TO_STRONG.items():
        pattern = re.compile(re.escape(weak), re.IGNORECASE)
        if pattern.search(rewritten):
            rewritten = pattern.sub(strong, rewritten)
            changes.append(f"Replaced '{weak}' → '{strong}'")

    # 2. Mode-specific enhancements
    if mode == "ats":
        # Enhance generic terms
        for generic, enhanced in ENHANCEMENT_PHRASES.items():
            pattern = re.compile(r'\b' + re.escape(generic) + r'\b', re.IGNORECASE)
            if pattern.search(rewritten) and enhanced.lower() not in rewritten.lower():
                rewritten = pattern.sub(enhanced, rewritten, count=1)
                changes.append(f"Enhanced '{generic}' → '{enhanced}'")

    elif mode == "impact":
        # Add quantification hints
        sentences = rewritten.split('.')
        enhanced_sentences = []
        for s in sentences:
            s = s.strip()
            if s and not re.search(r'\d+%|\d+ ', s):
                # Suggest adding metrics where none exist
                if any(word in s.lower() for word in ['increase', 'improve', 'reduce', 'grow', 'boost', 'optimized']):
                    s = s.rstrip() + " (quantify with specific metrics)"
                    changes.append("Flagged sentence for quantification")
            enhanced_sentences.append(s)
        rewritten = '. '.join(enhanced_sentences)

    elif mode == "technical":
        # Make technical terms more specific
        tech_upgrades = {
            "frontend": "frontend (React/TypeScript)",
            "backend": "backend (Python/FastAPI)",
            "cloud": "cloud infrastructure (AWS/GCP)",
            "machine learning": "machine learning (TensorFlow/PyTorch)",
            "data": "data engineering",
        }
        for generic, specific in tech_upgrades.items():
            pattern = re.compile(r'\b' + re.escape(generic) + r'\b', re.IGNORECASE)
            if pattern.search(rewritten) and specific.lower() not in rewritten.lower():
                rewritten = pattern.sub(specific, rewritten, count=1)
                changes.append(f"Added specificity: '{generic}' → '{specific}'")

    # 3. Capitalize first letter of each sentence
    rewritten = '. '.join(s.strip().capitalize() if s.strip() else s for s in rewritten.split('.'))

    # 4. Score before/after (simple heuristic)
    score_before = _score_text(original_text)
    score_after = _score_text(rewritten)

    return {
        "rewritten": rewritten.strip(),
        "changes": changes,
        "score_before": score_before,
        "score_after": score_after,
        "mode": mode
    }


def _score_text(text: str) -> int:
    """Simple resume quality score (0-100)."""
    score = 40  # base

    # Action verbs boost
    strong_verbs = ["engineered", "spearheaded", "architected", "optimized", "facilitated",
                    "developed", "designed", "implemented", "managed", "led", "directed",
                    "resolved", "leveraged", "orchestrated", "established"]
    for v in strong_verbs:
        if v in text.lower():
            score += 3

    # Numbers/metrics boost
    metrics = len(re.findall(r'\d+%|\$\d+|\d+\+', text))
    score += metrics * 5

    # Length penalty (too short or too long)
    words = len(text.split())
    if words > 50:
        score += 10
    if words > 150:
        score += 5

    # Weak verb penalty
    for weak in WEAK_TO_STRONG.keys():
        if weak in text.lower():
            score -= 2

    return max(0, min(100, score))
