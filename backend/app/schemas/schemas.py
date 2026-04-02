from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.models import UserRole, CaseStatus, FeedbackCode

# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ── User ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: UserRole = UserRole.agent

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserSessionOut(BaseModel):
    id: int
    login_time: datetime
    logout_time: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True

# ── Case ──────────────────────────────────────────────────────────────────────
class CaseCreate(BaseModel):
    loan_number: str
    customer_name: str
    address: Optional[str] = None
    pincode: Optional[str] = None
    primary_phone: str
    alternate_number: Optional[str] = None
    last_payment_date: Optional[str] = None
    outstanding_amount: Optional[float] = 0.0
    pos: Optional[float] = None
    loan_amount: Optional[float] = None
    bucket: Optional[str] = None
    bank_name: Optional[str] = None

class CaseAllocate(BaseModel):
    agent_id: int
    case_ids: List[int]

class CaseOut(BaseModel):
    id: int
    loan_number: str
    customer_name: str
    address: Optional[str]
    pincode: Optional[str]
    primary_phone: str
    alternate_number: Optional[str]
    last_payment_date: Optional[str]
    outstanding_amount: float
    pos: Optional[float]
    loan_amount: Optional[float]
    bucket: Optional[str]
    bank_name: Optional[str]
    status: CaseStatus
    agent_id: Optional[int]
    allocated_at: Optional[datetime]
    follow_up_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class CaseDetail(CaseOut):
    agent: Optional[UserOut]
    call_logs: List["CallLogOut"] = []
    tracing_data: List["TracingDataOut"] = []

# ── Call Log ──────────────────────────────────────────────────────────────────
class CallLogCreate(BaseModel):
    case_id: int
    feedback_code: FeedbackCode
    remarks: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    promise_amount: Optional[float] = None
    promise_date: Optional[datetime] = None

class CallLogOut(BaseModel):
    id: int
    case_id: int
    agent_id: int
    feedback_code: FeedbackCode
    remarks: Optional[str]
    follow_up_date: Optional[datetime]
    promise_amount: Optional[float]
    promise_date: Optional[datetime]
    called_at: datetime
    agent: Optional[UserOut]

    class Config:
        from_attributes = True

# ── Tracing ───────────────────────────────────────────────────────────────────
class TracingDataCreate(BaseModel):
    case_id: int
    data_type: str
    value: str
    source: str = "self-traced"
    is_verified: bool = False

class TracingDataOut(BaseModel):
    id: int
    case_id: int
    data_type: str
    value: str
    source: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── Notification ──────────────────────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── Dashboard Stats ───────────────────────────────────────────────────────────
class AgentStats(BaseModel):
    agent: UserOut
    total_cases: int
    calls_today: int
    cases_closed: int
    ptp_count: int
    rtp_count: int
    last_login: Optional[datetime]
    is_online: bool

class DashboardStats(BaseModel):
    total_cases: int
    total_agents: int
    cases_today: int
    calls_today: int
    closed_cases: int
    ptp_cases: int
    outstanding_total: float

CaseDetail.model_rebuild()