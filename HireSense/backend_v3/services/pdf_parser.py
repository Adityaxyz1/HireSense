import fitz  # PyMuPDF
import re

def extract_text(file_bytes: bytes) -> str:
    """Extract and normalize text securely from PDF bytes."""
    text = ""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            text += page.get_text() + " "
            # Extract embedded URIs to ensure clickable links (like a LinkedIn icon) are captured
            for link in page.get_links():
                if "uri" in link:
                    text += link["uri"] + " "
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")
    
    # Normalize whitespace
    return re.sub(r'\s+', ' ', text).strip()
