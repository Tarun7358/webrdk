# RAGE Cloud

**Upload. Share. Grow. Earn.**

RAGE Cloud is a high-performance, creator-focused file sharing and monetization platform. It combines a dark, gaming-inspired UI with cloud storage architecture backed by Google Drive API v3 and an institutional double-entry financial ledger.

---

## 🌟 Key Features

- **Decoupled Cloud Storage Architecture**: Uploads files to Google Drive API v3 (organized into `/public`, `/private`, `/paid`, `/teams`, `/quarantine`), with a pluggable `StorageService` interface allowing zero-rewrite future migration to S3, Cloudflare R2, or Backblaze B2.
- **Qualified Traffic Monetization Engine**: Automated anti-bot rule engine scrubs automated scrapers, headless browsers, and repeat IP spam so creators are accurately credited only for authentic human visitors.
- **Double-Entry Wallet Ledger**: Financial integrity guaranteed by database row-level locking. Balances are never modified without a corresponding immutable ledger entry.
- **Creator Hub & Analytics**: Track raw vs qualified downloads, RPM (eCPM), video watch duration milestones, and daily revenue trends.
- **Team Collaboration & Automated Revenue Splits**: Team owners can add collaborators and assign revenue shares with strict total allocation enforcement (&le; 100%).
- **Super Admin Command Center**: Governance over user accounts, file quarantine, manual payout authorization queues, fraud alerts, and live business rule configurations.
- **Dark Gaming Aesthetic**: Modern dark charcoal UI with crimson red accents, glassmorphic cards, responsive tables, and interactive calculators.

---

## 📂 Project Structure

```text
rage-cloud/
├── apps/
│   ├── api/                     # FastAPI Python 3.12 Backend
│   │   ├── app/
│   │   │   ├── api/v1/          # Modular domain REST endpoints
│   │   │   ├── core/            # Config, security, database, redis, RBAC
│   │   │   ├── models/          # Relational SQLAlchemy models
│   │   │   ├── schemas/         # Pydantic v2 validation contracts
│   │   │   ├── services/        # Storage, Revenue, Wallet, Fraud, Referral
│   │   │   └── workers/         # Background tasks & ledger reconciliation
│   │   └── tests/               # Backend automated test suite
│   └── web/                     # React 19 + TypeScript + Vite + Tailwind CSS
│       └── src/
│           ├── components/      # UI components & navigation
│           ├── layouts/         # Protected dashboard wrappers
│           ├── pages/           # Landing, Files, Upload, Download, Wallet, Admin
│           └── services/        # API client
├── infrastructure/
│   ├── docker/                  # Production Dockerfiles (backend & frontend)
│   └── nginx/                   # Nginx reverse proxy configuration
├── docs/                        # In-depth architectural & deployment guides
├── docker-compose.yml           # Multi-container orchestration
├── .env.example                 # Configuration template
└── README.md
```

---

## 🚀 Quick Start with Docker

```bash
# 1. Clone repository
git clone https://github.com/your-org/rage-cloud.git
cd rage-cloud

# 2. Configure environment
cp .env.example .env

# 3. Start full stack (PostgreSQL, Redis, Backend, Worker, Frontend)
docker compose up -d --build
```

- **Web Application:** [http://localhost:3000](http://localhost:3000)
- **REST API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

### Default Super Admin Credentials:
- **Email:** `admin@ragecloud.io`
- **Password:** `RageAdmin2026!`

---

## 💻 Local Development Setup

### 1. Backend (`apps/api`)
```bash
cd apps/api
python -m venv venv
venv\Scripts\activate   # Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (`apps/web`)
```bash
cd apps/web
npm install
npm run dev
```

---

## 🧪 Testing

Run backend test suite:
```bash
cd apps/api
pytest tests/test_suite.py -v
```

Run frontend build verification:
```bash
cd apps/web
npm run build
```

---

## 📖 In-Depth Documentation

- [Architecture Overview](docs/architecture.md)
- [Database Schema & Models](docs/database.md)
- [Google Drive Storage Integration](docs/google-drive.md)
- [Authentication & RBAC](docs/authentication.md)
- [Revenue Engine & Economics](docs/revenue-system.md)
- [Wallet Ledger System](docs/wallet.md)
- [Anti-Fraud & Quality Engine](docs/fraud-prevention.md)
- [Deployment & Production](docs/deployment.md)
- [API Reference](docs/api.md)

---

## ⚖️ License

MIT License. See [LICENSE](LICENSE) for details.
