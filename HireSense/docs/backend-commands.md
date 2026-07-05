# Backend Commands — FastAPI / Uvicorn

Root: `backend_v3/`

## Start Commands

```powershell
# Activate venv (Windows)
venv\Scripts\activate

# Development (auto-reload on file save)
uvicorn main:app --reload

# Production-style (no reload, explicit port)
uvicorn main:app --host 0.0.0.0 --port 8000
```

Server starts on **http://localhost:8000**

## Dependency Management

```powershell
# Install from pinned lockfile
pip install -r requirements.txt

# Recreate venv from scratch
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## requirements.txt

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.133.1 | Web framework |
| uvicorn | 0.41.0 | ASGI server |
| pydantic | 2.12.5 | Data validation (v2) |
| python-dotenv | 1.2.1 | `.env` loader |
| python-multipart | 0.0.22 | Form / file upload parsing |
| supabase | 2.28.0 | Supabase Python client |
| httpx | 0.28.1 | Async HTTP client |
| openai | 2.30.0 | OpenAI / NVIDIA NIM API |
| sentence-transformers | 5.2.3 | Semantic embeddings |
| PyMuPDF | 1.27.1 | PDF text extraction |
| numpy | 2.4.2 | Numerical ops |
| scikit-learn | 1.8.0 | Cosine similarity scoring |

> Pinned to known-good versions. To upgrade: `pip install -U <pkg>` then `pip freeze > requirements.txt`.
