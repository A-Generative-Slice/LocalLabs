import os
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
from .parsers import DocumentParser

class RAGEngine:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        self.collection = self.client.get_or_create_collection(
            name="client_data", 
            embedding_function=self.embedding_fn
        )

    def index_directory(self, directory_path: str):
        # Ensure we use absolute path for consistency
        abs_directory = os.path.abspath(directory_path)
        
        # Exclude directories that are typically massive or irrelevant
        exclude_dirs = {'.git', 'node_modules', '__pycache__', 'Library', 'Temp', 'Logs'}
        
        for root, dirs, files in os.walk(abs_directory):
            # Remove excluded directories from search
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                file_path = os.path.join(root, file)
                # Skip binary files that are too large or known images if tesseract is missing
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.pdf', '.exe', '.dll', '.so')):
                    continue
                    
                content = DocumentParser.parse(file_path)
                if content:
                    self.collection.add(
                        documents=[content],
                        metadatas=[{"source": file_path, "filename": file, "directory": abs_directory}],
                        ids=[file_path]
                    )
        print(f"Indexed directory: {abs_directory}")

    def query(self, text: str, n_results: int = 5, directory_path: str = None) -> List[Dict[str, Any]]:
        query_params = {
            "query_texts": [text],
            "n_results": n_results
        }
        
        if directory_path:
            abs_directory = os.path.abspath(directory_path)
            query_params["where"] = {"directory": abs_directory}
            
        results = self.collection.query(**query_params)
        
        formatted_results = []
        if results['documents']:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i] if 'distances' in results else None
                })
        return formatted_results

    def get_all_documents(self):
        return self.collection.get()
