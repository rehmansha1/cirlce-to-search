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

  video { width: 100%; height: 100%; object-fit: cover; display: block; }

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

  /* ── result pill ── */
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
  .result-panel:hover .result-inner { border-color: rgba(0,255,128,0.5); background: rgba(0,255,128,0.08); }
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
  .result-text.scanning { color: #00ff80; animation: flicker 0.15s step-end infinite; }
  @keyframes flicker { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
  .result-chevron {
    color: rgba(0,255,128,0.6);
    font-size: 18px;
    flex-shrink: 0;
    transition: transform 0.2s;
  }
  .result-panel:hover .result-chevron { transform: translateY(-2px); }

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

  /* ── popover ── */
  .popover-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.55);
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
    background: #0a140e;
    border-top: 1px solid rgba(0,255,128,0.25);
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    max-height: 78vh;
    display: flex;
    flex-direction: column;
  }
  .popover-backdrop.open .popover { transform: translateY(0); }

  .popover-handle {
    width: 40px; height: 4px;
    background: rgba(0,255,128,0.25);
    border-radius: 2px;
    margin: 12px auto 0;
    flex-shrink: 0;
  }

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 12px;
    border-bottom: 1px solid rgba(0,255,128,0.1);
    flex-shrink: 0;
  }
  .popover-title {
    font-family: 'Syne', sans-serif;
    font-size: 12px;
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

  /* ── chat messages ── */
  .chat-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,255,128,0.2) transparent;
  }

  .msg {
    display: flex;
    flex-direction: column;
    gap: 4px;
    animation: msg-in 0.2s ease;
  }
  @keyframes msg-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .msg.assistant { align-items: flex-start; }
  .msg.user      { align-items: flex-end; }

  .msg-label {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.4;
    color: #00ff80;
  }
  .msg.user .msg-label { color: #fff; }

  .msg-bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-wrap;
  }
  .msg.assistant .msg-bubble {
    background: rgba(0,255,128,0.06);
    border: 1px solid rgba(0,255,128,0.15);
    color: #d4ffd4;
    border-radius: 2px 10px 10px 10px;
  }
  .msg.user .msg-bubble {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    border-radius: 10px 2px 10px 10px;
  }

  /* typing indicator */
  .typing-dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #00ff80;
    margin: 0 2px;
    animation: typing 1s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes typing {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
    40%           { transform: scale(1.2); opacity: 1; }
  }

  /* ── chat input bar ── */
  .chat-input-bar {
    display: flex;
    gap: 10px;
    padding: 12px 16px 20px;
    border-top: 1px solid rgba(0,255,128,0.1);
    flex-shrink: 0;
    align-items: flex-end;
  }

  .chat-input {
    flex: 1;
    background: rgba(0,255,128,0.04);
    border: 1px solid rgba(0,255,128,0.2);
    border-radius: 6px;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 10px 14px;
    resize: none;
    outline: none;
    line-height: 1.5;
    min-height: 42px;
    max-height: 100px;
    overflow-y: auto;
    transition: border-color 0.2s;
  }
  .chat-input::placeholder { color: rgba(255,255,255,0.25); }
  .chat-input:focus { border-color: rgba(0,255,128,0.5); }

  .chat-send {
    background: #00ff80;
    border: none;
    color: #000;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.2s, transform 0.1s;
    height: 42px;
  }
  .chat-send:disabled { opacity: 0.3; cursor: not-allowed; }
  .chat-send:not(:disabled):active { transform: scale(0.95); }
`;

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);

  const startX = useRef(0); const startY = useRef(0);
  const endX   = useRef(0); const endY   = useRef(0);
  const isDown = useRef(false);
  const hasBox = useRef(false);

  const [model, setModel]               = useState("llava");
  const [result, setResult]             = useState("Draw a selection box over any object");
  const [scanning, setScanning]         = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [popoverOpen, setPopoverOpen]   = useState(false);

  // 🔹 Chat state
  const [messages, setMessages]   = useState([]);   // { role: 'assistant'|'user', text: string }
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy]   = useState(false);
  const [scanContext, setScanContext] = useState(""); // keeps the initial scan result as context

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, 50);
  };

  // ── camera ─────────────────────────────────────────────
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
    ctx.moveTo(x, y + c);              ctx.lineTo(x, y);              ctx.lineTo(x + c, y);
    ctx.moveTo(x + size - c, y);       ctx.lineTo(x + size, y);       ctx.lineTo(x + size, y + c);
    ctx.moveTo(x + size, y + size - c);ctx.lineTo(x + size, y + size);ctx.lineTo(x + size - c, y + size);
    ctx.moveTo(x + c, y + size);       ctx.lineTo(x, y + size);       ctx.lineTo(x, y + size - c);
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
    if (scanning || popoverOpen) return;
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
    apiScan(tmp.toDataURL("image/jpeg", 0.85).split(",")[1]);
  };

  // ── initial scan ────────────────────────────────────────
  const apiScan = async (base64) => {
    setScanning(true);
    setResult("Analysing...");
    // 🔹 Reset chat for new scan
    setMessages([]);
    setScanContext("");
    setPopoverOpen(true);

    try {
      const res = await axios.post(import.meta.env.VITE_URL_URL, {
        image: base64,
        prompt: "What is in this image? Be concise.",
      });
      const answer = res.data.result;
      setResult(answer);
      setScanContext(answer);
      // 🔹 Seed chat with the scan result as first assistant message
      setMessages([{ role: "assistant", text: answer }]);
      scrollToBottom();
    } catch (err) {
      const msg = "Error: " + err.message;
      setResult(msg);
      setMessages([{ role: "assistant", text: msg }]);
    } finally {
      setScanning(false);
      hasBox.current = false;
    }
  };

  // 🔹 follow-up chat ──────────────────────────────────────
  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatBusy) return;

    const userMsg = { role: "user", text: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    scrollToBottom();

    // Build a system prompt that anchors Claude to the scan context
    const systemPrompt =
      `You are an object identification assistant. The user scanned an object with their camera and the initial analysis was:\n\n"${scanContext}"\n\nAnswer follow-up questions about this object concisely and helpfully. Don't repeat the full initial description unless asked.`;

    // Build message history for the API (exclude the seeded assistant opener — it's part of context)
    const apiMessages = nextMessages.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      const reply = data.content?.find((b) => b.type === "text")?.text || "No response.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Error: " + err.message }]);
    } finally {
      setChatBusy(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
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

        {/* ── Popover with chat ── */}
        <div
          className={`popover-backdrop ${popoverOpen ? "open" : ""}`}
          onClick={(e) => { if (e.target === e.currentTarget) setPopoverOpen(false); }}
        >
          <div className="popover">
            <div className="popover-handle" />

            <div className="popover-header">
              <span className="popover-title">/ Analysis + Chat</span>
              <button className="popover-close" onClick={() => setPopoverOpen(false)}>✕</button>
            </div>

            {/* Messages */}
            <div className="chat-body" ref={chatBodyRef}>
              {scanning && messages.length === 0 && (
                <div className="msg assistant">
                  <span className="msg-label">system</span>
                  <div className="msg-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <span className="msg-label">{m.role === "assistant" ? "objectscan" : "you"}</span>
                  <div className="msg-bubble">
                    {/* Show typing indicator on last assistant message while busy */}
                    {chatBusy && i === messages.length - 1 && m.role === "user" ? null : m.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator while waiting for chat reply */}
              {chatBusy && (
                <div className="msg assistant">
                  <span className="msg-label">objectscan</span>
                  <div className="msg-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
            </div>

            {/* Input bar — only shown after first scan result */}
            {messages.length > 0 && !scanning && (
              <div className="chat-input-bar">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Ask anything about this object…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button className="chat-send" onClick={sendChat} disabled={chatBusy || !chatInput.trim()}>
                  ↑
                </button>
              </div>
            )}
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