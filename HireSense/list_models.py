import google.generativeai as genai

genai.configure(api_key="AIzaSyDG_Kc8ooz6ej43HeACZcrj9n_zKgDILYg")
models = genai.list_models()
for m in models:
    if "generateContent" in m.supported_generation_methods:
        print(m.name)
