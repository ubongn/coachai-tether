// backend/src/server.js — Fastify HTTP API wiring REAL QVAC AI + REAL WDK wallet.
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PORT, HOST, CORS_ORIGIN, QVAC_ENABLED } from './config.js'
import { QvacBridge } from './qvac-bridge.js'
import { WalletService, jsonSafe } from './wallet.js'
import { TacticsService } from './tactics.js'
import { getUpcomingMatches, getStandings, buildMatchContext } from './football.js'

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } })
  await app.register(cors, { origin: CORS_ORIGIN })

  const qvac = new QvacBridge()
  const wallet = await new WalletService().init()
  const tactics = new TacticsService(qvac)

  // Real on-device AI boots in the background (model load ~2s) so the API is up instantly.
  let qvacReady = false
  let qvacError = null
  if (QVAC_ENABLED) {
    qvac.start().then(() => { qvacReady = true }).catch((e) => {
      qvacError = e.message; app.log.error({ err: e.message }, 'QVAC worker failed to boot')
    })
  }

  function requireQvac() {
    if (!QVAC_ENABLED) throw Object.assign(new Error('QVAC disabled (QVAC_ENABLED=false)'), { statusCode: 503 })
    if (qvacError) throw Object.assign(new Error('QVAC worker unavailable: ' + qvacError), { statusCode: 503 })
    if (!qvacReady) throw Object.assign(new Error('QVAC on-device model still loading — retry shortly'), { statusCode: 503 })
  }

  app.setErrorHandler((err, _req, reply) => {
    const code = err.statusCode || 500
    app.log.error({ err: err.message, code }, 'request error')
    reply.code(code).send(jsonSafe({ ok: false, error: err.message, ...(err.policy ? { policy: err.policy } : {}) }))
  })

  // ---- health -------------------------------------------------------------
  app.get('/api/health', async () => jsonSafe({
    ok: true, service: 'coachai',
    qvac: QVAC_ENABLED ? { enabled: true, ready: qvacReady, error: qvacError } : { enabled: false },
    wallet: { chain: wallet.addresses.tron ? 'tron' : null, address: wallet.addresses.tron },
    tracks: ['QVAC — real on-device AI (qvac-fabric-llm.cpp / Llama 3.2 1B)', 'WDK — real self-custody wallet'],
  }))

  // ---- football data ------------------------------------------------------
  app.get('/api/matches', async (req) => getUpcomingMatches(Number(req.query.limit) || 12))
  app.get('/api/standings', async (req) => getStandings(req.query.competition || 'PL'))

  // ---- on-device AI: tactical analysis -----------------------------------
  app.post('/api/analyze', async (req) => {
    requireQvac()
    const { home, away, competition } = req.body || {}
    if (!home || !away) throw Object.assign(new Error('body requires { home, away }'), { statusCode: 400 })
    const context = await buildMatchContext({ home, away, competition })
    return jsonSafe(await tactics.analyze({ home, away, competition, context }))
  })

  app.post('/api/formation', async (req) => {
    requireQvac()
    const { home, away } = req.body || {}
    if (!home || !away) throw Object.assign(new Error('body requires { home, away }'), { statusCode: 400 })
    const context = await buildMatchContext({ home, away })
    return jsonSafe(await tactics.formation({ home, away, context }))
  })

  app.post('/api/ask', async (req) => {
    requireQvac()
    const { question, home, away, competition } = req.body || {}
    if (!question) throw Object.assign(new Error('body requires { question }'), { statusCode: 400 })
    const context = home ? await buildMatchContext({ home, away, competition }) : ''
    return jsonSafe(await tactics.ask({ question, context }))
  })

  // ---- REAL WDK wallet ----------------------------------------------------
  app.get('/api/wallet', async () => jsonSafe(await wallet.getInfo()))

  app.post('/api/wallet/quote', async (req) => {
    const { to, amountSun } = req.body || {}
    if (!to || amountSun == null) throw Object.assign(new Error('body requires { to, amountSun }'), { statusCode: 400 })
    return jsonSafe(await wallet.quote({ to, amountSun }))
  })

  app.post('/api/wallet/tip', async (req) => {
    const { to, amountSun, note } = req.body || {}
    if (!to || amountSun == null) throw Object.assign(new Error('body requires { to, amountSun }'), { statusCode: 400 })
    try { return jsonSafe(await wallet.tip({ to, amountSun, note })) }
    catch (e) {
      if (wallet.isPolicyError(e)) throw Object.assign(new Error('tip denied by WDK policy engine'), { statusCode: 422, policy: e.policy })
      throw e
    }
  })

  app.post('/api/wallet/split', async (req) => {
    const { recipients } = req.body || {}
    return jsonSafe(await wallet.split({ recipients }))
  })

  return { app, qvac, wallet }
}

// ---- run as a process ------------------------------------------------------
import { pathToFileURL } from 'node:url'
// Robust cross-platform "is main module" check (the naive `file://`+argv concat
// fails on Windows due to path separators / drive letters).
const isMain = import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const { app, qvac } = await buildApp()
  try {
    await app.listen({ port: PORT, host: HOST })
    console.error(`[coachai] backend on http://${HOST}:${PORT}`)
  } catch (e) {
    console.error('[coachai] failed to start', e); process.exit(1)
  }
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => { await qvac.stop(); await app.close(); process.exit(0) })
  }
}
