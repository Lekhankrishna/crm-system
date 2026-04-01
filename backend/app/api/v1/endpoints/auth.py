from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.models.models import User, UserSession
from app.schemas.schemas import LoginRequest, TokenResponse
from app.api.v1.deps import get_current_user

router = APIRouter()

IST = timezone(timedelta(hours=5, minutes=30))

def now_ist():
    return datetime.now(IST)

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    # Close any existing active sessions
    db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.is_active == True).update(
        {"is_active": False, "logout_time": now_ist()}
    )

    # Create new session
    session = UserSession(
        user_id=user.id,
        ip_address=request.client.host if request.client else "unknown",
        login_time=now_ist()
    )
    db.add(session)
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role.value, "session_id": session.id})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "name": user.name, "email": user.email, "role": user.role.value}
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({"is_active": False, "logout_time": now_ist()})
    db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "phone": current_user.phone
    }