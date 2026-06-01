# HireSense: AI-Powered Applicant Tracking System

HireSense is a premium, full-stack recruitment platform that streamlines hiring with state-of-the-art AI. It's a **two-sided portal**: **recruiters** parse resumes, match candidates against job descriptions with high precision, and manage their hiring pipeline, while **applicants** browse open roles, apply, and track their applications — all through a cinematic, interactive interface.

![HireSense Banner](https://img.shields.io/badge/HireSense-AI--Powered-blueviolet?style=for-the-badge&logo=openai)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ Features

### For Recruiters
- **🧠 AI Resume Scoring**: Automated ATS (Applicant Tracking System) scoring using **NVIDIA NIM** LLMs for unbiased candidate evaluation.
- **🤝 Semantic Job Matching**: Vector-embedding matching (Sentence-Transformers + pgvector) that ranks candidate profiles against specific Job Descriptions (JDs).
- **📄 Magical Parser**: Advanced PDF parsing using PyMuPDF to extract text, skills, and experience from complex resume layouts.
- **📊 Hiring Pipeline**: Manage applicants through stages, review incoming applications, and track candidates end to end.
- **💬 HireBot Assistant**: In-app assistant — find candidates by name, skill, or email, ask *"who applied for the React role?"*, and jump straight to a profile, all without leaving the page.
- **📥 Applicant Excel Export**: Download a job's applicants — scores, risk, status, and contact details — as an `.xlsx` workbook in one click.

### For Applicants
- **🔎 Job Browser**: Browse and search open roles posted by recruiters.
- **📨 One-Click Apply & Tracking**: Submit applications and follow their status in a dedicated student region.
- **👤 Applicant Profiles**: Personal profile with avatar and resume, powered by **Supabase Storage**.

### Platform
- **🚀 Cinematic Experience**: Crafted UI with 3D backgrounds and smooth animations using Framer Motion and Three.js.
- **🔒 Secure Architecture**: Authentication, role-based persona gating, and data isolation via **Supabase Auth** and FastAPI middleware.
- **🛡️ Admin Command Center**: Access restricted to an email allowlist (or `profiles.role = 'admin'`), with real-time activity logs, system-wide auditing, and **recruiter management** — recruiters are admin-provisioned and onboard via a secure email invite where they set their own password.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router, Framer Motion, Three.js, Recharts, Tailwind CSS |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic |
| **AI/ML** | NVIDIA NIM API, Sentence-Transformers, OpenAI-compatible SDK |
| **Database** | Supabase (PostgreSQL + pgvector), Supabase-py |
| **Storage** | Supabase Storage (for Resumes and Avatars) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.11+)
- Supabase Account
- NVIDIA NIM API Key

### 1. Backend Setup

```bash
cd HireSense/backend_v3

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env (see Environment Variables below)

# Start the server
uvicorn main:app --reload --port 8000
```

#### Backend Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | ✅ | Your Supabase project URL. |
| `SUPABASE_KEY` | ✅ | Service-role key (backend bypasses RLS). |
| `SUPABASE_ANON_KEY` | ⚠️ | Anon key, used to verify user JWTs with least privilege. Falls back to the service key if unset. |
| `NVIDIA_NIM_API_KEY_DEEPSEEK` / `_META` / `_GEMMA` | ✅ (≥1) | NVIDIA NIM keys. Add multiple to enable the racing strategy. |
| `MAGICAL_API_KEY` | ⬜ | Optional MagicalAPI integration. |
| `GITHUB_TOKEN` | ⬜ | Optional GitHub token for richer applicant GitHub stats + higher rate limits. |
| `WARM_EMBEDDING_MODEL` | ⬜ | Set `true` to pre-warm the embedding model on startup (slower boot, faster first match). |
| `ADMIN_MASTER_KEY` | ⬜ | Master key gating the admin command center. |
| `ADMIN_EMAILS` | ⬜ | Comma-separated admin allowlist. |
| `CORS_ORIGINS` | ⬜ | Comma-separated allowed origins (override in production). |
| `ENABLE_DOCS` | ⬜ | Set `false` to disable `/docs` & `/openapi.json` in production. |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | ⬜ | Per-IP rate limit (default 600 req / 60 s). |

### 2. Frontend Setup

```bash
cd HireSense/frontend

# Install dependencies
npm install

# Configure environment
# Ensure .env contains:
# VITE_SUPABASE_URL=your_url
# VITE_SUPABASE_ANON_KEY=your_key

# Start development server
npm run dev
```

### 3. Auth & Email Setup (Supabase)

Recruiter invites and password resets are emailed through Supabase Auth. Configure the project once under **Authentication**:

- **URL Configuration → Site URL**: your app origin (`http://localhost:5173` for dev, your domain in production).
- **URL Configuration → Redirect URLs**: add `<origin>/auth/confirm`, `<origin>/reset-password`, and `<origin>/login` (or a `<origin>/**` wildcard).
- **SMTP Settings**: enable custom SMTP (e.g. Brevo, Resend, SendGrid) so invite & reset emails actually send — the built-in service is rate-limited to a few per hour.
- **Email Templates**: point the **Invite user** and **Reset Password** links at the app's token-hash confirm route:

  ```text
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
  ```

  This verifies the token inside the app (`/auth/confirm`), so email link-scanners can't consume the one-time token before the user clicks.
- Optionally disable **Secure password change** so first-time recruiters can set a password without providing a current one.

---

## 📁 Project Structure

```text
HireSense/
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/      # UI + Layout (recruiter Layout, ApplicantLayout, HireBot)
│   │   ├── contexts/        # Auth, Theme, Mouse state management
│   │   ├── pages/           # Recruiter + auth pages: Dashboard, Jobs, Pipeline, Login,
│   │   │   │                #   ResetPassword, AuthConfirm (email-link verification)…
│   │   │   └── applicant/   # Applicant region: Browse, Applications, ApplicantProfile
│   │   ├── hooks/           # Reusable hooks (e.g. useBreakpoint)
│   │   └── lib/             # API and Supabase clients
├── backend_v3/             # FastAPI application
│   ├── routes/             # API endpoints (auth, profile, student, applications,
│   │                       #   resume, job, evaluate, match, rewrite, chat, admin)
│   ├── services/           # AI engines (LLM, scorer, parser, embeddings, matcher…)
│   ├── sql/                # Database schemas and migration files
│   ├── config.py           # Settings / environment configuration
│   ├── database.py         # Supabase client initialization
│   └── main.py             # App entry point and middleware
└── README.md               # This file
```

---

## 🛡️ Security

HireSense implements several security layers:
- **JWT Authentication**: Secured via Supabase Auth; JWTs verified with a least-privilege anon key.
- **Role-Based Persona Gating**: Applicants and recruiters are confined to their own regions; recruiter accounts are admin-created only.
- **Data Isolation**: Multi-tenant architecture ensures users only access their own data; private resume PDFs are served through an ownership-checked proxy.
- **Middleware**: Request size limits (10 MB), strict CORS, and security headers (XSS protection, frame deny, `no-store`, etc.).
- **Rate Limiting**: Integrated per-IP rate limiter to prevent API abuse.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made by Adityaxyz1</p>
