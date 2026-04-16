from sentence_transformers import SentenceTransformer
from functools import lru_cache
import numpy as np

# Load the model once globally
@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer('all-MiniLM-L6-v2')

def generate_embedding(text: str) -> list[float]:
    """Generates a 384-dimensional embedding for the given text."""
    if not text.strip():
        return [0.0] * 384
    model = get_model()
    # model.encode returns a numpy array, convert to regular float list
    embedding = model.encode(text)
    return embedding.tolist()
