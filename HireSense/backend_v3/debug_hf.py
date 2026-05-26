# debug_hf.py
import requests

def test_sync():
    url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct/v1/chat/completions"
    headers = {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "messages": [{"role": "user", "content": "Respond only with the word SUCCESS."}],
        "max_tokens": 10
    }
    try:
        print("Sending sync request via requests...")
        res = requests.post(url, headers=headers, json=payload, timeout=15)
        print("Status Code:", res.status_code)
        print("Response:", res.text)
    except Exception as e:
        print("Error details:", str(e))

test_sync()
