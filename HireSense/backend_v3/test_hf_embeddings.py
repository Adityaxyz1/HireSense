# test_hf_embeddings.py
import sys
import os
import time

# Add the current directory to path so config/services can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.embedding_engine import generate_embedding
from config import settings

print("=== HireSense Embedding Verification ===")
print(f"HF_API_KEY Configured: {'Yes' if settings.HF_API_KEY else 'No'}")
if settings.HF_API_KEY:
    print(f"Key Prefix: {settings.HF_API_KEY[:6]}...{settings.HF_API_KEY[-4:]}")

test_phrase = "Highly skilled Software Engineer with 5 years of experience in Python, FastAPI, and React."

# Test 1: Test with the active Hugging Face Key
print("\n--- Test 1: Cloud Inference (Fast path) ---")
t0 = time.perf_counter()
cloud_vector = generate_embedding(test_phrase)
t1 = time.perf_counter()
latency_ms = (t1 - t0) * 1000

print(f"Embedding generated successfully!")
print(f"Vector Length: {len(cloud_vector)} (Expected: 384)")
print(f"Latency: {latency_ms:.1f}ms")
print(f"First 5 dimensions: {cloud_vector[:5]}")

# Basic assertions
assert len(cloud_vector) == 384, f"Error: Vector dimension mismatch! Expected 384, got {len(cloud_vector)}"
assert isinstance(cloud_vector[0], float), "Error: Vector elements must be floats!"
print("[PASSED] Cloud Inference test.")

# Test 2: Test the Fallback (by temporarily removing the key)
print("\n--- Test 2: Local Fallback Verification (Offline Path) ---")
original_key = settings.HF_API_KEY
settings.HF_API_KEY = "" # Temporarily clear key to force fallback

t0_fallback = time.perf_counter()
fallback_vector = generate_embedding(test_phrase)
t1_fallback = time.perf_counter()
fallback_latency_ms = (t1_fallback - t0_fallback) * 1000

print(f"Fallback vector generated successfully!")
print(f"Vector Length: {len(fallback_vector)} (Expected: 384)")
print(f"Local Latency (model load + encode): {fallback_latency_ms:.1f}ms")
print(f"First 5 dimensions of fallback: {fallback_vector[:5]}")

# Basic assertions for fallback
assert len(fallback_vector) == 384, "Error: Fallback vector dimension mismatch!"
print("[PASSED] Local Fallback test.")

# Restore original key
settings.HF_API_KEY = original_key

print("\n==========================================")
print("SUCCESS! All embedding engine verification tests have passed.")
print("The webapp is now ready for production-level traffic.")
print("==========================================")
