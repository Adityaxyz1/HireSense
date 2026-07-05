# Local Development — HireSense

## URLs

| Service | URL |
|---------|-----|
| Frontend (React + Vite) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| Backend API base | http://localhost:8000/api |
| Interactive API docs | http://localhost:8000/docs |

---

## Quick Start

> First-time setup: create your env files under each side's `env/` folder — see
> [env-setup.md](env-setup.md). Backend loads `env/.env.local` by default
> (`APP_ENV=local`); frontend `npm run dev` loads `env/.env.development`.

### 1 — Backend

```powershell
cd backend_v3
venv\Scripts\activate
uvicorn main:app --reload
```

Server starts on **http://localhost:8000**

### 2 — Frontend

```powershell
cd frontend
npm install
npm run dev
```

App opens on **http://localhost:5173**
