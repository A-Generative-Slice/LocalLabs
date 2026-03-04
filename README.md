# MCP-LiteLabs

A secure, locally-hosted web application that uses Model Context Protocol (MCP) to retrieve, analyze, and manage client data stored in a local directory.

## Features
- **Local File Access**: Index and search PDF, Docx, Text, MD, and Images.
- **Conversational RAG**: Chat with your local documents using semantic search.
- **MCP Architecture**: Modular design for file retrieval and AI reasoning.
- **Hybrid AI**: Support for local (Ollama) and cloud (OpenAI) models.
- **Secure & Private**: All file operations stay on your local machine.
- **Document Export**: Generate PDF/Word reports from your data.

## Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Tesseract OCR** (for image text extraction)
  - Linux: `sudo apt install tesseract-ocr`
  - macOS: `brew install tesseract`

## Setup

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env .env  # Update your keys if needed
python -m uvicorn app.main:app --reload
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## AI Configuration
- **Local Mode**: Requires [Ollama](https://ollama.ai/) running on your machine.
- **Cloud Mode**: Requires an OpenAI API Key in the `.env` file.
