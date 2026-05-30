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


def warm_model() -> None:
    """Eagerly load + initialize the SentenceTransformer so the first real
    request doesn't pay the torch/model cold-start. Safe to call at startup
    in a background thread; failures are non-fatal (lazy load still works)."""
    try:
        model = get_model()
        # A tiny encode finishes torch's lazy CUDA/CPU kernel init.
        model.encode("warmup")
        print("SentenceTransformer model warmed up.")
    except Exception as e:
        print(f"Model warmup skipped (non-fatal): {e}")

