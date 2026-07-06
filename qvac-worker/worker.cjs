/**
 * qvac-worker/worker.cjs — REAL on-device AI inference worker.
 *
 * Runs on the Holepunch Bare runtime (NOT Node.js), because the QVAC native
 * engine `qvac-fabric-llm.cpp` (via @qvac/llm-llamacpp) ships as a Bare addon.
 *
 * Loads a real quantized LLM (Llama 3.2 1B Instruct, Q4_K_M) once into memory and
 * serves completion requests over a newline-delimited JSON-RPC channel on stdio:
 *
 *   request  (stdin):  {"id": <int>, "type": "complete", "messages": [{"role","content"}, ...]}
 *                      {"id": <int>, "type": "ping"}
 *   response (stdout): {"id": <int>, "ok": true, "text": "...", "ms": 123, "chunks": 45}
 *
 * All diagnostics go to stderr so stdout stays a clean RPC channel.
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict'

const path = require('bare-path')
const process = require('bare-process')
const LlmLlamacpp = require('@qvac/llm-llamacpp') // IS the engine class (qvac-fabric-llm.cpp)

const DEFAULT_MODEL_NAME = 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'
function resolveModelPath() {
  if (process.env.QVAC_MODEL_PATH) return process.env.QVAC_MODEL_PATH
  return path.join(__dirname, '..', 'models', process.env.QVAC_MODEL_NAME || DEFAULT_MODEL_NAME)
}

const MODEL_PATH = resolveModelPath()
const CTX = Number(process.env.QVAC_CTX || 4096)
const TEMP = String(process.env.QVAC_TEMP || 0.6)
const PREDICT = Number(process.env.QVAC_MAX_TOKENS || 384)
const SEED = String(process.env.QVAC_SEED || 42)

let engine = null
let ready = false

function log(...a) { console.error('[qvac-worker]', ...a) }

async function loadEngine() {
  log('Instantiating qvac-fabric-llm.cpp engine on Bare runtime')
  log('Model:', MODEL_PATH)
  engine = new LlmLlamacpp({
    files: { model: [MODEL_PATH] },
    config: {
      device: 'cpu',
      ctx_size: String(CTX),
      temp: TEMP,
      top_p: '0.9',
      predict: String(PREDICT),
      seed: SEED,
      repeat_penalty: '1.1',
    },
  })
  log('Loading model weights into memory ...')
  const t0 = Date.now()
  await engine.load()
  log(`Model loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s — ready for inference`)
  ready = true
}

async function complete(messages) {
  if (!ready) throw new Error('engine not ready')
  const t0 = Date.now()
  const res = await engine.run(messages)
  let text = ''
  let chunks = 0
  if (typeof res.onUpdate === 'function') {
    res.onUpdate((tok) => { if (typeof tok === 'string') { text += tok; chunks++ } })
  }
  await res.await()
  return { text: text.trim(), ms: Date.now() - t0, chunks }
}

function send(obj) { console.log(JSON.stringify(obj)) }

let buf = ''
async function handleLine(raw) {
  let req
  try { req = JSON.parse(raw) } catch (e) { send({ id: null, ok: false, error: 'invalid json: ' + e.message }); return }
  try {
    if (req.type === 'ping') { send({ id: req.id, ok: true, ready }); return }
    if (req.type === 'complete') {
      const msgs = Array.isArray(req.messages) ? req.messages : [{ role: 'user', content: String(req.messages) }]
      const out = await complete(msgs)
      send({ id: req.id, ok: true, ...out })
      return
    }
    send({ id: req.id, ok: false, error: 'unknown type: ' + req.type })
  } catch (e) {
    send({ id: req.id, ok: false, error: String(e && e.message || e) })
  }
}

function onStdinData(chunk) {
  buf += chunk.toString()
  let nl
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim()
    buf = buf.slice(nl + 1)
    if (line) handleLine(line)
  }
}

async function main() {
  log('QVAC worker starting (Bare runtime). pid=', process.pid)
  await loadEngine()
  send({ id: 'boot', ok: true, ready: true, model: MODEL_PATH })
  process.stdin.on('data', onStdinData)
  process.stdin.on('end', () => { log('stdin closed, exiting'); engine && engine.unload() })
  process.stdin.resume()
}

main().catch((e) => { log('FATAL', e); send({ id: 'boot', ok: false, error: String(e && e.message || e) }) })
