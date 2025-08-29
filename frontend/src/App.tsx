import React, { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

export default function App() {
  const [seedOk, setSeedOk] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "Hi! Tell me what you’re in the mood for (e.g., friendship & magic, war & loss, freedom & social control) and I’ll recommend a book.",
    },
  ]);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [history, thinking]);

  useEffect(() => {
    fetch("/api/seed")
      .then((r) => r.json())
      .then((j) => setSeedOk(Boolean(j?.ok)))
      .catch(() => setSeedOk(false));
  }, []);

  async function send() {
    const text = query.trim();
    if (!text || thinking) return;
    setHistory((h) => [...h, { role: "user", content: text }]);
    setThinking(true);
    setQuery("");

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.detail || "Server error");
      }
      const data = await res.json();
      const msg = data?.message || "Sorry, I couldn’t find a good match.";
      setHistory((h) => [...h, { role: "assistant", content: msg }]);
    } catch (e: any) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content:
            "I couldn’t reach the server. Please verify your backend and API key, then try again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="wrap">
      <style>{styles}</style>

      {/* Background */}
      <div className="bg" />

      {/* Centered chat card */}
      <div className="card">
        {/* Header */}
        <div className="header">
          <div className="left">
            <div className="logo">
              {/* chat bubble logo */}
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path
                  d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v6A3.5 3.5 0 0 1 16.5 15H12l-3.6 3.2c-.9.8-2.4.1-2.4-1.1V15A3.5 3.5 0 0 1 4 11.5v-6Z"
                  fill="url(#g)"
                />
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4f46e5" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="title">Smart Librarian</div>
          </div>
          <div className="right">
            <span className="dot" />
            <span className="status">{seedOk === false ? "Offline" : "Online"}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="body">
          {history.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="row row-user">
                <div className="bubble bubble-user">{t.content}</div>
              </div>
            ) : (
              <div key={i} className="row row-assistant">
                <div className="bubble bubble-assistant">
                  {t.content}
                  <div className="ai-pill">
                    <span className="sparkle">✦</span> Answered by AI
                  </div>
                </div>
              </div>
            )
          )}

          {thinking && (
            <div className="row row-assistant">
              <div className="bubble bubble-assistant typing">
                <span className="dots">
                  <i />
                  <i />
                  <i />
                </span>
                <div className="ai-pill">
                  <span className="sparkle">✦</span> Answered by AI
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="composer">
          <input
            className="input"
            placeholder="Type your message…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="send" onClick={send} disabled={!query.trim() || thinking}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                d="M2.5 4.6c-.5-1.5 1-2.9 2.5-2.4l15.8 5.3c1.8.6 1.8 3.1 0 3.7L5 16.6c-1.5.5-3-1-2.5-2.4l1.1-3.1a1 1 0 0 1 .6-.6l6.8-2.2-6.8-2.2a1 1 0 0 1-.6-.6l-1.1-3Z"
                fill="currentColor"
              />
            </svg>
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- CSS (scoped) ---------- */
const styles = `
:root {
  --bg: #f7f8ff;
  --ink-1: #0b1020;
  --ink-2: rgba(11,16,32,.72);
  --stroke: rgba(12,18,38,.08);
  --shadow: 0 20px 60px rgba(15, 23, 42, .12);
  --white: #fff;
  --grad-1: #4f46e5;
  --grad-2: #06b6d4;
}

* { box-sizing: border-box; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }

.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 28px;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
               "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

.bg {
  position: fixed; inset: 0; pointer-events: none;
  background:
    radial-gradient(700px 500px at 10% 10%, rgba(79,70,229,0.12), transparent 60%),
    radial-gradient(700px 500px at 90% 20%, rgba(6,182,212,0.10), transparent 60%);
  filter: saturate(1.02);
  animation: ambiance 16s ease-in-out infinite;
}
@keyframes ambiance { 50% { filter: saturate(1.08) brightness(1.01);} }

.card {
  width: 820px; max-width: 92vw;
  background: var(--white);
  border: 1px solid var(--stroke);
  border-radius: 22px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

/* Header */
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--stroke);
  background: rgba(255,255,255,.7);
  backdrop-filter: blur(8px);
}
.left { display: flex; align-items: center; gap: 10px; }
.logo {
  width: 32px; height: 32px; border-radius: 10px;
  display: grid; place-items: center;
  background: rgba(79,70,229,.08);
  color: #444;
}
.title { font-weight: 700; color: var(--ink-1); letter-spacing: .2px; }
.right { display: flex; align-items: center; gap: 8px; color: var(--ink-2); font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 99px; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
.status { opacity: .8; }

/* Chat body */
.body {
  padding: 22px 18px 16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,.94) 65%, rgba(255,255,255,1) 100%);
  max-height: calc(80vh - 120px);
  overflow: auto;
}

.row { display: flex; margin: 12px 0; }
.row-user { justify-content: flex-end; }
.row-assistant { justify-content: flex-start; }

.bubble {
  border-radius: 18px;
  padding: 14px 16px;
  line-height: 1.6;
  max-width: 70ch;
  box-shadow: 0 10px 28px rgba(15,23,42,.08);
}

.bubble-user {
  background: #fff;
  border: 1px solid var(--stroke);
  color: var(--ink-1);
}

.bubble-assistant {
  position: relative;
  color: #fff;
  background: linear-gradient(135deg, var(--grad-1), var(--grad-2));
}

.ai-pill {
  position: absolute;
  left: 12px; bottom: -14px;
  font-size: 12px; color: #334155;
  background: #fff;
  border: 1px solid var(--stroke);
  padding: 4px 8px; border-radius: 999px;
  display: inline-flex; align-items: center; gap: 6px;
  box-shadow: 0 8px 20px rgba(15,23,42,.08);
}
.sparkle { color: #7c3aed; }

/* typing */
.typing { display: inline-flex; align-items: center; gap: 6px; }
.dots { display: inline-flex; gap: 6px; }
.dots i {
  width: 6px; height: 6px; border-radius: 99px;
  background: rgba(255,255,255,.8);
  animation: blink 1.2s infinite ease-in-out;
}
.dots i:nth-child(2){ animation-delay: .15s; }
.dots i:nth-child(3){ animation-delay: .3s; }
@keyframes blink { 0%,80%,100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }

/* Composer */
.composer {
  display: grid; grid-template-columns: 1fr auto; gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--stroke);
  background: rgba(255,255,255,.7);
  backdrop-filter: blur(8px);
}
.input {
  width: 100%;
  border: 1px solid var(--stroke);
  background: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 15px;
  outline: none;
}
.input::placeholder { color: #94a3b8; }

.send {
  display: inline-flex; align-items: center; gap: 8px;
  border: none; cursor: pointer;
  color: #fff; font-weight: 600;
  padding: 0 14px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--grad-1), var(--grad-2));
  box-shadow: 0 12px 28px rgba(79,70,229,.28);
  transition: transform .08s ease, filter .12s ease;
}
.send:disabled { filter: grayscale(.3) opacity(.6); cursor: default; }
.send:active { transform: translateY(1px); }
`;
