// ─── $FARBORN Dynamic Pricing ────────────────────────
// Gold is in-game only (not on-chain), price moves by demand
// NO DECAY — prices are permanent once changed

const BASE_BUY_PRICE = 10000;   // gold per FARBORN baseline
const BASE_SELL_PRICE = 9000;   // gold per FARBORN sell baseline
const PRICE_FLOOR = 5000;       // min gold per FARBORN
const PRICE_CEILING = 50000;    // max gold per FARBORN
const SENSITIVITY = 0.001;      // how fast price moves per transaction

let buyPrice = BASE_BUY_PRICE;
let sellPrice = BASE_SELL_PRICE;
let lastPriceUpdate = Date.now();
let recentBuys = 0;   // gold→token transactions in window
let recentSells = 0;  // token→gold transactions in window

// Called every transaction to move price (NO DECAY)
export function recordTransaction(type, amount) {
  if (type === 'buy') {
    // Player buying token with gold → demand up → price up
    buyPrice = Math.min(PRICE_CEILING, buyPrice * (1 + SENSITIVITY * amount / 10000));
    sellPrice = Math.min(PRICE_CEILING, sellPrice * (1 + SENSITIVITY * 0.8 * amount / 10000));
    recentBuys++;
  } else if (type === 'sell') {
    // Player selling token for gold → supply up → price down
    buyPrice = Math.max(PRICE_FLOOR, buyPrice * (1 - SENSITIVITY * 0.8 * amount / 10000));
    sellPrice = Math.max(PRICE_FLOOR, sellPrice * (1 - SENSITIVITY * amount / 10000));
    recentSells++;
  }

  buyPrice = Math.round(buyPrice);
  sellPrice = Math.round(sellPrice);
  lastPriceUpdate = Date.now();
}

export function getCurrentPrices() {
  return {
    buyPrice: Math.round(buyPrice),
    sellPrice: Math.round(sellPrice),
    recentBuys,
    recentSells,
    trend: recentBuys > recentSells ? '📈 rising' : recentSells > recentBuys ? '📉 falling' : '➡️ stable'
  };
}
