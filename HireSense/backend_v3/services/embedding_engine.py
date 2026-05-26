import numpy as np

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
    """Generates a 384-dimensional embedding for the given text."""
    if not text.strip():
        return [0.0] * 384
    model = get_model()
    embedding = model.encode(text)
    return embedding.tolist()

