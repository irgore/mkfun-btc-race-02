/**
 * btc-race-24h entry: EMA crossover with RSI confirmation.
 * Strategy: buy when fast EMA crosses above slow EMA + RSI < 70,
 *           sell on cross-down or 8% max drawdown.
 * Long only, single asset (CBBTC), 1 position max.
 */
import { BPS, runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const FAST = 6, SLOW = 18, RSI_PER = 14;
const RSI_OVER = 70, MAX_DD_BPS = 800, MAX_SLIP = 100;

let closes: number[] = [];
let fast = 0, slow = 0, pfast = 0, pslow = 0;
let entry = 0;
let scale = 0;

function rsi(): number {
  if (closes.length < RSI_PER + 1) return 50;
  let g = 0, l = 0;
  for (let i = closes.length - RSI_PER; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  if (l === 0) return 100;
  return 100 - 100 / (1 + (g / RSI_PER) / (l / RSI_PER));
}

await runBars({
  onBatch(state: BarsState): OrderInput[] {
    const raw = state.close('CBBTC');
    if (raw === null) return [];
    if (scale === 0) {
      const s = state.hello.symbols.find(x => x.symbol === 'CBBTC');
      scale = s?.price_scale ?? 0;
    }
    const c = Number(raw) / (10 ** scale);
    closes.push(c);
    if (closes.length > 200) closes = closes.slice(-200);

    const kf = 2 / (FAST + 1), ks = 2 / (SLOW + 1);
    pfast = fast; pslow = slow;
    fast = fast === 0 ? c : c * kf + fast * (1 - kf);
    slow = slow === 0 ? c : c * ks + slow * (1 - ks);

    const orders: OrderInput[] = [];
    const inPos = state.positions.has('CBBTC');
    const ready = closes.length >= SLOW + 2;

    if (!inPos && ready && !state.warmingUp) {
      const cross = pfast <= pslow && fast > pslow;
      if (cross && rsi() < RSI_OVER) {
        const spend = (state.cash * 95n) / 100n;
        if (spend >= BigInt(state.hello.fees.min_notional_quote_units)) {
          orders.push({ side: 'buy', symbol: 'CBBTC', notional_quote_units: spend, max_slippage_bps: MAX_SLIP });
          entry = c;
        }
      }
    }
    if (inPos) {
      const cross = pfast >= pslow && fast < pslow;
      const dd = entry > 0 ? (c - entry) / entry * 10000 : 0;
      if (cross || dd < -MAX_DD_BPS) {
        const pos = state.positions.get('CBBTC');
        if (pos) {
          orders.push({ side: 'sell', symbol: 'CBBTC', qty: pos.qty, max_slippage_bps: MAX_SLIP });
        }
      }
    }
    return orders;
  },
});