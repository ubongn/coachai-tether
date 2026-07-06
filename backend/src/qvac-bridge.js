// backend/src/qvac-bridge.js — spawns & talks to the REAL QVAC Bare worker.
//
// The QVAC native engine (qvac-fabric-llm.cpp) only loads on the Holepunch Bare
// runtime, so the backend (Node.js) spawns `bare qvac-worker/worker.cjs` as a
// long-lived child process and speaks newline-delimited JSON-RPC over stdio.
// The worker keeps the Llama 3.2 1B model resident in memory.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { QVAC_WORKER, QVAC_MODEL_PATH, QVAC_ENABLED, QVAC_SPAWN } from './config.js'

export class QvacBridge {
  constructor() {
    this.proc = null
    this.buf = ''
    this.pending = new Map()
    this._nextId = 1
    this.ready = false
    this.bootPromise = null
  }

  async start() {
    if (!QVAC_ENABLED) { this.disabled = true; return }
    if (!QVAC_SPAWN) { return } // externally managed
    if (this.bootPromise) return this.bootPromise
    this.bootPromise = this._spawn()
    return this.bootPromise
  }

  async _spawn() {
    if (!existsSync(QVAC_WORKER)) throw new Error(`QVAC worker not found: ${QVAC_WORKER}`)
    const args = [QVAC_WORKER]
    const env = { ...process.env }
    if (QVAC_MODEL_PATH) env.QVAC_MODEL_PATH = QVAC_MODEL_PATH

    this.proc = spawn('bare', args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit'],
      env,
      shell: process.platform === 'win32',
    })

    this.proc.on('exit', (code) => {
      console.error(`[qvac-bridge] worker exited (code=${code})`)
      this.ready = false
      this.bootPromise = null
      // fail any in-flight requests
      for (const [id, { reject }] of this.pending) {
        reject(new Error(`qvac worker exited (code=${code})`))
      }
      this.pending.clear()
    })

    this.proc.stdout.on('data', (chunk) => this._onData(chunk))

    await new Promise((resolve, reject) => {
      this._bootResolve = resolve
      this._bootReject = reject
      this._bootTimer = setTimeout(() => reject(new Error('qvac worker boot timeout (90s)')), 90_000)
    })
  }

  _onData(chunk) {
    this.buf += chunk.toString()
    let nl
    while ((nl = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, nl).trim()
      this.buf = this.buf.slice(nl + 1)
      if (!line) continue
      let msg
      try { msg = JSON.parse(line) } catch { continue }
      if (msg.id === 'boot') {
        clearTimeout(this._bootTimer)
        if (msg.ok) { this.ready = true; console.error('[qvac-bridge] worker ready'); this._bootResolve(msg) }
        else this._bootReject(new Error(msg.error || 'worker boot failed'))
        continue
      }
      const p = this.pending.get(msg.id)
      if (p) {
        this.pending.delete(msg.id)
        clearTimeout(p.timer)
        msg.ok ? p.resolve(msg) : p.reject(new Error(msg.error || 'qvac inference failed'))
      }
    }
  }

  /**
   * Run on-device completion. Returns { text, ms, chunks }.
   * @param {Array<{role:string,content:string}>} messages
   * @param {number} timeoutMs
   */
  async complete(messages, timeoutMs = 60_000) {
    if (this.disabled) throw new Error('QVAC is disabled (QVAC_ENABLED=false)')
    if (!this.ready) throw new Error('QVAC worker not ready')
    const id = this._nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`qvac complete timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.proc.stdin.write(JSON.stringify({ id, type: 'complete', messages }) + '\n')
    })
  }

  async ping() {
    if (this.disabled) return { ok: true, ready: false, disabled: true }
    if (!this.ready) return { ok: false, ready: false }
    const id = this._nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('ping timeout')) }, 5_000)
      this.pending.set(id, { resolve: (m) => resolve({ ok: true, ready: m.ready }), reject, timer })
      this.proc.stdin.write(JSON.stringify({ id, type: 'ping' }) + '\n')
    })
  }

  async stop() {
    if (this.proc) {
      try { this.proc.stdin.end() } catch {}
      this.proc.kill()
    }
  }
}
