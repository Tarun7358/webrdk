# RAGE Cloud — Deployment & Operations Guide

## 1. Quick Start with Docker Compose

The simplest way to run RAGE Cloud locally or on a cloud server:

```bash
# 1. Clone repository
git clone https://github.com/your-org/rage-cloud.git
cd rage-cloud

# 2. Configure environment
cp .env.example .env
# Edit .env with your Google Service Account and JWT secret

# 3. Launch full stack (postgres, redis, backend, worker, frontend)
docker compose up -d --build
```

### Access URLs:
- **Web App:** http://localhost:3000
- **FastAPI Documentation:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

---

## 2. Local Development Without Docker

### Run Backend:
```bash
cd apps/api
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run Frontend:
```bash
cd apps/web
npm install
npm run dev
```

---

## 3. Initial Credentials

On initial startup, the database automatically seeds a Super Admin account:
- **Email:** `admin@ragecloud.io`
- **Password:** `RageAdmin2026!`
*(Ensure you change this immediately in production via the admin panel!)*
