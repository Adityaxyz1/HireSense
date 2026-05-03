import asyncio, sys, time
sys.path.insert(0, '.')
from services.llm_service import _clients, MODEL_REGISTRY

async def t():
    models = MODEL_REGISTRY
    for m in models:
        c = _clients[m['name']]
        t0 = time.time()
        try:
            print(f"Calling {m['name']} ({m['model_id']})...")
            res = await c.chat.completions.create(model=m['model_id'], messages=[{'role': 'user', 'content': 'hi'}])
            print(f"{m['name']} took {time.time()-t0:.2f}s")
        except Exception as e:
            print(f"{m['name']} error: {e}")

asyncio.run(t())
