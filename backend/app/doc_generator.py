from fpdf import FPDF
from docx import Document
import os

class DocumentGenerator:
    @staticmethod
    def generate_pdf(content: str, filename: str = "report.pdf"):
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.multi_cell(0, 10, content)
        path = os.path.join(os.getcwd(), filename)
        pdf.output(path)
        return path

    @staticmethod
    def generate_docx(content: str, filename: str = "report.docx"):
        doc = Document()
        doc.add_paragraph(content)
        path = os.path.join(os.getcwd(), filename)
        doc.save(path)
        return path
