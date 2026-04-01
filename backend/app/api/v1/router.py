from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, cases, calls, analytics

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(cases.router, prefix="/cases", tags=["Cases"])
api_router.include_router(calls.router, prefix="/activity", tags=["Calls & Tracing"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
