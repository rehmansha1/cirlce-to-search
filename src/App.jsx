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
  .splash.hidden { opacity: 0; visibility: hidden; pointer-events: none; }

  .splash-icon {
    width: 80px; height: 80px;
    border: 2px solid #00ff80;
    border-radius: 4px;
    position: relative;
    animation: pulse-border 2s ease-in-out infinite;
  }
  .splash-icon::before, .splash-icon::after {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
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
  .splash p { font-size: 12px; color: #555; letter-spacing: 2px; text-transform: uppercase; text-align: center; }

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

  /* ── HUD corners ── */
  .hud-corner {
    position: absolute;
    width: 24px; height: 24px;
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
  .top-bar .label { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #00ff80; }
  .top-bar .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #00ff80;
    box-shadow: 0 0 8px #00ff80;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }

  /* ── result pill (bottom bar) ── */
  .result-panel {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 12px 20px 20px;
    background: linear-gradient(to top, rgba(0,0,0,0.92) 70%, transparent);
    z-index: 10;
    cursor: pointer;
    user-select: none;
    transition: opacity 0.2s;
  }
  .result-panel:active { opacity: 0.7; }

  .result-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid rgba(0,255,128,0.2);
    border-radius: 6px;
    padding: 10px 14px;
    background: rgba(0,255,128,0.04);
    backdrop-filter: blur(4px);
    transition: border-color 0.2s, background 0.2s;
  }
  .result-panel:hover .result-inner {
    border-color: rgba(0,255,128,0.5);
    background: rgba(0,255,128,0.08);
  }

  .result-left { flex: 1; min-width: 0; }
  .result-tag { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #00ff80; opacity: 0.7; margin-bottom: 4px; }
  .result-text {
    font-size: clamp(12px, 3vw, 14px);
    color: #fff;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .result-text.scanning { color: #00ff80; animation: flicker 0.1s step-end infinite; }
  @keyframes flicker { 0%,100% { opacity:1; } 50% { opacity:0.7; } }

  .result-chevron {
    color: rgba(0,255,128,0.6);
    font-size: 18px;
    flex-shrink: 0;
    transition: transform 0.2s;
  }
  .result-panel:hover .result-chevron { transform: translateY(-2px); }

  /* ── popover overlay ── */
  .popover-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(6px);
    z-index: 30;
    display: flex;
    align-items: flex-end;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }
  .popover-backdrop.open { opacity: 1; visibility: visible; }

  .popover {
    width: 100%;
    background: #0d1a12;
    border-top: 1px solid rgba(0,255,128,0.3);
    border-radius: 16px 16px 0 0;
    padding: 0 0 32px;
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
  }
  .popover-backdrop.open .popover { transform: translateY(0); }

  .popover-handle {
    width: 40px; height: 4px;
    background: rgba(0,255,128,0.3);
    border-radius: 2px;
    margin: 12px auto 0;
    flex-shrink: 0;
  }

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(0,255,128,0.1);
    flex-shrink: 0;
  }
  .popover-title {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #00ff80;
  }
  .popover-close {
    background: transparent;
    border: 1px solid rgba(0,255,128,0.3);
    color: #00ff80;
    width: 28px; height: 28px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
    font-family: 'Space Mono', monospace;
  }
  .popover-close:hover { background: rgba(0,255,128,0.1); }

  .popover-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .popover-result {
    font-size: 15px;
    color: #e8ffe8;
    line-height: 1.75;
    letter-spacing: 0.3px;
  }
  .popover-result.scanning { color: #00ff80; animation: flicker 0.1s step-end infinite; }

  .popover-meta {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(0,255,128,0.1);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,255,128,0.4);
  }

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
  }
  .model-input:focus { border-color: #00ff80; }

  /* ── scanlines ── */
  .scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px, transparent 3px,
      rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px
    );
    pointer-events: none;
    z-index: 4;
  }
`;

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startX = useRef(0); const startY = useRef(0);
  const endX   = useRef(0); const endY   = useRef(0);
  const isDown = useRef(false);
  const hasBox = useRef(false);

  const [model, setModel]             = useState("llava");
  const [result, setResult]           = useState("Draw a selection box over any object");
  const [scanning, setScanning]       = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false); // 🔹 popover state

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
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
    ctx.fillStyle = "rgba(0,255,128,0.06)";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#00ff80";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, size, size);
    const c = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + c);         ctx.lineTo(x, y);             ctx.lineTo(x + c, y);
    ctx.moveTo(x + size - c, y);  ctx.lineTo(x + size, y);      ctx.lineTo(x + size, y + c);
    ctx.moveTo(x + size, y + size - c); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size - c, y + size);
    ctx.moveTo(x + c, y + size);  ctx.lineTo(x, y + size);      ctx.lineTo(x, y + size - c);
    ctx.stroke();
    ctx.fillStyle = "#00ff80";
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.fillText(`${Math.round(size)} × ${Math.round(size)}`, x + 4, y - 6);
  };

  const clientToCanvas = (cx, cy) => {
    const rect   = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width  / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  };

  const onDown = (cx, cy) => {
    if (scanning || popoverOpen) return; // 🔹 block draw when popover open
    const p = clientToCanvas(cx, cy);
    startX.current = p.x; startY.current = p.y;
    endX.current   = p.x; endY.current   = p.y;
    isDown.current = true;
    hasBox.current = true;
  };
  const onMove = (cx, cy) => {
    if (!isDown.current) return;
    const p = clientToCanvas(cx, cy);
    endX.current = p.x; endY.current = p.y;
  };
  const onUp = () => {
    if (!isDown.current) return;
    isDown.current = false;
    cropAndSend();
  };

  const onMouseDown  = (e) => onDown(e.clientX, e.clientY);
  const onMouseMove  = (e) => onMove(e.clientX, e.clientY);
  const onMouseUp    = ()  => onUp();
  const onTouchStart = (e) => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchMove  = (e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchEnd   = (e) => { e.preventDefault(); onUp(); };

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
    setPopoverOpen(true); // 🔹 auto-open popover on scan start
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

        <video ref={videoRef} autoPlay muted playsInline />

        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        />

        <div className="scanline" />
        <div className="hud-corner tl" /><div className="hud-corner tr" />
        <div className="hud-corner bl" /><div className="hud-corner br" />

        <div className="top-bar">
          <span className="label">ObjectScan</span>
          {cameraActive && <div className="dot" />}
        </div>

        {cameraActive && (
          <input className="model-input" value={model}
            onChange={(e) => setModel(e.target.value)} placeholder="model" />
        )}

        {/* 🔹 Clickable result bar */}
        {cameraActive && (
          <div className="result-panel" onClick={() => setPopoverOpen(true)}>
            <div className="result-inner">
              <div className="result-left">
                <div className="result-tag">/ output</div>
                <div className={`result-text ${scanning ? "scanning" : ""}`}>{result}</div>
              </div>
              <div className="result-chevron">↑</div>
            </div>
          </div>
        )}

        {/* 🔹 Popover */}
        <div
          className={`popover-backdrop ${popoverOpen ? "open" : ""}`}
          onClick={(e) => { if (e.target === e.currentTarget) setPopoverOpen(false); }}
        >
          <div className="popover">
            <div className="popover-handle" />
            <div className="popover-header">
              <span className="popover-title">/ Analysis Output</span>
              <button className="popover-close" onClick={() => setPopoverOpen(false)}>✕</button>
            </div>
            <div className="popover-body">
              <div className={`popover-result ${scanning ? "scanning" : ""}`}>
                {result}
              </div>
              {!scanning && result !== "Draw a selection box over any object" && (
                <div className="popover-meta">
                  Model: {model} &nbsp;·&nbsp; Tap outside to dismiss
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Splash */}
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