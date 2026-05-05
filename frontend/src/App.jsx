import { useState, useRef, useEffect } from "react"
import axios from "axios"
import "./App.css"

const API_URL = 'http://localhost:8000'

export default function App() {
    const [apiKey, setApiKey] = useState("")
    const [files, setFiles] = useState([])
    const [messages, setMessages] = useState([])
    const [question, setQuestion] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const [isThinking, setIsThinking] = useState(false)
    const [docsReady, setDocsReady] = useState(false)
    const [chunks, setChunks] = useState(0)
    const messagesEndRef = useRef(null)

useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
}, [messages])

const handleUpload = async () => {
    if (!apiKey || files.length === 0) return
    setIsUploading(true)

    const formData = new FormData()
    files.forEach(file => formData.append("files", file))
    formData.append("api_key", apiKey)

    try {
        const res = await axios.post(
            `${API_URL}/upload?api_key=${apiKey}`, 
            formData
        )
        setChunks(res.data.chunks)
        setDocsReady(true)
    } catch (err) {
        alert(err.response?.data?.detail || "Upload Failed")

    } finally {
        setIsUploading(false)
    }
}

const handleChat = async () => {
    if (!question.trim() || !docsReady) return

    const currentHistory = [...messages]  // capture BEFORE adding new message
    const userMessage = { role: "user", content: question }
    setMessages(prev => [...prev, userMessage])
    setQuestion("")
    setIsThinking(true)

    const assistantMessage = { role: "assistant", content: "" }
    setMessages(prev => [...prev, assistantMessage])

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: userMessage.content,
                chat_history: currentHistory  // use captured history
            })
        })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop()

        for (const line of lines) {
            if (!line.trim()) continue
            try {
                const data = JSON.parse(line)

                if (data.type === "token") {
                    setMessages(prev => {
                        const updated = [...prev]
                        const last = updated[updated.length - 1]
                        updated[updated.length - 1] = { ...last, content: last.content + data.content }
                        return updated
                    })
                } else if (data.type === "sources") {
                    setMessages(prev => {
                        const updated = [...prev]
                        const last = updated[updated.length - 1]
                        updated[updated.length - 1] = { ...last, sources: data.sources }
                        return updated
                    })
                } else if (data.type === "error") {
                    alert(data.content)
                }
            } catch {
                continue
            }
        }
    }
    } catch (err) {
      alert("Something went wrong")
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className="app">
      <div className="sidebar">
        <h2>RAG Chatbot</h2>
        <p className="subtitle">Chat with your documents</p>

        <div className="section">
          <label>Groq API Key</label>
          <input
            type="password"
            placeholder="gsk_..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
        </div>

        <div className="section">
          <label>Upload Documents</label>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.docx"
            onChange={e => setFiles(Array.from(e.target.files))}
          />
          {files.length > 0 && (
            <p className="file-count">{files.length} file(s) selected</p>
          )}
        </div>

        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={!apiKey || files.length === 0 || isUploading}
        >
          {isUploading ? "Processing..." : "Process Documents"}
        </button>

        {docsReady && (
          <div className="success">
            ✅ {chunks} chunks indexed
          </div>
        )}
      </div>

      <div className="chat">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty">
              Upload documents and start asking questions
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="content">{msg.content}</div>
              {msg.sources && (
                <div className="sources">
                  <p className="sources-title">Sources:</p>
                  {msg.sources.map((src, j) => (
                    <div key={j} className="source">
                      <strong>{src.file}</strong>
                      <p>{src.content}...</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isThinking && (
            <div className="message assistant">
              <div className="content thinking">Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            placeholder={docsReady ? "Ask a question..." : "Upload documents first"}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleChat()}
            disabled={!docsReady}
          />
          <button
            onClick={handleChat}
            disabled={!docsReady || isThinking}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
