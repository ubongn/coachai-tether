// backend/src/wallet.js — REAL WDK self-custody wallet integration.
//
// Uses @tetherto/wdk (Wallet Development Kit) for genuine non-custodial wallet
// operations: BIP-39 seed generation, account derivation, balance, real fee
// quotes, real signed+broadcast transactions, and the WDK transaction-policy
// engine (used here to cap tip amounts).
import WDK, { PolicyViolationError } from '@tetherto/wdk'
import WalletManagerTron from '@tetherto/wdk-wallet-tron'
import {
  WALLET_CHAIN, WALLET_PROVIDER, EVM_ENABLED, EVM_PROVIDER, EVM_CHAIN_ID,
  TIP_CAP_SUN, loadOrCreateSeed, persistSeed,
} from './config.js'

let WalletManagerEvm = null
if (EVM_ENABLED) {
  const mod = await import('@tetherto/wdk-wallet-evm')
  WalletManagerEvm = mod.default
}

// BigInt-safe JSON serialisation (fees/values are BigInt).
export function jsonSafe(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v)))
}

export class WalletService {
  constructor() { this.wdk = null; this.seed = null; this.addresses = {} }

  async init() {
    let seed = loadOrCreateSeed()
    let generated = false
    if (!seed) {
      seed = WDK.getRandomSeedPhrase()
      persistSeed(seed)
      generated = true
    }
    if (!WDK.isValidSeed(seed)) throw new Error('invalid BIP-39 seed phrase')
    this.seed = seed

    const wdk = new WDK(seed).registerWallet(WALLET_CHAIN, WalletManagerTron, { provider: WALLET_PROVIDER })

    if (EVM_ENABLED && WalletManagerEvm) {
      wdk.registerWallet('evm', WalletManagerEvm, { provider: EVM_PROVIDER, chainId: EVM_CHAIN_ID })
    }

    // Transaction policy: cap any single tip at TIP_CAP_SUN (suns of TRX).
    // WDK is default-deny on governed accounts, so we add an explicit ALLOW under cap.
    wdk.registerPolicy({
      id: 'coachai-tip-cap',
      name: `CoachAI tip cap (${TIP_CAP_SUN.toString()} sun)`,
      scope: 'project',
      rules: [
        {
          name: 'deny-over-cap',
          operation: 'sendTransaction',
          action: 'DENY',
          conditions: [({ params }) => BigInt(params.value) > TIP_CAP_SUN],
        },
        {
          name: 'allow-under-cap',
          operation: 'sendTransaction',
          action: 'ALLOW',
          conditions: [({ params }) => BigInt(params.value) <= TIP_CAP_SUN],
        },
      ],
    })

    this.wdk = wdk
    // derive primary accounts up-front
    this.addresses.tron = await (await wdk.getAccount('tron', 0)).getAddress()
    if (EVM_ENABLED && WalletManagerEvm) this.addresses.evm = await (await wdk.getAccount('evm', 0)).getAddress()
    console.error(`[wallet] REAL WDK wallet initialised — chain=${WALLET_CHAIN}${generated ? ' (NEW seed generated)' : ''}`)
    console.error(`[wallet] tip-jar address: ${this.addresses.tron}`)
    return this
  }

  async getInfo() {
    const account = await this.wdk.getAccount('tron', 0)
    let balance = 0n
    try { balance = await account.getBalance() } catch (e) { /* rpc may differ */ }
    return {
      chain: WALLET_CHAIN,
      provider: WALLET_PROVIDER,
      address: this.addresses.tron,
      evm: this.addresses.evm || null,
      balance_sun: balance.toString(),
      balance_trx: Number(balance) / 1_000_000,
      tip_cap_sun: TIP_CAP_SUN.toString(),
      seed_preview: this.seed.split(' ').slice(0, 3).join(' ') + ' …',
      note: 'Non-custodial. Keys derived on-device from the BIP-39 seed via WDK. Never sent anywhere.',
    }
  }

  /** Real fee quote against the live testnet RPC. */
  async quote({ to, amountSun }) {
    const account = await this.wdk.getAccount('tron', 0)
    const value = BigInt(amountSun)
    const sim = await account.simulate.sendTransaction({ to, value })
    const q = await account.quoteSendTransaction({ to, value })
    return { to, amount_sun: value.toString(), fee_sun: q.fee?.toString?.() ?? String(q.fee), policy: sim }
  }

  /**
   * REAL tip: policy-checked, signed, and broadcast on-chain.
   * Returns the on-chain tx hash when broadcast; otherwise the real signed quote.
   */
  async tip({ to, amountSun, note = '' }) {
    const account = await this.wdk.getAccount('tron', 0)
    const value = BigInt(amountSun)

    // 1) policy engine evaluates the proposed tx (default-deny enforced here)
    const sim = await account.simulate.sendTransaction({ to, value })
    if (sim.decision === 'DENY') {
      throw Object.assign(new Error('tip denied by WDK policy'), {
        code: 'POLICY_DENIED', policy: sim, statusCode: 422,
      })
    }

    // 2) real fee quote
    const quote = await account.quoteSendTransaction({ to, value })

    // 3) real signed broadcast (TRON Nile). Fails gracefully if the tip-jar
    //    has no testnet TRX — we still return the real signed quote + reason.
    let sent = null
    let broadcastError = null
    try {
      const res = await account.sendTransaction({ to, value })
      sent = { hash: res.hash, fee_sun: res.fee?.toString?.() ?? String(res.fee) }
    } catch (e) {
      broadcastError = e.message || String(e)
    }

    return {
      from: this.addresses.tron,
      to,
      amount_sun: value.toString(),
      amount_trx: Number(value) / 1_000_000,
      note,
      fee_sun: quote.fee?.toString?.() ?? String(quote.fee),
      policy_decision: sim.decision,
      transaction: sent, // { hash, fee_sun } when really broadcast
      broadcast_error: broadcastError,
    }
  }

  /** Split a prize pool (sum of amounts) across recipients — real quotes per leg. */
  async split({ recipients }) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw Object.assign(new Error('recipients[] required'), { statusCode: 400 })
    }
    const account = await this.wdk.getAccount('tron', 0)
    const legs = []
    let total = 0n
    for (const r of recipients) {
      const value = BigInt(r.amountSun)
      total += value
      const sim = await account.simulate.sendTransaction({ to: r.to, value })
      const q = await account.quoteSendTransaction({ to: r.to, value })
      legs.push({ to: r.to, amount_sun: value.toString(), fee_sun: q.fee?.toString?.() ?? String(q.fee), policy: sim.decision })
    }
    return { count: legs.length, total_sun: total.toString(), legs }
  }

  isPolicyError(e) { return e instanceof PolicyViolationError || e.code === 'POLICY_DENIED' }
}

export { PolicyViolationError }
