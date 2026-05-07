import { useState, useRef, useEffect } from "react"
import axios from "axios"
import "./App.css"
import SystemDesignModal from "./SystemDesignModal"
import DeveloperInfoModal from "./DeveloperInfoModal"
import ParticleConeCard from "./ParticleConeCard"

const API_URL = 'https://ragnify-backend.onrender.com'

export default function App() {
    const [apiKey, setApiKey] = useState("")
    const [files, setFiles] = useState([])
    const [messages, setMessages] = useState([])
    const [question, setQuestion] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const [isThinking, setIsThinking] = useState(false)
    const [docsReady, setDocsReady] = useState(false)
    const [chunks, setChunks] = useState(0)
    const [connStatus, setConnStatus] = useState(null) // null | 'testing' | 'connected' | 'failed'
    const [showSystemDesign, setShowSystemDesign] = useState(false)
    const [showDevInfo, setShowDevInfo] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [slowWarning, setSlowWarning] = useState("")
    const messagesEndRef = useRef(null)
    const slowTimerRef = useRef(null)

    const startSlowTimer = () => {
        clearTimeout(slowTimerRef.current)
        slowTimerRef.current = setTimeout(() => {
            setSlowWarning(
                "The server is warming up after a period of inactivity — this first request may take up to 60 seconds. Thank you for your patience."
            )
        }, 6000)
    }

    const clearSlowTimer = () => {
        clearTimeout(slowTimerRef.current)
        setSlowWarning("")
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleTestConnection = async () => {
        if (!apiKey) return
        setConnStatus('testing')
        startSlowTimer()
        try {
            await axios.post(`${API_URL}/test-connection?api_key=${apiKey}`)
            setConnStatus('connected')
        } catch {
            setConnStatus('failed')
        } finally {
            clearSlowTimer()
        }
    }

    const handleUpload = async () => {
        if (!apiKey || files.length === 0) return
        setIsUploading(true)
        startSlowTimer()

        const formData = new FormData()
        files.forEach(file => formData.append("files", file))

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
            clearSlowTimer()
        }
    }

    const handleChat = async () => {
        if (!question.trim() || !docsReady) return

        const currentHistory = [...messages]
        const userMessage = { role: "user", content: question }
        setMessages(prev => [...prev, userMessage])
        setQuestion("")
        setIsThinking(true)
        setMessages(prev => [...prev, { role: "assistant", content: "" }])
        startSlowTimer()

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: userMessage.content,
                    chat_history: currentHistory
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
                            clearSlowTimer()
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
        } catch {
            alert("Something went wrong")
        } finally {
            setIsThinking(false)
            clearSlowTimer()
        }
    }

    const connLabel =
        connStatus === 'testing' ? 'Testing...' :
        connStatus === 'connected' ? 'Connected.' :
        connStatus === 'failed' ? 'Failed.' :
        'Test Connection.'

    const connClass =
        connStatus === 'connected' ? 'btn-pill status-connected' :
        connStatus === 'failed' ? 'btn-pill status-failed' :
        'btn-pill'

    return (
        <div className="app">
            {/* Mobile header – hidden on desktop */}
            <div className="mobile-header">
                <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                    <span /><span /><span />
                </button>
                <div className="mobile-logo">
                    <h1 className="logo">Ragnify.</h1>
                    <p className="byline">Developed by <span className="accent">Saif Ahmed.</span></p>
                </div>
            </div>

            {/* Backdrop – closes drawer on mobile */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            <div className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
                <div className="sidebar-top-row">
                    <div className="sidebar-header">
                        <h1 className="logo">Ragnify.</h1>
                        <p className="byline">Developed by <span className="accent">Saif Ahmed.</span></p>
                    </div>
                    <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
                </div>

                <div className="config-card">
                    <h3 className="card-title">Configuration.</h3>

                    <div className="field">
                        <label>Groq API Key</label>
                        <input
                            type="password"
                            placeholder="gsk_..."
                            value={apiKey}
                            onChange={e => {
                                setApiKey(e.target.value)
                                setConnStatus(null)
                            }}
                        />
                        <div className="field-row">
                            <button
                                className={connClass}
                                onClick={handleTestConnection}
                                disabled={!apiKey || connStatus === 'testing'}
                            >
                                {connLabel}
                            </button>
                        </div>
                    </div>

                    <div className="field">
                        <label>Upload Document</label>
                        <div className="file-drop-area">
                            <label htmlFor="file-input" className="btn-pill">Choose File.</label>
                            <input
                                id="file-input"
                                type="file"
                                multiple
                                accept=".pdf,.txt,.docx"
                                onChange={e => setFiles(Array.from(e.target.files))}
                                style={{ display: 'none' }}
                            />
                            {files.length > 0 && (
                                <span className="file-name">
                                    {files.length === 1 ? files[0].name : `${files.length} files selected`}
                                </span>
                            )}
                        </div>
                        <button
                            className="btn-pill"
                            onClick={handleUpload}
                            disabled={!apiKey || files.length === 0 || isUploading}
                        >
                            {isUploading ? "Processing..." : "Process Document"}
                        </button>
                    </div>

                    {docsReady && (
                        <div className="success-badge">
                            {chunks} chunks indexed
                        </div>
                    )}
                </div>

                {slowWarning && !isThinking && (
                    <div className="slow-warning">
                        <span className="slow-warning-icon">⏳</span>
                        {slowWarning}
                    </div>
                )}

                <div className="system-design-card" onClick={() => setShowSystemDesign(true)}>
                    <p>View System Design.</p>
                </div>

                <ParticleConeCard onInfoClick={() => setShowDevInfo(true)} />
            </div>

            <div className="chat">
                <div className="messages">
                    {messages.length === 0 && (
                        <div className="empty">
                            {!docsReady && (
                                <p className="mobile-configure-hint">Please Configure First.</p>
                            )}
                            <p>Upload documents and start asking questions</p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                            <div className="bubble">{msg.content}</div>
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
                    {isThinking && slowWarning && (
                        <div className="slow-warning-chat">
                            <span className="slow-warning-icon">⏳</span>
                            {slowWarning}
                        </div>
                    )}
                    {isThinking && (
                        <div className="message assistant">
                            <div className="bubble thinking">Thinking...</div>
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

            {showSystemDesign && (
                <SystemDesignModal onClose={() => setShowSystemDesign(false)} />
            )}
            {showDevInfo && (
                <DeveloperInfoModal onClose={() => setShowDevInfo(false)} />
            )}
        </div>
    )
}
