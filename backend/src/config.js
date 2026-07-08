// backend/src/config.js — centralised configuration & wallet-seed persistence.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const env = process.env

function bool(k, d) { return env[k] !== undefined ? env[k] === 'true' || env[k] === '1' : d }
function int(k, d) { const n = Number(env[k]); return Number.isFinite(n) ? n : d }

export const PORT = int('PORT', 8000)
export const HOST = env.HOST || '0.0.0.0'
export const CORS_ORIGIN = env.CORS_ORIGIN || '*'

// ---- QVAC worker ----------------------------------------------------------
export const QVAC_WORKER = env.QVAC_WORKER || join(process.cwd(), 'qvac-worker', 'worker.cjs')
export const QVAC_MODEL_PATH = env.QVAC_MODEL_PATH || '' // passed to worker if set
export const QVAC_ENABLED = bool('QVAC_ENABLED', true)
// If true, the backend spawns & manages the QVAC Bare worker. If false, you must
// run it yourself (e.g. `npm run worker`) and set QVAC_WORKER_URL to its HTTP bridge.
export const QVAC_SPAWN = bool('QVAC_SPAWN', true)

// ---- WDK wallet -----------------------------------------------------------
// TRON Nile testnet — free, Tether-aligned (USDT native chain).
export const WALLET_CHAIN = env.WALLET_CHAIN || 'tron'
export const WALLET_PROVIDER = env.WALLET_PROVIDER || 'https://nile.trongrid.io'

// Optional second chain (EVM Sepolia). Leave blank to disable.
export const EVM_ENABLED = bool('EVM_ENABLED', false)
export const EVM_PROVIDER = env.EVM_PROVIDER || 'https://rpc.sepolia.org'
export const EVM_CHAIN_ID = int('EVM_CHAIN_ID', 11155111)

// Policy: cap any single tip at this many sun (1 TRX = 1_000_000 sun).
export const TIP_CAP_SUN = BigInt(int('TIP_CAP_SUN', 100_000_000)) // 100 TRX

// ---- Football data (football-data.org) ------------------------------------
export const FOOTBALL_DATA_TOKEN = env.FOOTBALL_DATA_TOKEN || ''
// comma-separated competition codes the free tier covers
export const FOOTBALL_COMPETITIONS = (env.FOOTBALL_COMPETITIONS || 'CL,PL,PD,SA,FL1,BL1').split(',')

// ---- Wallet seed persistence ---------------------------------------------
function stateDir() {
  const d = env.STATE_DIR || join(process.cwd(), '.coachai')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

export function loadOrCreateSeed() {
  if (env.WALLET_SEED) return env.WALLET_SEED.trim()
  const file = join(stateDir(), 'seed.txt')
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  // generate via WDK at first use (see wallet.js), persisted by caller
  return null
}

export function persistSeed(seed) {
  const file = join(stateDir(), 'seed.txt')
  writeFileSync(file, seed, { mode: 0o600 })
}
