import { useRef, useState, useEffect } from "react";
import axios from "axios";

/* ─── helpers ──────────────────────────────────────────────── */
const SUGGESTIONS = [
  "Where can I buy this?",
  "How much does it cost?",
  "What is it used for?",
  "Is it safe to use?",
  "What is it made of?",
  "Any interesting facts?",
];

function getTags(text) {
  if (!text) return [];
  const stop = new Set([
    "the","a","an","is","it","in","on","at","to","of","and","or","but","this","that",
    "with","for","be","are","was","has","have","can","its","by","as","not","also",
    "very","some","any","there","which","been","from","would","could","they","their",
    "them","into","about","more","most","other","such","than","then","when","who",
    "will","just","like","used","made","make","see","look","appears","shows","image",
    "visible","displays","contains","object","item","appear","often","typically",
    "commonly","usually","known","called","type","kind","form","part",
  ]);
  return [
    ...new Set(
      text
        .split(/[\s,\.!?;:()\[\]"'\/\\]+/)
        .filter(w => w.length > 3 && !stop.has(w.toLowerCase()) && /^[a-zA-Z]+$/.test(w))
        .map(w => w.toLowerCase())
    ),
  ].slice(0, 6);
}

function buildFollowUpPrompt(scanContext, messages, newQuestion) {
  const history = messages
    .map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.text}`)
    .join("\n\n");
  return (
    `You are an expert object identification assistant. The camera scanned an object and the initial analysis was:\n\n` +
    `"${scanContext}"\n\n` +
    `Conversation so far:\n${history}\n\n` +
    `User: ${newQuestion}\n\nAssistant:`
  );
}

/* ─── CSS ──────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #000; height: 100%; overflow: hidden; }

  :root {
    --g:    #00ff80;
    --g2:   #00cc65;
    --gd:   rgba(0,255,128,0.10);
    --gb:   rgba(0,255,128,0.18);
    --border:    rgba(0,255,128,0.16);
    --border-hi: rgba(0,255,128,0.45);
    --panel-bg:  #060d08;
    --text-body: #bff0cc;
    --text-dim:  rgba(0,255,128,0.42);
  }

  .wrapper {
    position: fixed; inset: 0;
    background: #000;
    overflow: hidden;
    font-family: 'Space Mono', monospace;
    color: var(--g);
  }

  video {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
  }

  canvas {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    cursor: crosshair;
    touch-action: none;
    z-index: 2;
  }

  /* ── atmosphere overlays ── */
  .vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 45%, transparent 32%, rgba(0,0,0,0.82) 100%);
    pointer-events: none; z-index: 3;
  }
  .scanlines {
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0, transparent 2px,
      rgba(0,0,0,0.055) 2px, rgba(0,0,0,0.055) 4px
    );
    pointer-events: none; z-index: 4;
    animation: scanroll 12s linear infinite;
  }
  @keyframes scanroll {
    0%   { background-position: 0 0; }
    100% { background-position: 0 200px; }
  }
  .grain {
    position: absolute; inset: 0;
    pointer-events: none; z-index: 5;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 160px 160px;
  }
  .scan-flash {
    position: absolute; inset: 0;
    background: rgba(0,255,128,0.14);
    z-index: 15; pointer-events: none;
    opacity: 0; transition: opacity 0.06s;
  }
  .scan-flash.active { opacity: 1; }

  /* ── HUD corners ── */
  .hud { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
  .corner {
    position: absolute;
    width: 20px; height: 20px;
    border-color: rgba(0,255,128,0.38); border-style: solid;
    transition: border-color 0.3s;
  }
  .wrapper.scanning-active .corner { border-color: rgba(0,255,128,0.9); }
  .corner.tl { top: 14px; left: 14px; border-width: 2px 0 0 2px; }
  .corner.tr { top: 14px; right: 14px; border-width: 2px 2px 0 0; }
  .corner.bl { bottom: 64px; left: 14px; border-width: 0 0 2px 2px; }
  .corner.br { bottom: 64px; right: 14px; border-width: 0 2px 2px 0; }

  @media (min-width: 768px) {
    .corner.bl, .corner.br { bottom: 14px; }
  }

  /* ── top bar ── */
  .topbar {
    position: absolute; top: 0; left: 0; right: 0; height: 50px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 14px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, transparent 100%);
    z-index: 10;
  }
  .topbar-left { display: flex; align-items: center; gap: 10px; }
  .logo {
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 800;
    letter-spacing: 4px; text-transform: uppercase;
    color: var(--g);
  }
  .logo em { color: rgba(0,255,128,0.45); font-style: normal; }
  .live-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--g); box-shadow: 0 0 7px var(--g);
    animation: blink 2s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
  .scan-badge {
    font-size: 8px; letter-spacing: 2px;
    color: var(--text-dim); border: 1px solid var(--border);
    padding: 2px 7px; border-radius: 2px;
  }
  .topbar-right { display: flex; align-items: center; gap: 7px; }
  .icon-btn {
    background: transparent; border: 1px solid var(--border);
    color: var(--text-dim); width: 30px; height: 30px;
    border-radius: 4px; cursor: pointer; font-size: 13px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .icon-btn:hover { border-color: var(--g); color: var(--g); background: var(--gd); }

  /* ── draw hint ── */
  .hint {
    position: absolute; bottom: 84px; left: 50%;
    transform: translateX(-50%);
    z-index: 10; display: flex; flex-direction: column;
    align-items: center; gap: 10px;
    pointer-events: none; transition: opacity 0.5s;
  }
  .hint.gone { opacity: 0; }
  .hint-box {
    width: 48px; height: 48px;
    border: 1.5px dashed rgba(0,255,128,0.4); border-radius: 3px;
    position: relative;
    animation: hint-pulse 2.5s ease-in-out infinite;
  }
  .hint-box::after {
    content: ''; position: absolute; inset: 7px;
    border: 1px solid rgba(0,255,128,0.18); border-radius: 2px;
  }
  @keyframes hint-pulse {
    0%,100% { opacity:.45; transform:scale(1); }
    50%      { opacity:1;   transform:scale(1.07); }
  }
  .hint-text {
    font-size: 8px; letter-spacing: 4px; text-transform: uppercase;
    color: rgba(0,255,128,0.45);
  }

  /* ── result bar ── */
  .resultbar {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 10px 14px 18px;
    background: linear-gradient(to top, rgba(0,0,0,0.96) 60%, transparent);
    z-index: 10; cursor: pointer;
  }
  .resultbar-inner {
    display: flex; align-items: center; gap: 12px;
    border: 1px solid var(--border); border-radius: 6px;
    padding: 10px 14px;
    background: rgba(0,8,4,0.7);
    backdrop-filter: blur(10px);
    transition: border-color 0.2s;
  }
  .resultbar:hover .resultbar-inner { border-color: var(--border-hi); }
  .result-tag {
    font-size: 7px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--text-dim); margin-bottom: 3px;
  }
  .result-text {
    font-size: 13px; color: #c4f0d0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.3; max-width: 280px;
  }
  .result-text.scanning { color: var(--g); animation: flicker 0.2s step-end infinite; }
  @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:0.55} }
  .result-right { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .result-scantime {
    font-size: 8px; letter-spacing: 1px; color: var(--text-dim);
    border: 1px solid var(--border); padding: 2px 6px; border-radius: 2px;
  }
  .result-arrow { color: var(--text-dim); font-size: 15px; transition: all 0.2s; }
  .resultbar:hover .result-arrow { color: var(--g); transform: translateY(-2px); }

  /* ── splash ── */
  .splash {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 40% 48%, #0a1c0f 0%, #000 62%);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 26px;
    z-index: 20; text-align: center; padding: 28px;
    transition: opacity 0.7s, visibility 0.7s;
  }
  .splash.out { opacity: 0; visibility: hidden; pointer-events: none; }

  /* radar */
  .radar {
    position: relative; width: 96px; height: 96px;
    flex-shrink: 0;
  }
  .radar-ring {
    position: absolute; inset: 0;
    border-radius: 50%; border: 1px solid rgba(0,255,128,0.18);
  }
  .radar-ring:nth-child(2) { inset: 22px; border-color: rgba(0,255,128,0.13); }
  .radar-ring:nth-child(3) { inset: 44px; border-color: rgba(0,255,128,0.09); }
  .radar-line {
    position: absolute; top: 50%; left: 50%;
    width: 48px; height: 1px;
    background: linear-gradient(to right, rgba(0,255,128,0.8), transparent);
    transform-origin: left center;
    animation: radar-spin 2.8s linear infinite;
  }
  @keyframes radar-spin { to { transform: rotate(360deg); } }
  .radar-sweep {
    position: absolute; inset: 0; border-radius: 50%;
    background: conic-gradient(from 0deg, transparent 0deg, rgba(0,255,128,0.2) 35deg, transparent 55deg);
    animation: radar-spin 2.8s linear infinite;
  }
  .radar-x, .radar-y {
    position: absolute; background: rgba(0,255,128,0.08);
  }
  .radar-x { top: 50%; left: 0; right: 0; height: 1px; transform: translateY(-50%); }
  .radar-y { left: 50%; top: 0; bottom: 0; width: 1px; transform: translateX(-50%); }
  .radar-pip {
    position: absolute; border-radius: 50%;
    background: var(--g); box-shadow: 0 0 7px var(--g);
  }
  .radar-pip.a { width: 5px; height: 5px; top: 20%; left: 60%; animation: pip 2.8s ease 0.5s infinite; }
  .radar-pip.b { width: 4px; height: 4px; top: 65%; left: 28%; animation: pip 2.8s ease 1.1s infinite; }
  .radar-pip.c { width: 3px; height: 3px; top: 38%; left: 72%; animation: pip 2.8s ease 1.9s infinite; }
  @keyframes pip {
    0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)}
  }

  .splash h1 {
    font-family: 'Syne', sans-serif;
    font-size: clamp(32px, 7vw, 52px); font-weight: 800;
    color: #fff; letter-spacing: -1px; line-height: 1;
  }
  .splash h1 em { color: var(--g); font-style: normal; }
  .splash-sub {
    font-size: 9px; letter-spacing: 5px; text-transform: uppercase;
    color: rgba(255,255,255,0.2); margin-top: 6px;
  }
  .feature-list {
    display: flex; flex-direction: column; gap: 7px;
    text-align: left; align-self: flex-start;
    margin: 0 auto;
  }
  .feature-item {
    display: flex; align-items: center; gap: 10px;
    font-size: 11px; letter-spacing: 0.5px; color: rgba(0,255,128,0.45);
  }
  .feature-item::before { content: '▸'; color: var(--g); font-size: 8px; flex-shrink: 0; }
  .start-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 13px 34px; background: transparent;
    border: 1px solid var(--g); color: var(--g);
    font-family: 'Space Mono', monospace;
    font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
    cursor: pointer; position: relative; overflow: hidden;
    transition: color 0.25s;
  }
  .start-btn::before {
    content: ''; position: absolute; inset: 0;
    background: var(--g); transform: translateX(-100%);
    transition: transform 0.25s ease; z-index: 0;
  }
  .start-btn:hover::before { transform: translateX(0); }
  .start-btn:hover { color: #000; }
  .start-btn > * { position: relative; z-index: 1; }

  /* ── analysis panel ── */
  .backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.48);
    backdrop-filter: blur(5px);
    z-index: 30; display: flex; align-items: flex-end;
    opacity: 0; visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
  }
  .backdrop.open { opacity: 1; visibility: visible; }

  .panel {
    width: 100%; background: var(--panel-bg);
    border-top: 1px solid var(--border);
    border-radius: 14px 14px 0 0;
    max-height: 87vh; display: flex; flex-direction: column;
    transform: translateY(102%);
    transition: transform 0.36s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .backdrop.open .panel { transform: translateY(0); }

  @media (min-width: 768px) {
    .backdrop { align-items: stretch; justify-content: flex-end; background: rgba(0,0,0,0.3); }
    .panel {
      width: 420px; height: 100vh; max-height: 100vh;
      border-radius: 0; border-top: none;
      border-left: 1px solid var(--border);
      transform: translateX(105%);
      transition: transform 0.36s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .backdrop.open .panel { transform: translateX(0); }
    .drag-handle { display: none; }
    .resultbar { max-width: calc(100% - 440px); }
  }

  .drag-handle {
    width: 34px; height: 3px;
    background: rgba(0,255,128,0.18); border-radius: 2px;
    margin: 10px auto 0; flex-shrink: 0;
  }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px 0; flex-shrink: 0;
  }
  .panel-title {
    font-family: 'Syne', sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: 4px; text-transform: uppercase; color: var(--g);
  }
  .panel-actions { display: flex; gap: 7px; align-items: center; }
  .panel-btn {
    background: transparent; border: 1px solid var(--border);
    color: var(--text-dim); width: 27px; height: 27px;
    border-radius: 4px; cursor: pointer; font-size: 11px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; font-family: monospace;
  }
  .panel-btn:hover { border-color: var(--g); color: var(--g); background: var(--gd); }

  /* tabs */
  .tabs {
    display: flex; padding: 10px 16px 0; flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }
  .tab {
    background: transparent; border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-dim);
    font-family: 'Space Mono', monospace;
    font-size: 8px; letter-spacing: 2.5px; text-transform: uppercase;
    padding: 5px 13px 9px; cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    margin-bottom: -1px;
  }
  .tab.active { color: var(--g); border-bottom-color: var(--g); }
  .tab:hover:not(.active) { color: rgba(0,255,128,0.65); }
  .tab-pill {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--gd); color: rgba(0,255,128,0.65);
    font-size: 7px; padding: 1px 5px; border-radius: 2px;
    margin-left: 5px; vertical-align: middle; min-width: 14px;
  }

  /* ── analysis tab ── */
  .analysis-body {
    flex: 1; overflow-y: auto; padding: 14px 16px;
    scrollbar-width: thin; scrollbar-color: rgba(0,255,128,0.15) transparent;
  }

  .scan-hero {
    display: flex; gap: 13px; align-items: flex-start;
    margin-bottom: 13px;
  }
  .thumb-wrap { position: relative; flex-shrink: 0; }
  .thumb {
    width: 76px; height: 76px; object-fit: cover;
    border-radius: 5px; border: 1px solid var(--border); display: block;
  }
  .thumb-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(0,255,128,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,128,0.07) 1px, transparent 1px);
    background-size: 19px 19px;
    border-radius: 5px; pointer-events: none;
  }
  .thumb-corner {
    position: absolute; width: 10px; height: 10px;
    border-color: rgba(0,255,128,0.6); border-style: solid;
  }
  .thumb-corner.tl { top: -1px; left: -1px; border-width: 1.5px 0 0 1.5px; }
  .thumb-corner.br { bottom: -1px; right: -1px; border-width: 0 1.5px 1.5px 0; }
  .scan-info { flex: 1; min-width: 0; }
  .scan-no {
    font-size: 7px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--text-dim); margin-bottom: 5px;
  }
  .badges { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
  .badge {
    font-size: 7px; letter-spacing: 1.5px; text-transform: uppercase;
    padding: 2px 8px; border-radius: 2px; border: 1px solid;
  }
  .badge.ok   { color: var(--g); border-color: rgba(0,255,128,0.28); background: rgba(0,255,128,0.06); }
  .badge.time { color: var(--text-dim); border-color: var(--border); }
  .badge.num  { color: rgba(0,255,128,0.5); border-color: var(--border); }
  .scan-snippet { font-size: 11px; color: #a8e8bc; line-height: 1.55; }

  /* tags */
  .tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 14px; }
  .tag {
    font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase;
    color: rgba(0,255,128,0.55); border: 1px solid rgba(0,255,128,0.18);
    padding: 3px 9px; border-radius: 2px;
    background: rgba(0,255,128,0.03);
    transition: border-color 0.15s, color 0.15s;
  }
  .tag:hover { border-color: rgba(0,255,128,0.4); color: var(--g); }

  .divider { height: 1px; background: var(--border); margin: 12px 0; }

  .full-desc {
    font-size: 12.5px; color: var(--text-body);
    line-height: 1.72; white-space: pre-wrap;
  }

  .action-row { display: flex; gap: 8px; margin-top: 16px; }
  .act-btn {
    flex: 1; background: transparent;
    border: 1px solid var(--border); color: var(--text-dim);
    font-family: 'Space Mono', monospace;
    font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase;
    padding: 8px 6px; border-radius: 4px; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center;
    justify-content: center; gap: 5px;
  }
  .act-btn:hover { border-color: var(--g); color: var(--g); background: var(--gd); }

  /* empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 40px 0; gap: 10px; opacity: 0.35;
  }
  .empty-icon { font-size: 32px; }
  .empty-label { font-size: 8px; letter-spacing: 4px; text-transform: uppercase; color: var(--g); }

  /* ── chat tab ── */
  .chat-body {
    flex: 1; overflow-y: auto; padding: 13px 16px;
    display: flex; flex-direction: column; gap: 12px;
    scrollbar-width: thin; scrollbar-color: rgba(0,255,128,0.15) transparent;
  }
  .msg { display: flex; flex-direction: column; gap: 3px; animation: msg-in 0.22s ease; }
  @keyframes msg-in { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:none} }
  .msg.ai { align-items: flex-start; }
  .msg.me { align-items: flex-end; }
  .msg-who {
    font-size: 7px; letter-spacing: 2.5px; text-transform: uppercase;
    color: var(--text-dim);
  }
  .msg.me .msg-who { color: rgba(255,255,255,0.25); }
  .bwrap { position: relative; max-width: 88%; }
  .bwrap:hover .cbtn { opacity: 1; }
  .bubble {
    font-size: 12px; line-height: 1.68; padding: 9px 13px;
    border-radius: 4px; white-space: pre-wrap;
  }
  .msg.ai .bubble {
    background: rgba(0,255,128,0.045); border: 1px solid rgba(0,255,128,0.12);
    color: #c4f0d4; border-radius: 2px 10px 10px 10px;
  }
  .msg.me .bubble {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: #e0e8e4; border-radius: 10px 2px 10px 10px;
  }
  .cbtn {
    position: absolute; top: 5px; right: -29px;
    background: rgba(0,0,0,0.85); border: 1px solid var(--border);
    color: var(--text-dim); width: 22px; height: 22px;
    border-radius: 3px; cursor: pointer; font-size: 10px;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: all 0.15s;
  }
  .msg.me .cbtn { right: auto; left: -29px; }
  .cbtn:hover, .cbtn.done { color: var(--g); border-color: rgba(0,255,128,0.4); opacity: 1; }

  .typing-row { display: flex; gap: 4px; padding: 5px 2px; }
  .tdot {
    width: 4px; height: 4px; border-radius: 50%; background: var(--g);
    animation: tdots 1.1s ease-in-out infinite;
  }
  .tdot:nth-child(2) { animation-delay: 0.16s; }
  .tdot:nth-child(3) { animation-delay: 0.32s; }
  @keyframes tdots {
    0%,80%,100%{transform:scale(0.65);opacity:0.3}
    40%{transform:scale(1.2);opacity:1}
  }

  /* chips */
  .chips {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 0 16px 10px; flex-shrink: 0;
  }
  .chip {
    background: transparent; border: 1px solid var(--border);
    color: rgba(0,255,128,0.58);
    font-family: 'Space Mono', monospace;
    font-size: 9px; letter-spacing: 0.3px;
    padding: 5px 11px; border-radius: 20px;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .chip:hover { background: var(--gd); border-color: var(--g); color: var(--g); }
  .chip:active { transform: scale(0.95); }

  /* input bar */
  .input-bar {
    display: flex; gap: 8px; padding: 10px 14px 20px;
    border-top: 1px solid var(--border); flex-shrink: 0;
    align-items: flex-end;
  }
  .iw { flex: 1; position: relative; }
  .inp {
    width: 100%; background: rgba(0,255,128,0.03);
    border: 1px solid var(--border); border-radius: 6px;
    color: #d8f0e0; font-family: 'Space Mono', monospace;
    font-size: 12px; padding: 9px 12px; resize: none; outline: none;
    line-height: 1.5; min-height: 40px; max-height: 100px;
    overflow-y: auto; transition: border-color 0.15s; display: block;
  }
  .inp::placeholder { color: rgba(255,255,255,0.18); }
  .inp:focus { border-color: rgba(0,255,128,0.38); }
  .send {
    background: var(--g); border: none; color: #000;
    width: 40px; height: 40px; border-radius: 6px;
    cursor: pointer; font-size: 15px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
  }
  .send:disabled { opacity: 0.22; cursor: not-allowed; }
  .send:not(:disabled):hover { background: #00e870; }
  .send:not(:disabled):active { transform: scale(0.91); }

  /* ── history tab ── */
  .hist-body {
    flex: 1; overflow-y: auto; padding: 12px 14px;
    display: flex; flex-direction: column; gap: 10px;
    scrollbar-width: thin; scrollbar-color: rgba(0,255,128,0.15) transparent;
  }
  .hist-item {
    display: flex; gap: 11px; align-items: flex-start;
    background: rgba(0,255,128,0.025); border: 1px solid var(--border);
    border-radius: 7px; padding: 10px; cursor: pointer;
    transition: all 0.15s; animation: msg-in 0.2s ease;
  }
  .hist-item:hover { border-color: var(--border-hi); background: var(--gd); }
  .hist-thumb {
    width: 46px; height: 46px; object-fit: cover;
    border-radius: 4px; border: 1px solid var(--border); flex-shrink: 0;
  }
  .hist-info { flex: 1; min-width: 0; }
  .hist-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  .hist-no { font-size: 7px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); }
  .hist-ms { font-size: 7px; color: rgba(0,255,128,0.28); letter-spacing: 1px; }
  .hist-desc {
    font-size: 11px; color: #a8e8bc; line-height: 1.4;
    overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .hist-footer { font-size: 9px; color: rgba(255,255,255,0.22); margin-top: 3px; }
  .hist-tags { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
  .hist-tag {
    font-size: 7px; letter-spacing: 1px; text-transform: uppercase;
    color: rgba(0,255,128,0.35); border: 1px solid rgba(0,255,128,0.12);
    padding: 1px 6px; border-radius: 2px;
  }

  /* ── toast ── */
  .toast {
    position: absolute; bottom: 84px; left: 50%;
    transform: translateX(-50%) translateY(10px);
    background: rgba(0,7,3,0.94); border: 1px solid rgba(0,255,128,0.32);
    color: var(--g); font-size: 9px; letter-spacing: 2.5px;
    text-transform: uppercase; padding: 7px 18px;
    border-radius: 3px; z-index: 50; pointer-events: none;
    opacity: 0; transition: opacity 0.2s, transform 0.2s;
    white-space: nowrap; backdrop-filter: blur(6px);
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

/* ─── component ─────────────────────────────────────────────── */
export default function App() {
  // DOM refs
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const flashRef    = useRef(null);
  const chatBodyRef = useRef(null);
  const inputRef    = useRef(null);

  // selection refs
  const sx = useRef(0), sy = useRef(0), ex = useRef(0), ey = useRef(0);
  const isDown  = useRef(false);
  const hasBox  = useRef(false);

  // animation refs (no re-render needed)
  const scanningRef = useRef(false);
  const scanProg    = useRef(0);
  const rafId       = useRef(null);
  const scanStart   = useRef(0);
  const toastTimer  = useRef(null);

  // state
  const [result,       setResult]       = useState("Draw a selection box over any object");
  const [scanning,     setScanning]     = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [activeTab,    setActiveTab]    = useState("analysis");
  const [lastImage,    setLastImage]    = useState("");
  const [showHint,     setShowHint]     = useState(true);
  const [messages,     setMessages]     = useState([]);
  const [chatInput,    setChatInput]    = useState("");
  const [chatBusy,     setChatBusy]     = useState(false);
  const [scanContext,  setScanContext]  = useState("");
  const [history,      setHistory]      = useState([]);
  const [copiedIdx,    setCopiedIdx]    = useState(null);
  const [toast,        setToast]        = useState("");
  const [toastVis,     setToastVis]     = useState(false);
  const [scanCount,    setScanCount]    = useState(0);
  const [scanMs,       setScanMs]       = useState(null);
  const [tags,         setTags]         = useState([]);

  // keep ref in sync for RAF loop
  useEffect(() => { scanningRef.current = scanning; }, [scanning]);

  /* toast helper */
  const showToast = (msg) => {
    setToast(msg);
    setToastVis(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVis(false), 2200);
  };

  const scrollBottom = () =>
    setTimeout(() => {
      if (chatBodyRef.current)
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, 60);

  /* ── camera ─────────────────────────────────────────────── */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        canvasRef.current.width  = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        setCameraActive(true);
        drawLoop();
      };
    } catch (err) {
      setResult("Camera error: " + err.message);
    }
  };

  const drawLoop = () => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (hasBox.current) drawBox(ctx);
    }
    rafId.current = requestAnimationFrame(drawLoop);
  };

  const getRect = () => {
    const dx = ex.current - sx.current;
    const dy = ey.current - sy.current;
    const size = Math.min(Math.abs(dx), Math.abs(dy));
    return {
      x: sx.current + (dx < 0 ? -size : 0),
      y: sy.current + (dy < 0 ? -size : 0),
      size,
    };
  };

  /* ── canvas drawing ─────────────────────────────────────── */
  const drawBox = (ctx) => {
    const { x, y, size } = getRect();
    if (size < 2) return;
    const isScanning = scanningRef.current;

    // fill
    ctx.fillStyle = isScanning
      ? "rgba(0,255,128,0.07)"
      : "rgba(0,255,128,0.04)";
    ctx.fillRect(x, y, size, size);

    if (isScanning) {
      // animate sweep
      scanProg.current = (scanProg.current + 0.011) % 1;
      const lineY = y + scanProg.current * size;

      // glow trail
      const grad = ctx.createLinearGradient(x, lineY - 44, x, lineY + 10);
      grad.addColorStop(0,   "rgba(0,255,128,0)");
      grad.addColorStop(0.55,"rgba(0,255,128,0.12)");
      grad.addColorStop(1,   "rgba(0,255,128,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, lineY - 44, size, 54);

      // sweep line
      ctx.strokeStyle = "rgba(0,255,128,0.95)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + size, lineY);
      ctx.stroke();

      // horizontal dashes on sweep
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = "rgba(0,255,128,0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, lineY - 6);
      ctx.lineTo(x + size, lineY - 6);
      ctx.stroke();
      ctx.setLineDash([]);

      // status label
      ctx.fillStyle = "rgba(0,255,128,0.88)";
      ctx.font = "bold 9px 'Space Mono', monospace";
      const dots = ".".repeat(1 + Math.floor((Date.now() / 300) % 3));
      ctx.fillText("ANALYSING" + dots, x + 5, y + 14);
    }

    // border
    ctx.strokeStyle = isScanning ? "rgba(0,255,128,0.75)" : "rgba(0,255,128,0.9)";
    ctx.lineWidth = isScanning ? 1 : 1.5;
    ctx.strokeRect(x, y, size, size);

    // corner brackets
    const c = 13;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isScanning ? "rgba(0,255,128,0.55)" : "#00ff80";
    ctx.beginPath();
    ctx.moveTo(x, y + c);         ctx.lineTo(x, y);         ctx.lineTo(x + c, y);
    ctx.moveTo(x+size-c, y);      ctx.lineTo(x+size, y);    ctx.lineTo(x+size, y+c);
    ctx.moveTo(x+size, y+size-c); ctx.lineTo(x+size, y+size); ctx.lineTo(x+size-c, y+size);
    ctx.moveTo(x+c, y+size);      ctx.lineTo(x, y+size);    ctx.lineTo(x, y+size-c);
    ctx.stroke();

    if (!isScanning) {
      ctx.fillStyle = "rgba(0,255,128,0.75)";
      ctx.font      = "9px 'Space Mono', monospace";
      ctx.fillText(`${Math.round(size)}px`, x + 3, y - 5);
    }
  };

  /* ── pointer helpers ──────────────────────────────────────── */
  const toCanvas = (cx, cy) => {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: (cx - r.left) * (canvasRef.current.width  / r.width),
      y: (cy - r.top)  * (canvasRef.current.height / r.height),
    };
  };

  const onDown = (cx, cy) => {
    if (scanning || panelOpen) return;
    const p = toCanvas(cx, cy);
    sx.current = p.x; sy.current = p.y;
    ex.current = p.x; ey.current = p.y;
    isDown.current = true; hasBox.current = true;
    setShowHint(false);
  };
  const onMove = (cx, cy) => {
    if (!isDown.current) return;
    const p = toCanvas(cx, cy);
    ex.current = p.x; ey.current = p.y;
  };
  const onUp = () => {
    if (!isDown.current) return;
    isDown.current = false;
    cropAndScan();
  };

  const triggerFlash = () => {
    flashRef.current?.classList.add("active");
    setTimeout(() => flashRef.current?.classList.remove("active"), 90);
  };

  /* ── initial scan ─────────────────────────────────────────── */
  const cropAndScan = () => {
    const { x, y, size } = getRect();
    if (size < 22) { setResult("Selection too small — try again"); return; }
    triggerFlash();
    const tmp = document.createElement("canvas");
    tmp.width = size; tmp.height = size;
    tmp.getContext("2d").drawImage(canvasRef.current, x, y, size, size, 0, 0, size, size);
    apiScan(tmp.toDataURL("image/jpeg", 0.85).split(",")[1]);
  };

  const apiScan = async (base64) => {
    setScanning(true);
    setResult("Analysing...");
    setMessages([]);
    setScanContext("");
    setTags([]);
    setPanelOpen(true);
    setActiveTab("analysis");
    scanStart.current = Date.now();

    try {
      const res = await axios.post(import.meta.env.VITE_URL_URL, {
        image:  base64,
        prompt: "What is in this image? Identify the object precisely and informatively. Start with the main object name, then add key details about what it is, its purpose, and any notable features. Keep it under 120 words.",
      });
      const answer  = res.data.result;
      const elapsed = Date.now() - scanStart.current;

      setScanMs(elapsed);
      setResult(answer);
      setScanContext(answer);
      setMessages([{ role: "assistant", text: answer }]);
      setTags(getTags(answer));
      setLastImage(base64);
      setScanCount(n => n + 1);
      scrollBottom();
    } catch (err) {
      const msg = "Error: " + err.message;
      setResult(msg);
      setMessages([{ role: "assistant", text: msg }]);
    } finally {
      setScanning(false);
      hasBox.current = false;
      scanProg.current = 0;
    }
  };

  // save to history once scan finishes
  useEffect(() => {
    if (!scanning && scanContext && lastImage) {
      setHistory(prev => [{
        id: Date.now(), image: lastImage,
        description: scanContext, messages: [],
        tags: getTags(scanContext), ms: scanMs,
      }, ...prev.slice(0, 29)]);
    }
  }, [scanning, scanContext]); // eslint-disable-line

  // keep history entry up-to-date with latest messages
  useEffect(() => {
    if (history.length > 0 && messages.length > 1) {
      setHistory(prev => {
        const u = [...prev];
        u[0] = { ...u[0], messages };
        return u;
      });
    }
  }, [messages]); // eslint-disable-line

  /* ── follow-up chat ───────────────────────────────────────── */
  const sendChat = async (override) => {
    const q = (override || chatInput).trim();
    if (!q || chatBusy) return;

    const newMsgs = [...messages, { role: "user", text: q }];
    setMessages(newMsgs);
    setChatInput("");
    setChatBusy(true);
    scrollBottom();

    try {
      const res = await axios.post(import.meta.env.VITE_URL_URL, {
        image:  lastImage,
        prompt: buildFollowUpPrompt(scanContext, newMsgs.slice(0, -1), q),
      });
      setMessages(prev => [...prev, { role: "assistant", text: res.data.result }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Error: " + err.message }]);
    } finally {
      setChatBusy(false);
      scrollBottom();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
  };

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    e.target.style.height = "40px";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  /* ── copy ─────────────────────────────────────────────────── */
  const copyMsg = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      showToast("Copied to clipboard");
      setTimeout(() => setCopiedIdx(null), 1600);
    });
  };

  /* ── history ─────────────────────────────────────────────── */
  const loadHistory = (item) => {
    setLastImage(item.image);
    setScanContext(item.description);
    setMessages(
      item.messages?.length ? item.messages : [{ role: "assistant", text: item.description }]
    );
    setResult(item.description);
    setTags(item.tags || getTags(item.description));
    setScanMs(item.ms);
    setActiveTab("analysis");
  };

  const newScan = () => {
    setPanelOpen(false);
    hasBox.current = false;
    setShowHint(true);
  };

  const followUpCount = messages.filter(m => m.role === "user").length;

  /* ── render ──────────────────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>
      <div className={`wrapper ${scanning ? "scanning-active" : ""}`}>

        <video ref={videoRef} autoPlay muted playsInline />

        <canvas
          ref={canvasRef}
          onMouseDown={e => onDown(e.clientX, e.clientY)}
          onMouseMove={e => onMove(e.clientX, e.clientY)}
          onMouseUp={onUp}
          onTouchStart={e => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchMove={e  => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchEnd={e   => { e.preventDefault(); onUp(); }}
        />

        {/* atmosphere */}
        <div className="vignette" />
        <div className="scanlines" />
        <div className="grain" />
        <div className="scan-flash" ref={flashRef} />

        {/* HUD corners */}
        <div className="hud">
          <div className="corner tl" /><div className="corner tr" />
          <div className="corner bl" /><div className="corner br" />
        </div>

        {/* top bar */}
        <div className="topbar">
          <div className="topbar-left">
            <span className="logo">Object<em>Scan</em></span>
            {cameraActive && <div className="live-dot" />}
            {scanCount > 0 && <span className="scan-badge">#{scanCount}</span>}
          </div>
          <div className="topbar-right">
            {cameraActive && (
              <button
                className="icon-btn"
                title="History"
                onClick={() => { setPanelOpen(true); setActiveTab("history"); }}
              >◫</button>
            )}
          </div>
        </div>

        {/* draw hint */}
        {cameraActive && (
          <div className={`hint ${!showHint ? "gone" : ""}`}>
            <div className="hint-box" />
            <div className="hint-text">Drag to scan</div>
          </div>
        )}

        {/* result bar */}
        {cameraActive && (
          <div className="resultbar" onClick={() => setPanelOpen(true)}>
            <div className="resultbar-inner">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="result-tag">/ output</div>
                <div className={`result-text ${scanning ? "scanning" : ""}`}>{result}</div>
              </div>
              <div className="result-right">
                {scanMs && !scanning && (
                  <span className="result-scantime">{(scanMs / 1000).toFixed(1)}s</span>
                )}
                <span className="result-arrow">↑</span>
              </div>
            </div>
          </div>
        )}

        {/* ── analysis panel ── */}
        <div
          className={`backdrop ${panelOpen ? "open" : ""}`}
          onClick={e => { if (e.target === e.currentTarget) setPanelOpen(false); }}
        >
          <div className="panel">
            <div className="drag-handle" />

            <div className="panel-header">
              <span className="panel-title">/ ObjectScan</span>
              <div className="panel-actions">
                {scanContext && (
                  <button className="panel-btn" title="Copy analysis" onClick={() => copyMsg(scanContext, -1)}>⎘</button>
                )}
                {cameraActive && (
                  <button className="panel-btn" title="New scan" onClick={newScan}>↺</button>
                )}
                <button className="panel-btn" onClick={() => setPanelOpen(false)}>✕</button>
              </div>
            </div>

            {/* tab bar */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === "analysis" ? "active" : ""}`}
                onClick={() => setActiveTab("analysis")}
              >Analysis</button>
              <button
                className={`tab ${activeTab === "chat" ? "active" : ""}`}
                onClick={() => setActiveTab("chat")}
              >
                Chat
                {followUpCount > 0 && <span className="tab-pill">{followUpCount}</span>}
              </button>
              <button
                className={`tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                History
                {history.length > 0 && <span className="tab-pill">{history.length}</span>}
              </button>
            </div>

            {/* ── ANALYSIS TAB ── */}
            {activeTab === "analysis" && (
              <div className="analysis-body">
                {!scanning && !lastImage && (
                  <div className="empty-state">
                    <div className="empty-icon">◫</div>
                    <div className="empty-label">No scan yet</div>
                  </div>
                )}

                {(lastImage || scanning) && (
                  <>
                    <div className="scan-hero">
                      {lastImage && (
                        <div className="thumb-wrap">
                          <img
                            src={`data:image/jpeg;base64,${lastImage}`}
                            className="thumb" alt="scanned object"
                          />
                          <div className="thumb-grid" />
                          <div className="thumb-corner tl" />
                          <div className="thumb-corner br" />
                        </div>
                      )}

                      <div className="scan-info">
                        <div className="scan-no">Scan #{scanCount}</div>
                        <div className="badges">
                          {!scanning && <span className="badge ok">Identified</span>}
                          {scanning   && <span className="badge ok" style={{animation:"flicker 0.3s step-end infinite"}}>Scanning</span>}
                          {scanMs     && !scanning && <span className="badge time">{(scanMs/1000).toFixed(1)}s</span>}
                          {followUpCount > 0 && <span className="badge num">{followUpCount} Q&A</span>}
                        </div>
                        {scanning && (
                          <div className="typing-row" style={{ marginTop: 8 }}>
                            <div className="tdot"/><div className="tdot"/><div className="tdot"/>
                          </div>
                        )}
                        {!scanning && scanContext && (
                          <div className="scan-snippet">
                            {scanContext.split(" ").slice(0, 14).join(" ")}
                            {scanContext.split(" ").length > 14 ? "…" : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {tags.length > 0 && (
                      <div className="tags-row">
                        {tags.map(t => <span key={t} className="tag">{t}</span>)}
                      </div>
                    )}

                    {!scanning && scanContext && (
                      <>
                        <div className="divider" />
                        <div className="full-desc">{scanContext}</div>
                        <div className="action-row">
                          <button className="act-btn" onClick={() => setActiveTab("chat")}>
                            ↗ Ask questions
                          </button>
                          <button className="act-btn" onClick={() => copyMsg(scanContext, -1)}>
                            ⎘ Copy
                          </button>
                          <button className="act-btn" onClick={newScan}>
                            ↺ New scan
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {activeTab === "chat" && (
              <>
                <div className="chat-body" ref={chatBodyRef}>
                  {/* initial scan typing indicator */}
                  {scanning && messages.length === 0 && (
                    <div className="msg ai">
                      <span className="msg-who">objectscan</span>
                      <div className="bwrap">
                        <div className="bubble">
                          <div className="typing-row">
                            <div className="tdot"/><div className="tdot"/><div className="tdot"/>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={`msg ${m.role === "assistant" ? "ai" : "me"}`}>
                      <span className="msg-who">{m.role === "assistant" ? "objectscan" : "you"}</span>
                      <div className="bwrap">
                        <div className="bubble">{m.text}</div>
                        <button
                          className={`cbtn ${copiedIdx === i ? "done" : ""}`}
                          onClick={() => copyMsg(m.text, i)}
                        >{copiedIdx === i ? "✓" : "⎘"}</button>
                      </div>
                    </div>
                  ))}

                  {chatBusy && (
                    <div className="msg ai">
                      <span className="msg-who">objectscan</span>
                      <div className="bwrap">
                        <div className="bubble">
                          <div className="typing-row">
                            <div className="tdot"/><div className="tdot"/><div className="tdot"/>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* suggestion chips */}
                {messages.length === 1 && !scanning && !chatBusy && (
                  <div className="chips">
                    {SUGGESTIONS.map(s => (
                      <button key={s} className="chip" onClick={() => sendChat(s)}>{s}</button>
                    ))}
                  </div>
                )}

                {/* input */}
                {messages.length > 0 && !scanning && (
                  <div className="input-bar">
                    <div className="iw">
                      <textarea
                        ref={inputRef}
                        className="inp"
                        placeholder="Ask anything about this object…"
                        value={chatInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKey}
                        rows={1}
                      />
                    </div>
                    <button
                      className="send"
                      onClick={() => sendChat()}
                      disabled={chatBusy || !chatInput.trim()}
                    >↑</button>
                  </div>
                )}

                {messages.length === 0 && !scanning && (
                  <div className="empty-state">
                    <div className="empty-icon">◫</div>
                    <div className="empty-label">Scan an object first</div>
                  </div>
                )}
              </>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === "history" && (
              <div className="hist-body">
                {history.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">◫</div>
                    <div className="empty-label">No scans yet</div>
                  </div>
                ) : (
                  history.map((item, i) => (
                    <div key={item.id} className="hist-item" onClick={() => loadHistory(item)}>
                      <img
                        src={`data:image/jpeg;base64,${item.image}`}
                        className="hist-thumb" alt="scan"
                      />
                      <div className="hist-info">
                        <div className="hist-meta">
                          <span className="hist-no">#{history.length - i}</span>
                          {item.ms && <span className="hist-ms">{(item.ms/1000).toFixed(1)}s</span>}
                        </div>
                        <div className="hist-desc">{item.description}</div>
                        {item.messages?.length > 1 && (
                          <div className="hist-footer">
                            {item.messages.filter(m => m.role === "user").length} follow-up question
                            {item.messages.filter(m => m.role === "user").length !== 1 ? "s" : ""}
                          </div>
                        )}
                        {item.tags?.length > 0 && (
                          <div className="hist-tags">
                            {item.tags.slice(0, 3).map(t => (
                              <span key={t} className="hist-tag">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── splash ── */}
        <div className={`splash ${cameraActive ? "out" : ""}`}>
          <div className="radar">
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-ring" />
            <div className="radar-x" />
            <div className="radar-y" />
            <div className="radar-sweep" />
            <div className="radar-line" />
            <div className="radar-pip a" />
            <div className="radar-pip b" />
            <div className="radar-pip c" />
          </div>

          <div>
            <h1>Object<em>Scan</em></h1>
            <p className="splash-sub">AI visual identifier</p>
          </div>

          <div className="feature-list">
            <div className="feature-item">Point your camera at any object</div>
            <div className="feature-item">Draw a box to select and scan it</div>
            <div className="feature-item">Instant AI-powered identification</div>
            <div className="feature-item">Ask follow-up questions anytime</div>
          </div>

          <button className="start-btn" onClick={startCamera}>
            <span>▶</span>
            <span>Enable Camera</span>
          </button>
        </div>

        {/* toast */}
        <div className={`toast ${toastVis ? "show" : ""}`}>{toast}</div>
      </div>
    </>
  );
}