import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #060a07; height: 100%; }

  :root {
    --green: #00ff80;
    --green-dim: rgba(0,255,128,0.15);
    --green-border: rgba(0,255,128,0.2);
    --bg-panel: #080f0a;
    --bg-msg-ai: rgba(0,255,128,0.06);
  }

  .app-shell { display: contents; }

  .wrapper {
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    overflow: hidden;
    font-family: 'Space Mono', monospace;
  }

  video {
    position: absolute;
    inset: 0;
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

  /* ── scan flash ── */
  .scan-flash {
    position: absolute;
    inset: 0;
    background: rgba(0,255,128,0.18);
    z-index: 15;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.08s ease;
  }
  .scan-flash.active { opacity: 1; }

  /* ── draw hint ── */
  .draw-hint {
    position: absolute;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    pointer-events: none;
    transition: opacity 0.5s ease;
  }
  .draw-hint.hidden { opacity: 0; }
  .hint-icon {
    width: 52px; height: 52px;
    border: 1.5px dashed rgba(0,255,128,0.5);
    border-radius: 4px;
    position: relative;
    animation: hint-pulse 2s ease-in-out infinite;
  }
  .hint-icon::after {
    content: '';
    position: absolute;
    inset: 6px;
    border: 1.5px solid rgba(0,255,128,0.3);
    border-radius: 2px;
    animation: hint-inner 2s ease-in-out infinite;
  }
  @keyframes hint-pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50%       { transform: scale(1.08); opacity: 1; }
  }
  @keyframes hint-inner {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 0.8; }
  }
  .hint-text {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,255,128,0.6);
    text-align: center;
  }

  /* ── capture follow-up overlay ── */
  .capture-overlay {
    position: absolute;
    inset: 0;
    z-index: 8;
    pointer-events: none;
    transition: opacity 0.3s ease;
    opacity: 0;
  }
  .capture-overlay.active { opacity: 1; }

  /* animated border */
  .capture-overlay::before {
    content: '';
    position: absolute;
    inset: 3px;
    border: 1.5px dashed rgba(0,255,128,0.45);
    border-radius: 4px;
    animation: border-march 1.2s linear infinite;
    background: linear-gradient(135deg,
      rgba(0,255,128,0.03) 0%,
      transparent 60%
    );
  }
  @keyframes border-march {
    0%   { border-color: rgba(0,255,128,0.45); }
    50%  { border-color: rgba(0,255,128,0.15); }
    100% { border-color: rgba(0,255,128,0.45); }
  }

  .capture-banner {
    position: absolute;
    top: 56px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 12;
    background: rgba(0,0,0,0.82);
    border: 1px solid var(--green);
    color: var(--green);
    font-size: 10px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    padding: 8px 18px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease, transform 0.25s ease;
    transform: translateX(-50%) translateY(-6px);
    white-space: nowrap;
  }
  .capture-banner.active {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  .capture-banner-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
    animation: blink 0.8s step-end infinite;
    flex-shrink: 0;
  }

  .capture-cancel-btn {
    position: absolute;
    top: 56px;
    right: 16px;
    z-index: 13;
    background: rgba(0,0,0,0.8);
    border: 1px solid rgba(0,255,128,0.35);
    color: rgba(0,255,128,0.8);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 7px 14px;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: all;
    transition: background 0.2s, border-color 0.2s;
    opacity: 0;
    transform: translateY(-6px);
    transition: opacity 0.25s ease, transform 0.25s ease, background 0.2s;
  }
  .capture-cancel-btn.active { opacity: 1; transform: translateY(0); }
  .capture-cancel-btn:hover { background: rgba(255,40,40,0.15); border-color: rgba(255,80,80,0.5); color: #ff8080; }

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
    text-align: center;
    padding: 24px;
  }
  .splash.hidden { opacity: 0; visibility: hidden; pointer-events: none; }

  .splash-icon {
    width: 80px; height: 80px;
    border: 2px solid var(--green);
    border-radius: 4px;
    position: relative;
    animation: pulse-border 2s ease-in-out infinite;
  }
  .splash-icon::before, .splash-icon::after {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    border-color: var(--green);
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
  .splash h1 span { color: var(--green); }
  .splash p { font-size: 12px; color: #555; letter-spacing: 2px; text-transform: uppercase; text-align: center; }

  .btn-start {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 32px;
    background: transparent;
    border: 1px solid var(--green);
    color: var(--green);
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
    background: var(--green);
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
  }
  .top-bar .label { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--green); pointer-events: none; }
  .top-bar .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: blink 1.5s step-end infinite;
    pointer-events: none;
  }
  @keyframes blink { 50% { opacity: 0; } }

  /* ── history button ── */
  .history-btn {
    background: transparent;
    border: 1px solid var(--green-border);
    color: var(--green);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    padding: 5px 10px;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.2s, border-color 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .history-btn:hover { background: var(--green-dim); border-color: var(--green); }
  .history-badge {
    background: var(--green);
    color: #000;
    border-radius: 2px;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    min-width: 16px;
    text-align: center;
  }
  @media (min-width: 768px) {
    .history-btn { display: none; }
  }

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
    border: 1px solid var(--green-border);
    border-radius: 6px;
    padding: 10px 14px;
    background: rgba(0,255,128,0.04);
    backdrop-filter: blur(4px);
    transition: border-color 0.2s, background 0.2s;
  }
  .result-panel:hover .result-inner { border-color: rgba(0,255,128,0.5); background: var(--green-dim); }
  .result-left { flex: 1; min-width: 0; }
  .result-tag { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--green); opacity: 0.7; margin-bottom: 4px; }
  .result-text {
    font-size: clamp(12px, 3vw, 14px);
    color: #fff;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .result-text.scanning { color: var(--green); animation: flicker 0.15s step-end infinite; }
  @keyframes flicker { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
  .result-chevron {
    color: rgba(0,255,128,0.6);
    font-size: 18px;
    flex-shrink: 0;
    transition: transform 0.2s;
  }
  .result-panel:hover .result-chevron { transform: translateY(-2px); }

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
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
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
    background: var(--bg-panel);
    border-top: 1px solid rgba(0,255,128,0.25);
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    max-height: 82vh;
    display: flex;
    flex-direction: column;
  }
  .popover-backdrop.open .popover { transform: translateY(0); }

  @media (min-width: 768px) {
    .popover-backdrop {
      align-items: stretch;
      justify-content: flex-end;
      background: rgba(0,0,0,0.3);
    }
    .popover {
      width: 400px;
      max-height: 100vh;
      height: 100vh;
      border-radius: 0;
      border-top: none;
      border-left: 1px solid rgba(0,255,128,0.2);
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .popover-backdrop.open .popover { transform: translateX(0); }
    .popover-handle { display: none; }
    .hud-corner.br { bottom: 16px; }
    .hud-corner.bl { bottom: 16px; }
    .result-panel { max-width: calc(100% - 420px); }
  }

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
    color: var(--green);
  }
  .popover-actions { display: flex; gap: 8px; align-items: center; }
  .popover-action-btn {
    background: transparent;
    border: 1px solid var(--green-border);
    color: rgba(0,255,128,0.6);
    width: 28px; height: 28px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s, color 0.2s;
    font-family: 'Space Mono', monospace;
  }
  .popover-action-btn:hover { background: var(--green-dim); color: var(--green); }
  .popover-close {
    background: transparent;
    border: 1px solid var(--green-border);
    color: var(--green);
    width: 28px; height: 28px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
    font-family: 'Space Mono', monospace;
  }
  .popover-close:hover { background: var(--green-dim); }

  /* ── scan thumbnail ── */
  .scan-thumb-row {
    padding: 12px 20px 0;
    flex-shrink: 0;
  }
  .scan-thumb-wrap {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(0,255,128,0.04);
    border: 1px solid var(--green-border);
    border-radius: 6px;
    padding: 6px 10px 6px 6px;
  }
  .scan-thumb {
    width: 40px; height: 40px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid rgba(0,255,128,0.2);
    flex-shrink: 0;
  }
  .scan-thumb-label {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,255,128,0.5);
    line-height: 1.4;
  }
  .scan-thumb-label strong { display: block; color: rgba(0,255,128,0.8); font-size: 10px; }

  /* ── chat messages ── */
  .chat-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 20px;
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
    animation: msg-in 0.22s ease;
  }
  @keyframes msg-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .msg.assistant { align-items: flex-start; }
  .msg.user      { align-items: flex-end; }

  .msg-label {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.4;
    color: var(--green);
  }
  .msg.user .msg-label { color: #fff; }

  .msg-bubble-wrap { position: relative; max-width: 85%; }
  .msg-bubble-wrap:hover .msg-copy { opacity: 1; }

  .msg-bubble {
    padding: 10px 14px;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-wrap;
  }
  .msg.assistant .msg-bubble {
    background: var(--bg-msg-ai);
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

  /* ── msg with image attachment ── */
  .msg-attachment {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 6px 6px;
    background: rgba(0,255,128,0.06);
    border: 1px solid rgba(0,255,128,0.2);
    border-radius: 6px;
    margin-bottom: 6px;
    max-width: 85%;
    align-self: flex-end;
    animation: msg-in 0.22s ease;
  }
  .msg-attachment-img {
    width: 44px; height: 44px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid rgba(0,255,128,0.25);
    flex-shrink: 0;
  }
  .msg-attachment-label {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,255,128,0.6);
    line-height: 1.5;
  }
  .msg-attachment-label strong { display: block; color: rgba(0,255,128,0.9); font-size: 10px; }

  /* copy btn */
  .msg-copy {
    position: absolute;
    top: 6px; right: -30px;
    background: rgba(0,0,0,0.7);
    border: 1px solid var(--green-border);
    color: rgba(0,255,128,0.6);
    width: 22px; height: 22px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s;
  }
  .msg.user .msg-copy { right: auto; left: -30px; }
  .msg-copy:hover { background: var(--green-dim); color: var(--green); }
  .msg-copy.copied { color: var(--green); opacity: 1; }

  /* typing indicator */
  .typing-dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--green);
    margin: 0 2px;
    animation: typing 1s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes typing {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
    40%           { transform: scale(1.2); opacity: 1; }
  }

  /* ── suggestion chips ── */
  .chips-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 0 20px 10px;
    flex-shrink: 0;
  }
  .chip {
    background: transparent;
    border: 1px solid var(--green-border);
    color: rgba(0,255,128,0.7);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    padding: 6px 12px;
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
    white-space: nowrap;
  }
  .chip:hover { background: var(--green-dim); border-color: var(--green); color: var(--green); }
  .chip:active { transform: scale(0.95); }

  /* ── chat input bar ── */
  .chat-input-bar {
    display: flex;
    gap: 8px;
    padding: 10px 16px 20px;
    border-top: 1px solid rgba(0,255,128,0.1);
    flex-shrink: 0;
    align-items: flex-end;
    flex-direction: column;
  }

  /* pending image preview row */
  .pending-image-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0,255,128,0.05);
    border: 1px solid rgba(0,255,128,0.2);
    border-radius: 6px;
    padding: 6px 10px 6px 6px;
    animation: msg-in 0.2s ease;
  }
  .pending-image-thumb {
    width: 38px; height: 38px;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid rgba(0,255,128,0.25);
    flex-shrink: 0;
  }
  .pending-image-label {
    flex: 1;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,255,128,0.6);
    line-height: 1.5;
  }
  .pending-image-label strong { display: block; color: rgba(0,255,128,0.9); font-size: 10px; }
  .pending-image-remove {
    background: transparent;
    border: 1px solid rgba(255,80,80,0.3);
    color: rgba(255,100,100,0.7);
    width: 22px; height: 22px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s, color 0.2s;
  }
  .pending-image-remove:hover { background: rgba(255,40,40,0.15); color: #ff8080; }

  /* input row (textarea + buttons) */
  .input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    width: 100%;
  }

  .chat-input-wrap { flex: 1; position: relative; }

  .chat-input {
    width: 100%;
    background: rgba(0,255,128,0.04);
    border: 1px solid var(--green-border);
    border-radius: 6px;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 10px 14px;
    resize: none;
    outline: none;
    line-height: 1.5;
    min-height: 42px;
    max-height: 110px;
    overflow-y: auto;
    transition: border-color 0.2s;
    display: block;
  }
  .chat-input::placeholder { color: rgba(255,255,255,0.25); }
  .chat-input:focus { border-color: rgba(0,255,128,0.5); }

  .char-count {
    position: absolute;
    bottom: 6px; right: 10px;
    font-size: 9px;
    color: rgba(255,255,255,0.2);
    pointer-events: none;
    transition: color 0.2s;
  }
  .char-count.warn { color: rgba(255,140,0,0.6); }

  /* camera capture button */
  .chat-capture-btn {
    background: transparent;
    border: 1px solid var(--green-border);
    color: rgba(0,255,128,0.7);
    font-size: 16px;
    padding: 0;
    width: 42px;
    height: 42px;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.1s;
    position: relative;
    overflow: hidden;
  }
  .chat-capture-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--green-dim);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .chat-capture-btn:hover { border-color: var(--green); color: var(--green); }
  .chat-capture-btn:hover::before { opacity: 1; }
  .chat-capture-btn:active { transform: scale(0.9); }
  /* pulsing ring when capturing */
  .chat-capture-btn.capturing {
    border-color: var(--green);
    color: var(--green);
    animation: capture-ring 1s ease-in-out infinite;
  }
  @keyframes capture-ring {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,128,0.4); }
    50%       { box-shadow: 0 0 0 5px rgba(0,255,128,0); }
  }

  .chat-send {
    background: var(--green);
    border: none;
    color: #000;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.2s, transform 0.1s, background 0.2s;
    height: 42px;
    min-width: 42px;
  }
  .chat-send:disabled { opacity: 0.3; cursor: not-allowed; background: rgba(0,255,128,0.5); }
  .chat-send:not(:disabled):hover { background: #00e070; }
  .chat-send:not(:disabled):active { transform: scale(0.93); }

  /* ── history panel ── */
  .history-panel {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--bg-panel);
    z-index: 40;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .history-panel.open { transform: translateX(0); }

  @media (min-width: 768px) {
    .history-panel {
      left: auto;
      width: 400px;
      border-left: 1px solid rgba(0,255,128,0.2);
    }
  }
  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0,255,128,0.15);
    flex-shrink: 0;
  }
  .history-title {
    font-family: 'Syne', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--green);
  }
  .history-back {
    background: transparent;
    border: 1px solid var(--green-border);
    color: var(--green);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    padding: 5px 12px;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.2s;
  }
  .history-back:hover { background: var(--green-dim); }
  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,255,128,0.2) transparent;
  }
  .history-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    opacity: 0.4;
  }
  .history-empty-icon { font-size: 36px; }
  .history-empty-text { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--green); }

  .history-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: var(--bg-msg-ai);
    border: 1px solid var(--green-border);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    animation: msg-in 0.2s ease;
  }
  .history-item:hover { border-color: rgba(0,255,128,0.4); background: var(--green-dim); }
  .history-thumb {
    width: 48px; height: 48px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid rgba(0,255,128,0.2);
    flex-shrink: 0;
  }
  .history-info { flex: 1; min-width: 0; }
  .history-num { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: rgba(0,255,128,0.5); margin-bottom: 4px; }
  .history-desc { font-size: 12px; color: #d4ffd4; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .history-msgs { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 4px; }

  /* ── toast ── */
  .toast {
    position: absolute;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(12px);
    background: rgba(0,255,128,0.15);
    border: 1px solid rgba(0,255,128,0.4);
    color: var(--green);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 8px 16px;
    border-radius: 4px;
    z-index: 50;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    white-space: nowrap;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

const SUGGESTIONS = [
  "Where can I buy this?",
  "How much does it cost?",
  "Tell me more about it",
  "Is it safe to use?",
  "What is it made of?",
];

export default function App() {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const chatBodyRef = useRef(null);
  const inputRef    = useRef(null);
  const flashRef    = useRef(null);

  const startX = useRef(0); const startY = useRef(0);
  const endX   = useRef(0); const endY   = useRef(0);
  const isDown = useRef(false);
  const hasBox = useRef(false);

  const [result, setResult]             = useState("Draw a selection box over any object");
  const [scanning, setScanning]         = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [popoverOpen, setPopoverOpen]   = useState(false);
  const [lastImage, setLastImage]       = useState("");
  const [showHint, setShowHint]         = useState(true);

  const [messages, setMessages]         = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatBusy, setChatBusy]         = useState(false);
  const [scanContext, setScanContext]   = useState("");

  const [history, setHistory]           = useState([]);
  const [historyOpen, setHistoryOpen]   = useState(false);

  const [copiedIdx, setCopiedIdx]       = useState(null);
  const [toast, setToast]               = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  // ── follow-up capture state ──────────────────────────────
  const [capturingFollowUp, setCapturingFollowUp] = useState(false);
  const [pendingImage, setPendingImage]           = useState(""); // base64 of the in-chat capture

  const showToast = (msg) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  };

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
    // Different colour when in follow-up capture mode
    const color = capturingFollowUp ? "#00cfff" : "#00ff80";
    ctx.fillStyle = capturingFollowUp ? "rgba(0,207,255,0.07)" : "rgba(0,255,128,0.06)";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, size, size);
    const c = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + c);               ctx.lineTo(x, y);              ctx.lineTo(x + c, y);
    ctx.moveTo(x + size - c, y);        ctx.lineTo(x + size, y);       ctx.lineTo(x + size, y + c);
    ctx.moveTo(x + size, y + size - c); ctx.lineTo(x + size, y + size);ctx.lineTo(x + size - c, y + size);
    ctx.moveTo(x + c, y + size);        ctx.lineTo(x, y + size);       ctx.lineTo(x, y + size - c);
    ctx.stroke();
    ctx.fillStyle = color;
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
    if (scanning) return;
    // In follow-up capture mode we allow drawing even if popover would normally block
    if (popoverOpen && !capturingFollowUp) return;
    const p = clientToCanvas(cx, cy);
    startX.current = p.x; startY.current = p.y;
    endX.current   = p.x; endY.current   = p.y;
    isDown.current = true;
    hasBox.current = true;
    if (!capturingFollowUp) setShowHint(false);
  };
  const onMove = (cx, cy) => {
    if (!isDown.current) return;
    const p = clientToCanvas(cx, cy);
    endX.current = p.x; endY.current = p.y;
  };
  const onUp = () => {
    if (!isDown.current) return;
    isDown.current = false;
    if (capturingFollowUp) {
      cropForFollowUp();
    } else {
      cropAndSend();
    }
  };

  const onMouseDown  = (e) => onDown(e.clientX, e.clientY);
  const onMouseMove  = (e) => onMove(e.clientX, e.clientY);
  const onMouseUp    = ()  => onUp();
  const onTouchStart = (e) => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchMove  = (e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchEnd   = (e) => { e.preventDefault(); onUp(); };

  const triggerFlash = () => {
    if (!flashRef.current) return;
    flashRef.current.classList.add("active");
    setTimeout(() => flashRef.current && flashRef.current.classList.remove("active"), 120);
  };

  const cropAndSend = () => {
    const { x, y, size } = getSquare();
    if (size < 20) { setResult("Selection too small — try again"); return; }
    triggerFlash();
    const tmp = document.createElement("canvas");
    tmp.width = size; tmp.height = size;
    tmp.getContext("2d").drawImage(canvasRef.current, x, y, size, size, 0, 0, size, size);
    apiScan(tmp.toDataURL("image/jpeg", 0.85).split(",")[1], "What is in this image? Be concise.");
  };

  // ── follow-up capture ───────────────────────────────────
  const startFollowUpCapture = () => {
    setPopoverOpen(false);
    setCapturingFollowUp(true);
    hasBox.current = false;
    showToast("Draw a box to capture");
  };

  const cancelFollowUpCapture = () => {
    setCapturingFollowUp(false);
    hasBox.current = false;
    setPopoverOpen(true);
  };

  const cropForFollowUp = () => {
    const { x, y, size } = getSquare();
    if (size < 20) {
      setCapturingFollowUp(false);
      setPopoverOpen(true);
      showToast("Selection too small — cancelled");
      return;
    }
    triggerFlash();
    const tmp = document.createElement("canvas");
    tmp.width = size; tmp.height = size;
    tmp.getContext("2d").drawImage(canvasRef.current, x, y, size, size, 0, 0, size, size);
    const base64 = tmp.toDataURL("image/jpeg", 0.85).split(",")[1];
    setPendingImage(base64);
    setCapturingFollowUp(false);
    hasBox.current = false;
    setPopoverOpen(true);
    showToast("Image captured — add a message");
    setTimeout(() => inputRef.current && inputRef.current.focus(), 400);
  };

  // ── initial scan ────────────────────────────────────────
  const apiScan = async (base64, prompt) => {
    setScanning(true);
    setResult("Analysing...");
    setMessages([]);
    setScanContext("");
    setPopoverOpen(true);

    try {
      const res = await axios.post(import.meta.env.VITE_URL_URL, {
        image: base64,
        prompt: prompt,
      });
      const answer = res.data.result;
      setResult(answer);
      setScanContext(answer);
      setMessages([{ role: "assistant", text: answer }]);
      setLastImage(base64);
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

  // save to history when scan completes
  useEffect(() => {
    if (!scanning && scanContext && lastImage) {
      setHistory(prev => {
        const entry = { id: Date.now(), image: lastImage, description: scanContext, messages: [] };
        return [entry, ...prev.slice(0, 19)];
      });
    }
  }, [scanning, scanContext]);

  // update history messages count
  useEffect(() => {
    if (history.length > 0 && messages.length > 1) {
      setHistory(prev => {
        const updated = [...prev];
        updated[0] = { ...updated[0], messages };
        return updated;
      });
    }
  }, [messages]);

  // ── follow-up chat (supports optional image attachment) ─
  const sendChat = async (overrideText) => {
    const q = (overrideText || chatInput).trim();
    if ((!q && !pendingImage) || chatBusy) return;

    const capturedImg = pendingImage;
    const displayText = q || "What is in this image?";

    // Build the user message to display
    const userMsg = {
      role: "user",
      text: displayText,
      ...(capturedImg ? { attachedImage: capturedImg } : {}),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatInput("");
    setPendingImage("");
    setChatBusy(true);
    scrollToBottom();

    const systemPrompt = `You are an object identification assistant. The user scanned an object with their camera and the initial analysis was:\n\n"${scanContext}"\n\nAnswer follow-up questions about this object concisely and helpfully.${capturedImg ? " The user has also attached a new image in this follow-up — analyse it in context of the conversation." : ""} Don't repeat the full initial description unless asked.`;

    try {
      const res = await axios.post(import.meta.env.VITE_URL_URL, {
        // Send the follow-up image if available, otherwise keep the original
        image: capturedImg || lastImage,
        prompt: systemPrompt + "\n\n" + displayText,
      });
      const data = res.data.result;
      setMessages(prev => [...prev, { role: "assistant", text: data }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Error: " + err.message }]);
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

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    e.target.style.height = "42px";
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      showToast("Copied!");
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  const loadHistoryItem = (item) => {
    setLastImage(item.image);
    setScanContext(item.description);
    setMessages(item.messages.length > 0 ? item.messages : [{ role: "assistant", text: item.description }]);
    setResult(item.description);
    setHistoryOpen(false);
    setPopoverOpen(true);
    scrollToBottom();
  };

  const charCount = chatInput.length;
  const canSend   = (chatInput.trim().length > 0 || pendingImage.length > 0) && !chatBusy;

  return (
    <>
      <style>{CSS}</style>
      <div className="app-shell">
      <div className="wrapper">
        <video ref={videoRef} autoPlay muted playsInline />

        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        />

        <div className="scan-flash" ref={flashRef} />
        <div className="scanline" />
        <div className="hud-corner tl" /><div className="hud-corner tr" />
        <div className="hud-corner bl" /><div className="hud-corner br" />

        {/* ── Follow-up capture overlay & banner ── */}
        <div className={`capture-overlay ${capturingFollowUp ? "active" : ""}`} />

        <div className={`capture-banner ${capturingFollowUp ? "active" : ""}`}>
          <span className="capture-banner-dot" />
          Capture mode — draw a selection
        </div>

        <button
          className={`capture-cancel-btn ${capturingFollowUp ? "active" : ""}`}
          onClick={cancelFollowUpCapture}
        >
          ✕ Cancel
        </button>

        {/* draw hint */}
        {cameraActive && !capturingFollowUp && (
          <div className={`draw-hint ${!showHint ? "hidden" : ""}`}>
            <div className="hint-icon" />
            <div className="hint-text">Drag to select an object</div>
          </div>
        )}

        <div className="top-bar">
          <span className="label">ObjectScan</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {cameraActive && <div className="dot" />}
            {cameraActive && (
              <button className="history-btn" onClick={() => setHistoryOpen(true)}>
                History
                {history.length > 0 && <span className="history-badge">{history.length}</span>}
              </button>
            )}
          </div>
        </div>

        {cameraActive && !capturingFollowUp && (
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
              <div className="popover-actions">
                {messages.length > 0 && !scanning && (
                  <button
                    className="popover-action-btn"
                    title="Copy full analysis"
                    onClick={() => { copyMessage(messages[0]?.text || "", -1); }}
                  >⎘</button>
                )}
                <button className="popover-close" onClick={() => setPopoverOpen(false)}>✕</button>
              </div>
            </div>

            {/* Scan thumbnail */}
            {lastImage && !scanning && (
              <div className="scan-thumb-row">
                <div className="scan-thumb-wrap">
                  <img src={`data:image/jpeg;base64,${lastImage}`} className="scan-thumb" alt="scan" />
                  <div className="scan-thumb-label">
                    <strong>Scanned object</strong>
                    {messages.length > 1 ? `${messages.length - 1} follow-up${messages.length > 2 ? "s" : ""}` : "Tap to ask anything"}
                  </div>
                </div>
              </div>
            )}

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
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
                  {/* Show attached image above the bubble for user messages */}
                  {m.role === "user" && m.attachedImage && (
                    <div className="msg-attachment">
                      <img
                        src={`data:image/jpeg;base64,${m.attachedImage}`}
                        className="msg-attachment-img"
                        alt="attached"
                      />
                      <div className="msg-attachment-label">
                        <strong>New capture</strong>
                        attached image
                      </div>
                    </div>
                  )}
                  <div className={`msg ${m.role}`}>
                    <span className="msg-label">{m.role === "assistant" ? "objectscan" : "you"}</span>
                    <div className="msg-bubble-wrap">
                      <div className="msg-bubble">{m.text}</div>
                      <button
                        className={`msg-copy ${copiedIdx === i ? "copied" : ""}`}
                        onClick={() => copyMessage(m.text, i)}
                        title="Copy"
                      >{copiedIdx === i ? "✓" : "⎘"}</button>
                    </div>
                  </div>
                </div>
              ))}

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

            {/* Suggestion chips */}
            {messages.length === 1 && !scanning && !chatBusy && (
              <div className="chips-row">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => sendChat(s)}>{s}</button>
                ))}
              </div>
            )}

            {/* Input bar */}
            {messages.length > 0 && !scanning && (
              <div className="chat-input-bar">
                {/* Pending image preview */}
                {pendingImage && (
                  <div className="pending-image-row">
                    <img
                      src={`data:image/jpeg;base64,${pendingImage}`}
                      className="pending-image-thumb"
                      alt="pending capture"
                    />
                    <div className="pending-image-label">
                      <strong>New capture ready</strong>
                      will be sent with your message
                    </div>
                    <button
                      className="pending-image-remove"
                      onClick={() => setPendingImage("")}
                      title="Remove image"
                    >✕</button>
                  </div>
                )}

                <div className="input-row">
                  {/* Camera / capture button */}
                  <button
                    className={`chat-capture-btn ${capturingFollowUp ? "capturing" : ""}`}
                    onClick={startFollowUpCapture}
                    title="Capture a new image to attach"
                    disabled={chatBusy}
                  >
                    {/* Camera SVG icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </button>

                  <div className="chat-input-wrap">
                    <textarea
                      ref={inputRef}
                      className="chat-input"
                      placeholder={pendingImage ? "Add a message (or send image only)…" : "Ask anything about this object…"}
                      value={chatInput}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      rows={1}
                    />
                    {charCount > 0 && (
                      <span className={`char-count ${charCount > 400 ? "warn" : ""}`}>{charCount}</span>
                    )}
                  </div>

                  <button className="chat-send" onClick={() => sendChat()} disabled={!canSend}>
                    ↑
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── History panel ── */}
        <div className={`history-panel ${historyOpen ? "open" : ""}`}>
          <div className="history-header">
            <span className="history-title">/ Scan History</span>
            <button className="history-back" onClick={() => setHistoryOpen(false)}>← Back</button>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-icon">◫</div>
                <div className="history-empty-text">No scans yet</div>
              </div>
            ) : (
              history.map((item, i) => (
                <div key={item.id} className="history-item" onClick={() => loadHistoryItem(item)}>
                  <img src={`data:image/jpeg;base64,${item.image}`} className="history-thumb" alt="scan" />
                  <div className="history-info">
                    <div className="history-num">Scan #{history.length - i}</div>
                    <div className="history-desc">{item.description}</div>
                    {item.messages.length > 1 && (
                      <div className="history-msgs">{item.messages.length - 1} follow-up message{item.messages.length > 2 ? "s" : ""}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Splash ── */}
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

        {/* ── Toast ── */}
        <div className={`toast ${toastVisible ? "show" : ""}`}>{toast}</div>
      </div>
      </div>
    </>
  );
}