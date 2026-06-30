import { getOne, getAll, run } from './db.js';

// ═══════════════════════════════════════════════════════════
//  DYNAMIC PRICING ENGINE (Bonding Curve + Market Dynamics)
// ═══════════════════════════════════════════════════════════

const BASE_PRICE = 10000;
const K_FACTOR = 0.000001;
const PRICE_FLOOR = 5_000;
const PRICE_CEILING = 40000;
const DEMAND_WINDOW_HOURS = 24;

// ─── Core Pricing Functions ─────────────────────────────
async function getEconomyState() {
  let state = await getOne('SELECT * FROM global_economy WHERE id = 1');
  if (!state) {
    await run(`INSERT OR IGNORE INTO global_economy (id, total_gold_supply, total_farborn_burned, recent_claims, recent_purchases, avg_gold_per_level) VALUES (1, 0, 0, 0, 0, 1000)`);
    state = await getOne('SELECT * FROM global_economy WHERE id = 1');
  }
  return state;
}

async function calculateGoldPrice() {
  const state = await getEconomyState();
  const activeRow = await getOne('SELECT COUNT(*) as c FROM players WHERE gold > 0');
  const activePlayers = activeRow?.c || 1;
  const avgGold = state.total_gold_supply / activePlayers;
  const supplyPressure = Math.log2(avgGold / 50_000 + 1) * 0.15;
  const demandPressure = state.recent_purchases > 10 ? Math.log2(state.recent_purchases / 10) * 0.1 : 0;
  const burnPressure = state.total_farborn_burned > 1000 ? Math.log2(state.total_farborn_burned / 1000) * 0.05 : 0;
  let price = BASE_PRICE * (1 + supplyPressure - demandPressure - burnPressure);
  price = Math.max(PRICE_FLOOR, Math.min(PRICE_CEILING, price));
  return Math.round(price);
}

async function getPrices() {
  const goldPrice = await calculateGoldPrice();
  const sellPrice = Math.round(goldPrice * 0.95);
  const buyPrice = Math.round(goldPrice * 1.05);
  return {
    basePrice: BASE_PRICE,
    currentPrice: goldPrice,
    sellPrice,
    buyPrice,
    supplyPressure: await getEconomyState(),
    timestamp: Date.now()
  };
}

// ─── Price History ──────────────────────────────────────
async function recordPricePoint(price) {
  await run('INSERT INTO price_history (price, timestamp) VALUES (?, datetime(\'now\'))', [price]);
}

async function getPriceHistory(hours = 24) {
  return getAll(`SELECT price, timestamp FROM price_history WHERE timestamp >= datetime('now', '-${hours} hours') ORDER BY timestamp ASC`);
}

// ─── Update Economy State ───────────────────────────────
async function updateGoldSupply(delta) {
  await run('UPDATE global_economy SET total_gold_supply = total_gold_supply + ?, updated_at = datetime(\'now\') WHERE id = 1', [delta]);
}

async function updateTokenBurn(amount) {
  await run('UPDATE global_economy SET total_farborn_burned = total_farborn_burned + ?, updated_at = datetime(\'now\') WHERE id = 1', [amount]);
}

async function incrementRecentClaims() {
  await run('UPDATE global_economy SET recent_claims = recent_claims + 1, updated_at = datetime(\'now\') WHERE id = 1');
}

async function incrementRecentPurchases() {
  await run('UPDATE global_economy SET recent_purchases = recent_purchases + 1, updated_at = datetime(\'now\') WHERE id = 1');
}

async function decayActivity() {
  await run('UPDATE global_economy SET recent_claims = MAX(0, recent_claims - 1), recent_purchases = MAX(0, recent_purchases - 1), updated_at = datetime(\'now\') WHERE id = 1');
}

// ═══════════════════════════════════════════════════════════
//  GOLD SINKS
// ═══════════════════════════════════════════════════════════

const GOLD_SINKS = {
  death: { name: 'Death Penalty', icon: '💀', percentage: 0.10, cap: 50_000, enabled: true },
  repair: { name: 'Equipment Repair', icon: '🔧', baseCost: 100, costPerLevel: 20, enabled: true },
  forge: { name: 'Forge Enhancement', icon: '🔨', baseCost: 500, costPerLevel: 100, maxLevel: 12, enabled: true },
  travel: { name: 'Fast Travel', icon: '🚪', baseCost: 200, costPerZone: 100, enabled: true },
  shopTax: { name: 'NPC Tax', icon: '🏪', markup: 0.20, enabled: true },
  crafting: { name: 'Crafting Materials', icon: '⚗️', baseCost: 300, enabled: true },
  marketFee: { name: 'Market Listing Fee', icon: '📋', feePercentage: 0.01, minFee: 100, enabled: true }
};

async function applyGoldSink(type, fid, context = {}) {
  const sink = GOLD_SINKS[type];
  if (!sink || !sink.enabled) return { applied: false, reason: 'disabled' };

  let goldCost = 0;
  switch (type) {
    case 'death': goldCost = Math.min(Math.floor(context.gold * sink.percentage), sink.cap); break;
    case 'repair': goldCost = sink.baseCost + (context.itemLevel || 1) * sink.costPerLevel; break;
    case 'forge': goldCost = sink.baseCost + (context.enhanceLevel || 1) * sink.costPerLevel; break;
    case 'travel': goldCost = sink.baseCost + Math.abs(context.zoneDistance || 1) * sink.costPerZone; break;
    case 'crafting': goldCost = sink.baseCost + (context.tier || 1) * 100; break;
    case 'marketFee': goldCost = Math.max(sink.minFee, Math.floor(context.price * sink.feePercentage)); break;
    default: return { applied: false, reason: 'unknown sink' };
  }

  if (goldCost <= 0) return { applied: false, reason: 'no cost' };

  const player = await getOne('SELECT gold FROM players WHERE fid = ?', [fid]);
  if (!player || player.gold < goldCost) {
    return { applied: false, reason: 'insufficient gold', cost: goldCost };
  }

  await run('UPDATE players SET gold = gold - ?, updated_at = datetime(\'now\') WHERE fid = ?', [goldCost, fid]);
  await updateGoldSupply(-goldCost);
  await run('INSERT INTO gold_sink_log (fid, sink_type, gold_amount) VALUES (?, ?, ?)', [fid, type, goldCost]);

  return { applied: true, cost: goldCost, sink: sink.name, icon: sink.icon };
}

async function getSinkStats() {
  return getAll('SELECT sink_type, SUM(gold_amount) as total_gold, COUNT(*) as count FROM gold_sink_log WHERE created_at >= datetime(\'now\', \'-30 days\') GROUP BY sink_type ORDER BY total_gold DESC');
}

// ─── Economy Dashboard ──────────────────────────────────
async function getEconomyDashboard() {
  const state = await getEconomyState();
  const prices = await getPrices();
  const sinks = await getSinkStats();
  const goldSinkTotal = sinks.reduce((sum, s) => sum + s.total_gold, 0);
  return {
    prices,
    economy: {
      totalGoldSupply: state.total_gold_supply,
      totalFARBORNBurned: state.total_farborn_burned,
      recentClaims: state.recent_claims,
      recentPurchases: state.recent_purchases,
    },
    sinks,
    netGoldFlow: state.total_gold_supply - goldSinkTotal,
    inflationIndex: state.total_gold_supply > 0 ? (goldSinkTotal / state.total_gold_supply * 100).toFixed(1) + '%' : '0%'
  };
}

async function getInflationMetrics() {
  const state = await getEconomyState();
  const claimsRow = await getOne('SELECT COALESCE(SUM(gold_spent), 0) as gold FROM gold_claims WHERE created_at >= datetime(\'now\', \'-24 hours\')');
  const sinksRow = await getOne('SELECT COALESCE(SUM(gold_amount), 0) as gold FROM gold_sink_log WHERE created_at >= datetime(\'now\', \'-24 hours\')');
  const claims24h = claimsRow?.gold || 0;
  const sinks24h = sinksRow?.gold || 0;
  const priceNow = await calculateGoldPrice();
  const price1h = await getOne('SELECT price FROM price_history WHERE timestamp <= datetime(\'now\', \'-1 hour\') ORDER BY timestamp DESC LIMIT 1');
  const priceTrend = price1h ? ((priceNow - price1h.price) / price1h.price * 100).toFixed(1) : 0;
  return {
    goldInflow24h: claims24h,
    goldOutflow24h: sinks24h,
    netFlow24h: claims24h - sinks24h,
    priceNow,
    priceTrend: parseFloat(priceTrend),
    supplyGrowthRate: state.total_gold_supply > 0 ? ((claims24h - sinks24h) / state.total_gold_supply * 100).toFixed(3) + '%' : '0%'
  };
}

// ─── Player Utilities ───────────────────────────────────
const GOLD_PER_TOKEN = 10_000;

async function validateGoldClaim(fid, goldAmount, level) {
  const player = await getOne('SELECT * FROM players WHERE fid = ?', [fid]);
  if (!player) return { valid: false, error: 'Player not found' };
  if (goldAmount <= 0 || goldAmount > 10_000_000) return { valid: false, error: 'Invalid gold amount' };
  if (level <= 0 || level > 200) return { valid: false, error: 'Invalid level' };
  if (player.gold < goldAmount) return { valid: false, error: 'Insufficient gold' };
  const lastClaim = await getOne('SELECT created_at FROM gold_claims WHERE fid = ? ORDER BY created_at DESC LIMIT 1', [fid]);
  if (lastClaim && (Date.now() - new Date(lastClaim.created_at).getTime()) < 60000) {
    return { valid: false, error: 'Wait before claiming again' };
  }
  return { valid: true, player };
}

async function processGoldClaim(fid, goldAmount, dynamicPrice) {
  const price = dynamicPrice || GOLD_PER_TOKEN;
  const tokenAmount = Math.floor(goldAmount / price);
  if (tokenAmount <= 0) return null;
  await run('UPDATE players SET gold = gold - ?, total_gold_earned = total_gold_earned + ?, updated_at = datetime(\'now\') WHERE fid = ?', [goldAmount, goldAmount, fid]);
  const result = await run('INSERT INTO gold_claims (fid, gold_spent, tokens_claimed) VALUES (?, ?, ?)', [fid, goldAmount, tokenAmount]);
  return { claimId: result.lastInsertRowid, goldSpent: goldAmount, tokensClaimed: tokenAmount };
}

async function updatePlayer(fid, data) {
  const fields = [], values = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue; // skip undefined
    if (['level', 'class', 'zone', 'gold', 'equipped', 'bag', 'exp',
         'totalKills', 'zoneKills', 'upg', 'skillIdx', 'prestige', 'prestigeMult', 'total_gold_earned', 'last_online', 'potions'].includes(key)) {
      fields.push(key + ' = ?');
      values.push(['equipped', 'bag', 'upg', 'potions'].includes(key) ? JSON.stringify(value) : value);
    }
  }
  if (fields.length === 0) return false;
  fields.push('updated_at = datetime(\'now\')');
  values.push(fid);
  await run('UPDATE players SET ' + fields.join(', ') + ' WHERE fid = ?', values);
  return true;
}

async function getPlayer(fid) {
  const player = await getOne('SELECT * FROM players WHERE fid = ?', [fid]);
  if (player) {
    player.equipped = JSON.parse(player.equipped || '{}');
    player.upg = JSON.parse(player.upg || '{}');
    player.bag = JSON.parse(player.bag || '[]');
    player.potions = JSON.parse(player.potions || '{"small":0,"medium":0,"large":0}');
  }
  return player;
}

async function getDailyStats(fid) {
  const today = new Date().toISOString().split('T')[0];
  return getOne('SELECT COALESCE(SUM(gold_spent), 0) as gold_today, COALESCE(SUM(tokens_claimed), 0) as tokens_today FROM gold_claims WHERE fid = ? AND created_at >= ?', [fid, today]);
}

export {
  getEconomyState, calculateGoldPrice, getPrices, recordPricePoint, getPriceHistory,
  updateGoldSupply, updateTokenBurn, incrementRecentClaims, incrementRecentPurchases,
  decayActivity, GOLD_SINKS, applyGoldSink, getSinkStats, getEconomyDashboard,
  getInflationMetrics, validateGoldClaim, processGoldClaim, updatePlayer, getPlayer, getDailyStats
};
