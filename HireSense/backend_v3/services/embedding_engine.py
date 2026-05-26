import numpy as np
import requests
from config import settings

_model = None

def get_model():
    global _model
    if _model is None:
        print("Loading SentenceTransformer model (all-MiniLM-L6-v2) on-demand...")
        import torch
        # Optimize PyTorch memory footprint for 512MB RAM environments
        torch.set_num_threads(1)
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        print("SentenceTransformer model loaded on-demand.")
    return _model

def generate_embedding(text: str) -> list[float]:
    """Generates a 384-dimensional embedding for the given text.
    First tries Hugging Face Serverless Inference API, then falls back to local SentenceTransformers.
    """
    if not text.strip():
        return [0.0] * 384

    # 1. Attempt Hugging Face Cloud Inference
    if settings.HF_API_KEY:
        try:
            url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
            headers = {
                "Authorization": f"Bearer {settings.HF_API_KEY}",
                "Content-Type": "application/json"
            }
            # wait_for_model=True tells HF to load the model on their end if it's currently cold/idle
            payload = {"inputs": text, "options": {"wait_for_model": True}}
            
            # Set a very short connection timeout (1.5s) to fail-fast if DNS/network is blocked
            res = requests.post(url, headers=headers, json=payload, timeout=(1.5, 10.0))
            if res.status_code == 200:
                embedding = res.json()
                if isinstance(embedding, list) and len(embedding) == 384:
                    return embedding
                print(f"[Embedding Engine] HF API returned unexpected response shape/type: {type(embedding)}")
            else:
                print(f"[Embedding Engine] HF API failed with status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[Embedding Engine] Hugging Face Cloud API error: {e}. Falling back to local model...")

    # 2. Local Fallback (runs completely offline)
    model = get_model()
    embedding = model.encode(text)
    return embedding.tolist()

