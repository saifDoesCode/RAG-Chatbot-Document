import os
import re
import unicodedata
import tempfile
from typing import Optional
from dotenv import load_dotenv
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    Docx2txtLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
import cohere as cohere_sdk
from langchain_core.embeddings import Embeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage


load_dotenv()


# ── Text Cleaning ─────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """
    Normalise messy document text before chunking.

    Handles the most common real-world issues:
    - Unicode noise (ligatures, smart quotes, soft hyphens, BOM, replacement chars)
    - PDF extraction artefacts (hyphenated line-breaks, header/footer repetition)
    - Excessive whitespace (multiple spaces, tabs, 3+ newlines collapsed to 2)
    - Near-empty content that wastes vector-store slots

    Trade-off: we intentionally keep single and double newlines so that the
    RecursiveCharacterTextSplitter can still use paragraph boundaries as
    preferred split points. Collapsing everything to a single space would
    produce denser but less semantically clean chunks.
    """

    # 1. Normalise unicode to NFC (handles accented chars, ligatures like ﬁ→fi)
    text = unicodedata.normalize("NFC", text)

    # 2. Strip BOM and zero-width / invisible characters
    text = text.replace("\ufeff", "")          # BOM
    text = text.replace("\u00ad", "")          # soft hyphen
    text = text.replace("\ufffd", "")          # Unicode replacement char (garbled OCR)
    text = text.replace("\u200b", "")          # zero-width space
    text = text.replace("\u200c", "")          # zero-width non-joiner
    text = text.replace("\u200d", "")          # zero-width joiner

    # 3. Normalise smart / curly quotes and dashes to ASCII equivalents
    #    (keeps downstream regex and keyword search reliable)
    text = text.replace("\u2018", "'").replace("\u2019", "'")   # ' '
    text = text.replace("\u201c", '"').replace("\u201d", '"')   # " "
    text = text.replace("\u2013", "-").replace("\u2014", "-")   # – —
    text = text.replace("\u2026", "...")                         # …

    # 4. Repair PDF hyphenated line-breaks  ("infor-\nmation" → "information")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # 5. Strip common PDF header/footer patterns
    #    - Bare page numbers on their own line  (e.g. "  3  " or "Page 3 of 12")
    text = re.sub(r"(?im)^\s*page\s+\d+\s+(of\s+\d+)?\s*$", "", text)
    text = re.sub(r"(?m)^\s*\d{1,4}\s*$", "", text)

    # 6. Collapse runs of spaces/tabs (but NOT newlines — preserve paragraph breaks)
    text = re.sub(r"[ \t]+", " ", text)

    # 7. Collapse 3+ consecutive newlines to exactly 2 (keeps paragraph structure)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # 8. Strip leading/trailing whitespace per line
    text = "\n".join(line.strip() for line in text.splitlines())

    # 9. Final global strip
    return text.strip()


MIN_CHUNK_CHARS = 50   # discard chunks that are too short to be meaningful

def is_meaningful_chunk(text: str) -> bool:
    """
    Return False for chunks that are too short or consist only of
    punctuation / numbers (e.g. a lone page number that slipped through).

    Trade-off: a threshold of 50 chars is conservative — it will only drop
    genuinely useless fragments, not short-but-valid sentences.
    """
    stripped = text.strip()
    if len(stripped) < MIN_CHUNK_CHARS:
        return False
    # Reject chunks that are >80 % non-alphabetic (pure tables of numbers, etc.)
    alpha_ratio = sum(c.isalpha() for c in stripped) / max(len(stripped), 1)
    if alpha_ratio < 0.20:
        return False
    return True


# ── Embeddings ────────────────────────────────────────────────────────────────

class CohereEmbeddings(Embeddings):
    def __init__(self, model: str, cohere_api_key: str):
        self.model = model
        self._client = cohere_sdk.Client(api_key=cohere_api_key)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        response = self._client.embed(
            texts=texts, model=self.model, input_type="search_document"
        )
        return response.embeddings

    def embed_query(self, text: str) -> list[float]:
        response = self._client.embed(
            texts=[text], model=self.model, input_type="search_query"
        )
        return response.embeddings[0]


# ── Prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a helpful AI assistant. Answer the user's questions based strictly on the document context provided below.

Context:
{context}

Rules:
- Only use information from the context above to answer
- If the answer is not in the context, say: "I don't have enough information in the provided documents to answer this."
- Be concise and accurate
- Reference the source document when relevant"""


# ── RAG Engine ────────────────────────────────────────────────────────────────

class RAGEngine:
    def __init__(self, api_key: str):
        self.vectorstore = None
        self.embeddings = CohereEmbeddings(
            model="embed-english-light-v3.0",
            cohere_api_key=os.getenv("COHERE_API_KEY")
        )
        self.llm = ChatGroq(
            groq_api_key=api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.1,
        )

    async def process_documents(self, uploaded_files) -> int:
        documents = []

        for uploaded_file in uploaded_files:
            ext = os.path.splitext(uploaded_file.filename)[1].lower()

            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
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
                    # ── Clean each page/document's text before indexing ──
                    doc.page_content = clean_text(doc.page_content)

                documents.extend(docs)

            finally:
                os.unlink(tmp_path)

        if not documents:
            raise ValueError("No readable content found in the uploaded files.")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""],
        )

        chunks = splitter.split_documents(documents)

        # ── Filter out meaningless chunks produced by messy source text ──
        chunks = [c for c in chunks if is_meaningful_chunk(c.page_content)]

        if not chunks:
            raise ValueError(
                "Documents were processed but no meaningful content could be extracted. "
                "The files may be scanned images, empty, or heavily corrupted."
            )

        self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
        return len(chunks)

    async def stream_query(self, question: str, chat_history: list):
        if self.vectorstore is None:
            raise RuntimeError("No documents indexed. Please upload files first.")

        source_docs = self.vectorstore.similarity_search(question, k=4)
        context = "\n\n---\n\n".join([doc.page_content for doc in source_docs])
        messages = [SystemMessage(content=SYSTEM_PROMPT.format(context=context))]

        for msg in chat_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

        messages.append(HumanMessage(content=question))

        return self.llm.astream(messages), source_docs