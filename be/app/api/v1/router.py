from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.meeting_intelligence import router as meeting_intelligence_router
from app.api.v1.meetings import router as meetings_router
from app.api.v1.media import router as media_router
from app.api.v1.projects import router as projects_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(media_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(meeting_intelligence_router)
api_v1_router.include_router(meetings_router)
