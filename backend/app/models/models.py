from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    agent = "agent"

class CaseStatus(str, enum.Enum):
    new = "new"
    follow_up = "follow_up"
    closed = "closed"
    rtp = "rtp"
    ptp = "ptp"

class FeedbackCode(str, enum.Enum):
    NC = "NC"
    WN = "WN"
    RTP = "RTP"
    PT = "PT"
    RNR = "RNR"
    CB = "CB"
    PTP = "PTP"
    PAID = "PAID"
    DISPUTE = "DISPUTE"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20))
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.agent, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    cases = relationship("Case", back_populates="agent", foreign_keys="Case.agent_id")
    call_logs = relationship("CallLog", back_populates="agent")
    sessions = relationship("UserSession", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    login_time = Column(DateTime(timezone=True), server_default=func.now())
    logout_time = Column(DateTime(timezone=True), nullable=True)
    ip_address = Column(String(50))
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="sessions")

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    loan_number = Column(String(100), unique=True, index=True, nullable=False)
    customer_name = Column(String(150), nullable=False)
    address = Column(Text)
    pincode = Column(String(10))
    primary_phone = Column(String(20), nullable=False)
    alternate_number = Column(String(20))
    last_payment_date = Column(String(20))
    outstanding_amount = Column(Float, default=0.0)
    bucket = Column(String(20))  # DPD category
    bank_name = Column(String(100))
    status = Column(SAEnum(CaseStatus), default=CaseStatus.new)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    allocated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    allocated_at = Column(DateTime(timezone=True), nullable=True)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    agent = relationship("User", back_populates="cases", foreign_keys=[agent_id])
    call_logs = relationship("CallLog", back_populates="case")
    tracing_data = relationship("TracingData", back_populates="case")

class CallLog(Base):
    __tablename__ = "call_logs"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feedback_code = Column(SAEnum(FeedbackCode), nullable=False)
    remarks = Column(Text)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    promise_amount = Column(Float, nullable=True)
    promise_date = Column(DateTime(timezone=True), nullable=True)
    called_at = Column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case", back_populates="call_logs")
    agent = relationship("User", back_populates="call_logs")

class TracingData(Base):
    __tablename__ = "tracing_data"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    data_type = Column(String(50))  # phone, whatsapp, address, employer, etc
    value = Column(String(255))
    source = Column(String(50))  # self-traced, external, customer-provided
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case", back_populates="tracing_data")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
