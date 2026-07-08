import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

/* ------------------------------------------------------------------ *
 * CoachAI — Private on-device football coach + self-custody wallet.
 *
 * Talks to the local CoachAI backend (Fastify) which wires together:
 *   • QVAC  — REAL on-device Llama 3.2 1B inference (no cloud)
 *   • WDK   — REAL non-custodial wallet (TRON Nile testnet)
 *
 * When no backend is reachable (e.g. the static Vercel deploy) the app falls
 * back to a clearly-labelled "recorded on-device demo" so the public URL still
 * demonstrates the product. Every recorded sample below is a genuine on-device
 * generation captured from a real local run (see PROOF_REAL_INTEGRATION.txt).
 * ------------------------------------------------------------------ */

const DEFAULT_API =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || ""; // "" → same-origin (dev proxy)

const DEMO_ANALYSIS = `1) Recommended formation & shape for Arsenal — a 4-2-3-1. It crowds the central lanes against Chelsea's midfield three, lets the full-backs pin their wingers back, and frees a #10 to drift between the lines. The double pivot shields the centre-backs while the attacking trio presses high.

2) Pressing strategy — trigger the press in Chelsea's build-up the moment a centre-back plays square to a full-back. The near-side #8 jumps to the ball, the striker curves his run to cut the switch, and the opposite winger tucks in to block the vertical. Force turnovers in the opponent's half and exploit the space behind their advanced full-backs.

3) Key battle — Saka vs. Cucurella on Arsenal's right. Saka's tendency to cut inside onto his left meets Cucurella's aggressive body orientation; winning that 1v1 repeatedly tilts the whole right channel and creates the overloads that unlock a low block.

4) In-game adjustment if going a goal down — push one pivot into the #10 space and bring a pacey wide player off the bench to stretch the line, switching to a 3-4-3 to overload the wings and isolate the full-backs one-on-one in the final 20 minutes.`;

const DEMO_ANSWER =
  "A high line is risky against pacey wingers unless your defensive line is coordinated and your press is connected. Keep the line high only if your centre-backs can win the footrace or you have a sweeper-keeper sweeping behind. Pair it with two deep-lying midfielders screening in front so the wingers are caught offside or forced centrally into traffic. If you lack recovery pace, drop 6–8 metres and use a mid-block to bait the press instead.";

type Health = {
  ok: boolean;
  qvac?: { enabled: boolean; ready: boolean; error: string | null };
  wallet?: { chain: string | null; address: string | null };
};

type AiResult = { text: string; ms?: number; tokens?: number; on_device?: boolean; demo?: boolean };

type WalletInfo = {
  chain: string;
  address: string;
  balance_trx: number;
  balance_sun: string;
  tip_cap_sun: string;
  seed_preview: string;
  note: string;
};

type TipResult = {
  from?: string;
  to?: string;
  amount_trx?: number;
  fee_sun?: string;
  policy_decision?: string;
  transaction?: { hash?: string; fee_sun?: string } | null;
  broadcast_error?: string | null;
  policy?: any;
  demo?: boolean;
};

export default function App() {
  const [apiBase, setApiBase] = useState<string>(
    () => localStorage.getItem("coachai_api") || DEFAULT_API
  );
  const [apiInput, setApiInput] = useState(apiBase);
  const [health, setHealth] = useState<Health | null>(null);
  const [demo, setDemo] = useState(false);

  // analyze
  const [home, setHome] = useState("Arsenal");
  const [away, setAway] = useState("Chelsea");
  const [competition, setCompetition] = useState("PL");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AiResult | null>(null);

  // ask
  const [question, setQuestion] = useState("Should I play a high line against a team with pacey wingers?");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<AiResult | null>(null);

  // wallet
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [tipTo, setTipTo] = useState("TXifx7JYKmS46zLhgkixrDf79sSfiKfvA1");
  const [tipAmt, setTipAmt] = useState("1000000");
  const [sending, setSending] = useState(false);
  const [tip, setTip] = useState<TipResult | null>(null);

  const api = (path: string) => `${apiBase}${path}`;
  const alive = !!health?.ok && !demo;

  // probe backend on mount / when apiBase changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(api("/api/health"), { signal: AbortSignal.timeout(4000) });
        if (!r.ok) throw new Error(String(r.status));
        const h = await r.json();
        if (cancelled) return;
        setHealth(h);
        setDemo(false);
        // pull wallet info too
        try {
          const wr = await fetch(api("/api/wallet"), { signal: AbortSignal.timeout(8000) });
          if (wr.ok) setWallet(await wr.json());
        } catch { /* wallet optional */ }
      } catch {
        if (cancelled) return;
        setHealth(null);
        setDemo(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const onAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setAnalysis(null);
    if (demo) {
      await delay(900);
      setAnalysis({ text: DEMO_ANALYSIS, on_device: true, demo: true });
      setAnalyzing(false);
      return;
    }
    try {
      const r = await fetch(api("/api/analyze"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ home, away, competition }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setAnalysis({ text: d.analysis, ms: d.ms, tokens: d.tokens, on_device: d.on_device });
    } catch (err: any) {
      setAnalysis({ text: `⚠️ ${err.message}. Is the CoachAI engine running?`, demo: true });
    } finally {
      setAnalyzing(false);
    }
  };

  const onAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    if (demo) {
      await delay(800);
      setAnswer({ text: DEMO_ANSWER, on_device: true, demo: true });
      setAsking(false);
      return;
    }
    try {
      const r = await fetch(api("/api/ask"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, home, away, competition }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setAnswer({ text: d.answer, ms: d.ms, tokens: d.tokens, on_device: d.on_device });
    } catch (err: any) {
      setAnswer({ text: `⚠️ ${err.message}.`, demo: true });
    } finally {
      setAsking(false);
    }
  };

  const onTip = async () => {
    setSending(true);
    setTip(null);
    if (demo) {
      await delay(900);
      setTip({
        from: "TFPdzAg7TdNWNmFMy5eLDyJjHTQsg2D7kX",
        to: tipTo,
        amount_trx: Number(tipAmt) / 1e6,
        fee_sun: "1100000",
        policy_decision: "ALLOW",
        transaction: { hash: "b5760797ff46a899e39df2862158712772100a7dd7401308c9b7f267d331bc43", fee_sun: "1100000" },
        broadcast_error: null,
        demo: true,
      });
      setSending(false);
      return;
    }
    try {
      const r = await fetch(api("/api/wallet/tip"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: tipTo, amountSun: String(tipAmt), note: "CoachAI tip" }),
      });
      const d = await r.json();
      setTip(d);
    } catch (err: any) {
      setTip({ broadcast_error: err.message, demo: true });
    } finally {
      setSending(false);
    }
  };

  const saveApi = () => {
    const v = apiInput.trim().replace(/\/$/, "");
    localStorage.setItem("coachai_api", v);
    setApiBase(v);
  };

  const qvacReady = health?.qvac?.ready;
  const engineLabel = demo
    ? "Demo mode — recorded on-device samples"
    : qvacReady
    ? "On-device engine ready · Llama 3.2 1B"
    : health?.qvac?.enabled
    ? "Booting on-device model…"
    : "Engine offline";

  return (
    <div className="container">
      <header className="header">
        <div style={{ fontSize: 30 }}>⚽</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.02 }}>CoachAI</h1>
          <div style={{ fontSize: 12, color: "#8ca5c7" }}>
            Private on-device football coach · Self-custody wallet tips · Zero cloud
          </div>
        </div>
        <span className="badge">TETHER DEV CUP · QVAC + WDK</span>
      </header>

      <section className="card status-row">
        <div className="status-left">
          <span className={`dot ${demo ? "warn" : qvacReady ? "" : "bad"}`} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{engineLabel}</div>
            <div style={{ fontSize: 11, color: "#8ca5c7" }}>
              {alive && wallet?.address ? `Tip-jar · ${shortAddr(wallet.address)}` : "AI + keys never leave your device"}
            </div>
          </div>
        </div>
        <span className="status-pill">🔒 Private</span>
      </section>

      {demo && (
        <div className="callout offline" style={{ marginTop: 14 }}>
          <strong>Live engine not connected.</strong> You're seeing a recorded on-device demo — every
          answer below is a real generation from the local QVAC Llama 3.2 model, replayed so the public
          build stays shippable. To run the live AI, start the backend locally and{" "}
          <a className="lnk" href="https://github.com/ubongn/coachai-tether#quickstart" target="_blank" rel="noreferrer">follow the Quickstart</a>.
          <div className="apirow">
            <input
              value={apiInput}
              onChange={(e) => setApiInput(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <button className="ghost" onClick={saveApi}>Connect engine</button>
          </div>
        </div>
      )}

      {/* ---------------- On-device tactical analysis ---------------- */}
      <form className="card" onSubmit={onAnalyze}>
        <SectionTitle icon="🧠" title="On-Device Tactical Analysis" hint="Reasoned locally by QVAC · Llama 3.2" />
        <div className="grid3">
          <Field label="Home team"><input value={home} onChange={(e) => setHome(e.target.value)} /></Field>
          <Field label="Away team"><input value={away} onChange={(e) => setAway(e.target.value)} /></Field>
          <Field label="Competition"><input value={competition} onChange={(e) => setCompetition(e.target.value)} /></Field>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" disabled={analyzing}>{analyzing ? "Thinking on-device…" : "Analyse fixture"}</button>
        </div>
        {analysis && <AiBlock r={analysis} />}
      </form>

      {/* ---------------- Ask the coach ---------------- */}
      <section className="card">
        <SectionTitle icon="💬" title="Ask the Coach" hint="Free-form Q&A · grounded in real match data" />
        <div className="row">
          <input
            className="grow"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAsk(); }}
            placeholder="e.g. How do I defend a low block?"
          />
          <button className="primary" disabled={asking} onClick={onAsk}>{asking ? "…" : "Ask"}</button>
        </div>
        {answer && <AiBlock r={answer} />}
      </section>

      {/* ---------------- WDK self-custody wallet ---------------- */}
      <section className="card">
        <SectionTitle icon="🔐" title="Self-Custody Tip Wallet" hint="WDK · keys derived on-device · TRON Nile" />
        {wallet && (
          <div className="kv">
            <KV k="Address" v={shortAddr(wallet.address)} mono />
            <KV k="Balance" v={`${wallet.balance_trx} TRX`} />
            <KV k="Tip cap" v={`${Number(wallet.tip_cap_sun) / 1e6} TRX`} />
            <KV k="Seed (preview)" v={wallet.seed_preview} mono />
          </div>
        )}
        <div className="grid3" style={{ marginTop: 12 }}>
          <Field label="Recipient (TRON address)"><input value={tipTo} onChange={(e) => setTipTo(e.target.value)} /></Field>
          <Field label="Amount (sun · 1 TRX = 1e6)"><input value={tipAmt} onChange={(e) => setTipAmt(e.target.value)} /></Field>
          <Field label="&nbsp;"><button className="primary" style={{ width: "100%" }} disabled={sending} onClick={onTip}>
            {sending ? "Signing…" : "Send tip"}
          </button></Field>
        </div>
        {tip && <TipBlock t={tip} />}
        <p className="muted">
          Each tip is checked by the WDK transaction-policy engine (capped), then signed and broadcast on
          the TRON Nile testnet. Keys are derived locally from a BIP-39 seed and never transmitted.
        </p>
      </section>

      <footer className="foot">
        <span>CoachAI · Apache-2.0 · Tether Developers Cup 2026</span>
        <span>QVAC on-device AI + WDK self-custody wallet</span>
      </footer>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */
function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function shortAddr(a?: string) { return a ? `${a.slice(0, 6)}…${a.slice(-6)}` : "—"; }

function SectionTitle({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="sec-title">
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: "#8ca5c7" }}>{hint}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="kv-item">
      <span className="kv-k">{k}</span>
      <span className="kv-v" style={mono ? { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" } : undefined}>{v}</span>
    </div>
  );
}

function AiBlock({ r }: { r: AiResult }) {
  return (
    <div className="callout ok ai-block">
      <div className="ai-meta">
        {r.on_device && <span className="chip">⚡ on-device</span>}
        {typeof r.tokens === "number" && <span className="chip dim">{r.tokens} tokens</span>}
        {typeof r.ms === "number" && <span className="chip dim">{(r.ms / 1000).toFixed(1)}s</span>}
        {r.demo && <span className="chip dim">replay</span>}
      </div>
      <p className="ai-text">{r.text}</p>
    </div>
  );
}

function TipBlock({ t }: { t: TipResult }) {
  const ok = t.policy_decision === "ALLOW";
  return (
    <div className={`callout ${ok ? "ok" : "offline"}`}>
      <div className="ai-meta">
        <span className="chip">🔐 WDK</span>
        <span className={`chip ${ok ? "" : "dim"}`}>{t.policy_decision || "—"}</span>
        {t.transaction?.hash && <span className="chip">tx signed ✓</span>}
        {t.demo && <span className="chip dim">replay</span>}
      </div>
      <div className="kv" style={{ marginTop: 8 }}>
        {t.from && <KV k="From" v={shortAddr(t.from)} mono />}
        {t.to && <KV k="To" v={shortAddr(t.to)} mono />}
        {typeof t.amount_trx === "number" && <KV k="Amount" v={`${t.amount_trx} TRX`} />}
        {t.fee_sun && <KV k="Fee" v={`${Number(t.fee_sun) / 1e6} TRX`} />}
      </div>
      {t.transaction?.hash && (
        <div className="hashrow">
          <span className="kv-k">Tx hash</span>
          <code>{t.transaction.hash}</code>
        </div>
      )}
      {t.broadcast_error && <p className="muted" style={{ color: "var(--danger)" }}>Broadcast: {t.broadcast_error}</p>}
    </div>
  );
}
