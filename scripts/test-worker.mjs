// Test the QVAC worker over stdio JSON-RPC (the same path the backend bridge uses).
import { spawn } from 'node:child_process'

const proc = spawn('bare', ['qvac-worker/worker.cjs'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit'],
  shell: process.platform === 'win32',
})

let buf = ''
const pending = new Map()
let bootResolve
const booted = new Promise((r) => (bootResolve = r))

proc.stdout.on('data', (chunk) => {
  buf += chunk.toString()
  let nl
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl); buf = buf.slice(nl + 1)
    if (!line.trim()) continue
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.id === 'boot') { console.log('[boot]', msg); bootResolve(msg); continue }
    const r = pending.get(msg.id)
    if (r) { r(msg); pending.delete(msg.id) }
  }
})

function rpc(req) {
  return new Promise((res) => { pending.set(req.id, res); proc.stdin.write(JSON.stringify(req) + '\n') })
}

const boot = await booted
if (!boot.ok) { console.error('worker failed to boot'); process.exit(1) }

const r1 = await rpc({ id: 1, type: 'ping' })
console.log('PING ->', r1)

const r2 = await rpc({
  id: 2, type: 'complete',
  messages: [
    { role: 'system', content: 'You are CoachAI, a concise football tactics assistant. Answer in 2 sentences.' },
    { role: 'user', content: 'How do I defend against a team playing a high-press 4-3-3?' },
  ],
})
console.log('COMPLETE ->', JSON.stringify(r2))

proc.stdin.end()
setTimeout(() => process.exit(0), 500)
