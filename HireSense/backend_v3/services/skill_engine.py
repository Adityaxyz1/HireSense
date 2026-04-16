import re
from typing import List, Dict, Any

# Expanded taxonomy for evaluation
TAXONOMY = [
    "python", "react", "fastapi", "sql", "postgres", "aws", "docker",
    "javascript", "node", "java", "c++", "kubernetes", "typescript",
    "html", "css", "rust", "go", "ruby", "php", "swift", "kotlin",
    "tensorflow", "pytorch", "redis", "mongodb", "graphql", "git",
    "linux", "nginx", "flask", "django", "express", "vue", "angular",
    "next.js", "tailwind", "supabase", "firebase"
]

def extract_skills(text: str) -> List[str]:
    """Basic extraction of known skills."""
    text_lower = text.lower()
    found = []
    for skill in TAXONOMY:
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found.append(skill)
    return found


def extract_skills_with_proficiency(text: str) -> List[Dict[str, Any]]:
    """Extract skills with mention count and proficiency tier."""
    text_lower = text.lower()
    results = []
    for skill in TAXONOMY:
        mentions = len(re.findall(r'\b' + re.escape(skill) + r'\b', text_lower))
        if mentions > 0:
            if mentions >= 3:
                tier = "high"
            elif mentions == 2:
                tier = "mid"
            else:
                tier = "low"
            results.append({"name": skill, "tier": tier, "mentions": mentions})
    # Sort by mentions descending
    results.sort(key=lambda x: x["mentions"], reverse=True)
    return results

def calculate_skill_overlap(resume_text: str, jd_text: str) -> float:
    """Calculates overlap ratio of skills found in JD and Resume."""
    jd_skills = set(extract_skills(jd_text))
    resume_skills = set(extract_skills(resume_text))
    
    if not jd_skills:
        return 1.0 # If JD has no skills, overlap is implicit
    
    overlap = jd_skills.intersection(resume_skills)
    return len(overlap) / len(jd_skills)
