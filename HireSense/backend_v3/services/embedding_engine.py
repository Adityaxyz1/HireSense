from sentence_transformers import SentenceTransformer
import numpy as np

# Eagerly load the model at import time — eliminates 2-4s cold start on first request
print("Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
_model = SentenceTransformer('all-MiniLM-L6-v2')
print("SentenceTransformer model loaded.")

def get_model():
    return _model

def generate_embedding(text: str) -> list[float]:
    """Generates a 384-dimensional embedding for the given text."""
    if not text.strip():
        return [0.0] * 384
    # model.encode returns a numpy array, convert to regular float list
    embedding = _model.encode(text)
    return embedding.tolist()
