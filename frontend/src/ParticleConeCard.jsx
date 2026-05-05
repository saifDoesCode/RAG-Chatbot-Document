import { useEffect, useRef } from "react"

const CONFIG = {
    width: 100,
    height: 100,
    radius: 30,
    coneHeight: 46,
    particleSpacing: 2.8,
    dotSize: 0.85,
    color: '46, 196, 182',
    rotationSpeed: 0.012,
    tiltX: 0.35,
    fov: 180,
}

function buildConePoints() {
    const pts = []
    const { radius: R, coneHeight: H, particleSpacing: STEP } = CONFIG
    const baseY = H / 2

    for (let px = -R; px <= R; px += STEP) {
        for (let pz = -R; pz <= R; pz += STEP) {
            if (px * px + pz * pz <= R * R) pts.push({ x: px, y: baseY, z: pz })
        }
    }

    const slices = Math.ceil(H / STEP)
    for (let si = 0; si <= slices; si++) {
        const t = si / slices
        const y = baseY - t * H
        const r = R * (1 - t)
        const steps = Math.max(1, Math.round((2 * Math.PI * r) / STEP))
        for (let j = 0; j < steps; j++) {
            const theta = (2 * Math.PI * j) / steps
            pts.push({ x: r * Math.cos(theta), y, z: r * Math.sin(theta) })
        }
    }

    return pts
}

const POINTS = buildConePoints()

export default function ParticleConeCard({ onInfoClick }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        canvas.width = CONFIG.width
        canvas.height = CONFIG.height

        let angleY = 0
        let animId

        const rotateX = (p, a) => ({
            x: p.x,
            y: p.y * Math.cos(a) - p.z * Math.sin(a),
            z: p.y * Math.sin(a) + p.z * Math.cos(a),
        })
        const rotateY = (p, a) => ({
            x: p.x * Math.cos(a) + p.z * Math.sin(a),
            y: p.y,
            z: -p.x * Math.sin(a) + p.z * Math.cos(a),
        })
        const project = (p) => ({
            x: (p.x * CONFIG.fov) / (p.z + CONFIG.fov) + CONFIG.width / 2,
            y: (p.y * CONFIG.fov) / (p.z + CONFIG.fov) + CONFIG.height / 2,
            z: p.z,
        })

        function draw() {
            ctx.clearRect(0, 0, CONFIG.width, CONFIG.height)
            angleY += CONFIG.rotationSpeed
            const projected = POINTS.map(p => project(rotateY(rotateX(p, CONFIG.tiltX), angleY)))
            projected.sort((a, b) => a.z - b.z)
            for (const p of projected) {
                const depth = (p.z + CONFIG.radius + 80) / (CONFIG.radius * 2 + 80)
                const alpha = 0.15 + depth * 0.85
                const r = CONFIG.dotSize * (0.4 + depth * 0.7)
                ctx.beginPath()
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(${CONFIG.color}, ${alpha})`
                ctx.fill()
            }
            animId = requestAnimationFrame(draw)
        }

        draw()
        return () => cancelAnimationFrame(animId)
    }, [])

    return (
        <div style={{
            marginTop: "auto",
            borderTop: "2px solid #000",
            paddingTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <canvas ref={canvasRef} style={{ display: "block", flexShrink: 0 }} />
                <div>
                    <p style={{
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: 700, fontSize: "14px",
                        color: "#000", margin: 0,
                    }}>Saif Ahmed</p>
                    <p style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "11px", color: "#888",
                        margin: "4px 0 0",
                    }}>AI Software Engineer</p>
                </div>
            </div>

            <button onClick={onInfoClick} style={{
                background: "none",
                border: "1px solid #e0e0e0",
                borderRadius: "100px",
                padding: "8px 16px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "12px",
                fontWeight: 700,
                color: "#000",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s",
            }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00c49a'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
            >
                Developer Info.
            </button>
        </div>
    )
}
