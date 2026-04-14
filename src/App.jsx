import { useRef, useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [model, setModel] = useState("llava");
  const [result, setResult] = useState("Draw a box over anything to identify it");
  const [drawing, setDrawing] = useState(false);
  const [scanning, setScanning] = useState(false);

  let startX = 0,
    startY = 0,
    endX = 0,
    endY = 0;

  // 🔹 Start Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        loop();
      };
    } catch (err) {
      setResult("Camera error: " + err.message);
    }
  };

  // 🔹 Draw loop
  const loop = () => {
    const ctx = canvasRef.current.getContext("2d");

    if (videoRef.current.readyState >= 2) {
      ctx.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      drawOverlay(ctx);
    }

    requestAnimationFrame(loop);
  };

  const drawOverlay = (ctx) => {
    if (!startX && !endX) return;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    ctx.strokeStyle = "#00ff80";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "rgba(0,255,128,0.07)";
    ctx.fillRect(x, y, w, h);
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    if (scanning) return;
    setDrawing(true);
    const p = getPos(e);
    startX = p.x;
    startY = p.y;
    endX = p.x;
    endY = p.y;
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const p = getPos(e);
    endX = p.x;
    endY = p.y;
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);
    cropAndSend();
  };

  const cropAndSend = () => {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    if (w < 20 || h < 20) {
      setResult("Box too small — try again");
      return;
    }

    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;

    tmp
      .getContext("2d")
      .drawImage(canvasRef.current, x, y, w, h, 0, 0, w, h);

    const base64 = tmp.toDataURL("image/jpeg", 0.85).split(",")[1];

    api(base64);
  };
const api = async(base64) =>{
  const res = await axios.post(import.meta.env.VITE_URL_URL, {
    image: base64,
    prompt: "What is in this image?"
  });
  setResult(res.data.result);
}
  return (
    <div style={{ position: "relative", width: "100%", background: "#000" }}>
      <video ref={videoRef} autoPlay muted style={{ width: "100%" }} />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          cursor: "crosshair",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      <button
        onClick={startCamera}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        Enable Camera
      </button>

      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          color: "#fff",
        }}
      >
        {result}
      </div>

      <input
        value={model}
        onChange={(e) => setModel(e.target.value)}
        style={{ position: "absolute", top: 10, right: 10 }}
      />
    </div>
  );
}