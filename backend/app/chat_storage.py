import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional

STORAGE_FILE = "chat_sessions.json"

class ChatStorage:
    def __init__(self, storage_path: str = "."):
        self.file_path = os.path.join(storage_path, STORAGE_FILE)
        self.sessions = self._load()

    def _load(self) -> Dict:
        if os.path.exists(self.file_path):
            with open(self.file_path, 'r') as f:
                return json.load(f)
        return {"sessions": {}, "directory_map": {}}

    def _save(self):
        with open(self.file_path, 'w') as f:
            json.dump(self.sessions, f, indent=2)

    def create_session(self, directory_path: str, name: Optional[str] = None) -> str:
        session_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        session = {
            "id": session_id,
            "name": name or f"Chat {timestamp[:16]}",
            "directory_path": directory_path,
            "created_at": timestamp,
            "messages": []
        }
        
        self.sessions["sessions"][session_id] = session
        
        if directory_path not in self.sessions["directory_map"]:
            self.sessions["directory_map"][directory_path] = []
        self.sessions["directory_map"][directory_path].append(session_id)
        
        self._save()
        return session_id

    def get_sessions_for_directory(self, directory_path: str) -> List[Dict]:
        session_ids = self.sessions["directory_map"].get(directory_path, [])
        return [self.sessions["sessions"][sid] for sid in session_ids if sid in self.sessions["sessions"]]

    def add_message(self, session_id: str, role: str, content: str, sources: Optional[List[str]] = None):
        if session_id in self.sessions["sessions"]:
            self.sessions["sessions"][session_id]["messages"].append({
                "role": role,
                "content": content,
                "sources": sources or [],
                "timestamp": datetime.now().isoformat()
            })
            self._save()

    def get_session(self, session_id: str) -> Optional[Dict]:
        return self.sessions["sessions"].get(session_id)

    def delete_session(self, session_id: str):
        if session_id in self.sessions["sessions"]:
            session = self.sessions["sessions"].pop(session_id)
            dir_path = session["directory_path"]
            if dir_path in self.sessions["directory_map"]:
                self.sessions["directory_map"][dir_path].remove(session_id)
            self._save()
