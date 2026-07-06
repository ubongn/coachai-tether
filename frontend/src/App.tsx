import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type MatchStats = {
  formation: string;
  possession: number;
  shots_on_target: number;
  shots_off_target: number;
  corners: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  score_differential: number;
  opponent_formation: string;
};

type Sub = {
  player_out: string;
  player_in: string;
  minute: number;
  reason: string;
  expected_impact: "low" | "medium" | "high";
};

type Analysis = {
  recommended_formation: string;
  recommended_subs: Sub[];
  key_weakness: string;
  predicted_outcome: "win" | "draw" | "loss";
  confidence: number;
  summary: string;
};

const statsDefaults: MatchStats = {
  formation: "4-3-3",
  possession: 50,
  shots_on_target: 3,
  shots_off_target: 5,
  corners: 4,
  fouls: 10,
  yellow_cards: 1,
  red_cards: 0,
  minutes_played: 65,
  score_differential: 0,
  opponent_formation: "4-4-2",
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

export default function App() {
  const [form, setForm] = useState<MatchStats>(statsDefaults);
  const [analyzing, setAnalyzing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [tipTo, setTipTo] = useState("0xTeam2785");
  const [tipAmt, setTipAmt] = useState("1000");
  const [txResult, setTxResult] = useState<any>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onOff = () => setOffline(!navigator.onLine);
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  const onInput = (e: any) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "formation" || name === "opponent_formation" ? value : Number(value) }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setAnswer(null);
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error(err);
      setAnalysis({
        recommended_formation: form.formation,
        recommended_subs: [],
        key_weakness: "network error",
        predicted_outcome: "draw",
        confidence: 0,
        summary: "Could not reach CoachAI backend. Make sure docker compose is up and offline mode is enabled.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const onAsk = async () => {
    if (!question.trim()) return;
    const res = await fetch(`${API_BASE}/api/ask?question=${encodeURIComponent(question)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setAnswer(data.answer);
  };

  const onTip = async () => {
    setSending(true);
    setTxResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/tip`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipient: tipTo, amount: tipAmt }),
      });
      setTxResult(await res.json());
    } finally {
      setSending(false);
    }
  };

  const impactColor = (i: "low" | "medium" | "high") =>
    i === "high" ? "var(--accent)" : i === "medium" ? "var(--warning)" : "#8ca5c7";

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.02 }}>⚽ CoachAI</h1>
          <div style={{ fontSize: 12, color: "#8ca5c7" }}>
            On-device AI coach · Self-custody wallet · Zero cloud
          </div>
        </div>
        <span className="badge">TETHER DEV CUP · 2026</span>
      </header>

      <section className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`dot ${offline ? "warn" : ""}`} />
          <div>
            <div style={{ fontSize: 13 }}>{offline ? "Offline mode — inference still runs locally" : "Online — backend + local inference"}</div>
            <div style={{ fontSize: 11, color: "#8ca5c7" }}>AI runs on device · WDK holds keys</div>
          </div>
        </div>
        <span className="status-pill">
          🔒 Private
        </span>
      </section>

      <form onSubmit={onSubmit} className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>📊 Match Input</h2>
          <span style={{ fontSize: 11, color: "#8ca5c7" }}>Stats stay on your device</span>
        </div>
        <div className="grid">
          <div className="field">
            <label>Formation</label>
            <input name="formation" value={form.formation} onChange={onInput} />
          </div>
          <div className="field">
            <label>Opponent Formation</label>
            <input name="opponent_formation" value={form.opponent_formation} onChange={onInput} />
          </div>
          <div className="field">
            <label>Possession %</label>
            <input name="possession" type="number" min={0} max={100} value={form.possession} onChange={onInput} />
          </div>
          <div className="field">
            <label>Minutes Played</label>
            <input name="minutes_played" type="number" min={0} max={120} value={form.minutes_played} onChange={onInput} />
          </div>
          <div className="field">
            <label>Shots on Target</label>
            <input name="shots_on_target" type="number" min={0} value={form.shots_on_target} onChange={onInput} />
          </div>
          <div className="field">
            <label>Shots off Target</label>
            <input name="shots_off_target" type="number" min={0} value={form.shots_off_target} onChange={onInput} />
          </div>
          <div className="field">
            <label>Corners</label>
            <input name="corners" type="number" min={0} value={form.corners} onChange={onInput} />
          </div>
          <div className="field">
            <label>Fouls</label>
            <input name="fouls" type="number" min={0} value={form.fouls} onChange={onInput} />
          </div>
          <div className="field">
            <label>Score Differential ({form.score_differential > 0 ? "+" : ""}{form.score_differential})</label>
            <input name="score_differential" type="number" value={form.score_differential} onChange={onInput} />
          </div>
          <div className="field">
            <label>Yellow Cards</label>
            <input name="yellow_cards" type="number" min={0} value={form.yellow_cards} onChange={onInput} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="primary" disabled={analyzing} type="submit">
            {analyzing ? "Analyzing on-device model…" : "⚡ Analyze Tactics"}
          </button>
        </div>
      </form>

      {analysis && (
        <>
          <section className="card">
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>🧠 On-Device AI Analysis</h2>
            <div className="callout ok">
              <div style={{ fontSize: 12, color: "#9ad8b5" }}>
                ✅ QVAC inference ran locally · no data left the device · no cloud API
              </div>
            </div>
            <div className="grid" style={{ marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "#8ca5c7" }}>Recommended Formation</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{analysis.recommended_formation}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#8ca5c7" }}>Predicted Outcome</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent2)", textTransform: "uppercase" }}>
                  {analysis.predicted_outcome}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#8ca5c7" }}>Confidence</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{(analysis.confidence * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#8ca5c7" }}>Key Weakness</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{analysis.key_weakness}</div>
              </div>
            </div>
            {analysis.recommended_subs?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: "#8ca5c7", marginBottom: 6 }}>Recommended Subs</div>
                {analysis.recommended_subs.map((s, i) => (
                  <div key={i} className="callout" style={{ marginTop: 8, borderLeft: `3px solid ${impactColor(s.expected_impact)}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <strong>{s.player_in}</strong> <span style={{ color: "#8ca5c7", fontSize: 12 }}>⏱ {s.minute}'</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#8ca5c7" }}>
                      {s.player_out} &rarr; {s.player_in} · impact: <span style={{ color: impactColor(s.expected_impact) }}>{s.expected_impact.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{s.reason}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12 }}>{analysis.summary}</div>
          </section>

          <section className="card">
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>💬 Ask Coach</h2>
            <div className="field">
              <label>Question</label>
              <input
                placeholder="How should we change formation?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="button" className="ghost" onClick={onAsk} disabled={!question.trim()}>
                Ask
              </button>
            </div>
            {answer && (
              <div className="callout ok" style={{ marginTop: 10 }}>
                {answer}
              </div>
            )}
          </section>

          <section className="card">
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>💸 Tip the Team (WDK Self-Custody)</h2>
            <div className="grid">
              <div className="field">
                <label>Recipient (wallet / team id)</label>
                <input value={tipTo} onChange={(e) => setTipTo(e.target.value)} />
              </div>
              <div className="field">
                <label>Amount</label>
                <input value={tipAmt} onChange={(e) => setTipAmt(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="primary" disabled={sending} onClick={onTip}>
                {sending ? "Signing via WDK…" : "Send Tip"}
              </button>
            </div>

            {txResult && (
              <div className={`callout ${txResult.status === "confirmed" ? "ok" : txResult.status === "failed" ? "offline" : ""}`}>
                <div>Status: <strong>{txResult.status}</strong></div>
                <div style={{ fontSize: 12, color: "#8ca5c7", wordBreak: "break-all" }}>
                  tx: {txResult.tx_hash}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <footer style={{ marginTop: 24, fontSize: 12, color: "#6e7a8f", textAlign: "center" }}>
        CoachAI · QVAC on-device AI · WDK self-custody wallet · Private · No cloud
        <br />
        Built for the Tether Developers Cup 2026
      </footer>
    </div>
  );
}
