// ─── $FARBORN Dynamic Pricing (DB-backed) ────────────────
// Prices persist across server cold starts via Turso/SQLite

import { getOne, run } from './db.js';

const BASE_BUY_PRICE = 10000;
const BASE_SELL_PRICE = 9000;
const PRICE_FLOOR = 5000;
const PRICE_CEILING = 50000;
const SENSITIVITY = 0.001;

// In-memory cache (loaded from DB on first access)
let cached = null;
let lastLoaded = 0;
const CACHE_TTL = 5000; // reload from DB every 5s

async function loadPrices() {
  if (cached && Date.now() - lastLoaded < CACHE_TTL) return cached;
  
  let row = await getOne('SELECT * FROM token_prices WHERE id = 1');
  if (!row) {
    // First time: insert baseline
    await run('INSERT OR IGNORE INTO token_prices (id, buy_price, sell_price, recent_buys, recent_sells) VALUES (1, 10000, 9000, 0, 0)');
    row = await getOne('SELECT * FROM token_prices WHERE id = 1');
  }
  
  cached = {
    buyPrice: row.buy_price,
    sellPrice: row.sell_price,
    recentBuys: row.recent_buys,
    recentSells: row.recent_sells,
  };
  lastLoaded = Date.now();
  return cached;
}

async function savePrices(prices) {
  await run(
    'UPDATE token_prices SET buy_price = ?, sell_price = ?, recent_buys = ?, recent_sells = ?, updated_at = datetime(\'now\') WHERE id = 1',
    [prices.buyPrice, prices.sellPrice, prices.recentBuys, prices.recentSells]
  );
  cached = prices;
}

export async function recordTransaction(type, amount) {
  const prices = await loadPrices();
  
  if (type === 'buy') {
    prices.buyPrice = Math.min(PRICE_CEILING, prices.buyPrice * (1 + SENSITIVITY * amount / 10000));
    prices.sellPrice = Math.min(PRICE_CEILING, prices.sellPrice * (1 + SENSITIVITY * 0.8 * amount / 10000));
    prices.recentBuys++;
  } else if (type === 'sell') {
    prices.buyPrice = Math.max(PRICE_FLOOR, prices.buyPrice * (1 - SENSITIVITY * 0.8 * amount / 10000));
    prices.sellPrice = Math.max(PRICE_FLOOR, prices.sellPrice * (1 - SENSITIVITY * amount / 10000));
    prices.recentSells++;
  }
  
  prices.buyPrice = Math.round(prices.buyPrice);
  prices.sellPrice = Math.round(prices.sellPrice);
  
  // Save to DB (non-blocking)
  savePrices(prices).catch(e => console.warn('[pricing] save error:', e.message));
  
  return prices;
}

export async function getCurrentPrices() {
  const prices = await loadPrices();
  return {
    buyPrice: prices.buyPrice,
    sellPrice: prices.sellPrice,
    recentBuys: prices.recentBuys,
    recentSells: prices.recentSells,
    trend: prices.recentBuys > prices.recentSells ? '📈 rising' : 
           prices.recentSells > prices.recentBuys ? '📉 falling' : '➡️ stable'
  };
}
