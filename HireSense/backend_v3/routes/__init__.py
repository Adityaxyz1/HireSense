from fastapi import APIRouter
from routes.resume import router as resume_router
from routes.job import router as job_router
from routes.evaluate import router as evaluate_router
from routes.rewrite import router as rewrite_router
from routes.chat import router as chat_router
from routes.match import router as match_router
from routes.auth import router as auth_router
from routes.profile import router as profile_router
from routes.admin import router as admin_router
from routes.applications import router as applications_router
from routes.student import router as student_router

api_router = APIRouter()

api_router.include_router(auth_router, tags=["Auth"])
api_router.include_router(profile_router, tags=["Profile"])
api_router.include_router(student_router, tags=["Student"])
api_router.include_router(applications_router, tags=["Applications"])
api_router.include_router(resume_router, tags=["Resume"])
api_router.include_router(job_router, tags=["Job"])
api_router.include_router(evaluate_router, tags=["Evaluation"])
api_router.include_router(match_router, tags=["Match"])
api_router.include_router(rewrite_router, tags=["Rewrite"])
api_router.include_router(chat_router, tags=["Chat"])
api_router.include_router(admin_router, tags=["Admin"])
