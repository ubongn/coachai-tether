// fetch-model.mjs — downloads a real GGUF model for the on-device QVAC engine.
// Runs on plain Node.js (not Bare) since Node has robust fetch + fs streams.
// The QVAC worker (Bare runtime) then loads this file via qvac-fabric-llm.cpp.
import { createWriteStream, existsSync, mkdirSync, statSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODELS_DIR = join(__dirname, '..', 'models')
const DEFAULT_URL =
  'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf'
const DEFAULT_NAME = 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'
const EXPECTED_SIZE = 807694464

const url = process.env.QVAC_MODEL_URL || DEFAULT_URL
const name = process.env.QVAC_MODEL_NAME || DEFAULT_NAME
const dest = join(MODELS_DIR, name)

function formatBytes(b) {
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

if (existsSync(dest) && Math.abs(statSync(dest).size - EXPECTED_SIZE) < 1024) {
  console.log(`[fetch-model] Already present: ${dest} (${formatBytes(statSync(dest).size)})`)
  console.log(`[fetch-model] QVAC_MODEL_PATH=${dest}`)
  process.exit(0)
}

mkdirSync(MODELS_DIR, { recursive: true })
console.log(`[fetch-model] Downloading real on-device model for QVAC engine...`)
console.log(`[fetch-model]   from: ${url}`)
console.log(`[fetch-model]   to:   ${dest}`)

const res = await fetch(url)
if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`)

const total = Number(res.headers.get('content-length') || EXPECTED_SIZE)
let received = 0
let lastPct = -1
const tmp = dest + '.part'
const stream = createWriteStream(tmp)

for await (const chunk of res.body) {
  stream.write(chunk)
  received += chunk.length
  const pct = total ? Math.floor((received / total) * 100) : 0
  if (pct !== lastPct && pct % 5 === 0) {
    lastPct = pct
    process.stdout.write(`\r[fetch-model] ${pct}% (${formatBytes(received)} / ${formatBytes(total)})   `)
  }
}
await new Promise((r) => stream.end(r))
renameSync(tmp, dest)
console.log(`\n[fetch-model] ✅ Done: ${dest} (${formatBytes(statSync(dest).size)})`)
console.log(`[fetch-model] Set QVAC_MODEL_PATH=${dest} for the QVAC worker.`)
