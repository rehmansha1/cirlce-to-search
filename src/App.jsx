import { useRef, useState } from "react";
import axios from "axios";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #000; }

  .wrapper {
    position: relative;
    width: 100vw;
    height: 100vh;
    background: #000;
    overflow: hidden;
    font-family: 'Space Mono', monospace;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    touch-action: none;
  }

  /* ── splash ── */
  .splash {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    background: radial-gradient(ellipse at center, #0a1628 0%, #000 70%);
    z-index: 20;
    transition: opacity 0.6s ease, visibility 0.6s ease;
  }
  .splash.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .splash-icon {
    width: 80px;
    height: 80px;
    border: 2px solid #00ff80;
    border-radius: 4px;
    position: relative;
    animation: pulse-border 2s ease-in-out infinite;
  }
  .splash-icon::before, .splash-icon::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: #00ff80;
    border-style: solid;
  }
  .splash-icon::before { top: -2px; left: -2px; border-width: 2px 0 0 2px; }
  .splash-icon::after  { bottom: -2px; right: -2px; border-width: 0 2px 2px 0; }

  @keyframes pulse-border {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,128,0.3); }
    50%       { box-shadow: 0 0 0 12px rgba(0,255,128,0); }
  }

  .splash h1 {
    font-family: 'Syne', sans-serif;
    font-size: clamp(28px, 6vw, 48px);
    font-weight: 800;
    color: #fff;
    letter-spacing: -1px;
    text-align: center;
  }
  .splash h1 span { color: #00ff80; }

  .splash p {
    font-size: 12px;
    color: #555;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
  }

  .btn-start {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 32px;
    background: transparent;
    border: 1px solid #00ff80;
    color: #00ff80;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: color 0.3s, background 0.3s;
  }
  .btn-start::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #00ff80;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 0;
  }
  .btn-start:hover::before { transform: translateX(0); }
  .btn-start:hover { color: #000; }
  .btn-start span { position: relative; z-index: 1; }

  /* ── HUD corners (decorative) ── */
  .hud-corner {
    position: absolute;
    width: 24px;
    height: 24px;
    border-color: rgba(0,255,128,0.5);
    border-style: solid;
    pointer-events: none;
    z-index: 5;
  }
  .hud-corner.tl { top: 16px; left: 16px; border-width: 2px 0 0 2px; }
  .hud-corner.tr { top: 16px; right: 16px; border-width: 2px 2px 0 0; }
  .hud-corner.bl { bottom: 72px; left: 16px; border-width: 0 0 2px 2px; }
  .hud-corner.br { bottom: 72px; right: 16px; border-width: 0 2px 2px 0; }

  /* ── top bar ── */
  .top-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
    z-index: 10;
    pointer-events: none;
  }
  .top-bar .label {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #00ff80;
  }
  .top-bar .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #00ff80;
    box-shadow: 0 0 8px #00ff80;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }

  /* ── model input ── */
  .model-input {
    position: absolute;
    top: 14px; right: 16px;
    background: rgba(0,0,0,0.6);
    border: 1px solid rgba(0,255,128,0.3);
    color: #00ff80;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    padding: 4px 10px;
    width: 110px;
    outline: none;
    z-index: 10;
    letter-spacing: 1px;
    pointer-events: all;
  }
  .model-input:focus { border-color: #00ff80; }

  /* ── result panel ── */
  .result-panel {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    min-height: 64px;
    background: linear-gradient(to top, rgba(0,0,0,0.9) 60%, transparent);
    padding: 12px 20px 16px;
    z-index: 10;
    pointer-events: none;
  }
  .result-tag {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #00ff80;
    margin-bottom: 4px;
    opacity: 0.7;
  }
  .result-text {
    font-size: clamp(12px, 3vw, 15px);
    color: #fff;
    line-height: 1.5;
  }
  .result-text.scanning {
    color: #00ff80;
    animation: flicker 0.1s step-end infinite;
  }
  @keyframes flicker {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.7; }
  }

  /* ── scan line ── */
  .scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(0,0,0,0.03) 3px,
      rgba(0,0,0,0.03) 4px
    );
    pointer-events: none;
    z-index: 4;
  }
`;

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 🔹 All drawing state in refs — never stale inside rAF loop
  const startX   = useRef(0);
  const startY   = useRef(0);
  const endX     = useRef(0);
  const endY     = useRef(0);
  const isDown   = useRef(false);
  const hasBox   = useRef(false);

  const [model, setModel]             = useState("llava");
  const [result, setResult]           = useState("Draw a selection box over any object");
  const [scanning, setScanning]       = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // ── camera ─────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        const canvas = canvasRef.current;
        canvas.width  = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        setCameraActive(true);
        loop();
      };
    } catch (err) {
      setResult("Camera error: " + err.message);
    }
  };

  // ── rAF draw loop ───────────────────────────────────────
  const loop = () => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");

    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (hasBox.current) drawBox(ctx);
    }
    requestAnimationFrame(loop);
  };

  const getSquare = () => {
    const dx   = endX.current - startX.current;
    const dy   = endY.current - startY.current;
    const size = Math.min(Math.abs(dx), Math.abs(dy));
    return {
      x: startX.current + (dx < 0 ? -size : 0),
      y: startY.current + (dy < 0 ? -size : 0),
      size,
    };
  };

  const drawBox = (ctx) => {
    const { x, y, size } = getSquare();
    if (size < 2) return;

    // Fill
    ctx.fillStyle = "rgba(0,255,128,0.06)";
    ctx.fillRect(x, y, size, size);

    // Border
    ctx.strokeStyle = "#00ff80";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, size, size);

    // Corner accents
    const c = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // TL
    ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
    // TR
    ctx.moveTo(x + size - c, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size, y + c);
    // BR
    ctx.moveTo(x + size, y + size - c); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size - c, y + size);
    // BL
    ctx.moveTo(x + c, y + size); ctx.lineTo(x, y + size); ctx.lineTo(x, y + size - c);
    ctx.stroke();

    // Size label
    ctx.fillStyle = "#00ff80";
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.fillText(`${Math.round(size)} × ${Math.round(size)}`, x + 4, y - 6);
  };

  // ── pointer helpers ─────────────────────────────────────
  const clientToCanvas = (cx, cy) => {
    const rect   = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width  / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (cx - rect.left) * scaleX,
      y: (cy - rect.top)  * scaleY,
    };
  };

  const onDown = (cx, cy) => {
    if (scanning) return;
    const p = clientToCanvas(cx, cy);
    startX.current = p.x; startY.current = p.y;
    endX.current   = p.x; endY.current   = p.y;
    isDown.current = true;
    hasBox.current = true;
  };

  const onMove = (cx, cy) => {
    if (!isDown.current) return;
    const p = clientToCanvas(cx, cy);
    endX.current = p.x;
    endY.current = p.y;
  };

  const onUp = () => {
    if (!isDown.current) return;
    isDown.current = false;
    cropAndSend();
  };

  // Mouse
  const onMouseDown = (e) => onDown(e.clientX, e.clientY);
  const onMouseMove = (e) => onMove(e.clientX, e.clientY);
  const onMouseUp   = ()  => onUp();

  // Touch
  const onTouchStart = (e) => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchMove  = (e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchEnd   = (e) => { e.preventDefault(); onUp(); };

  // ── crop & send ─────────────────────────────────────────
  const cropAndSend = () => {
    const { x, y, size } = getSquare();
    if (size < 20) { setResult("Selection too small — try again"); return; }

    const tmp = document.createElement("canvas");
    tmp.width = size; tmp.height = size;
    tmp.getContext("2d").drawImage(canvasRef.current, x, y, size, size, 0, 0, size, size);
    api(tmp.toDataURL("image/jpeg", 0.85).split(",")[1]);
  };

  const api = async (base64) => {
    setScanning(true);
    setResult("Analysing...");
    try {
      const res = await axios.post(import.meta.env.VITE_URL_URL, {
        image: base64,
        prompt: "What is in this image? Be concise.",
      });
      setResult(res.data.result);
    } catch (err) {
      setResult("Error: " + err.message);
    } finally {
      setScanning(false);
      hasBox.current = false;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="wrapper">

        {/* Camera feed */}
        <video ref={videoRef} autoPlay muted playsInline />

        {/* Drawing canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />

        {/* CRT scanlines */}
        <div className="scanline" />

        {/* HUD corners */}
        <div className="hud-corner tl" />
        <div className="hud-corner tr" />
        <div className="hud-corner bl" />
        <div className="hud-corner br" />

        {/* Top bar */}
        <div className="top-bar">
          <span className="label">ObjectScan</span>
          {cameraActive && <div className="dot" />}
        </div>

        {/* Model selector */}
        {cameraActive && (
          <input
            className="model-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="model"
          />
        )}

        {/* Result */}
        {cameraActive && (
          <div className="result-panel">
            <div className="result-tag">/ output</div>
            <div className={`result-text ${scanning ? "scanning" : ""}`}>{result}</div>
          </div>
        )}

        {/* Splash screen — hidden once camera starts */}
        <div className={`splash ${cameraActive ? "hidden" : ""}`}>
          <div className="splash-icon" />
          <div>
            <h1>Object<span>Scan</span></h1>
            <p style={{ marginTop: 8 }}>AI-powered visual identifier</p>
          </div>
          <button className="btn-start" onClick={startCamera}>
            <span>&#9654; Enable Camera</span>
          </button>
        </div>

      </div>
    </>
  );
}