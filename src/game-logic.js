// =============================================================================
// FARBORN SERVER - GAME LOGIC & VALIDATION SYSTEM (Server-Authoritative)
// =============================================================================

import {
  CLASS_STATS, STAT_GROWTH, LEVEL_TABLE, RARITY_TABLE, MONSTER_DATA,
  ZONE_DATA, FORGE_DATA, BAG_SIZE, COMBAT_TICK_MS, getRandomRarity
} from './game-data.js';

// =============================================================================
// 1. PLAYER MODEL CONVERSION (DB ↔ Game-Logic)
// =============================================================================

/**
 * Convert DB player row to game-logic player object with computed combat stats
 */
export function dbPlayerToGame(dbPlayer) {
  const equipped = typeof dbPlayer.equipped === 'string'
    ? JSON.parse(dbPlayer.equipped || '{}')
    : (dbPlayer.equipped || {});
  const bag = typeof dbPlayer.bag === 'string'
    ? JSON.parse(dbPlayer.bag || '[]')
    : (dbPlayer.bag || []);
  const upg = typeof dbPlayer.upg === 'string'
    ? JSON.parse(dbPlayer.upg || '{}')
    : (dbPlayer.upg || {});

  const classStats = CLASS_STATS[dbPlayer.class] || CLASS_STATS.warrior;
  const growth = STAT_GROWTH[dbPlayer.class] || STAT_GROWTH.warrior;
  const level = dbPlayer.level || 1;

  // Compute base stats from class + level
  let atk = classStats.baseATK + growth.ATK * (level - 1);
  let def = classStats.baseDEF + growth.DEF * (level - 1);
  let hp = classStats.baseHP + growth.HP * (level - 1);
  let mp = classStats.baseMP + growth.MP * (level - 1);
  let spd = classStats.baseSPD + growth.SPD * (level - 1);

  // Add equipment bonuses
  for (const item of Object.values(equipped)) {
    if (item && typeof item === 'object') {
      atk += (item.atk || item.stats?.attack || 0);
      def += (item.def || item.stats?.defense || 0);
      hp += (item.hp || item.stats?.hp || 0);
    }
  }

  return {
    fid: dbPlayer.fid,
    level,
    class: dbPlayer.class,
    exp: dbPlayer.exp || 0,
    gold: dbPlayer.gold || 0,
    zone: dbPlayer.zone || 1,
    equipped,
    bag,
    upg,
    skillIdx: dbPlayer.skillIdx || 0,
    totalKills: dbPlayer.totalKills || 0,
    zoneKills: dbPlayer.zoneKills || 0,
    prestige: dbPlayer.prestige || 0,
    prestigeMult: dbPlayer.prestigeMult || 1.0,
    // Computed combat stats
    atk: Math.floor(atk),
    def: Math.floor(def),
    maxHp: Math.floor(hp),
    hp: Math.floor(hp),
    maxMp: Math.floor(mp),
    mp: Math.floor(mp),
    spd: Math.floor(spd),
  };
}

// =============================================================================
// 2. EXP TABLE
// =============================================================================

/**
 * Get EXP required for a specific level (uses LEVEL_TABLE from game-data.js)
 */
export function getExpRequiredForLevel(level) {
  if (LEVEL_TABLE[level] !== undefined) return LEVEL_TABLE[level];
  return Math.floor(100 * Math.pow(level, 1.5));
}

// =============================================================================
// 3. VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate item drop from monster
 */
export function validateItemDrop(player, monsterLevel) {
  if (!player || typeof monsterLevel !== 'number') {
    return { valid: false, reason: 'Invalid player or monster level' };
  }
  const levelDiff = Math.abs(player.level - monsterLevel);
  if (levelDiff > 10) {
    return { valid: false, reason: 'Player level too far from monster level (max 10 difference)' };
  }
  if (monsterLevel < 1 || monsterLevel > 100) {
    return { valid: false, reason: 'Monster level out of valid range (1-100)' };
  }
  return { valid: true, reason: 'Item drop valid' };
}

/**
 * Validate level up attempt
 */
export function validateLevelUp(player, newLevel) {
  if (!player || typeof newLevel !== 'number') {
    return { valid: false, reason: 'Invalid player or level' };
  }
  if (newLevel !== player.level + 1) {
    return { valid: false, reason: 'Can only level up by one level at a time' };
  }
  const expRequired = getExpRequiredForLevel(player.level);
  if (player.exp < expRequired) {
    return { valid: false, reason: `Insufficient EXP: need ${expRequired}, have ${player.exp}` };
  }
  if (newLevel > 100) {
    return { valid: false, reason: 'Maximum level reached (100)' };
  }
  return { valid: true, reason: 'Level up valid' };
}

/**
 * Validate equip action
 */
export function validateEquip(player, itemId) {
  if (!player || !itemId) {
    return { valid: false, reason: 'Invalid player or item ID' };
  }
  const bagItem = player.bag.find(item => item.id === itemId);
  if (!bagItem) {
    return { valid: false, reason: 'Item not found in bag' };
  }
  if (bagItem.levelRequirement && player.level < bagItem.levelRequirement) {
    return { valid: false, reason: `Level ${bagItem.levelRequirement} required to equip this item` };
  }
  if (bagItem.classRequirement && bagItem.classRequirement !== player.class) {
    return { valid: false, reason: `This item can only be equipped by ${bagItem.classRequirement}` };
  }
  return { valid: true, reason: 'Equip valid' };
}

/**
 * Validate unequip action
 */
export function validateUnequip(player, itemId) {
  if (!player || !itemId) {
    return { valid: false, reason: 'Invalid player or item ID' };
  }
  for (const [slot, item] of Object.entries(player.equipped || {})) {
    if (item && item.id === itemId) {
      return { valid: true, reason: 'Unequip valid' };
    }
  }
  return { valid: false, reason: 'Item is not currently equipped' };
}

/**
 * Validate sell action
 */
export function validateSell(player, itemId) {
  if (!player || !itemId) {
    return { valid: false, reason: 'Invalid player or item ID' };
  }
  const bagItem = player.bag.find(item => item.id === itemId);
  if (!bagItem) {
    return { valid: false, reason: 'Item not found in bag' };
  }
  if (bagItem.locked) {
    return { valid: false, reason: 'Item is locked and cannot be sold' };
  }
  return { valid: true, reason: 'Sell valid' };
}

/**
 * Validate forge action
 */
export function validateForge(player, itemId) {
  if (!player || !itemId) {
    return { valid: false, reason: 'Invalid parameters' };
  }
  let item = player.bag.find(i => i.id === itemId) ||
             Object.values(player.equipped || {}).find(i => i && i.id === itemId);
  if (!item) {
    return { valid: false, reason: 'Item not found' };
  }
  if ((item.upgradeLevel || 0) >= FORGE_DATA.maxUpgradeLevel) {
    return { valid: false, reason: 'Item is already at maximum upgrade level' };
  }
  const forgeCost = calculateForgeCost(item);
  if (player.gold < forgeCost) {
    return { valid: false, reason: `Insufficient gold: need ${forgeCost}, have ${player.gold}` };
  }
  return { valid: true, reason: 'Forge valid' };
}

/**
 * Validate zone change
 */
export function validateZoneChange(player, newZone) {
  if (!player || !newZone) {
    return { valid: false, reason: 'Invalid player or zone' };
  }
  const zoneData = ZONE_DATA[newZone];
  if (!zoneData) {
    return { valid: false, reason: 'Zone does not exist' };
  }
  if (player.level < zoneData.levelRange.min) {
    return { valid: false, reason: `Level ${zoneData.levelRange.min} required to access this zone` };
  }
  if (player.zone === newZone) {
    return { valid: false, reason: 'Already in this zone' };
  }
  return { valid: true, reason: 'Zone change valid' };
}

/**
 * Validate gold spend
 */
export function validateGoldSpend(player, amount) {
  if (!player || typeof amount !== 'number') {
    return { valid: false, reason: 'Invalid player or amount' };
  }
  if (amount <= 0) {
    return { valid: false, reason: 'Amount must be positive' };
  }
  if (player.gold < amount) {
    return { valid: false, reason: `Insufficient gold: need ${amount}, have ${player.gold}` };
  }
  return { valid: true, reason: 'Gold spend valid' };
}

// =============================================================================
// 4. APPLY FUNCTIONS
// =============================================================================

/**
 * Apply level up - calculate new stats
 */
export function applyLevelUp(player) {
  const newPlayer = { ...player };
  const newLevel = player.level + 1;
  const expRequired = getExpRequiredForLevel(player.level);
  const expOverflow = player.exp - expRequired;

  const growth = STAT_GROWTH[player.class] || STAT_GROWTH.warrior;
  const randomFactor = () => 0.8 + Math.random() * 0.4;

  newPlayer.level = newLevel;
  newPlayer.exp = expOverflow;

  // Full heal on level up
  newPlayer.hp = newPlayer.maxHp;
  newPlayer.mp = newPlayer.maxMp;

  return newPlayer;
}

/**
 * Apply item drop - add to bag
 */
export function applyItemDrop(player, item) {
  const newPlayer = { ...player, bag: [...player.bag] };
  newPlayer.bag.push(item);

  if (newPlayer.bag.length > BAG_SIZE) {
    newPlayer.bag = newPlayer.bag.slice(-BAG_SIZE);
  }
  return newPlayer;
}

/**
 * Apply equip - equip item
 */
export function applyEquip(player, itemId) {
  const newPlayer = { ...player, bag: [...player.bag], equipped: { ...player.equipped } };
  const bagIndex = player.bag.findIndex(item => item.id === itemId);
  if (bagIndex === -1) return player;

  const item = player.bag[bagIndex];
  const slot = item.slot || item.type || 'accessory';

  // Unequip current item in slot if any
  if (newPlayer.equipped[slot]) {
    newPlayer.bag.push(newPlayer.equipped[slot]);
  }

  // Remove from bag and add to equipment
  newPlayer.bag.splice(bagIndex, 1);
  newPlayer.equipped[slot] = item;

  return newPlayer;
}

/**
 * Apply unequip - unequip to bag
 */
export function applyUnequip(player, itemId) {
  const newPlayer = { ...player, bag: [...player.bag], equipped: { ...player.equipped } };

  for (const [slot, item] of Object.entries(newPlayer.equipped)) {
    if (item && item.id === itemId) {
      newPlayer.bag.push(item);
      newPlayer.equipped[slot] = null;
      return newPlayer;
    }
  }
  return player;
}

/**
 * Apply sell - remove from bag, add gold
 */
export function applySell(player, itemId) {
  const newPlayer = { ...player, bag: [...player.bag] };
  const bagIndex = player.bag.findIndex(item => item.id === itemId);
  if (bagIndex === -1) return player;

  const item = player.bag[bagIndex];
  const sellPrice = calculateSellPrice(item);

  newPlayer.bag.splice(bagIndex, 1);
  newPlayer.gold = player.gold + sellPrice;

  return newPlayer;
}

/**
 * Apply forge - upgrade or destroy item
 */
export function applyForge(player, itemId) {
  const newPlayer = { ...player, bag: [...player.bag], equipped: { ...player.equipped } };

  let item = player.bag.find(i => i.id === itemId) ||
             Object.values(player.equipment || {}).find(i => i && i.id === itemId);
  if (!item) return player;

  const forgeCost = calculateForgeCost(item);
  newPlayer.gold = player.gold - forgeCost;

  const successChance = FORGE_DATA.getSuccessRate(item.upgradeLevel || 0);
  const success = Math.random() < successChance;

  if (success) {
    item = { ...item, upgradeLevel: (item.upgradeLevel || 0) + 1 };
    // Boost stats
    const boost = 1 + 0.1 * (item.upgradeLevel || 1);
    if (item.atk) item.atk = Math.floor(item.atk * boost);
    if (item.def) item.def = Math.floor(item.def * boost);
    if (item.hp) item.hp = Math.floor(item.hp * boost);
  } else {
    // Failure: downgrade if possible, else destroy
    if ((item.upgradeLevel || 0) > 0) {
      item = { ...item, upgradeLevel: item.upgradeLevel - 1 };
    } else {
      // Destroy item
      const bagIdx = newPlayer.bag.findIndex(i => i.id === itemId);
      if (bagIdx !== -1) {
        newPlayer.bag.splice(bagIdx, 1);
      } else {
        for (const [slot, eq] of Object.entries(newPlayer.equipped)) {
          if (eq && eq.id === itemId) { newPlayer.equipped[slot] = null; break; }
        }
      }
      return newPlayer;
    }
  }

  // Update item in bag or equipment
  const bagIdx = newPlayer.bag.findIndex(i => i.id === itemId);
  if (bagIdx !== -1) {
    newPlayer.bag[bagIdx] = item;
  } else {
    for (const [slot, eq] of Object.entries(newPlayer.equipped)) {
      if (eq && eq.id === itemId) { newPlayer.equipped[slot] = item; break; }
    }
  }

  return newPlayer;
}

/**
 * Apply zone change
 */
export function applyZoneChange(player, newZone) {
  return { ...player, zone: newZone, zoneKills: 0 };
}

/**
 * Apply gold spend
 */
export function applyGoldSpend(player, amount) {
  return { ...player, gold: player.gold - amount };
}

// =============================================================================
// 5. HELPER FUNCTIONS
// =============================================================================

/**
 * Get equipment slot for item type
 */
export function getItemSlot(itemType) {
  const slotMap = {
    'weapon': 'weapon', 'armor': 'armor', 'accessory': 'accessory',
    'helmet': 'helmet', 'shield': 'shield'
  };
  return slotMap[itemType] || 'accessory';
}

/**
 * Calculate sell price
 */
export function calculateSellPrice(item) {
  if (!item) return 0;
  const baseValue = item.value || 100;
  const upgradeMultiplier = 1 + (item.upgradeLevel || 0) * 0.2;
  const rarityMultiplier = RARITY_TABLE[item.rarity]?.multiplier || 1.0;
  return Math.floor(baseValue * upgradeMultiplier * rarityMultiplier * 0.3);
}

/**
 * Calculate forge cost
 */
export function calculateForgeCost(item) {
  if (!item) return 0;
  return FORGE_DATA.getUpgradeCost(item.upgradeLevel || 0);
}

/**
 * Calculate damage between attacker and defender
 */
function calculateDamage(attackerAtk, defenderDef) {
  const critChance = 0.10;
  const isCrit = Math.random() < critChance;
  const critMultiplier = isCrit ? 1.5 : 1.0;
  const variance = 0.9 + Math.random() * 0.2;
  let damage = (attackerAtk - defenderDef / 2) * critMultiplier * variance;
  damage = Math.max(1, Math.floor(damage));
  return { damage, isCrit };
}

/**
 * Generate a loot item from a monster
 */
function generateLoot(monsterLevel) {
  const rarity = getRandomRarity();
  const rarityData = RARITY_TABLE[rarity];
  if (!rarityData) return null;

  const multiplier = rarityData.multiplier;
  const itemTypes = ['weapon', 'armor', 'accessory'];
  const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

  const baseAtk = Math.floor(monsterLevel * 2 + Math.random() * 5);
  const baseDef = Math.floor(monsterLevel * 1.5 + Math.random() * 3);
  const baseHp = Math.floor(monsterLevel * 10 + Math.random() * 20);

  const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: itemId,
    name: `${rarity} ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
    type: itemType,
    rarity,
    upgradeLevel: 0,
    levelRequirement: Math.max(1, monsterLevel - 2),
    atk: itemType === 'weapon' ? Math.floor(baseAtk * multiplier) : 0,
    def: (itemType === 'armor' || itemType === 'accessory') ? Math.floor(baseDef * multiplier) : 0,
    hp: itemType === 'armor' ? Math.floor(baseHp * multiplier) : 0,
    stats: {
      attack: Math.floor(baseAtk * multiplier),
      defense: Math.floor(baseDef * multiplier),
      hp: Math.floor(baseHp * multiplier)
    },
    value: Math.floor(100 * multiplier * monsterLevel)
  };
}

/**
 * Generate random loot (compatibility export)
 */
export function generateLootDrop(monsterLevel, luck = 0) {
  const dropChance = 0.3 + luck * 0.005;
  if (Math.random() > dropChance) return null;
  return generateLoot(monsterLevel);
}

// =============================================================================
// 6. SERVER-AUTHORITATIVE COMBAT TICK
// =============================================================================

/**
 * Process a combat tick - server calculates all combat results
 * @param {Object} player - DB player row (raw from database)
 * @param {number} zoneKey - Current zone number
 * @param {Array} monstersInZone - Array of monster keys from zone
 * @returns {Object} { attacks, expGained, goldGained, itemsDropped, levelUps, newStats }
 */
export function processCombatTick(player, zoneKey, monstersInZone) {
  const gamePlayer = dbPlayerToGame(player);
  const zone = ZONE_DATA[zoneKey];
  if (!zone || !monstersInZone || monstersInZone.length === 0) {
    return { attacks: [], expGained: 0, goldGained: 0, itemsDropped: [], levelUps: 0, newStats: null };
  }

  // Pick 2-4 random monsters
  const numMobs = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
  const selectedMonsters = [];
  for (let i = 0; i < numMobs; i++) {
    const key = monstersInZone[Math.floor(Math.random() * monstersInZone.length)];
    if (MONSTER_DATA[key]) {
      selectedMonsters.push({ key, ...MONSTER_DATA[key] });
    }
  }

  const attacks = [];
  let totalExp = 0;
  let totalGold = 0;
  const itemsDropped = [];
  let kills = 0;

  for (const monster of selectedMonsters) {
    // Hero attacks monster
    const heroDmg = calculateDamage(gamePlayer.atk, monster.def);
    const monsterDead = heroDmg.damage >= monster.hp;

    // Monster attacks hero (if alive)
    let monsterDmg = { damage: 0, isCrit: false };
    if (!monsterDead) {
      monsterDmg = calculateDamage(monster.atk, gamePlayer.def);
    }

    const attackResult = {
      monsterKey: monster.key,
      monsterName: monster.name,
      monsterLevel: monster.level,
      heroDamage: heroDmg.damage,
      heroCrit: heroDmg.isCrit,
      monsterDamage: monsterDead ? 0 : monsterDmg.damage,
      monsterCrit: monsterDead ? false : monsterDmg.isCrit,
      monsterKilled: monsterDead
    };

    if (monsterDead) {
      kills++;
      // Roll exp/gold rewards (with zone multiplier)
      const expReward = Math.floor(monster.expReward * (zone.expMultiplier || 1));
      const goldReward = Math.floor(monster.goldReward * (zone.goldMultiplier || 1));
      totalExp += expReward;
      totalGold += goldReward;

      attackResult.expReward = expReward;
      attackResult.goldReward = goldReward;

      // Roll item drop (30% base chance per monster)
      if (Math.random() < 0.30) {
        const loot = generateLoot(monster.level);
        if (loot) {
          itemsDropped.push(loot);
          attackResult.itemDrop = loot;
        }
      }
    }

    attacks.push(attackResult);
  }

  // Apply rewards to player
  let newExp = gamePlayer.exp + totalExp;
  let newGold = gamePlayer.gold + totalGold;
  let newLevel = gamePlayer.level;
  let levelUps = 0;

  // Check for level ups (can chain multiple)
  while (newLevel < 100) {
    const req = getExpRequiredForLevel(newLevel);
    if (newExp >= req) {
      newExp -= req;
      newLevel++;
      levelUps++;
    } else {
      break;
    }
  }

  // Add items to bag
  let newBag = [...gamePlayer.bag];
  for (const item of itemsDropped) {
    if (newBag.length < BAG_SIZE) {
      newBag.push(item);
    }
  }

  return {
    attacks,
    expGained: totalExp,
    goldGained: totalGold,
    itemsDropped,
    levelUps,
    newStats: {
      level: newLevel,
      exp: newExp,
      gold: newGold,
      totalKills: gamePlayer.totalKills + kills,
      zoneKills: gamePlayer.zoneKills + kills,
      bag: newBag
    }
  };
}

// =============================================================================
// 7. OFFLINE PROGRESS CALCULATION
// =============================================================================

/**
 * Calculate offline passive gains (no combat simulation)
 * @param {Object} player - DB player row
 * @param {string|null} lastOnlineTimestamp - ISO timestamp of last online
 * @returns {Object} { duration, expGained, goldGained }
 */
export function calculateOfflineProgress(player, lastOnlineTimestamp) {
  if (!lastOnlineTimestamp) {
    return { duration: 0, expGained: 0, goldGained: 0 };
  }

  const lastOnline = new Date(lastOnlineTimestamp).getTime();
  const now = Date.now();
  let elapsedMs = now - lastOnline;

  // Cap at 8 hours
  const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
  elapsedMs = Math.min(elapsedMs, MAX_OFFLINE_MS);

  if (elapsedMs <= 0) {
    return { duration: 0, expGained: 0, goldGained: 0 };
  }

  const hours = elapsedMs / (60 * 60 * 1000);
  const level = player.level || 1;
  const zone = player.zone || 1;
  const zoneData = ZONE_DATA[zone] || ZONE_DATA[1];
  const zoneMultiplier = zoneData.expMultiplier || 1.0;

  // Passive gains: no combat, just time-based
  const expGained = Math.floor(level * 10 * hours * zoneMultiplier);
  const goldGained = Math.floor(level * 5 * hours * zoneMultiplier);

  return {
    duration: Math.floor(elapsedMs / 1000), // seconds
    expGained,
    goldGained
  };
}

// =============================================================================
// 8. EXPORTS
// =============================================================================

export {
  COMBAT_TICK_MS,
  BAG_SIZE
};
