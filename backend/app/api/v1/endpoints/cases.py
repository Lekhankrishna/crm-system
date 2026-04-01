from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, date
import pandas as pd
import io
from app.db.session import get_db
from app.models.models import User, Case, CallLog, CaseStatus, UserRole
from app.schemas.schemas import CaseOut, CaseDetail, CaseAllocate
from app.api.v1.deps import get_current_user, require_super_admin, require_admin_or_above

router = APIRouter()

@router.post("/upload-csv")
async def upload_cases_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_above)
):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    content = await file.read()
    try:
        if file.filename.endswith('.csv'):
            # Try different encodings
            for enc in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, dtype=str)
                    break
                except UnicodeDecodeError:
                    continue
        else:
            df = pd.read_excel(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="File is empty or has no data rows")

    # Normalize column names: strip whitespace, lowercase, replace spaces/special chars
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(r'[\s\-\.]+', '_', regex=True)
        .str.replace(r'[^a-z0-9_]', '', regex=True)
    )

    detected_cols = list(df.columns)

    # Flexible column mapping — every common variation
    column_map = {
        'loan_number': [
            'loan_number', 'loan_no', 'loanno', 'loan_num', 'loannum',
            'account_number', 'account_no', 'acc_no', 'accno',
            'case_id', 'caseid', 'case_no', 'ref_no', 'refno', 'id'
        ],
        'customer_name': [
            'customer_name', 'customer', 'name', 'borrower', 'borrower_name',
            'client_name', 'client', 'full_name', 'fullname', 'debtor', 'debtor_name'
        ],
        'primary_phone': [
            'primary_phone', 'phone', 'mobile', 'mobile_no', 'mobileno',
            'contact', 'contact_no', 'contactno', 'phone_no', 'phoneno',
            'number', 'phone_number', 'mobile_number', 'cell', 'cell_no'
        ],
        'alternate_number': [
            'alternate_number', 'alternate_phone', 'alt_phone', 'alt_no',
            'alternate_no', 'alternate', 'secondary_phone', 'other_phone',
            'phone2', 'mobile2', 'contact2'
        ],
        'address': ['address', 'addr', 'full_address', 'residential_address', 'home_address'],
        'pincode': ['pincode', 'pin_code', 'pin', 'zip', 'zipcode', 'postal_code', 'postalcode'],
        'outstanding_amount': [
            'outstanding_amount', 'outstanding', 'amount', 'balance',
            'due_amount', 'pending_amount', 'os_amount', 'os_bal',
            'overdue_amount', 'principal', 'total_due', 'dpd_amount'
        ],
        'bucket': [
            'bucket', 'dpd', 'dpd_bucket', 'days_past_due', 'dpd_range',
            'overdue_days', 'bucket_type', 'category', 'aging'
        ],
        'bank_name': [
            'bank_name', 'bank', 'lender', 'lender_name', 'financier',
            'nbfc', 'institution', 'source_bank', 'product_bank'
        ],
        'last_payment_date': [
            'last_payment_date', 'last_payment', 'lpd', 'last_paid',
            'last_paid_date', 'payment_date', 'last_emi_date'
        ],
    }

    rename_map = {}
    for field, aliases in column_map.items():
        for alias in aliases:
            if alias in df.columns and alias not in rename_map:
                rename_map[alias] = field
                break
    df = df.rename(columns=rename_map)

    # Only require loan_number and customer_name — phone is optional
    required = ['loan_number', 'customer_name']
    missing = [r for r in required if r not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Could not find required columns: {missing}. "
                   f"Your file has these columns: {detected_cols}. "
                   f"Please rename your columns to match: loan_number, customer_name, primary_phone"
        )

    created, skipped = 0, 0
    for _, row in df.iterrows():
        loan_number = str(row.get('loan_number', '') or '').strip()
        if not loan_number or loan_number.lower() in ('nan', 'none', ''):
            skipped += 1
            continue
        if db.query(Case).filter(Case.loan_number == loan_number).first():
            skipped += 1
            continue

        def safe(col):
            val = row.get(col)
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return None
            return str(val).strip() or None

        def safe_float(col):
            val = safe(col)
            if not val:
                return 0.0
            try:
                return float(str(val).replace(',', '').replace('₹', '').strip())
            except:
                return 0.0

        case = Case(
            loan_number=loan_number,
            customer_name=str(row.get('customer_name', '') or '').strip() or 'Unknown',
            primary_phone=safe('primary_phone') or '',
            alternate_number=safe('alternate_number'),
            address=safe('address'),
            pincode=safe('pincode'),
            outstanding_amount=safe_float('outstanding_amount'),
            bucket=safe('bucket'),
            bank_name=safe('bank_name'),
            last_payment_date=safe('last_payment_date'),
        )
        db.add(case)
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped, "total_rows": len(df)}

@router.post("/allocate")
def allocate_cases(payload: CaseAllocate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    agent = db.query(User).filter(User.id == payload.agent_id, User.role == UserRole.agent).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    updated = db.query(Case).filter(Case.id.in_(payload.case_ids)).update(
        {"agent_id": payload.agent_id, "allocated_by": current_user.id, "allocated_at": datetime.utcnow()},
        synchronize_session=False
    )
    db.commit()
    return {"allocated": updated, "agent": agent.name}

@router.get("/", response_model=List[CaseOut])
def list_cases(
    status: Optional[str] = None,
    agent_id: Optional[int] = None,
    bank_name: Optional[str] = None,
    bucket: Optional[str] = None,
    unallocated: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Case)

    if current_user.role == UserRole.agent:
        q = q.filter(Case.agent_id == current_user.id)
    elif agent_id:
        q = q.filter(Case.agent_id == agent_id)

    if status:
        q = q.filter(Case.status == status)
    if bank_name:
        q = q.filter(Case.bank_name.ilike(f"%{bank_name}%"))
    if bucket:
        q = q.filter(Case.bucket == bucket)
    if unallocated:
        q = q.filter(Case.agent_id == None)
    if search:
        q = q.filter(
            (Case.customer_name.ilike(f"%{search}%")) |
            (Case.loan_number.ilike(f"%{search}%")) |
            (Case.primary_phone.ilike(f"%{search}%"))
        )

    return q.order_by(Case.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/stats/summary")
def cases_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Case)
    if current_user.role == UserRole.agent:
        q = q.filter(Case.agent_id == current_user.id)

    total = q.count()
    new = q.filter(Case.status == CaseStatus.new).count()
    follow_up = q.filter(Case.status == CaseStatus.follow_up).count()
    closed = q.filter(Case.status == CaseStatus.closed).count()
    ptp = q.filter(Case.status == CaseStatus.ptp).count()
    rtp = q.filter(Case.status == CaseStatus.rtp).count()
    unallocated = db.query(Case).filter(Case.agent_id == None).count() if current_user.role != UserRole.agent else 0

    today = date.today()
    calls_today = db.query(CallLog).filter(func.date(CallLog.called_at) == today)
    if current_user.role == UserRole.agent:
        calls_today = calls_today.filter(CallLog.agent_id == current_user.id)
    calls_today_count = calls_today.count()

    return {
        "total": total, "new": new, "follow_up": follow_up,
        "closed": closed, "ptp": ptp, "rtp": rtp,
        "calls_today": calls_today_count, "unallocated": unallocated
    }

@router.get("/{case_id}", response_model=CaseDetail)
def get_case(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).options(
        joinedload(Case.agent),
        joinedload(Case.call_logs).joinedload(CallLog.agent),
        joinedload(Case.tracing_data)
    ).filter(Case.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.role == UserRole.agent and case.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return case

@router.put("/{case_id}/status")
def update_case_status(case_id: int, status: CaseStatus, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.role == UserRole.agent and case.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    case.status = status
    db.commit()
    return {"message": "Status updated"}