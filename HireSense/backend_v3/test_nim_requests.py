import os
import requests
import sys

key = "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"
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
payload = {
    "model": "meta/llama-3.1-70b-instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 5
}
print("Sending request...")
try:
    res = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=20)
    print(res.status_code, res.text)
except Exception as e:
    print(e)
