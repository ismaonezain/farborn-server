import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import db from './db.js';
import { generateLoginToken, requireAuth } from './auth.js';
import {
  validateGoldClaim, processGoldClaim, updatePlayer, getPlayer, getDailyStats,
  getPrices, getEconomyDashboard, getInflationMetrics,
  applyGoldSink, GOLD_SINKS, recordPricePoint,
  updateGoldSupply, incrementRecentClaims, decayActivity
} from './economy.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json());

// ─── Health ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Auth: Farcaster login ──────────────────────────────
// Client sends FID + username + wallet after Farcaster SDK auth
app.post('/api/auth/login', (req, res) => {
  const { fid, username, wallet } = req.body;

  if (!fid || !username || !wallet) {
    return res.status(400).json({ error: 'Missing fid, username, or wallet' });
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  // Upsert player
  const existing = db.prepare('SELECT fid FROM players WHERE fid = ?').get(fid);
  if (!existing) {
    db.prepare(`
      INSERT INTO players (fid, username, wallet, hero_name)
      VALUES (?, ?, ?, ?)
    `).run(fid, username, wallet.toLowerCase(), username);
  } else {
    // Update username/wallet if changed
    db.prepare('UPDATE players SET username = ?, wallet = ?, updated_at = datetime(\'now\') WHERE fid = ?')
      .run(username, wallet.toLowerCase(), fid);
  }

  const { token, expiresAt } = generateLoginToken(fid, username, wallet);
  const player = getPlayer(fid);

  res.json({ token, expiresAt, player });
});

// ─── Player state ───────────────────────────────────────
app.get('/api/player', requireAuth, (req, res) => {
  const player = getPlayer(req.fid);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json({ player });
});

app.put('/api/player', requireAuth, (req, res) => {
  const { level, zone, gold, equipped, bag } = req.body;
  updatePlayer(req.fid, { level, zone, gold, equipped, bag });
  const player = getPlayer(req.fid);
  res.json({ player });
});

// ─── Pricing (Supply & Demand) ──────────────────────────
app.get('/api/prices', (req, res) => {
  res.json(getPrices());
});

app.get('/api/economy', (req, res) => {
  res.json(getEconomyDashboard());
});

app.get('/api/economy/inflation', (req, res) => {
  res.json(getInflationMetrics());
});

// ─── Gold → Token conversion (dynamic pricing) ──────────
app.post('/api/convert', requireAuth, (req, res) => {
  const { goldAmount, level } = req.body;

  const validation = validateGoldClaim(req.fid, goldAmount, level);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const prices = getPrices();
  const tokenAmount = Math.floor(goldAmount / prices.currentPrice);
  if (tokenAmount <= 0) {
    return res.status(400).json({ error: 'Gold amount too low for current price' });
  }

  const result = processGoldClaim(req.fid, goldAmount, prices.currentPrice);
  if (!result) {
    return res.status(400).json({ error: 'Conversion failed' });
  }

  // Update economy state
  updateGoldSupply(-goldAmount); // gold leaves circulation
  incrementRecentClaims();
  recordPricePoint(prices.currentPrice);

  const stats = getDailyStats(req.fid);
  res.json({
    success: true,
    claimId: result.claimId,
    goldSpent: result.goldSpent,
    tokensClaimed: result.tokensClaimed,
    currentPrice: prices.currentPrice,
    priceBreakdown: `1 $FARBORN = ${prices.currentPrice} gold`,
    dailyStats: stats
  });
});

// ─── Gold Sinks ─────────────────────────────────────────
app.post('/api/sink', requireAuth, (req, res) => {
  const { type, context } = req.body;
  const result = applyGoldSink(type, req.fid, context || {});
  res.json(result);
});

app.get('/api/sinks', (req, res) => {
  res.json({ sinks: Object.entries(GOLD_SINKS).map(([k, v]) => ({ id: k, ...v })) });
});

// ─── Marketplace ────────────────────────────────────────
app.get('/api/marketplace', requireAuth, (req, res) => {
  const listings = db.prepare(`
    SELECT ml.*, p.username as seller_name
    FROM marketplace_listings ml
    JOIN players p ON ml.seller_fid = p.fid
    WHERE ml.status = 'active'
    ORDER BY ml.created_at DESC
    LIMIT 100
  `).all();
  res.json({ listings });
});

app.post('/api/marketplace/list', requireAuth, (req, res) => {
  const { itemId, price } = req.body;

  if (!itemId || !price) {
    return res.status(400).json({ error: 'Missing itemId or price' });
  }

  if (price < 100_000) { // 0.1 USDC
    return res.status(400).json({ error: 'Minimum price is 0.1 USDC' });
  }

  // Verify player owns the item
  const player = getPlayer(req.fid);
  const itemInBag = player.bag.some(i => i.id === itemId);
  const itemEquipped = Object.values(player.equipped).some(e => e && e.id === itemId);

  if (!itemInBag && !itemEquipped) {
    logCheatEvent(req.fid, 'list_no_ownership', { itemId });
    return res.status(400).json({ error: 'You do not own this item' });
  }

  // Remove from bag/equipped
  if (itemInBag) {
    const newBag = player.bag.filter(i => i.id !== itemId);
    updatePlayer(req.fid, { bag: newBag });
  }

  // Log listing (on-chain tx will be signed client-side)
  db.prepare(`
    INSERT INTO marketplace_listings (listing_id, seller_fid, item_id, price)
    VALUES (?, ?, ?, ?)
  `).run(-1, req.fid, itemId, price); // -1 until on-chain confirmed

  res.json({ success: true, message: 'Listing created. Sign transaction in wallet.' });
});

app.post('/api/marketplace/confirm', requireAuth, (req, res) => {
  const { itemId, listingId, buyerFid } = req.body;

  // Transfer item to buyer
  const buyer = getPlayer(buyerFid);
  if (!buyer) return res.status(404).json({ error: 'Buyer not found' });

  buyer.bag.push({ id: itemId }); // simplified — in reality, full item data needed
  updatePlayer(buyerFid, { bag: buyer.bag });

  // Update listing status
  db.prepare(`
    UPDATE marketplace_listings SET status = 'sold', buyer_fid = ?, sold_at = datetime('now')
    WHERE item_id = ?
  `).run(buyerFid, itemId);

  res.json({ success: true });
});

// ─── Stats ──────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const players = db.prepare('SELECT COUNT(*) as count FROM players').get();
  const claims = db.prepare('SELECT COUNT(*) as count, SUM(tokens_claimed) as total FROM gold_claims').get();
  const listings = db.prepare('SELECT COUNT(*) as count FROM marketplace_listings WHERE status = \'active\'').get();

  res.json({
    totalPlayers: players.count,
    totalClaims: claims.count,
    totalTokensClaimed: claims.total || 0,
    activeListings: listings.count
  });
});

// ─── Cheat detection endpoint (admin) ───────────────────
app.get('/api/admin/cheats', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const events = db.prepare(`
    SELECT ac.*, p.username
    FROM anti_cheat ac
    JOIN players p ON ac.fid = p.fid
    ORDER BY ac.created_at DESC
    LIMIT 100
  `).all();

  res.json({ events });
});

function logCheatEvent(fid, eventType, data) {
  db.prepare(`INSERT INTO anti_cheat (fid, event_type, event_data) VALUES (?, ?, ?)`)
    .run(fid, eventType, JSON.stringify(data));
}

app.listen(PORT, () => {
  console.log(`🏰 Farborn Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
