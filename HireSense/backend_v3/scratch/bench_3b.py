import asyncio, sys, time, json
sys.path.insert(0, '.')
from services.llm_service import _clients

async def t():
    m = 'meta/llama-3.2-3b-instruct'
    c = list(_clients.values())[0]
    sys_p = '''You are an expert ATS compliance analyzer. Assess ATS readiness. Respond ONLY with valid JSON:
{"score":<0-100>,"candidate_name":"<name>","breakdown":[{"type":"success|warning|critical","message":"..."}]}
Limit breakdown to 3 concise items.'''
    user_p = 'Resume:\nJohn Doe, Senior Software Engineer. Experience: 10 years at Google, Meta, Amazon. Skills: Python, Java, AWS, React, Distributed Systems...\nReturn the ATS JSON report.'
    
    t0 = time.time()
    try:
        res = await c.chat.completions.create(model=m, messages=[{'role': 'system', 'content': sys_p}, {'role': 'user', 'content': user_p}], max_tokens=300)
        print(f'3B took {time.time()-t0:.2f}s')
        print(res.choices[0].message.content)
    except Exception as e:
        print("Error:", e)

asyncio.run(t())
