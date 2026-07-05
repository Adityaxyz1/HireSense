import fitz  # PyMuPDF
import re

def compress_pdf(file_bytes: bytes) -> bytes:
    """Compress PDF bytes using PyMuPDF (garbage collection and deflation)."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        compressed_bytes = doc.tobytes(garbage=4, deflate=True)
        return compressed_bytes
    except Exception as e:
        raise ValueError(f"Failed to compress PDF: {str(e)}")

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
