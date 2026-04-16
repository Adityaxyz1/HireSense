<div align="center">

<img src="https://img.shields.io/badge/HireSense-AI%20Talent%20Acquisition-6366f1?style=for-the-badge&logoColor=white" alt="HireSense" />

<h3>AI-powered resume ↔ job matching platform built for precision hiring</h3>

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA%20NIM-Llama%203.1%2070B-76B900?style=flat-square&logo=nvidia)](https://build.nvidia.com/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)

</div>

---

## Overview

**HireSense** is a full-stack AI talent acquisition platform that automates the most cognitively expensive part of recruitment — evaluating whether a candidate actually fits a role.

It goes beyond keyword matching by combining **semantic similarity**, **skill NER**, **experience heuristics**, and **resume strength scoring** into a single weighted precision score per candidate-job pair.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React 19 SPA                         │
│         (Recruiter Dashboard · Candidate Portal)            │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST / SSE
┌───────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Precision Scoring Engine               │   │
│   │  semantic_sim · skill_ner · exp_heuristic · strength│   │
│   └──────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│          ┌───────────────┴──────────────┐                   │
│          ▼                              ▼                    │
│   NVIDIA NIM API               Supabase (pgvector)          │
│   Llama 3.1 70B                  Vector embeddings          │
│   (NER · analysis)               + relational store         │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features

| Feature | Description |
|---|---|
| **Precision Scoring** | Weighted blend of semantic similarity, skill NER, experience heuristics, and resume strength |
| **Semantic Matching** | pgvector cosine similarity on LLM-generated embeddings |
| **Skill NER** | Entity extraction via Llama 3.1 70B through NVIDIA NIM |
| **Resume Parsing** | Structured extraction of work history, education, and skills |
| **Recruiter Dashboard** | Ranked candidate list with score breakdowns per job posting |
| **Candidate Portal** | Resume upload, job browsing, and match feedback |

---

## Scoring Algorithm

The core scoring function produces a normalized `[0, 1]` match score:

```
score = w₁·semantic_sim
      + w₂·skill_overlap
      + w₃·exp_heuristic
      + w₄·resume_strength
```

Where weights are configurable per job category. Score components:

- **`semantic_sim`** — cosine similarity between job description and resume embeddings (pgvector)
- **`skill_overlap`** — Jaccard similarity over NER-extracted skill sets
- **`exp_heuristic`** — normalized experience gap penalty relative to JD requirements
- **`resume_strength`** — structural and content quality score (sections, quantified impact, formatting)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.12, Pydantic v2 |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **LLM** | NVIDIA NIM — Llama 3.1 70B Instruct |
| **Auth** | Supabase Auth (JWT) |
| **Deployment** | Docker, (Vercel / Railway) |

---

## Getting Started

### Prerequisites

```bash
python >= 3.12
node >= 20
supabase CLI
NVIDIA NIM API key
```

### Environment Variables

```env
# .env
NVIDIA_NIM_API_KEY=your_nim_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
supabase db push          # applies migrations
supabase functions deploy # (if using edge functions)
```

---

## Project Structure

```
hiresense/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, security
│   │   ├── models/       # Pydantic schemas
│   │   ├── services/
│   │   │   ├── scoring/  # Precision scoring engine
│   │   │   ├── nim/      # NVIDIA NIM client
│   │   │   └── parser/   # Resume parser
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   └── package.json
└── supabase/
    └── migrations/
```

---

## License

AGPL-3.0 © 2026 HireSense Contributors
