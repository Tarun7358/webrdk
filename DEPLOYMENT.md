# 🚀 RAGE Cloud — Deployment & Hosting Guide

This guide covers hosting **RAGE Cloud** in production using **Netlify** for the frontend and **Railway** for the backend, as well as alternative options.

---

## 🏗️ Architecture Overview

```mermaid
graph LR
    User[User Browser] -->|Static SPA & CDN| Netlify[Netlify (apps/web)]
    User -->|API Requests & Downloads| Railway[Railway FastAPI (apps/api)]
    Railway -->|Database| Postgres[(Railway PostgreSQL)]
    Railway -->|Cache / Rate Limiting| Redis[(Railway Redis)]
    Railway -->|5TB Storage Backend| GDrive[Google Drive 5TB Storage]
```

- **Frontend (Netlify):** React 19, TypeScript, Tailwind CSS, Vite. Fast global CDN, automated deployments from Git, zero server maintenance.
- **Backend (Railway):** FastAPI Python 3.12, SQLAlchemy, uvicorn. Supports dynamic `$PORT`, background streaming, one-click PostgreSQL and Redis.
- **Storage:** Google Drive API v3 (5TB account) with automated local storage fallback.

---

## Part 1: Backend Deployment on Railway

### 1. Push code to GitHub
Create a GitHub repository and push your project:
```bash
git init
git add .
git commit -m "Ready for hosting"
git branch -M main
git remote add origin https://github.com/<your-username>/rage-cloud.git
git push -u origin main
```

### 2. Create Project in Railway
1. Go to [railway.com](https://railway.com) and log in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Set the **Root Directory** to `/apps/api` in the service settings (or Railway will automatically use the `apps/api/Dockerfile`).

### 3. Add Managed Database & Redis
1. In your Railway project canvas, click **+ New** → **Database** → **Add PostgreSQL**.
2. Railway will automatically link the database and inject `DATABASE_URL`.
3. *(Optional)* Click **+ New** → **Database** → **Add Redis**.

### 4. Configure Railway Environment Variables
In your backend service under the **Variables** tab, add:

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | Run mode |
| `SECRET_KEY` | *(generate 32+ random characters)* | Cryptographic secret |
| `JWT_SECRET` | *(generate 32+ random characters)* | Token signing secret |
| `STORAGE_BACKEND` | `google_drive` | Primary storage engine |
| `GOOGLE_TOKEN_JSON` | *(paste contents of google_token.json)* | Direct OAuth credentials |
| `CORS_ORIGINS` | `["*"]` or `["https://your-app.netlify.app"]` | Netlify domain |

> 💡 **Tip:** Generate `google_token.json` by running `python scripts/setup_google_drive.py` locally once. Open the generated file, copy the whole JSON string, and paste it into `GOOGLE_TOKEN_JSON` in Railway!

### 5. Generate Domain
1. In your Backend service settings, navigate to **Networking** → **Public Networking**.
2. Click **Generate Domain**.
3. You will get a URL like `https://rage-api-production.up.railway.app`.
4. Test by opening `https://rage-api-production.up.railway.app/health` in your browser.

---

## Part 2: Frontend Deployment on Netlify

### 1. Connect Repo to Netlify
1. Go to [netlify.com](https://netlify.com) and log in.
2. Click **Add new site** → **Import an existing project** → **GitHub**.
3. Select your repository.

### 2. Configure Build Settings
Netlify will read the included `netlify.toml` automatically, but verify these fields:
- **Base directory:** `apps/web`
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### 3. Configure Environment Variables
In Netlify under **Site configuration** → **Environment variables**, add:
- `VITE_API_URL`: `https://rage-api-production.up.railway.app/api/v1` *(replace with your actual Railway domain)*

### 4. Deploy
Click **Deploy site**. Within 1–2 minutes, your site will be live at `https://<site-name>.netlify.app` with full SSL and global CDN distribution!

---

## Part 3: Other Hosting Alternatives

| Platform Pairing | Pros | Cons | Best For |
| :--- | :--- | :--- | :--- |
| **Netlify + Railway** *(Recommended)* | Extremely simple, Git push deploys, managed Postgres, dynamic ports handled out-of-the-box. | Railway free tier limits compute hours. | Startups, fast MVPs, modern SPAs. |
| **Vercel + Railway** | Vercel has fastest edge CDN for Vite. | Similar pricing to Netlify. | Teams already on Vercel. |
| **Cloudflare Pages + Render** | Free unlimited bandwidth on Cloudflare Pages. | Render free tier sleeps after 15 min inactivity. | Zero-cost prototypes. |
| **Docker Compose on VPS (Hetzner / DO)** | Complete control, 100% fixed cost ($5–$10/mo), no egress limits. | Requires Linux server management and manual SSL cert setup (Certbot/Caddy). | Scaling high-traffic video/file platforms. |

---

## ✅ Deployment Checklist
- [x] `apps/web/public/_redirects` created (prevents 404s on React Router refreshes).
- [x] `apps/web/netlify.toml` and root `netlify.toml` created.
- [x] `apps/api/Dockerfile` created (supports dynamic Railway `$PORT`).
- [x] `apps/api/railway.json` and `Procfile` created.
- [x] `apps/api/requirements.txt` updated with `email-validator` and `asyncpg`.
- [x] `apps/api/app/core/config.py` configured with dynamic `$PORT` and `postgresql+asyncpg` translation.
- [x] `apps/api/app/services/storage/google_drive.py` supports `GOOGLE_TOKEN_JSON` env var directly.
- [x] `.gitignore` created to prevent accidental upload of secrets or tokens.
