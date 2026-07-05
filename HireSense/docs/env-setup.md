# Environment Setup

Env files now live in a per-side **`env/`** folder, split by target. Copy the
example and fill in your values before starting either server.

| Side | Folder | Local file | Deployed file | Template |
|------|--------|-----------|---------------|----------|
| Backend | `backend_v3/env/` | `.env.local` | `.env.production` | `.env.example` |
| Frontend | `frontend/env/` | `.env.development` | `.env.production` | `.env.example` |

Only `.env.example` (each side) is committed; the real env files are gitignored.

---

## Backend — `backend_v3/env/.env.local`

Copy from `backend_v3/env/.env.example`:

```powershell
cp backend_v3\env\.env.example backend_v3\env\.env.local
```

The backend selects which file to load via the **`APP_ENV`** variable
(`local` by default, `production` on Render). `config.py` loads
`backend_v3/env/.env.$APP_ENV`. In production, real secrets come from the
host's env vars (Render dashboard) — `APP_ENV=production` is set there and the
file is optional.

```env
# Supabase Config
SUPABASE_URL=your_supabase_project_url
# Service role key — bypasses RLS for backend operations
SUPABASE_KEY=your_supabase_service_role_key
# Anon key — used only to verify user JWTs with least privilege
SUPABASE_ANON_KEY=your_supabase_anon_key

# NVIDIA NIM API Keys (at least 1 required for AI features)
NVIDIA_NIM_API_KEY_DEEPSEEK=nvapi-xxxxxx
NVIDIA_NIM_API_KEY_META=nvapi-xxxxxx
NVIDIA_NIM_API_KEY_GEMMA=nvapi-xxxxxx

# Optional integrations (leave blank — features degrade gracefully)
MAGICAL_API_KEY=
GITHUB_TOKEN=

# Pre-warm embedding model on startup (slower boot, faster first match)
WARM_EMBEDDING_MODEL=false

# Admin access — comma-separated email allowlist
ADMIN_EMAILS=admin@example.com

# CORS allowed origins
CORS_ORIGINS=http://localhost:5173,https://hiresense.pages.dev

# Interactive API docs at /docs (set false in production)
ENABLE_DOCS=true

# Rate limiting per IP
RATE_LIMIT_MAX=600
RATE_LIMIT_WINDOW=60
```

---

## Frontend — `frontend/env/.env.development`

Copy from `frontend/env/.env.example`:

```powershell
cp frontend\env\.env.example frontend\env\.env.development
```

Vite reads env files from `frontend/env/` (`envDir: 'env'` in `vite.config.js`)
and auto-selects by mode: `npm run dev` → `.env.development`, `npm run build` →
`.env.production`. `VITE_*` values are **public** (baked into the bundle) — use
the Supabase ANON key only.

```env
# Supabase — use the ANON key (not service role)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API URL
# .env.development → http://localhost:8000/api
# .env.production  → https://<your-render-api>/api  (also set in Cloudflare Pages)
VITE_API_URL=http://localhost:8000/api
```
