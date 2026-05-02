from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.db.session import engine, Base
from app.models import models  # noqa: ensure models are registered
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.models import User, UserRole

app = FastAPI(
    title="CRM Recovery System",
    description="Debt Recovery CRM with Super Admin, Admin and Agent roles",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://crm.sriswastikservices.com",
        "https://crm.sriswastikservices.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # Seed super admin if not exists
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "superadmin@crm.com").first()
        if not existing:
            admin = User(
                name="Super Admin",
                email="superadmin@crm.com",
                hashed_password=get_password_hash("Admin@123"),
                role=UserRole.super_admin,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Super Admin seeded: superadmin@crm.com / Admin@123")
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "CRM Recovery System API", "version": "1.0.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
