# RAG Chatbot V2

> Upload any document. Ask anything. Get answers with sources — powered by RAG, FastAPI, and Groq.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![LangChain](https://img.shields.io/badge/LangChain-0.2-green?style=flat-square)
![Groq](https://img.shields.io/badge/Groq-LLaMA3.3-orange?style=flat-square)

---

## What This Is

A full-stack Retrieval-Augmented Generation (RAG) application that lets users upload documents and query them using natural language. Built with a FastAPI backend and React frontend, it streams responses in real time with source citations — no hallucinated answers, no black-box outputs.

---

## Demo

> Upload a PDF → Ask a question → Get a grounded, sourced answer in real time

<img width="651" height="883" alt="Screenshot 2026-05-07 at 12 13 29 PM" src="https://github.com/user-attachments/assets/7610be76-214c-47fd-8052-e8a840113cec" />
<img width="652" height="897" alt="Screenshot 2026-05-07 at 12 14 36 PM" src="https://github.com/user-attachments/assets/0dd76223-c13a-4410-bb15-48663d248551" />


---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│               React Frontend (Vite)                  │
│                                                     │
│  Sidebar: API Key + File Upload + Process Button    │
│  Chat Area: Streaming Messages + Source Citations   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / Streaming
                       ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend                         │
│                                                     │
│  POST /upload   → process & index documents         │
│  POST /chat     → stream LLM response               │
│  GET  /health   → health check                      │
│  DELETE /reset  → clear vector store                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 RAG Engine                           │
│                                                     │
│  Document Loading  → PDF / TXT / DOCX               │
│  Text Chunking     → RecursiveCharacterTextSplitter  │
│  Embeddings        → HuggingFace all-MiniLM-L6-v2   │
│  Vector Store      → FAISS (in-memory)              │
│  LLM               → Groq (LLaMA 3.3 70B)          │
│  Streaming         → Token-by-token via astream     │
└─────────────────────────────────────────────────────┘
```

---

## How It Works

### Phase 1 — Document Ingestion

When the user uploads files and clicks **Process Documents**:

1. **Load** — Files are read by the appropriate LangChain loader based on extension (`.pdf`, `.txt`, `.docx`)
2. **Chunk** — Documents are split into overlapping chunks using `RecursiveCharacterTextSplitter` with a chunk size of 1000 characters and 200 character overlap — preserving context at boundaries
3. **Embed** — Every chunk is converted into a 384-dimensional vector using `all-MiniLM-L6-v2`, a lightweight sentence transformer that runs on CPU
4. **Index** — All vectors are stored in a FAISS index in memory for fast nearest-neighbour search

### Phase 2 — Query & Answer

When the user asks a question:

1. **Embed** — The question is converted to a vector using the same embedding model
2. **Retrieve** — FAISS finds the 4 most semantically similar chunks via cosine similarity
3. **Prompt** — Retrieved chunks are injected into a strict system prompt alongside the full conversation history
4. **Stream** — Groq's LLaMA 3.3 70B streams the response token-by-token back to the React frontend via `StreamingResponse`
5. **Cite** — Source documents and page excerpts are returned alongside the answer

---

## Why RAG Over Fine-Tuning

This project uses RAG rather than fine-tuning because:

- Document content changes frequently — RAG just updates the vector store
- Fine-tuning would require expensive retraining for every document update
- RAG provides grounded, source-cited answers — dramatically reducing hallucination
- No GPU required for inference — runs on CPU with Groq handling the LLM layer

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Fast, modern UI with real-time streaming |
| Backend | FastAPI | Async Python API with automatic docs |
| LLM | Groq (LLaMA 3.3 70B) | Fast cloud inference, free tier |
| Embeddings | HuggingFace all-MiniLM-L6-v2 | Lightweight CPU-friendly embeddings |
| Vector Store | FAISS | In-memory fast similarity search |
| Orchestration | LangChain | Document loading, chunking, retrieval |
| HTTP Client | Axios | Frontend API calls |

---

## Project Structure

```
rag-chatbot-v2/
├── backend/
│   ├── main.py          # FastAPI app — routes, CORS, streaming
│   ├── rag_engine.py    # Core RAG logic — ingestion, retrieval, LLM
│   ├── requirements.txt
│   └── .env             # GROQ_API_KEY (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── App.css      # Styles
│   │   └── index.css    # Global styles
│   └── package.json
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Key Engineering Decisions

**Chunk overlap at 200 characters** — Prevents answers from being split across chunk boundaries. The end of each chunk is repeated at the start of the next, ensuring complete context is always retrievable.

**Strict system prompt** — The LLM is explicitly instructed to only answer from retrieved context and to say "I don't have enough information" when the answer isn't present. This eliminates hallucination on out-of-context questions.

**StreamingResponse with NDJSON** — Each token is yielded as a newline-delimited JSON object `{"type": "token", "content": "..."}`. Sources are sent as a final chunk after streaming completes. This allows the frontend to render tokens and sources independently.

**FAISS over Milvus** — For a single-user portfolio application, FAISS in-memory is sufficient and requires zero infrastructure. A production multi-user system would use Milvus or Pinecone with persistent storage.

**Separation of concerns** — Input validation lives entirely in `main.py`. The `RAGEngine` class assumes valid inputs and focuses purely on RAG logic. This makes both layers independently testable.

---

## Limitations & Future Improvements

- FAISS is in-memory — restarting the server clears the index. A production version would persist to Milvus or Pinecone
- Single user session — no authentication or multi-user support
- Could add hybrid search (BM25 + semantic) for better retrieval on keyword-heavy queries
- Could add a re-ranker model to improve chunk selection quality

---

## Author

**Mohammad Saif Ahmed** — AI Engineer & Full Stack Developer based in Abu Dhabi, UAE

[GitHub](https://github.com/saifDoesCode) · [LinkedIn](https://linkedin.com/in/saif-ahmed-6ba859257)

---

## License

MIT License — free to use and modify.
