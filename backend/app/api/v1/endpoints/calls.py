from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from app.db.session import get_db
from app.models.models import User, Case, CallLog, TracingData, CaseStatus, FeedbackCode, UserRole
from app.schemas.schemas import CallLogCreate, CallLogOut, TracingDataCreate, TracingDataOut
from app.api.v1.deps import get_current_user, require_admin_or_above

router = APIRouter()

# ── Call Logs ─────────────────────────────────────────────────────────────────
@router.post("/call-logs", response_model=CallLogOut)
def create_call_log(payload: CallLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == payload.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.role == UserRole.agent and case.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    log = CallLog(
        case_id=payload.case_id,
        agent_id=current_user.id,
        feedback_code=payload.feedback_code,
        remarks=payload.remarks,
        follow_up_date=payload.follow_up_date,
        promise_amount=payload.promise_amount,
        promise_date=payload.promise_date
    )
    db.add(log)

    # Update case status based on feedback
    status_map = {
        FeedbackCode.RTP: CaseStatus.rtp,
        FeedbackCode.PT: CaseStatus.ptp,
        FeedbackCode.PTP: CaseStatus.ptp,
        FeedbackCode.PAID: CaseStatus.closed,
    }
    if payload.feedback_code in status_map:
        case.status = status_map[payload.feedback_code]
    elif payload.follow_up_date:
        case.status = CaseStatus.follow_up
        case.follow_up_date = payload.follow_up_date

    db.commit()
    db.refresh(log)
    return db.query(CallLog).options(joinedload(CallLog.agent)).filter(CallLog.id == log.id).first()

@router.get("/call-logs", response_model=List[CallLogOut])
def list_call_logs(
    case_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    today_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(CallLog).options(joinedload(CallLog.agent))

    if current_user.role == UserRole.agent:
        q = q.filter(CallLog.agent_id == current_user.id)
    elif agent_id:
        q = q.filter(CallLog.agent_id == agent_id)

    if case_id:
        q = q.filter(CallLog.case_id == case_id)
    if today_only:
        q = q.filter(func.date(CallLog.called_at) == date.today())

    return q.order_by(CallLog.called_at.desc()).limit(100).all()

# ── Tracing Data ──────────────────────────────────────────────────────────────
@router.post("/tracing", response_model=TracingDataOut)
def add_tracing(payload: TracingDataCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == payload.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.role == UserRole.agent and case.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    tracing = TracingData(
        case_id=payload.case_id,
        agent_id=current_user.id,
        data_type=payload.data_type,
        value=payload.value,
        source=payload.source,
        is_verified=payload.is_verified
    )
    db.add(tracing)
    db.commit()
    db.refresh(tracing)
    return tracing

@router.get("/tracing/{case_id}", response_model=List[TracingDataOut])
def get_tracing(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(TracingData).filter(TracingData.case_id == case_id).all()
