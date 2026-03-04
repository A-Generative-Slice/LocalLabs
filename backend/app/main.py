from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from .rag_engine import RAGEngine
from .parsers import DocumentParser
from .chat_engine import ChatEngine
from .doc_generator import DocumentGenerator
from .chat_storage import ChatStorage
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi.responses import FileResponse

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "mcp-lite-labs-secret-key-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(title="MCP-LiteLabs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Removed Passlib CryptContext due to bcrypt 4.0 conflict
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str

class QueryRequest(BaseModel):
    query: Optional[str] = None
    text: Optional[str] = None # Added for Zia SDK compatibility
    session_id: Optional[str] = None
    directory_path: Optional[str] = None
    files: Optional[List[str]] = None

class IndexRequest(BaseModel):
    directory_path: str

class SettingsRequest(BaseModel):
    mode: str
    openai_key: Optional[str] = None
    openrouter_key: Optional[str] = None
    gemini_key: Optional[str] = None
    groq_key: Optional[str] = None
    openrouter_model: Optional[str] = None
    groq_model: Optional[str] = None
    local_model: Optional[str] = None

# In-memory session or could use SQLite for more persistence
rag_engine = RAGEngine()
chat_engine = ChatEngine()
chat_storage = ChatStorage(storage_path=os.path.dirname(os.path.abspath(__file__)))

# Mock user for local access
# Password: admin123
SALT = bcrypt.gensalt()
FAKE_USERS_DB = {
    "admin": {
        "username": "admin",
        "hashed_password": bcrypt.hashpw("admin123".encode('utf-8'), SALT),
    }
}

def authenticate_user(username, password):
    user = FAKE_USERS_DB.get(username)
    if not user:
        return False
    # Handle both string and bytes for hashed_password
    hashed = user["hashed_password"]
    if isinstance(hashed, str):
        hashed = hashed.encode('utf-8')
    if not bcrypt.checkpw(password.encode('utf-8'), hashed):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/index")
async def index_data(request: IndexRequest, background_tasks: BackgroundTasks):
    if not os.path.exists(request.directory_path):
        raise HTTPException(status_code=400, detail="Path does not exist")
    
    # Run indexing in background to avoid blocking
    background_tasks.add_task(rag_engine.index_directory, request.directory_path)
    
    return {"status": "success", "message": f"Started indexing {request.directory_path} in the background"}

@app.post("/query")
async def query_documents(request: QueryRequest):
    actual_query = request.query or request.text
    if not actual_query:
        raise HTTPException(status_code=400, detail="Query or text must be provided")
    
    results = rag_engine.query(actual_query, directory_path=request.directory_path)
    
    # Generate context from search results
    context = "\n\n".join([f"Source: {res['metadata']['source']}\nContent: {res['content']}" for res in results])
    
    # Generate response using ChatEngine
    response = await chat_engine.generate_response(actual_query, context)
    
    sources = [res['metadata']['source'] for res in results]
    
    # Save to storage if session_id and directory_path provided
    if request.session_id and request.directory_path:
        chat_storage.add_message(request.session_id, "user", request.text)
        chat_storage.add_message(request.session_id, "assistant", response, sources)
    
    return {
        "answer": response,
        "sources": sources
    }

@app.get("/sessions")
async def get_sessions(directory_path: str):
    return {"sessions": chat_storage.get_sessions_for_directory(directory_path)}

@app.post("/sessions")
async def create_session(request: IndexRequest):
    session_id = chat_storage.create_session(request.directory_path)
    return {"session_id": session_id}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = chat_storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    chat_storage.delete_session(session_id)
    return {"status": "success", "message": "Session deleted"}

@app.post("/export")
async def export_document(request: QueryRequest, format: str = "pdf"):
    # Reuse query logic to get content for export
    results = rag_engine.query(request.text)
    context = "\n\n".join([f"Source: {res['metadata']['source']}\nContent: {res['content']}" for res in results])
    
    # Generate a report using the content
    prompt = f"Summarize these documents into a professional report: {context}"
    report_content = await chat_engine.generate_response(prompt, context)
    
    if format == "pdf":
        path = DocumentGenerator.generate_pdf(report_content)
    else:
        path = DocumentGenerator.generate_docx(report_content)
        
    return FileResponse(path, filename=f"report.{format}", media_type='application/octet-stream')

@app.get("/files")
async def list_indexed_files():
    docs = rag_engine.get_all_documents()
    files = set()
    if docs['metadatas']:
        for meta in docs['metadatas']:
            files.add(meta['filename'])
    return {"files": list(files)}

@app.post("/settings")
async def update_settings(request: SettingsRequest):
    chat_engine.mode = request.mode
    # Always update the keys from the request
    if request.openai_key is not None:
        chat_engine.openai_client = OpenAI(api_key=request.openai_key) if request.openai_key else None
        
    chat_engine.openrouter_api_key = request.openrouter_key
    chat_engine.gemini_key = request.gemini_key
    chat_engine.groq_api_key = request.groq_key
    
    if request.openrouter_model:
        chat_engine.openrouter_model = request.openrouter_model
    if request.groq_model:
        chat_engine.groq_model = request.groq_model
    if request.local_model:
        chat_engine.local_model = request.local_model
    return {"status": "success", "message": f"Mode set to {request.mode}"}

@app.get("/browse")
async def browse_directory(path: Optional[str] = None):
    # Default to home directory if no path provided
    if not path:
        path = os.path.expanduser("~")
    
    if not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Path does not exist")
    
    try:
        items = []
        for entry in os.scandir(path):
            try:
                items.append({
                    "name": entry.name,
                    "path": entry.path,
                    "is_directory": entry.is_dir()
                })
            except (PermissionError, OSError):
                continue
        
        # Sort directories first, then files
        items.sort(key=lambda x: (not x["is_directory"], x["name"].lower()))
        
        return {
            "current_path": os.path.abspath(path),
            "parent_path": os.path.dirname(os.path.abspath(path)),
            "items": items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now()}
