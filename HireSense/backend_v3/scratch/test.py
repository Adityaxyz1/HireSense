import urllib.request
try:
    print(urllib.request.urlopen("http://127.0.0.1:8000/api/resumes").read())
except Exception as e:
    print(e)
