from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core.security import get_password_hash
from app.models.models import User, UserSession, UserRole
from app.schemas.schemas import UserCreate, UserUpdate, UserOut, UserSessionOut
from app.api.v1.deps import get_current_user, require_super_admin, require_admin_or_above

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    if current_user.role == UserRole.admin and payload.role != UserRole.agent:
        raise HTTPException(status_code=403, detail="Admins can only create agents")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        created_by=current_user.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=List[UserOut])
def list_users(role: str = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if current_user.role == UserRole.admin:
        q = q.filter(User.role == UserRole.agent)
    return q.order_by(User.name).all()

@router.get("/agents", response_model=List[UserOut])
def list_agents(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    return db.query(User).filter(User.role == UserRole.agent, User.is_active == True).all()

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}

@router.get("/{user_id}/sessions", response_model=List[UserSessionOut])
def get_user_sessions(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    return db.query(UserSession).filter(UserSession.user_id == user_id).order_by(UserSession.login_time.desc()).limit(30).all()
