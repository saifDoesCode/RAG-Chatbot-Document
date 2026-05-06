import os
import tempfile
from typing import Optional
from dotenv import load_dotenv
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    Docx2txtLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

SYSTEM_PROMPT = """You are a helpful AI assistant. Answer the user's questions based strictly on the document context provided below.

Context:
{context}

Rules:
- Only use information from the context above to answer
- If the answer is not in the context, say: "I don't have enough information in the provided documents to answer this."
- Be concise and accurate
- Reference the source document when relevant"""

# Load once at startup — not per request
EMBEDDINGS = HuggingFaceEmbeddings(
    model_name="sentence-transformers/paraphrase-MiniLM-L3-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

class RAGEngine:
    def __init__(self, api_key: str):
        self.vectorstore = None
        self.embeddings = EMBEDDINGS  # reference the global
        self.llm = ChatGroq(
            groq_api_key = api_key,
            model_name = "llama-3.3-70b-versatile",
            temperature=0.1,
        )

    async def process_documents(self, uploaded_files) -> int:
        documents = []

        for uploaded_file in uploaded_files:
            ext = os.path.splitext(uploaded_file.filename)[1].lower()

            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                # File arrives as bytes in memory
                tmp.write(await uploaded_file.read())
                tmp_path = tmp.name
            try:
                if ext == ".pdf":
                    loader = PyPDFLoader(tmp_path)
                elif ext == ".txt":
                    loader = TextLoader(tmp_path, encoding="utf-8")
                elif ext == ".docx":
                    loader = Docx2txtLoader(tmp_path)
                else:
                    continue
                
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source"] = uploaded_file.filename
                documents.extend(docs)

            finally:
                os.unlink(tmp_path)
            
        if not documents:
            raise ValueError("No readable content found in th euploaded files.")
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""],
        )

        chunks = splitter.split_documents(documents)
        self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
        
        return len(chunks)


    async def stream_query(self, question: str, chat_history: list):
        if self.vectorstore is None:
            raise RuntimeError("No documents indexed. Please upload files first.")
        
        source_docs = self.vectorstore.similarity_search(question, k=4)
        context = "\n\n---\n\n".join([doc.page_content for doc in source_docs])
        messages = [SystemMessage(content=SYSTEM_PROMPT.format(context=context))]

        for msg in chat_history:
            if msg['role'] == 'user':
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        
        messages.append(HumanMessage(content=question))

        return self.llm.astream(messages), source_docs