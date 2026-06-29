import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getOne, getAll, run } from './db.js';
import { generateLoginToken, requireAuth } from './auth.js';
import {
  validateGoldClaim, processGoldClaim, updatePlayer, getPlayer, getDailyStats,
  getPrices, getEconomyDashboard, getInflationMetrics,
  applyGoldSink, GOLD_SINKS, recordPricePoint,
  updateGoldSupply, incrementRecentClaims, decayActivity
} from './economy.js';
import {
  validateItemDrop, validateLevelUp, validateEquip, validateUnequip,
  validateSell, validateForge, validateZoneChange, validateGoldSpend,
  applyLevelUp, applyItemDrop, applyEquip, applyUnequip,
  applySell, applyForge, applyZoneChange, applyGoldSpend,
  calculateSellPrice, calculateForgeCost,
  processCombatTick, calculateOfflineProgress, dbPlayerToGame
} from './game-logic.js';
import { ZONE_DATA, MONSTER_DATA } from './game-data.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json());

// ─── Health ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Farcaster user lookup (proxy to avoid CORS) ────────
app.get('/api/farcaster/user/:fid', async (req, res) => {
  try {
    const fid = req.params.fid;
    const r = await fetch(`https://api.farcaster.xyz/v2/user?fid=${fid}`);
    const data = await r.json();
    const user = data?.result?.user;
    if (user) {
      res.json({ fid: user.fid, username: user.username, displayName: user.displayName, pfpUrl: user.pfp?.url });
    } else {
      res.json({ error: 'not found' });
    }
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ─── Auth: login ─────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { fid, username, wallet } = req.body;
    if (!fid || !username || !wallet) {
      return res.status(400).json({ error: 'Missing fid, username, or wallet' });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const walletLower = wallet.toLowerCase();

    // Check if wallet already linked to different FID
    const walletOwner = await getOne('SELECT fid FROM players WHERE wallet = ?', [walletLower]);
    if (walletOwner && walletOwner.fid !== fid) {
      return res.status(409).json({ 
        error: 'Wallet already linked to another account', 
        linkedFid: walletOwner.fid 
      });
    }

    // Check if username already taken by different FID
    const usernameOwner = await getOne('SELECT fid FROM players WHERE username = ? AND fid != ?', [username, fid]);
    if (usernameOwner) {
      return res.status(409).json({ 
        error: 'Username already taken', 
        ownerFid: usernameOwner.fid 
      });
    }

    // Create or update player
    const existing = await getOne('SELECT fid FROM players WHERE fid = ?', [fid]);
    if (!existing) {
      await run('INSERT INTO players (fid, username, wallet, hero_name) VALUES (?, ?, ?, ?)', [fid, username, walletLower, username]);
    } else {
      await run('UPDATE players SET username = ?, wallet = ?, updated_at = datetime(\'now\') WHERE fid = ?', [username, walletLower, fid]);
    }

    const { token, expiresAt } = await generateLoginToken(fid, username, wallet);
    const player = await getPlayer(fid);
    res.json({ token, expiresAt, player });
  } catch (err) {
    console.error('Login error:', err);
    if (err.message?.includes('UNIQUE constraint failed')) {
      if (err.message.includes('wallet')) {
        return res.status(409).json({ error: 'Wallet already linked to another account' });
      }
      if (err.message.includes('username')) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Player state ───────────────────────────────────────
app.get('/api/player', requireAuth, async (req, res) => {
  const player = await getPlayer(req.fid);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json({ player });
});

app.put('/api/player', requireAuth, async (req, res) => {
  const { level, zone, gold, equipped, bag, class: heroClass } = req.body;
  const updates = { level, zone, gold, equipped, bag };
  if (heroClass) updates.class = heroClass;
  await updatePlayer(req.fid, updates);
  const player = await getPlayer(req.fid);
  res.json({ player });
});

// ─── Sync: Full State (GET = read, POST = write) ─────────
app.get('/api/sync/state', requireAuth, async (req, res) => {
  const player = await getPlayer(req.fid);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json({ player });
});

app.post('/api/sync/state', requireAuth, async (req, res) => {
  try {
    const { level, zone, gold, exp, equipped, bag, class: heroClass, upg, skillIdx, totalKills, zoneKills, prestige, prestigeMult, ts } = req.body;
    
    // Get current server state
    const current = await getPlayer(req.fid);
    if (!current) return res.status(404).json({ error: 'Player not found' });
    
    // Conflict resolution: server wins for most, but merge intelligently
    const updates = {};
    
    // Level: take higher
    if (level && (!current.level || level > current.level)) updates.level = level;
    
    // Zone: take higher
    if (zone !== undefined && zone > (current.zone || 0)) updates.zone = zone;
    
    // Gold: take higher (both could earn offline)
    if (gold !== undefined && gold > (current.gold || 0)) updates.gold = gold;
    
    // EXP: take higher
    if (exp !== undefined && exp > (current.exp || 0)) updates.exp = exp;
    
    // Equipped: server is source of truth (already synced via events)
    if (equipped) updates.equipped = equipped;
    
    // Bag: merge items (server + local new items)
    if (bag && current.bag) {
      const serverItemIds = new Set(current.bag.map(i => i.id));
      const localOnly = bag.filter(i => !serverItemIds.has(i.id));
      if (localOnly.length > 0) {
        updates.bag = [...current.bag, ...localOnly];
      }
    }
    
    // Class
    if (heroClass) updates.class = heroClass;
    
    // Upgrades
    if (upg) updates.upg = upg;
    
    // Skill
    if (skillIdx !== undefined) updates.skillIdx = skillIdx;
    
    // Kills
    if (totalKills && (!current.totalKills || totalKills > current.totalKills)) updates.totalKills = totalKills;
    if (zoneKills !== undefined) updates.zoneKills = zoneKills;
    
    // Prestige
    if (prestige !== undefined && prestige > (current.prestige || 0)) updates.prestige = prestige;
    if (prestigeMult !== undefined && prestigeMult > (current.prestigeMult || 1)) updates.prestigeMult = prestigeMult;
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      await updatePlayer(req.fid, updates);
    }
    
    const player = await getPlayer(req.fid);
    res.json({ player, merged: Object.keys(updates) });
  } catch (err) {
    console.error('Sync state error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── Sync: Batch Events (Server-Authoritative) ───────────────
app.post('/api/sync/events', requireAuth, async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'No events provided' });
    }
    
    const synced = [];
    const rejected = [];
    const player = await getPlayer(req.fid);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    
    // Convert to game-logic format for processing
    const gamePlayer = dbPlayerToGame(player);
    let bag = [...gamePlayer.bag];
    let equipped = { ...gamePlayer.equipped };
    let gold = gamePlayer.gold;
    let level = gamePlayer.level;
    let exp = gamePlayer.exp;
    let zone = gamePlayer.zone;
    let totalKills = gamePlayer.totalKills;
    let zoneKills = gamePlayer.zoneKills;
    
    // Process each event using game-logic validation/apply functions
    for (const event of events) {
      try {
        const { type, data } = event;
        let valid = false;
        let reason = '';
        
        // Build a temporary player state for validation
        const tempPlayer = {
          level, exp, gold, zone, class: player.class,
          bag, equipped, totalKills, zoneKills,
          maxHp: 100, hp: 100, maxMp: 50, mp: 50,
          stats: {}, materials: {}
        };
        
        switch (type) {
          case 'item_drop': {
            const monsterLevel = data.monsterLevel || level;
            const dropResult = validateItemDrop(tempPlayer, monsterLevel);
            if (!dropResult.valid) { reason = dropResult.reason; break; }
            if (!data.item || !data.item.id) { reason = 'Invalid item data'; break; }
            const addResult = applyItemDrop(tempPlayer, data.item);
            bag = addResult.bag;
            valid = true;
            break;
          }
          
          case 'item_equip': {
            const { itemId } = data;
            const equipResult = validateEquip(tempPlayer, itemId);
            if (!equipResult.valid) { reason = equipResult.reason; break; }
            const applied = applyEquip(tempPlayer, itemId);
            bag = applied.bag;
            equipped = applied.equipped;
            valid = true;
            break;
          }
          
          case 'item_unequip': {
            const { itemId } = data;
            const unequipResult = validateUnequip(tempPlayer, itemId);
            if (!unequipResult.valid) { reason = unequipResult.reason; break; }
            const applied = applyUnequip(tempPlayer, itemId);
            bag = applied.bag;
            equipped = applied.equipped;
            valid = true;
            break;
          }
          
          case 'item_sell': {
            const { itemId } = data;
            const sellResult = validateSell(tempPlayer, itemId);
            if (!sellResult.valid) { reason = sellResult.reason; break; }
            const applied = applySell(tempPlayer, itemId);
            bag = applied.bag;
            gold = applied.gold;
            valid = true;
            break;
          }
          
          case 'forge_upgrade': {
            const { itemId } = data;
            const forgeResult = validateForge(tempPlayer, itemId);
            if (!forgeResult.valid) { reason = forgeResult.reason; break; }
            const applied = applyForge(tempPlayer, itemId);
            bag = applied.bag;
            equipped = applied.equipped;
            gold = applied.gold;
            valid = true;
            break;
          }
          
          case 'level_up': {
            const levelResult = validateLevelUp(tempPlayer, level + 1);
            if (!levelResult.valid) { reason = levelResult.reason; break; }
            const applied = applyLevelUp({ ...tempPlayer, level, exp });
            level = applied.level;
            exp = applied.exp;
            valid = true;
            break;
          }
          
          case 'zone_change': {
            const newZone = data.zone || data.newZone;
            const zoneResult = validateZoneChange(tempPlayer, newZone);
            if (!zoneResult.valid) { reason = zoneResult.reason; break; }
            zone = newZone;
            zoneKills = 0;
            valid = true;
            break;
          }
          
          case 'gold_spend': {
            const { amount } = data;
            const goldResult = validateGoldSpend(tempPlayer, amount);
            if (!goldResult.valid) { reason = goldResult.reason; break; }
            gold = tempPlayer.gold - amount;
            valid = true;
            break;
          }
          
          case 'kill':
          case 'stat_upgrade':
          case 'skill_use':
          case 'prestige':
          case 'full_state':
            valid = true;
            break;
            
          default:
            reason = 'Unknown event type';
        }
        
        if (valid) {
          synced.push({ id: event.id, type });
        } else {
          rejected.push({ id: event.id, type, reason });
        }
      } catch (err) {
        console.error('Event processing error:', err);
        rejected.push({ id: event.id, type: event.type, reason: err.message });
      }
    }
    
    // Save updated state
    if (synced.length > 0) {
      await updatePlayer(req.fid, {
        level,
        exp,
        gold,
        zone,
        equipped,
        bag,
        totalKills,
        zoneKills
      });
    }
    
    res.json({ synced, rejected, count: synced.length });
  } catch (err) {
    console.error('Sync events error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── Combat Tick (Server-Authoritative) ──────────────────
app.post('/api/combat/tick', requireAuth, async (req, res) => {
  try {
    const player = await getPlayer(req.fid);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    
    const zone = player.zone || 1;
    const zoneData = ZONE_DATA[zone];
    if (!zoneData) return res.status(400).json({ error: 'Invalid zone' });
    
    // Run server-authoritative combat
    const result = processCombatTick(player, zone, zoneData.monsters);
    
    // Update player state in DB
    const updates = {
      level: result.newStats.level,
      exp: result.newStats.exp,
      gold: result.newStats.gold,
      totalKills: result.newStats.totalKills,
      zoneKills: result.newStats.zoneKills,
      bag: result.newStats.bag
    };
    
    await updatePlayer(req.fid, updates);
    
    // Get updated player for response
    const updatedPlayer = await getPlayer(req.fid);
    
    res.json({
      attacks: result.attacks,
      expGained: result.expGained,
      goldGained: result.goldGained,
      itemsDropped: result.itemsDropped,
      levelUps: result.levelUps,
      player: updatedPlayer
    });
  } catch (err) {
    console.error('Combat tick error:', err);
    res.status(500).json({ error: 'Combat tick failed' });
  }
});

// ─── Offline Progress ────────────────────────────────────
app.get('/api/offline/progress', requireAuth, async (req, res) => {
  try {
    const player = await getPlayer(req.fid);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    
    // Get last_online from DB
    const row = await getOne('SELECT last_online FROM players WHERE fid = ?', [req.fid]);
    const lastOnline = row?.last_online || null;
    
    // Calculate offline progress
    const progress = calculateOfflineProgress(player, lastOnline);
    
    if (progress.duration === 0) {
      return res.json({ duration: 0, expGained: 0, goldGained: 0, player });
    }
    
    // Apply gains
    const newExp = (player.exp || 0) + progress.expGained;
    const newGold = (player.gold || 0) + progress.goldGained;
    
    await updatePlayer(req.fid, { exp: newExp, gold: newGold });
    
    const updatedPlayer = await getPlayer(req.fid);
    
    res.json({
      duration: progress.duration,
      expGained: progress.expGained,
      goldGained: progress.goldGained,
      player: updatedPlayer
    });
  } catch (err) {
    console.error('Offline progress error:', err);
    res.status(500).json({ error: 'Failed to calculate offline progress' });
  }
});

// ─── Pricing ─────────────────────────────────────────────
app.get('/api/prices', async (req, res) => {
  res.json(await getPrices());
});

app.get('/api/economy', async (req, res) => {
  res.json(await getEconomyDashboard());
});

app.get('/api/economy/inflation', async (req, res) => {
  res.json(await getInflationMetrics());
});

// ─── Gold → Token conversion ─────────────────────────────
app.post('/api/convert', requireAuth, async (req, res) => {
  try {
    const { goldAmount, level } = req.body;
    const validation = await validateGoldClaim(req.fid, goldAmount, level);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const prices = await getPrices();
    const tokenAmount = Math.floor(goldAmount / prices.currentPrice);
    if (tokenAmount <= 0) return res.status(400).json({ error: 'Gold amount too low' });

    const result = await processGoldClaim(req.fid, goldAmount, prices.currentPrice);
    if (!result) return res.status(400).json({ error: 'Conversion failed' });

    await updateGoldSupply(-goldAmount);
    await incrementRecentClaims();
    await recordPricePoint(prices.currentPrice);

    const stats = await getDailyStats(req.fid);
    res.json({
      success: true,
      claimId: result.claimId,
      goldSpent: result.goldSpent,
      tokensClaimed: result.tokensClaimed,
      currentPrice: prices.currentPrice,
      priceBreakdown: `1 $FARBORN = ${prices.currentPrice} gold`,
      dailyStats: stats
    });
  } catch (err) {
    console.error('Convert error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Gold Sinks ──────────────────────────────────────────
app.post('/api/sink', requireAuth, async (req, res) => {
  const { type, context } = req.body;
  const result = await applyGoldSink(type, req.fid, context || {});
  res.json(result);
});

app.get('/api/sinks', (req, res) => {
  res.json({ sinks: Object.entries(GOLD_SINKS).map(([k, v]) => ({ id: k, ...v })) });
});

// ─── Marketplace ─────────────────────────────────────────
app.get('/api/marketplace', requireAuth, async (req, res) => {
  const listings = await getAll("SELECT ml.*, p.username as seller_name FROM marketplace_listings ml JOIN players p ON ml.seller_fid = p.fid WHERE ml.status = 'active' ORDER BY ml.created_at DESC LIMIT 100");
  res.json({ listings });
});

app.post('/api/marketplace/list', requireAuth, async (req, res) => {
  const { itemId, price } = req.body;
  if (!itemId || !price) return res.status(400).json({ error: 'Missing itemId or price' });
  if (price < 100_000) return res.status(400).json({ error: 'Minimum price is 0.1 USDC' });

  const player = await getPlayer(req.fid);
  const itemInBag = player.bag.some(i => i.id === itemId);
  const itemEquipped = Object.values(player.equipped).some(e => e && e.id === itemId);
  if (!itemInBag && !itemEquipped) return res.status(400).json({ error: 'You do not own this item' });

  if (itemInBag) {
    const newBag = player.bag.filter(i => i.id !== itemId);
    await updatePlayer(req.fid, { bag: newBag });
  }

  await run('INSERT INTO marketplace_listings (listing_id, seller_fid, item_id, price) VALUES (?, ?, ?, ?)', [-1, req.fid, itemId, price]);
  res.json({ success: true, message: 'Listing created' });
});

app.post('/api/marketplace/confirm', requireAuth, async (req, res) => {
  const { itemId, buyerFid } = req.body;
  const buyer = await getPlayer(buyerFid);
  if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
  buyer.bag.push({ id: itemId });
  await updatePlayer(buyerFid, { bag: buyer.bag });
  await run("UPDATE marketplace_listings SET status = 'sold', buyer_fid = ?, sold_at = datetime('now') WHERE item_id = ?", [buyerFid, itemId]);
  res.json({ success: true });
});

// ─── Leaderboard ────────────────────────────────────────
app.get('/api/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    if (type === 'gold') {
      const rows = await getAll(
        'SELECT fid, username, hero_name, class, level, gold, total_gold_earned FROM players ORDER BY gold DESC LIMIT ?',
        [limit]
      );
      return res.json({ type: 'gold', entries: rows.map((r, i) => ({ rank: i + 1, ...r })) });
    }

    if (type === 'level') {
      const rows = await getAll(
        'SELECT fid, username, hero_name, class, level, gold FROM players ORDER BY level DESC, total_gold_earned DESC LIMIT ?',
        [limit]
      );
      return res.json({ type: 'level', entries: rows.map((r, i) => ({ rank: i + 1, ...r })) });
    }

    if (type === 'power') {
      const rows = await getAll(
        'SELECT fid, username, hero_name, class, level, gold, equipped FROM players ORDER BY level DESC LIMIT ?',
        [limit * 3]
      );
      const ranked = rows.map(r => {
        let eqPower = 0;
        try {
          const eq = JSON.parse(r.equipped || '{}');
          for (const item of Object.values(eq)) {
            if (item && typeof item === 'object') {
              eqPower += (item.atk || 0) + (item.def || 0) + (item.hp || 0);
            }
          }
        } catch {}
        return { rank: 0, fid: r.fid, username: r.username, hero_name: r.hero_name, class: r.class, level: r.level, gold: r.gold, power: r.level * 100 + eqPower };
      });
      ranked.sort((a, b) => b.power - a.power);
      return res.json({ type: 'power', entries: ranked.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 })) });
    }

    res.status(400).json({ error: 'Invalid type. Use: gold, level, power' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Stats ───────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const players = await getOne('SELECT COUNT(*) as count FROM players');
  const claims = await getOne('SELECT COUNT(*) as count, SUM(tokens_claimed) as total FROM gold_claims');
  const listings = await getOne("SELECT COUNT(*) as count FROM marketplace_listings WHERE status = 'active'");
  res.json({
    totalPlayers: players?.count || 0,
    totalClaims: claims?.count || 0,
    totalTokensClaimed: claims?.total || 0,
    activeListings: listings?.count || 0
  });
});

// ─── Admin: cheat detection ──────────────────────────────
app.get('/api/admin/cheats', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  const events = await getAll('SELECT ac.*, p.username FROM anti_cheat ac JOIN players p ON ac.fid = p.fid ORDER BY ac.created_at DESC LIMIT 100');
  res.json({ events });
});

// ─── Vercel serverless export ────────────────────────────
export default app;

// Also listen for direct Node.js execution
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🏰 Farborn Server running on port ${PORT}`);
  });
}
