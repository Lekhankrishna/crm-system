from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from app.db.session import get_db
from app.models.models import User, Case, CallLog, UserSession, UserRole, CaseStatus
from app.api.v1.deps import get_current_user, require_admin_or_above

router = APIRouter()

IST = ZoneInfo("Asia/Kolkata")

def utc_to_ist(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)

def ist_now():
    return datetime.now(IST)

def ist_today():
    return ist_now().date()

def fmt_ist(dt):
    if dt is None:
        return None
    return utc_to_ist(dt).strftime("%d %b %Y, %I:%M %p")

TRACKED = ["NC", "WN", "RTP", "PT", "RNR"]

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    today = ist_today()
    total_cases = db.query(Case).count()
    total_agents = db.query(User).filter(User.role == UserRole.agent, User.is_active == True).count()
    calls_today = db.query(CallLog).filter(func.date(CallLog.called_at) == today).count()
    cases_closed = db.query(Case).filter(Case.status == CaseStatus.closed).count()
    ptp_cases = db.query(Case).filter(Case.status == CaseStatus.ptp).count()
    unallocated = db.query(Case).filter(Case.agent_id == None).count()
    outstanding = db.query(func.sum(Case.outstanding_amount)).scalar() or 0
    cutoff_utc = (datetime.now(timezone.utc) - timedelta(minutes=30)).replace(tzinfo=None)
    online_agents = db.query(UserSession).filter(UserSession.is_active == True, UserSession.login_time >= cutoff_utc).count()
    weekly_data = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = db.query(CallLog).filter(func.date(CallLog.called_at) == d).count()
        weekly_data.append({"date": d.strftime("%d %b"), "calls": count})
    feedback_dist = db.query(CallLog.feedback_code, func.count(CallLog.id)).group_by(CallLog.feedback_code).all()
    return {
        "total_cases": total_cases, "total_agents": total_agents,
        "calls_today": calls_today, "cases_closed": cases_closed,
        "ptp_cases": ptp_cases, "unallocated": unallocated,
        "outstanding_total": round(outstanding, 2), "online_agents": online_agents,
        "weekly_calls": weekly_data,
        "feedback_distribution": [{"code": f.value, "count": c} for f, c in feedback_dist]
    }

@router.get("/agents")
def get_agent_stats(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    today = ist_today()
    agents = db.query(User).filter(User.role == UserRole.agent).all()
    cutoff_utc = (datetime.now(timezone.utc) - timedelta(minutes=30)).replace(tzinfo=None)
    stats = []
    for agent in agents:
        total_cases = db.query(Case).filter(Case.agent_id == agent.id).count()
        calls_today = db.query(CallLog).filter(CallLog.agent_id == agent.id, func.date(CallLog.called_at) == today).count()
        calls_total = db.query(CallLog).filter(CallLog.agent_id == agent.id).count()
        cases_closed = db.query(Case).filter(Case.agent_id == agent.id, Case.status == CaseStatus.closed).count()
        ptp_count = db.query(Case).filter(Case.agent_id == agent.id, Case.status == CaseStatus.ptp).count()
        rtp_count = db.query(Case).filter(Case.agent_id == agent.id, Case.status == CaseStatus.rtp).count()
        fb_rows = db.query(CallLog.feedback_code, func.count(CallLog.id)).filter(CallLog.agent_id == agent.id).group_by(CallLog.feedback_code).all()
        feedback_counts = {f.value: c for f, c in fb_rows}
        fb_today_rows = db.query(CallLog.feedback_code, func.count(CallLog.id)).filter(CallLog.agent_id == agent.id, func.date(CallLog.called_at) == today).group_by(CallLog.feedback_code).all()
        feedback_today = {f.value: c for f, c in fb_today_rows}
        latest_call = db.query(CallLog).filter(CallLog.agent_id == agent.id).order_by(CallLog.called_at.desc()).first()
        last_session = db.query(UserSession).filter(UserSession.user_id == agent.id).order_by(UserSession.login_time.desc()).first()
        is_online = bool(last_session and last_session.is_active and last_session.login_time >= cutoff_utc)
        stats.append({
            "agent": {"id": agent.id, "name": agent.name, "email": agent.email, "phone": agent.phone, "role": agent.role.value, "is_active": agent.is_active, "created_at": agent.created_at},
            "total_cases": total_cases, "calls_today": calls_today, "calls_total": calls_total,
            "cases_closed": cases_closed, "ptp_count": ptp_count, "rtp_count": rtp_count,
            "is_online": is_online,
            "last_login_ist": fmt_ist(last_session.login_time) if last_session else None,
            "last_logout_ist": fmt_ist(last_session.logout_time) if last_session else None,
            "last_login_raw": last_session.login_time.isoformat() if last_session else None,
            "last_logout_raw": last_session.logout_time.isoformat() if last_session else None,
            "feedback_counts": {code: feedback_counts.get(code, 0) for code in TRACKED},
            "feedback_today": {code: feedback_today.get(code, 0) for code in TRACKED},
            "latest_remark": latest_call.remarks if latest_call else None,
            "latest_feedback": latest_call.feedback_code.value if latest_call else None,
            "latest_call_at": fmt_ist(latest_call.called_at) if latest_call else None,
        })
    return stats

@router.get("/agent/{agent_id}/activity")
def get_agent_activity(agent_id: int, days: int = 14, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    today = ist_today()
    activity = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        calls = db.query(CallLog).filter(CallLog.agent_id == agent_id, func.date(CallLog.called_at) == d).count()
        fb_rows = db.query(CallLog.feedback_code, func.count(CallLog.id)).filter(CallLog.agent_id == agent_id, func.date(CallLog.called_at) == d).group_by(CallLog.feedback_code).all()
        feedback = {f.value: c for f, c in fb_rows}
        sessions = db.query(UserSession).filter(UserSession.user_id == agent_id, func.date(UserSession.login_time) == d).order_by(UserSession.login_time).all()
        login_ist = fmt_ist(sessions[0].login_time) if sessions else None
        logout_ist = fmt_ist(sessions[-1].logout_time) if sessions else None
        duration_mins = None
        if sessions:
            login_dt = utc_to_ist(sessions[0].login_time)
            logout_dt = utc_to_ist(sessions[-1].logout_time) if sessions[-1].logout_time else ist_now()
            duration_mins = int((logout_dt - login_dt).total_seconds() / 60)
        activity.append({
            "date": d.strftime("%d %b"), "date_full": d.strftime("%d %b %Y"),
            "calls": calls, "login_ist": login_ist, "logout_ist": logout_ist,
            "duration_mins": duration_mins,
            "feedback": {code: feedback.get(code, 0) for code in TRACKED},
        })
    return activity

@router.get("/agent/{agent_id}/call-logs")
def get_agent_call_logs(agent_id: int, limit: int = 200, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    logs = db.query(CallLog).filter(CallLog.agent_id == agent_id).order_by(CallLog.called_at.desc()).limit(limit).all()
    result = []
    for log in logs:
        case = db.query(Case).filter(Case.id == log.case_id).first()
        result.append({
            "id": log.id,
            "customer_name": case.customer_name if case else "—",
            "loan_number": case.loan_number if case else "—",
            "phone": case.primary_phone if case else "—",
            "feedback_code": log.feedback_code.value,
            "remarks": log.remarks or "",
            "follow_up_date": log.follow_up_date.isoformat() if log.follow_up_date else None,
            "promise_amount": log.promise_amount,
            "called_at_ist": fmt_ist(log.called_at),
        })
    return result

@router.get("/follow-ups")
def get_follow_ups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = ist_today()
    q = db.query(Case).filter(Case.follow_up_date != None, func.date(Case.follow_up_date) <= today, Case.status.in_([CaseStatus.follow_up, CaseStatus.ptp]))
    if current_user.role == UserRole.agent:
        q = q.filter(Case.agent_id == current_user.id)
    return q.order_by(Case.follow_up_date).limit(50).all()