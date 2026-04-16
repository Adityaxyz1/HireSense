# HireSense: AI-Powered Applicant Tracking System

HireSense is a premium, full-stack recruitment platform designed to streamline the hiring process using state-of-the-art AI. It enables recruiters to parse resumes, match candidates against job descriptions with high precision, and manage the hiring pipeline through a cinematic, interactive interface.

![HireSense Banner](https://img.shields.io/badge/HireSense-AI--Powered-blueviolet?style=for-the-badge&logo=openai)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ Features

- **🚀 Cinematic Experience**: Beautifully crafted UI with glassmorphism, 3D backgrounds, and smooth periodic animations using Framer Motion and Three.js.
- **🧠 AI Resume Scoring**: Automated ATS (Applicant Tracking System) scoring using **NVIDIA NIM** LLMs for unbiased candidate evaluation.
- **📄 Magical Parser**: Advanced PDF parsing using PyMuPDF to extract text, skills, and experience from complex resume layouts.
- **🤝 Job Matching**: Intelligent matching algorithm that compares candidate profiles against specific Job Descriptions (JDs).
- **👤 User Profiles**: Personalized recruiter dashboards with custom profile pictures and display names, powered by **Supabase Storage**.
- **💬 Real-time Chat**: AI-driven chatbot assistant to help recruiters navigate candidates and analysis results.
- **🔒 Secure Architecture**: Robust authentication and data isolation using **Supabase Auth** and FastAPI middleware.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Framer Motion, Three.js, Recharts, Tailwind CSS |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic |
| **AI/ML** | NVIDIA NIM API, Sentence-Transformers, OpenAI-compatible SDK |
| **Database** | Supabase (PostgreSQL), Supabase-py |
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
# Edit .env with your SUPABASE_URL, SUPABASE_KEY, and NVIDIA_NIM_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

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

---

## 📁 Project Structure

```text
HireSense/
├── frontend/           # React + Vite application
│   ├── src/
│   │   ├── components/ # UI and Layout components
│   │   ├── contexts/   # Auth and Theme state management
│   │   ├── pages/      # Dashboard, Analyze, Profile, etc.
│   │   └── lib/        # API and Supabase clients
├── backend_v3/         # FastAPI application
│   ├── routes/         # API endpoints (Auth, Resume, Profile)
│   ├── services/       # AI Engines (LLM, Scorer, Parser)
│   ├── database.py     # Supabase client initialization
│   └── main.py         # App entry point and middleware
└── README.md           # This file
```

---

## 🛡️ Security

HireSense implements several security layers:
- **JWT Authentication**: Secured via Supabase Auth.
- **Data Isolation**: Multi-tenant architecture ensures users only access their own data.
- **Middleware**: Request size limits and security headers (CORS, XSS Protection, etc.).
- **Rate Limiting**: Integrated rate limiter to prevent API abuse.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made by Adityaxyz1</p>
