import sys
sys.path.insert(0, '.')
from services.llm_service import MODEL_REGISTRY, prompt_nim
print(f'Models registered: {len(MODEL_REGISTRY)}')
for m in MODEL_REGISTRY:
    print(f'  {m["name"]}: {m["model_id"]} (timeout={m["timeout"]}s)')
print('Import OK — Racing engine ready')
