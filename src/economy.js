import db from './db.js';

// ═══════════════════════════════════════════════════════════
//  DYNAMIC PRICING ENGINE (Bonding Curve + Market Dynamics)
// ═══════════════════════════════════════════════════════════
//  Formula: price = basePrice * (1 + k * supply/demand)
//  - Gold makin banyak supply → makin murah dikonversi ke FARBORN
//  - Demand naik (banyak beli) → FARBORN naik, gold makin murah
//  - Gold makin langka → makin mahal konversi ke FARBORN
//
//  Economics:
//  ┌─────────────────────────────────────────────────────┐
//  │ GOLD SUPPLY ↑  →  Gold value ↓  →  More gold/token │
//  │ GOLD SUPPLY ↓  →  Gold value ↑  →  Less gold/token │
//  │ DEMAND ↑       →  Token value ↑ →  More gold/token │
//  │ DEMAND ↓       →  Token value ↓ →  Less gold/token │
//  └─────────────────────────────────────────────────────┘

const BASE_PRICE = 10000        // 10,000 gold = 1 FARBORN base
const K_FACTOR = 0.000001       // sensitivity coefficient
const PRICE_FLOOR = 5_000       // minimum gold per token (50% of base)
const PRICE_CEILING = 40000     // maximum gold per token (4x base)
const DEMAND_WINDOW_HOURS = 24  // rolling window for demand calc

// ─── Core Pricing Functions ─────────────────────────────

// Get current economic state from global_economy table
function getEconomyState() {
  let state = db.prepare('SELECT * FROM global_economy WHERE id = 1').get();
  if (!state) {
    // Initialize with defaults
    db.prepare(`
      INSERT OR IGNORE INTO global_economy (id, total_gold_supply, total_farborn_burned, recent_claims, recent_purchases, avg_gold_per_level)
      VALUES (1, 0, 0, 0, 0, 1000)
    `).run();
    state = db.prepare('SELECT * FROM global_economy WHERE id = 1').get();
  }
  return state;
}

// Calculate dynamic price: gold per 1 FARBORN
function calculateGoldPrice() {
  const state = getEconomyState();

  // Supply pressure: more gold in circulation → gold worth less
  // Scale factor based on total gold in system (normalized per active player)
  const activePlayers = db.prepare('SELECT COUNT(*) as c FROM players WHERE gold > 0').get().c || 1;
  const avgGold = state.total_gold_supply / activePlayers;
  const supplyPressure = Math.log2(avgGold / 50_000 + 1) * 0.15; // +15% per doubling of avg gold

  // Demand pressure: recent marketplace activity
  // High demand = many purchases → token more valuable → need more gold
  const demandPressure = state.recent_purchases > 10 ? Math.log2(state.recent_purchases / 10) * 0.1 : 0;

  // Burn pressure: burned tokens reduce supply → remaining tokens worth more
  const burnPressure = state.total_farborn_burned > 1000 ? Math.log2(state.total_farborn_burned / 1000) * 0.05 : 0;

  // Base price adjusted by all pressures
  let price = BASE_PRICE * (1 + supplyPressure - demandPressure - burnPressure);

  // Clamp to floor/ceiling
  price = Math.max(PRICE_FLOOR, Math.min(PRICE_CEILING, price));

  return Math.round(price);
}

// Get buy/sell prices (with spread for market maker fee)
function getPrices() {
  const goldPrice = calculateGoldPrice(); // gold needed per 1 FARBORN

  // Sell price: player sells FARBORN for gold (lower — market buys cheap)
  const sellPrice = Math.round(goldPrice * 0.95); // 5% spread

  // Buy price: player buys FARBORN with gold (higher — market sells high)
  const buyPrice = Math.round(goldPrice * 1.05); // 5% spread

  return {
    basePrice: BASE_PRICE,
    currentPrice: goldPrice,
    sellPrice,      // player sells FARBORN → gets this much gold
    buyPrice,       // player buys FARBORN → pays this much gold
    supplyPressure: getEconomyState(),
    timestamp: Date.now()
  };
}

// ─── Price History (for charting) ───────────────────────
function recordPricePoint(price) {
  db.prepare(`
    INSERT INTO price_history (price, timestamp) VALUES (?, datetime('now'))
  `).run(price);
}

function getPriceHistory(hours = 24) {
  return db.prepare(`
    SELECT price, timestamp FROM price_history
    WHERE timestamp >= datetime('now', '-${hours} hours')
    ORDER BY timestamp ASC
  `).all();
}

// ─── Update Economy State (called after events) ─────────
function updateGoldSupply(delta) {
  db.prepare(`
    UPDATE global_economy SET 
      total_gold_supply = total_gold_supply + ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(delta);
}

function updateTokenBurn(amount) {
  db.prepare(`
    UPDATE global_economy SET
      total_farborn_burned = total_farborn_burned + ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(amount);
}

function incrementRecentClaims() {
  db.prepare(`
    UPDATE global_economy SET 
      recent_claims = recent_claims + 1,
      updated_at = datetime('now')
    WHERE id = 1
  `).run();
}

function incrementRecentPurchases() {
  db.prepare(`
    UPDATE global_economy SET
      recent_purchases = recent_purchases + 1,
      updated_at = datetime('now')
    WHERE id = 1
  `).run();
}

// Decay recent activity (called by cron)
function decayActivity() {
  db.prepare(`
    UPDATE global_economy SET
      recent_claims = MAX(0, recent_claims - 1),
      recent_purchases = MAX(0, recent_purchases - 1),
      updated_at = datetime('now')
    WHERE id = 1
  `).run();
}

// ═══════════════════════════════════════════════════════════
//  GOLD SINKS (Prevent Inflation)
// ═══════════════════════════════════════════════════════════
//
//  ┌─────────────────────────────────────────────────────┐
//  │  GOLD SINKS → reduce gold supply → gold makin valuable│
//  │                                                      │
//  │  1. Death penalty     → lose gold on death           │
//  │  2. Repair costs      → equipment durability loss    │
//  │  3. Shop tax          → NPC shop markup              │
//  │  4. Forge costs       → upgrade/enhance fees          │
//  │  5. Fast travel       → zone teleport cost            │
//  │  6. Potion crafting   → material gold cost            │
//  │  7. Guild taxes       → guild contribution            │
//  │  8. Market listing fee → 1% listing cost              │
//  └─────────────────────────────────────────────────────┘

const GOLD_SINKS = {
  // Death penalty: lose percentage of carried gold
  death: {
    name: 'Death Penalty',
    icon: '💀',
    percentage: 0.10, // lose 10% on death
    cap: 50_000,      // max 50k gold lost
    enabled: true
  },

  // Equipment repair: costs gold to repair damaged gear
  repair: {
    name: 'Equipment Repair',
    icon: '🔧',
    baseCost: 100,    // base cost per repair
    costPerLevel: 20, // additional per item level
    enabled: true
  },

  // Forge/enhancement: gold cost for upgrades
  forge: {
    name: 'Forge Enhancement',
    icon: '🔨',
    baseCost: 500,
    costPerLevel: 100,
    maxLevel: 12,
    enabled: true
  },

  // Fast travel: teleport between zones
  travel: {
    name: 'Fast Travel',
    icon: '🚪',
    baseCost: 200,
    costPerZone: 100, // per zone distance
    enabled: true
  },

  // NPC shop tax: items bought from NPC cost 20% more
  shopTax: {
    name: 'NPC Tax',
    icon: '🏪',
    markup: 0.20, // 20% markup on NPC items
    enabled: true
  },

  // Potion crafting materials
  crafting: {
    name: 'Crafting Materials',
    icon: '⚗️',
    baseCost: 300,
    enabled: true
  },

  // Market listing fee: 1% of listing price
  marketFee: {
    name: 'Market Listing Fee',
    icon: '📋',
    feePercentage: 0.01, // 1% of listing price
    minFee: 100,
    enabled: true
  }
};

// Apply a gold sink
function applyGoldSink(type, fid, context = {}) {
  const sink = GOLD_SINKS[type];
  if (!sink || !sink.enabled) return { applied: false, reason: 'disabled' };

  let goldCost = 0;

  switch (type) {
    case 'death':
      goldCost = Math.min(
        Math.floor(context.gold * sink.percentage),
        sink.cap
      );
      break;
    case 'repair':
      goldCost = sink.baseCost + (context.itemLevel || 1) * sink.costPerLevel;
      break;
    case 'forge':
      goldCost = sink.baseCost + (context.enhanceLevel || 1) * sink.costPerLevel;
      break;
    case 'travel':
      goldCost = sink.baseCost + Math.abs(context.zoneDistance || 1) * sink.costPerZone;
      break;
    case 'crafting':
      goldCost = sink.baseCost + (context.tier || 1) * 100;
      break;
    case 'marketFee':
      goldCost = Math.max(sink.minFee, Math.floor(context.price * sink.feePercentage));
      break;
    default:
      return { applied: false, reason: 'unknown sink' };
  }

  if (goldCost <= 0) return { applied: false, reason: 'no cost' };

  // Deduct gold
  const player = db.prepare('SELECT gold FROM players WHERE fid = ?').get(fid);
  if (!player || player.gold < goldCost) {
    return { applied: false, reason: 'insufficient gold', cost: goldCost };
  }

  db.prepare(`UPDATE players SET gold = gold - ?, updated_at = datetime('now') WHERE fid = ?`)
    .run(goldCost, fid);

  // Reduce global gold supply
  updateGoldSupply(-goldCost);

  // Log sink
  db.prepare(`
    INSERT INTO gold_sink_log (fid, sink_type, gold_amount) VALUES (?, ?, ?)
  `).run(fid, type, goldCost);

  return { applied: true, cost: goldCost, sink: sink.name, icon: sink.icon };
}

// Get sink stats
function getSinkStats() {
  return db.prepare(`
    SELECT sink_type, SUM(gold_amount) as total_gold, COUNT(*) as count
    FROM gold_sink_log
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY sink_type
    ORDER BY total_gold DESC
  `).all();
}

// ─── Economy Dashboard Data ─────────────────────────────
function getEconomyDashboard() {
  const state = getEconomyState();
  const prices = getPrices();
  const sinks = getSinkStats();

  const totalGoldInSystem = state.total_gold_supply;
  const goldSinkTotal = sinks.reduce((sum, s) => sum + s.total_gold, 0);
  const netGoldFlow = state.total_gold_supply - goldSinkTotal;

  return {
    prices,
    economy: {
      totalGoldSupply: totalGoldInSystem,
      totalFARBORNBurned: state.total_farborn_burned,
      recentClaims: state.recent_claims,
      recentPurchases: state.recent_purchases,
    },
    sinks,
    netGoldFlow,
    inflationIndex: totalGoldInSystem > 0 ? (goldSinkTotal / totalGoldInSystem * 100).toFixed(1) + '%' : '0%',
    recommendations: generateRecommendations(state, prices, sinks)
  };
}

// Smart recommendations based on economic state
function generateRecommendations(state, prices, sinks) {
  const recs = [];

  if (prices.currentPrice < BASE_PRICE * 0.6) {
    recs.push({ type: 'warning', msg: 'Gold value very high — consider increasing gold sinks' });
  }
  if (prices.currentPrice > BASE_PRICE * 2) {
    recs.push({ type: 'info', msg: 'Gold value low — reduce gold sinks or increase gold drops' });
  }
  if (state.recent_claims > 50) {
    recs.push({ type: 'alert', msg: 'High conversion volume — token inflation risk' });
  }
  if (state.total_gold_supply > 10_000_000) {
    recs.push({ type: 'warning', msg: 'Gold supply very high — activate more sinks' });
  }

  return recs;
}

// ─── Anti-Inflation Monitoring ──────────────────────────
function getInflationMetrics() {
  const state = getEconomyState();

  // Gold generation rate (claims + drops)
  const claims24h = db.prepare(`
    SELECT COALESCE(SUM(gold_spent), 0) as gold FROM gold_claims
    WHERE created_at >= datetime('now', '-24 hours')
  `).get().gold;

  // Gold sink rate
  const sinks24h = db.prepare(`
    SELECT COALESCE(SUM(gold_amount), 0) as gold FROM gold_sink_log
    WHERE created_at >= datetime('now', '-24 hours')
  `).get().gold;

  // Price trend
  const priceNow = calculateGoldPrice();
  const price1h = db.prepare(`
    SELECT price FROM price_history
    WHERE timestamp <= datetime('now', '-1 hour')
    ORDER BY timestamp DESC LIMIT 1
  `).get();

  const priceTrend = price1h ? ((priceNow - price1h.price) / price1h.price * 100).toFixed(1) : 0;

  return {
    goldInflow24h: claims24h,
    goldOutflow24h: sinks24h,
    netFlow24h: claims24h - sinks24h,
    priceNow,
    priceTrend: parseFloat(priceTrend),
    supplyGrowthRate: state.total_gold_supply > 0 ?
      ((claims24h - sinks24h) / state.total_gold_supply * 100).toFixed(3) + '%' : '0%'
  };
}

export {
  getEconomyState,
  calculateGoldPrice,
  getPrices,
  recordPricePoint,
  getPriceHistory,
  updateGoldSupply,
  updateTokenBurn,
  incrementRecentClaims,
  incrementRecentPurchases,
  decayActivity,
  GOLD_SINKS,
  applyGoldSink,
  getSinkStats,
  getEconomyDashboard,
  getInflationMetrics
};

// ─── Player Utilities ───────────────────────────────────
const GOLD_PER_TOKEN = 10_000; // base rate for daily cap calc

export function validateGoldClaim(fid, goldAmount, level) {
  const player = db.prepare('SELECT * FROM players WHERE fid = ?').get(fid);
  if (!player) return { valid: false, error: 'Player not found' };
  if (goldAmount <= 0 || goldAmount > 10_000_000) {
    return { valid: false, error: 'Invalid gold amount' };
  }
  if (level <= 0 || level > 200) {
    return { valid: false, error: 'Invalid level' };
  }
  if (player.gold < goldAmount) {
    return { valid: false, error: 'Insufficient gold' };
  }
  // Rate limit: 1 per minute
  const lastClaim = db.prepare('SELECT created_at FROM gold_claims WHERE fid = ? ORDER BY created_at DESC LIMIT 1').get(fid);
  if (lastClaim && (Date.now() - new Date(lastClaim.created_at).getTime()) < 60000) {
    return { valid: false, error: 'Wait before claiming again' };
  }
  return { valid: true, player };
}

export function processGoldClaim(fid, goldAmount, dynamicPrice) {
  const price = dynamicPrice || GOLD_PER_TOKEN;
  const tokenAmount = Math.floor(goldAmount / price);
  if (tokenAmount <= 0) return null;
  db.prepare('UPDATE players SET gold = gold - ?, total_gold_earned = total_gold_earned + ?, updated_at = datetime(\'now\') WHERE fid = ?')
    .run(goldAmount, goldAmount, fid);
  const result = db.prepare('INSERT INTO gold_claims (fid, gold_spent, tokens_claimed) VALUES (?, ?, ?)')
    .run(fid, goldAmount, tokenAmount);
  return { claimId: result.lastInsertRowid, goldSpent: goldAmount, tokensClaimed: tokenAmount };
}

export function updatePlayer(fid, data) {
  const fields = [], values = [];
  for (const [key, value] of Object.entries(data)) {
    if (['level', 'class', 'zone', 'gold', 'equipped', 'bag'].includes(key)) {
      fields.push(key + ' = ?');
      values.push(key === 'equipped' || key === 'bag' ? JSON.stringify(value) : value);
    }
  }
  if (fields.length === 0) return false;
  fields.push('updated_at = datetime(\'now\')');
  values.push(fid);
  db.prepare('UPDATE players SET ' + fields.join(', ') + ' WHERE fid = ?').run(...values);
  return true;
}

export function getPlayer(fid) {
  const player = db.prepare('SELECT * FROM players WHERE fid = ?').get(fid);
  if (player) {
    player.equipped = JSON.parse(player.equipped || '{}');
    player.bag = JSON.parse(player.bag || '[]');
  }
  return player;
}

export function getDailyStats(fid) {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    SELECT COALESCE(SUM(gold_spent), 0) as gold_today, COALESCE(SUM(tokens_claimed), 0) as tokens_today
    FROM gold_claims WHERE fid = ? AND created_at >= ?
  `).get(fid, today);
}
