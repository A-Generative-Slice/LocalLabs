import os
from typing import List, Optional
import pypdf
from docx import Document
import pandas as pd
from PIL import Image
import pytesseract
import markdown

class DocumentParser:
    @staticmethod
    def parse_text(file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

    @staticmethod
    def parse_pdf(file_path: str) -> str:
        text = ""
        with open(file_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text

    @staticmethod
    def parse_docx(file_path: str) -> str:
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    @staticmethod
    def parse_markdown(file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
            # We return plain text for indexing, but could return HTML if needed
            return md_content

    @staticmethod
    def parse_spreadsheet(file_path: str) -> str:
        df = pd.read_excel(file_path) if file_path.endswith('.xlsx') else pd.read_csv(file_path)
        return df.to_string()

    @staticmethod
    def parse_image(file_path: str) -> str:
        return pytesseract.image_to_string(Image.open(file_path))

    @classmethod
    def parse(cls, file_path: str) -> Optional[str]:
        ext = os.path.splitext(file_path)[1].lower()
        try:
            if ext in ['.txt', '.log']:
                return cls.parse_text(file_path)
            elif ext == '.pdf':
                return cls.parse_pdf(file_path)
            elif ext == '.docx':
                return cls.parse_docx(file_path)
            elif ext in ['.md', '.markdown']:
                return cls.parse_markdown(file_path)
            elif ext in ['.csv', '.xlsx']:
                return cls.parse_spreadsheet(file_path)
            elif ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
                return cls.parse_image(file_path)
            else:
                return None
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return None
