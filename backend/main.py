from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from fastapi.responses import StreamingResponse
import json
from rag_engine import RAGEngine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_engine: RAGEngine | None = None

@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    api_key: str = None
):
    global rag_engine

    if not api_key:
        raise HTTPException(status_code=400, detail="Groq API key is required.")

    if not files:
        raise HTTPException(status_code=400, detail="No Files Uploaded.")
    
    try:
        rag_engine = RAGEngine(api_key=api_key)
        num_chunks = await rag_engine.process_documents(files)
        return {"message": "Documents processed successfully", "chunks": num_chunks}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
class ChatRequest(BaseModel):
    question: str
    chat_history: List[dict] = []

@app.post('/chat')
async def chat(request: ChatRequest):
    global rag_engine

    if rag_engine is None:
        raise HTTPException(status_code=400, detail="No documents uploaded yet")

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    async def generate():
        try:
            stream, source_docs = await rag_engine.stream_query(
                request.question,
                request.chat_history
            )
            async for chunk in stream:
                if chunk.content:
                    yield json.dumps({"type": "token", "content": chunk.content}) + "\n"

            sources = []
            seen = set()
            for doc in source_docs:
                source = doc.metadata.get("source", "Unknown")
                if source not in seen:
                    seen.add(source)
                    sources.append({"file": source, "content": doc.page_content[:200]})

            yield json.dumps({"type": "sources", "sources": sources}) + "\n"
        
        except Exception as e:
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/test-connection")
async def test_connection(api_key: str = None):
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        client.models.list()
        return {"status": "connected"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid API key")

@app.get('/health')
async def health_check():
    return {'status': 'healthy'}

@app.delete("/reset")
async def reset():
    global rag_engine
    rag_engine = None
    return {'message': 'Reset Succesfully'}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)