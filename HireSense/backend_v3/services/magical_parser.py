import requests
import json
import time
import os
from typing import Dict, Any, Optional
from config import settings

MAGICAL_API_URL = "https://gw.magicalapi.com/resume-parser"
MAGICAL_API_KEY = settings.MAGICAL_API_KEY

def parse_resume_with_magicalapi(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Uploads a resume PDF to MagicalAPI using multipart/form-data,
    polls for completion, and returns the parsed JSON data.
    """
    if not os.path.exists(file_path):
        print(f"File not found for MagicalAPI parsing: {file_path}")
        return None

    headers = {
        "api-key": MAGICAL_API_KEY
    }

    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            res = requests.post(MAGICAL_API_URL, headers=headers, files=files, timeout=30)
            
        if res.status_code == 200:
            return res.json()
            
        if res.status_code == 201:
            req_id = res.json().get('data', {}).get('request_id')
            if not req_id:
                print("MagicalAPI returned 201 but no request_id.")
                return None
                
            # Polling loop
            max_retries = 15
            for _ in range(max_retries):
                time.sleep(2)
                poll_payload = {"request_id": req_id}
                poll_res = requests.post(MAGICAL_API_URL, headers=headers, json=poll_payload, timeout=30)
                
                if poll_res.status_code == 200:
                    return poll_res.json().get('data', {})
                elif poll_res.status_code != 201:
                    print(f"MagicalAPI polling failed: {poll_res.status_code} - {poll_res.text}")
                    return None
            
            print("MagicalAPI polling timed out.")
            return None
            
        print(f"MagicalAPI upload failed: {res.status_code} - {res.text}")
        return None
        
    except Exception as e:
        print(f"Error calling MagicalAPI: {e}")
        return None
