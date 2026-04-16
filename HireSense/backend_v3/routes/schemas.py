from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, List

class UploadResponse(BaseModel):
    resume_id: str
    status: str

class JobUploadResponse(BaseModel):
    job_id: str

class JobUploadRequest(BaseModel):
    job_text: str
    title: Optional[str] = None

class EvaluateRequest(BaseModel):
    resume_id: str
    job_id: str
    fair_mode: bool = False

class SkillDetail(BaseModel):
    name: str
    tier: str  # "high", "mid", "low"
    mentions: int

class EvaluateResponse(BaseModel):
    match_percentage: float
    resume_strength: int
    skill_overlap: float
    risk_level: str
    semantic_score: float
    experience_score: float
    fair_mode_enabled: bool
    bias_audit: Optional[Any] = None
    skills_found: List[SkillDetail] = []
