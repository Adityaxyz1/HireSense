import os
import sys
sys.path.append('d:/project kes/HireSense/backend_v3')
from services.llm_service import prompt_nim

print("Testing NIM...")
try:
    res = prompt_nim("You are an assistant.", "Return a valid JSON with key 'status' equal to 'ok'.")
    print("NIM RESPONSE:", res)
except Exception as e:
    print("NIM ERROR:", e)
