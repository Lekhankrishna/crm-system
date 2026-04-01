# CRM Recovery System — Complete Setup Guide

## System Overview

A full-stack Debt Recovery CRM with **3 roles**:
- **Super Admin** — Full control: upload cases via CSV, create admins/agents, allocate cases, view all analytics
- **Admin** — Monitor agents, allocate cases, track activity, view analytics  
- **Agent** — View assigned cases, log call outcomes, add tracing data, schedule follow-ups

**Tech Stack:** React + Vite (frontend) · FastAPI (backend) · PostgreSQL (database)

---

## Prerequisites

Install these before starting:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://postgresql.org |
| Git | any | https://git-scm.com |

---

## Step 1 — PostgreSQL Setup

### Option A: PostgreSQL installed locally

Open psql or pgAdmin and run:

```sql
CREATE USER crm_user WITH PASSWORD 'crm_pass';
CREATE DATABASE crm_db OWNER crm_user;
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
```

### Option B: Using Docker (easiest)

```bash
docker run -d \
  --name crm-postgres \
  -e POSTGRES_USER=crm_user \
  -e POSTGRES_PASSWORD=crm_pass \
  -e POSTGRES_DB=crm_db \
  -p 5432:5432 \
  postgres:15
```

---

## Step 2 — Backend Setup (FastAPI)

### 2.1 — Navigate to backend folder

```bash
cd crm-system/backend
```

### 2.2 — Create Python virtual environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.3 — Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2.4 — Configure environment variables

Edit the `.env` file in the `backend/` folder:

```env
DATABASE_URL=postgresql://crm_user:crm_pass@localhost:5432/crm_db
SECRET_KEY=change-this-to-a-random-secret-key-at-least-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

> **Important:** Change `SECRET_KEY` to a long random string in production.  
> Generate one: `python -c "import secrets; print(secrets.token_hex(32))"`

### 2.5 — Start the backend server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
✅ Super Admin seeded: superadmin@crm.com / Admin@123
INFO:     Application startup complete.
```

The server **auto-creates all database tables** on first run and seeds a super admin account.

### 2.6 — Verify backend is running

Open: http://localhost:8000  
API docs: http://localhost:8000/docs

---

## Step 3 — Frontend Setup (React + Vite)

### 3.1 — Navigate to frontend folder

```bash
cd crm-system/frontend
```

### 3.2 — Install Node dependencies

```bash
npm install
```

### 3.3 — Configure environment (optional)

The `.env` file is already set to connect to `http://localhost:8000`. Change only if your backend runs on a different port:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 3.4 — Start the development server

```bash
npm run dev
```

Open: http://localhost:5173

---

## Step 4 — First Login

Use the seeded super admin account:

| Field | Value |
|-------|-------|
| Email | superadmin@crm.com |
| Password | Admin@123 |

> **Change this password immediately** after first login via User Management.

---

## Step 5 — Initial Configuration Walkthrough

### 5.1 — Create Admin users (Super Admin)
1. Go to **Manage Users** → **Add User**
2. Set role to **Admin**
3. Fill name, email, password

### 5.2 — Create Agent users
1. Go to **Manage Users** → **Add User**
2. Set role to **Agent**
3. Agents will log in and see only their assigned cases

### 5.3 — Upload Cases via CSV
1. Go to **Upload Cases**
2. Download the **template CSV** to see the correct format
3. Fill your data and upload

**Required columns:** `loan_number`, `customer_name`, `primary_phone`

**Optional columns:** `alternate_number`, `address`, `pincode`, `outstanding_amount`, `bucket`, `bank_name`, `last_payment_date`

> The system automatically skips duplicate `loan_number` entries.

### 5.4 — Allocate Cases to Agents
1. Go to **Allocate Cases**
2. Use checkboxes to select cases (filter by bank, bucket, search)
3. Choose an agent from the dropdown
4. Click **Allocate** — cases immediately appear in the agent's dashboard

---

## Role Capabilities Reference

### Super Admin
| Feature | Access |
|---------|--------|
| Create / manage admins | ✅ |
| Create / manage agents | ✅ |
| Upload cases via CSV | ✅ |
| Allocate cases to agents | ✅ |
| View all cases | ✅ |
| View full analytics + charts | ✅ |
| Track agent login/logout times | ✅ |
| View per-agent activity | ✅ |

### Admin
| Feature | Access |
|---------|--------|
| Create / manage agents | ✅ |
| Allocate cases | ✅ |
| View all cases | ✅ |
| View analytics | ✅ |
| Track agent activity | ✅ |
| Upload CSV | ✅ |
| Create admins | ❌ |

### Agent
| Feature | Access |
|---------|--------|
| View assigned cases | ✅ |
| Log call outcomes (feedback codes) | ✅ |
| Add remarks / notes | ✅ |
| Schedule follow-up dates | ✅ |
| Add tracing data (phone, address, employer) | ✅ |
| Set Promise-to-Pay amounts | ✅ |
| View follow-ups due today | ✅ |
| View other agents' cases | ❌ |

---

## Feedback Codes

| Code | Meaning |
|------|---------|
| NC | Not Contactable |
| WN | Wrong Number |
| RTP | Ready to Pay |
| PT | Promise to Pay |
| RNR | Ring No Response |
| CB | Call Back requested |
| PTP | Promise to Pay (with date) |
| PAID | Payment Received → closes case |
| DISPUTE | Customer Dispute |

> Cases with **PAID** feedback are automatically marked **Closed**.  
> Cases with **PTP/PT** are marked **PTP**.  
> Cases with **RTP** are marked **RTP**.  
> Cases with a follow-up date set are marked **Follow Up**.

---

## CSV Template Format

```csv
loan_number,customer_name,primary_phone,alternate_number,address,pincode,outstanding_amount,bucket,bank_name,last_payment_date
LN001,Ramesh Kumar,9876543210,9876543211,"123 MG Road, Bangalore",560001,85000,30-60,HDFC Bank,2024-01-15
LN002,Priya Sharma,9123456789,,,"456 Anna Salai, Chennai",600002,210000,60-90,ICICI Bank,2024-01-08
```

Column aliases also accepted (auto-detected):
- `loan_number` = `loan number`, `loanno`, `account_number`
- `customer_name` = `name`, `borrower`
- `primary_phone` = `phone`, `mobile`, `contact`
- `outstanding_amount` = `outstanding`, `balance`, `amount`
- `bucket` = `dpd`, `days_past_due`

---

## Project File Structure

```
crm-system/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py          # Login / logout / session
│   │   │   │   ├── users.py         # User CRUD
│   │   │   │   ├── cases.py         # Case upload, list, allocate
│   │   │   │   ├── calls.py         # Call logs + tracing
│   │   │   │   └── analytics.py     # Dashboard stats, agent reports
│   │   │   ├── deps.py              # Auth dependencies / role guards
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py            # Settings from .env
│   │   │   └── security.py          # JWT + bcrypt
│   │   ├── db/session.py            # SQLAlchemy engine + get_db
│   │   ├── models/models.py         # All DB table definitions
│   │   ├── schemas/schemas.py       # Pydantic request/response schemas
│   │   └── main.py                  # FastAPI app + startup seeding
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── api/client.js            # Axios instance + all API functions
    │   ├── context/AuthContext.jsx  # Login state, JWT storage
    │   ├── components/
    │   │   ├── common/index.jsx     # Modal, Badge, Spinner, Avatar
    │   │   └── layout/
    │   │       ├── Sidebar.jsx      # Role-aware sidebar navigation
    │   │       └── AppLayout.jsx    # Main layout wrapper
    │   ├── pages/
    │   │   ├── auth/LoginPage.jsx
    │   │   ├── superadmin/
    │   │   │   ├── Dashboard.jsx    # Stats + agent table + charts
    │   │   │   ├── UsersPage.jsx    # Create/edit/deactivate users
    │   │   │   ├── UploadPage.jsx   # CSV drag-drop upload
    │   │   │   ├── AllocatePage.jsx # Multi-select case allocation
    │   │   │   ├── CasesPage.jsx    # All cases list + filters
    │   │   │   ├── AnalyticsPage.jsx # Charts + agent report
    │   │   │   └── AgentActivityPage.jsx # Login/logout tracking
    │   │   ├── agent/
    │   │   │   └── AgentPages.jsx   # Dashboard, MyCases, FollowUps
    │   │   └── CaseDetailPage.jsx   # Full case view + call log modal
    │   ├── App.jsx                  # Router + role guards
    │   ├── main.jsx
    │   └── index.css                # Full design system
    ├── .env
    ├── index.html
    └── vite.config.js
```

---

## API Endpoints Reference

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/login | All | Login, returns JWT |
| POST | /api/v1/auth/logout | All | Ends session |
| GET | /api/v1/auth/me | All | Current user info |
| GET | /api/v1/users | Admin+ | List all users |
| POST | /api/v1/users | Admin+ | Create user |
| PUT | /api/v1/users/{id} | Admin+ | Update user |
| GET | /api/v1/users/{id}/sessions | Admin+ | Login history |
| POST | /api/v1/cases/upload-csv | Admin+ | Bulk import |
| POST | /api/v1/cases/allocate | Admin+ | Assign to agent |
| GET | /api/v1/cases | All | List cases (role-filtered) |
| GET | /api/v1/cases/{id} | All | Case details + logs |
| POST | /api/v1/activity/call-logs | All | Log call outcome |
| GET | /api/v1/activity/call-logs | All | List call logs |
| POST | /api/v1/activity/tracing | All | Add traced contact |
| GET | /api/v1/analytics/dashboard | Admin+ | Dashboard stats |
| GET | /api/v1/analytics/agents | Admin+ | Per-agent performance |
| GET | /api/v1/analytics/agent/{id}/activity | Admin+ | Daily activity |
| GET | /api/v1/analytics/follow-ups | All | Pending follow-ups |

Full interactive docs: http://localhost:8000/docs

---

## Production Deployment Tips

### Backend (Gunicorn + Nginx)

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (Build for production)

```bash
npm run build
# Serve the dist/ folder via Nginx or any static host
```

### Environment — Production .env changes

```env
SECRET_KEY=<generate a 64-char random hex string>
DATABASE_URL=postgresql://user:password@your-db-host:5432/crm_db
ACCESS_TOKEN_EXPIRE_MINUTES=240
```

### CORS — Update for production

In `backend/app/main.py`, replace `"*"` in `allow_origins` with your actual frontend URL:
```python
allow_origins=["https://yourapp.com"]
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `connection refused` on DB | Check PostgreSQL is running: `pg_ctl status` |
| `relation does not exist` | Tables not created — restart backend |
| Frontend 401 errors | Token expired — log out and log in again |
| CSV upload fails | Check column names match template; ensure UTF-8 encoding |
| `Module not found` on npm install | Delete `node_modules` and run `npm install` again |
| Backend won't start (Windows) | Use `python -m uvicorn app.main:app --reload` |
| CORS errors in browser | Ensure backend is running on port 8000 and CORS allows port 5173 |

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@crm.com | Admin@123 |

Create additional users through the UI after first login.
