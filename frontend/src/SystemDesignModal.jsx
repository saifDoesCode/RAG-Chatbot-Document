import { useEffect } from "react"

export default function SystemDesignModal({ onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "24px"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: "16px", width: "100%",
        maxWidth: "780px", maxHeight: "88vh", overflowY: "auto",
        padding: "32px 36px", position: "relative"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "20px",
          background: "none", border: "none", fontSize: "22px",
          cursor: "pointer", color: "#888", lineHeight: 1
        }}>✕</button>

        <h2 style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>
          System Design.
        </h2>
        <p style={{ fontFamily: "monospace", fontSize: "13px", color: "#888", marginBottom: "28px" }}>
          How Ragnify works under the hood
        </p>

        <svg width="100%" viewBox="0 0 680 620" role="img" xmlns="http://www.w3.org/2000/svg">
          <title>Ragnify system design diagram</title>
          <desc>Full architecture of the Ragnify RAG chatbot from frontend to LLM</desc>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </marker>
          </defs>

          {/* ── Layer labels ── */}
          <text x="24" y="58" style={{ fontSize: "10px", fill: "#bbb", fontFamily: "monospace", letterSpacing: "1px" }}>FRONTEND</text>
          <text x="24" y="198" style={{ fontSize: "10px", fill: "#bbb", fontFamily: "monospace", letterSpacing: "1px" }}>API LAYER</text>
          <text x="24" y="338" style={{ fontSize: "10px", fill: "#bbb", fontFamily: "monospace", letterSpacing: "1px" }}>RAG ENGINE</text>
          <text x="24" y="518" style={{ fontSize: "10px", fill: "#bbb", fontFamily: "monospace", letterSpacing: "1px" }}>LLM</text>

          {/* ══ FRONTEND ══ */}
          <rect x="100" y="30" width="500" height="110" rx="14" fill="#f7f7f5" stroke="#ddd" strokeWidth="0.8"/>
          <text x="350" y="56" textAnchor="middle" style={{ fontSize: "13px", fontWeight: 600, fill: "#333", fontFamily: "monospace" }}>React Frontend — Vite</text>

          {/* sidebar box */}
          <rect x="120" y="68" width="180" height="56" rx="8" fill="#1DB594" fillOpacity="0.12" stroke="#1DB594" strokeWidth="0.8"/>
          <text x="210" y="91" textAnchor="middle" style={{ fontSize: "12px", fontWeight: 600, fill: "#0a6e56", fontFamily: "monospace" }}>Sidebar</text>
          <text x="210" y="108" textAnchor="middle" style={{ fontSize: "10px", fill: "#0a7a60", fontFamily: "monospace" }}>API key · upload · process</text>

          {/* chat box */}
          <rect x="320" y="68" width="260" height="56" rx="8" fill="#1DB594" fillOpacity="0.12" stroke="#1DB594" strokeWidth="0.8"/>
          <text x="450" y="91" textAnchor="middle" style={{ fontSize: "12px", fontWeight: 600, fill: "#0a6e56", fontFamily: "monospace" }}>Chat Area</text>
          <text x="450" y="108" textAnchor="middle" style={{ fontSize: "10px", fill: "#0a7a60", fontFamily: "monospace" }}>streaming tokens · source citations</text>

          {/* ── arrow frontend → api ── */}
          <line x1="350" y1="140" x2="350" y2="168" stroke="#ccc" strokeWidth="1" markerEnd="url(#arrow)"/>
          <text x="358" y="158" style={{ fontSize: "10px", fill: "#aaa", fontFamily: "monospace" }}>HTTP / stream</text>

          {/* ══ API LAYER ══ */}
          <rect x="100" y="170" width="500" height="110" rx="14" fill="#f7f7f5" stroke="#ddd" strokeWidth="0.8"/>
          <text x="350" y="196" textAnchor="middle" style={{ fontSize: "13px", fontWeight: 600, fill: "#333", fontFamily: "monospace" }}>FastAPI Backend</text>

          {/* endpoints */}
          {[
            { x: 120, label: "POST /upload", sub: "ingest docs" },
            { x: 252, label: "POST /chat", sub: "stream answer" },
            { x: 384, label: "GET /health", sub: "ping" },
            { x: 500, label: "DELETE /reset", sub: "clear index" },
          ].map((ep, i) => (
            <g key={i}>
              <rect x={ep.x} y="208" width="114" height="52" rx="8"
                fill="#1DB594" fillOpacity="0.1" stroke="#1DB594" strokeWidth="0.7"/>
              <text x={ep.x + 57} y="230" textAnchor="middle"
                style={{ fontSize: "10px", fontWeight: 600, fill: "#0a6e56", fontFamily: "monospace" }}>{ep.label}</text>
              <text x={ep.x + 57} y="247" textAnchor="middle"
                style={{ fontSize: "9px", fill: "#0a7a60", fontFamily: "monospace" }}>{ep.sub}</text>
            </g>
          ))}

          {/* ── arrow api → rag ── */}
          <line x1="350" y1="280" x2="350" y2="308" stroke="#ccc" strokeWidth="1" markerEnd="url(#arrow)"/>

          {/* ══ RAG ENGINE ══ */}
          <rect x="100" y="310" width="500" height="160" rx="14" fill="#f7f7f5" stroke="#ddd" strokeWidth="0.8"/>
          <text x="350" y="336" textAnchor="middle" style={{ fontSize: "13px", fontWeight: 600, fill: "#333", fontFamily: "monospace" }}>RAG Engine</text>

          {/* ingestion pipeline */}
          <rect x="118" y="348" width="216" height="106" rx="10" fill="#e8f4ff" stroke="#90c4f0" strokeWidth="0.7"/>
          <text x="226" y="368" textAnchor="middle" style={{ fontSize: "11px", fontWeight: 600, fill: "#1a5fa8", fontFamily: "monospace" }}>Ingestion pipeline</text>
          {["Load PDF/TXT/DOCX", "Chunk (1000 / 200 overlap)", "Embed (MiniLM-L6-v2)", "Index → FAISS"].map((s, i) => (
            <text key={i} x="134" y={386 + i * 16}
              style={{ fontSize: "10px", fill: "#2970b8", fontFamily: "monospace" }}>→ {s}</text>
          ))}

          {/* query pipeline */}
          <rect x="350" y="348" width="234" height="106" rx="10" fill="#fff7e6" stroke="#f0c46a" strokeWidth="0.7"/>
          <text x="467" y="368" textAnchor="middle" style={{ fontSize: "11px", fontWeight: 600, fill: "#8a5a00", fontFamily: "monospace" }}>Query pipeline</text>
          {["Embed question", "FAISS similarity search k=4", "Build prompt + history", "Stream via astream()"].map((s, i) => (
            <text key={i} x="366" y={386 + i * 16}
              style={{ fontSize: "10px", fill: "#a06800", fontFamily: "monospace" }}>→ {s}</text>
          ))}

          {/* arrow between pipelines */}
          <line x1="334" y1="400" x2="348" y2="400" stroke="#bbb" strokeWidth="1" markerEnd="url(#arrow)"/>

          {/* ── arrows rag → llm ── */}
          <line x1="230" y1="470" x2="230" y2="498" stroke="#ccc" strokeWidth="1" markerEnd="url(#arrow)"/>
          <line x1="467" y1="470" x2="467" y2="498" stroke="#ccc" strokeWidth="1" markerEnd="url(#arrow)"/>

          {/* ══ LLM LAYER ══ */}
          <rect x="100" y="490" width="500" height="90" rx="14" fill="#f7f7f5" stroke="#ddd" strokeWidth="0.8"/>
          <text x="350" y="516" textAnchor="middle" style={{ fontSize: "13px", fontWeight: 600, fill: "#333", fontFamily: "monospace" }}>LLM Layer — Groq</text>

          {/* model badges */}
          {[
            { x: 130, label: "LLaMA 3.3 70B", sub: "default" },
            { x: 310, label: "LLaMA 3.1 8B", sub: "fast" },
            { x: 480, label: "Gemma 2 9B", sub: "concise" },
          ].map((m, i) => (
            <g key={i}>
              <rect x={m.x} y="528" width="160" height="38" rx="8"
                fill="#1DB594" fillOpacity="0.13" stroke="#1DB594" strokeWidth="0.7"/>
              <text x={m.x + 80} y="545" textAnchor="middle"
                style={{ fontSize: "11px", fontWeight: 600, fill: "#0a6e56", fontFamily: "monospace" }}>{m.label}</text>
              <text x={m.x + 80} y="559" textAnchor="middle"
                style={{ fontSize: "9px", fill: "#0a7a60", fontFamily: "monospace" }}>{m.sub}</text>
            </g>
          ))}

          {/* ── return arrow ── */}
          <path d="M620 535 Q650 535 650 350 Q650 124 600 98" fill="none" stroke="#ddd" strokeWidth="1" strokeDasharray="5 4" markerEnd="url(#arrow)"/>
          <text x="654" y="348" style={{ fontSize: "9px", fill: "#bbb", fontFamily: "monospace" }}>streamed</text>
          <text x="654" y="360" style={{ fontSize: "9px", fill: "#bbb", fontFamily: "monospace" }}>response</text>
        </svg>

        {/* Tech stack pills */}
        <div style={{ marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
          <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#888", marginBottom: "12px" }}>TECH STACK</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              "React + Vite", "FastAPI", "LangChain", "FAISS",
              "HuggingFace", "Groq API", "Python 3.11", "Axios"
            ].map(t => (
              <span key={t} style={{
                fontFamily: "monospace", fontSize: "11px", padding: "4px 10px",
                background: "#1DB594", color: "#fff", borderRadius: "20px"
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
