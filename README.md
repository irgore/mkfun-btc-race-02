# btc-race-24h

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/irgore/mkfun-btc-race-02/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/irgore/mkfun-btc-race-02/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

## Strategy

Buy-and-hold with trailing stop-loss (6%) and take-profit (15%) on CBBTC/USDC.

- Enters 95% equity on first tradeable bar
- Exits on 6% trailing stop from peak or 15% take-profit
- Long only, single position

## Run

```bash
node cli/makefun.mjs grade-local --kit . --bot /path/to/bot --driver docker
```

## Referral

Use code `f04tmnkt` on [make.fun](https://make.fun/r/f04tmnkt) to get started.