// backend/src/tactics.js — prompt construction + on-device reasoning orchestration.
//
// Builds grounded prompts from REAL match data and routes them through the
// on-device QVAC model (Llama 3.2 1B via the Bare worker). No canned responses —
// every analysis/Q&A is freshly generated on-device.

const SYSTEM = `You are CoachAI, an expert football (soccer) head coach and tactical analyst.
You reason about REAL match data provided to you: standings, form, fixtures, and strengths.
Give concrete, actionable tactical advice: formations, pressing triggers, key player matchups,
set-piece plans, and in-game adjustments. Be specific and concise. Use plain prose, no markdown.`

export class TacticsService {
  constructor(qvac) { this.qvac = qvac }

  /** Deep tactical analysis of a fixture, grounded in real data. */
  async analyze({ home, away, competition, context }) {
    const ctx = context || ''
    const user = `Analyse this upcoming fixture and produce a tactical game plan.

${ctx}

Fixture: ${home} (home) vs ${away} (away)${competition ? ` — ${competition}` : ''}

Respond in 4 short numbered points:
1) Recommended formation & shape for ${home} and why.
2) Pressing strategy: where to trigger the press and how to exploit ${away}.
3) The single most important player matchup / key battle.
4) One in-game adjustment if going a goal down.`

    const res = await this.qvac.complete([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ])
    return { home, away, competition, analysis: res.text, ms: res.ms, tokens: res.chunks, on_device: true }
  }

  /** Free-form coach Q&A grounded in real match data. */
  async ask({ question, context }) {
    const ctx = context || 'No specific fixture context provided.'
    const user = `Match context:\n${ctx}\n\nCoach question: ${question}\n\nAnswer as a top coach in 3-5 sentences, grounded in the data above.`
    const res = await this.qvac.complete([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ])
    return { question, answer: res.text, ms: res.ms, tokens: res.chunks, on_device: true }
  }

  /** One-line formation suggestion for a given matchup. */
  async formation({ home, away, context }) {
    const user = `${context || ''}\n\nSuggest the best formation for ${home} to beat ${away} in one sentence, naming the shape and the key idea.`
    const res = await this.qvac.complete([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ])
    return { home, away, suggestion: res.text.trim(), ms: res.ms, on_device: true }
  }
}
