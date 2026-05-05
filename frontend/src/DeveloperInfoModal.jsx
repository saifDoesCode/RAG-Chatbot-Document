import { useEffect } from "react"
import avatar from "./assets/avatar.jpg"

export default function DeveloperInfoModal({ onClose }) {
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
                background: "#fff", borderRadius: "20px", width: "100%",
                maxWidth: "360px", padding: "40px 32px 32px",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "8px", position: "relative"
            }}>
                <img
                    src={avatar}
                    alt="Saif Ahmed"
                    style={{
                        width: "100px", height: "100px",
                        borderRadius: "50%", objectFit: "cover",
                        marginBottom: "8px"
                    }}
                />

                <h2 style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "20px", fontWeight: 700,
                    color: "#000", marginBottom: "2px"
                }}>
                    Saif Ahmed
                </h2>

                <p style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "12px", color: "#aaa",
                    marginBottom: "16px"
                }}>
                    AI Engineer · Software Engineer
                </p>

                <a href="mailto:saifanis03@gmail.com" style={linkStyle}>
                    saifanis03@gmail.com
                </a>
                <a
                    href="https://www.linkedin.com/in/saif-ahmed-6ba859257/"
                    target="_blank" rel="noreferrer"
                    style={linkStyle}
                >
                    LinkedIn Profile
                </a>
                <a
                    href="https://github.com/saifDoesCode"
                    target="_blank" rel="noreferrer"
                    style={linkStyle}
                >
                    GitHub — saifDoesCode
                </a>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: "24px",
                        background: "#00c49a", color: "#fff",
                        border: "none", borderRadius: "100px",
                        padding: "12px 40px",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "14px", fontWeight: 700,
                        cursor: "pointer"
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    )
}

const linkStyle = {
    fontFamily: "'Space Mono', monospace",
    fontSize: "13px",
    color: "#00c49a",
    textDecoration: "none",
    lineHeight: "2"
}
