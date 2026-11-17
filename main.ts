/**
 * btc-race-24h entry: EMA crossover with RSI filter.
 *
 * Strategy:
 *   - Track fast EMA (4 bars) and slow EMA (12 bars) of CBBTC close prices.
 *   - Buy when fast crosses above slow AND RSI < 70 (not overbought).
 *   - Sell when fast crosses below slow OR position drawdown exceeds 8%.
 *   - Start with 95% equity allocation, long only, 1 position max.
 *
 * Designed for 1-minute bars on a single asset (CBBTC/USDC).
 * Uses the vendor makefun-bars SDK for protocol handling.
 */
import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const FAST_EMA = 4;
const SLOW_EMA = 12;
const RSI_PERIOD = 14;
const RSI_OVERBOUGHT = 70;
const MAX_DRAWDOWN_BPS = 800; // 8%
const ALLOC_PCT = 95;
const MAX_SLIPPAGE_BPS = 100;

// State
let emaFast = 0;
let emaSlow = 0;
let prevFast = 0;
let prevSlow = 0;
let closes: number[] = [];
let entryPrice = 0;
let prevClose = 0;

function rsi(): number {
  if (closes.length < RSI_PERIOD + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - RSI_PERIOD; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta; else losses -= delta;
  }
  const avgGain = gains / RSI_PERIOD;
  const avgLoss = losses / RSI_PERIOD;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

await runBars({
  onBatch(state: BarsState, batch): OrderInput[] {
    const bar = state.bar('CBBTC');
    if (!bar) return [];

    const close = Number(bar.c) / (10 ** (state.hello.symbols[0]?.price_scale ?? 0));
    closes.push(close);
    if (closes.length > RSI_PERIOD * 3) closes = closes.slice(-RSI_PERIOD * 3);

    // EMA updates
    const kFast = 2 / (FAST_EMA + 1);
    const kSlow = 2 / (SLOW_EMA + 1);
    prevFast = emaFast;
    prevSlow = emaSlow;
    emaFast = emaFast === 0 ? close : close * kFast + emaFast * (1 - kFast);
    emaSlow = emaSlow === 0 ? close : close * kSlow + emaSlow * (1 - kSlow);
    prevClose = close;

    const orders: OrderInput[] = [];
    const hasPosition = state.positions.size > 0;

    if (!hasPosition && closes.length >= SLOW_EMA + 2) {
      const crossUp = prevFast <= prevSlow && emaFast > emaSlow;
      const rsiVal = rsi();
      if (crossUp && rsiVal < RSI_OVERBOUGHT) {
        const cash = Number(state.cash) / 1_000_000; // micro-USDC to USDC
        const spend = BigInt(Math.floor(cash * ALLOC_PCT / 100 * 1_000_000));
        if (spend >= BigInt(state.hello.fees.min_notional_quote_units)) {
          orders.push({
            side: 'buy',
            symbol: 'CBBTC',
            notional_quote_units: spend,
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          });
          entryPrice = close;
        }
      }
    }

    if (hasPosition) {
      const crossDown = prevFast >= prevSlow && emaFast < emaSlow;
      const drawdownBps = entryPrice > 0 ? (close - entryPrice) / entryPrice * 10000 : 0;
      const exit = crossDown || drawdownBps < -MAX_DRAWDOWN_BPS;
      if (exit) {
        const pos = [...state.positions.values()][0];
        if (pos) {
          orders.push({
            side: 'sell',
            symbol: 'CBBTC',
            qty: pos.qty,
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          });
        }
      }
    }

    return orders;
  },
});