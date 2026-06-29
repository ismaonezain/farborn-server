// =============================================================================
// FARBORN SERVER - GAME LOGIC & VALIDATION SYSTEM
// Comprehensive server-side game state validation and logic
// =============================================================================

// =============================================================================
// 1. GAME CONSTANTS (Balance Values)
// =============================================================================

/**
 * Experience required per level
 * Formula: base * (level ^ exponent) + flat_bonus
 */
const EXP_PER_LEVEL = {
  base: 100,
  exponent: 1.5,
  flatBonus: 50
};

/**
 * Calculate EXP required for a specific level
 */
function getExpRequiredForLevel(level) {
  return Math.floor(
    EXP_PER_LEVEL.base * Math.pow(level, EXP_PER_LEVEL.exponent) + EXP_PER_LEVEL.flatBonus
  );
}

/**
 * Stat growth per level for each class
 * Format: { strength: base, agility: base, intelligence: base, vitality: base }
 */
const STAT_GROWTH_PER_LEVEL = {
  warrior: {
    strength: 3,
    agility: 1,
    intelligence: 0.5,
    vitality: 2
  },
  mage: {
    strength: 0.5,
    agility: 1,
    intelligence: 3,
    vitality: 1.5
  },
  rogue: {
    strength: 1.5,
    agility: 3,
    intelligence: 1,
    vitality: 1.5
  },
  paladin: {
    strength: 2,
    agility: 0.5,
    intelligence: 1,
    vitality: 3
  }
};

/**
 * Item rarity drop chances (must sum to 1.0)
 */
const RARITY_CHANCES = {
  common: 0.50,      // 50%
  uncommon: 0.30,    // 30%
  rare: 0.15,        // 15%
  epic: 0.04,        // 4%
  legendary: 0.01    // 1%
};

/**
 * Forge success rates by item rarity
 */
const FORGE_SUCCESS_RATES = {
  common: 1.00,      // 100% - guaranteed upgrade
  uncommon: 0.90,    // 90%
  rare: 0.75,        // 75%
  epic: 0.50,        // 50%
  legendary: 0.30    // 30%
};

/**
 * Zone unlock requirements (level required to access)
 */
const ZONE_UNLOCK_REQUIREMENTS = {
  'plains': 1,
  'forest': 5,
  'caves': 10,
  'swamp': 15,
  'mountains': 20,
  'volcano': 25,
  'frozen_peak': 30,
  'ancient_ruins': 35,
  'demon_realm': 40,
  'void': 50
};

// =============================================================================
// 2. VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate item drop from monster
 * @param {Object} player - Player state
 * @param {number} monsterLevel - Level of defeated monster
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateItemDrop(player, monsterLevel) {
  if (!player || typeof monsterLevel !== 'number') {
    return { valid: false, reason: 'Invalid player or monster level' };
  }

  // Check if player is within level range of monster (within 10 levels)
  const levelDiff = Math.abs(player.level - monsterLevel);
  if (levelDiff > 10) {
    return { valid: false, reason: 'Player level too far from monster level (max 10 difference)' };
  }

  // Check if monster level is reasonable
  if (monsterLevel < 1 || monsterLevel > 100) {
    return { valid: false, reason: 'Monster level out of valid range (1-100)' };
  }

  return { valid: true, reason: 'Item drop valid' };
}

/**
 * Validate level up attempt
 * @param {Object} player - Player state
 * @param {number} newLevel - Desired new level
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateLevelUp(player, newLevel) {
  if (!player || typeof newLevel !== 'number') {
    return { valid: false, reason: 'Invalid player or level' };
  }

  // Must be exactly one level higher
  if (newLevel !== player.level + 1) {
    return { valid: false, reason: 'Can only level up by one level at a time' };
  }

  // Check if player has enough EXP
  const expRequired = getExpRequiredForLevel(player.level);
  if (player.exp < expRequired) {
    return { valid: false, reason: `Insufficient EXP: need ${expRequired}, have ${player.exp}` };
  }

  // Check level cap
  if (newLevel > 100) {
    return { valid: false, reason: 'Maximum level reached (100)' };
  }

  return { valid: true, reason: 'Level up valid' };
}

/**
 * Validate equip action
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to equip
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateEquip(player, itemId) {
  if (!player || !itemId) {
    return { valid: false, reason: 'Invalid player or item ID' };
  }

  // Check if item exists in bag
  const bagItem = player.bag.find(item => item.id === itemId);
  if (!bagItem) {
    return { valid: false, reason: 'Item not found in bag' };
  }

  // Check level requirement
  if (bagItem.levelRequirement && player.level < bagItem.levelRequirement) {
    return { valid: false, reason: `Level ${bagItem.levelRequirement} required to equip this item` };
  }

  // Check class requirement
  if (bagItem.classRequirement && bagItem.classRequirement !== player.class) {
    return { valid: false, reason: `This item can only be equipped by ${bagItem.classRequirement}` };
  }

  return { valid: true, reason: 'Equip valid' };
}

/**
 * Validate unequip action
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to unequip
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateUnequip(player, itemId) {
  if (!player || !itemId) {
    return { valid: false, reason: 'Invalid player or item ID' };
  }

  // Check if item is equipped
  const equippedItem = player.equipment[getItemSlot(itemId)];
  if (!equippedItem || equippedItem.id !== itemId) {
    return { valid: false, reason: 'Item is not currently equipped' };
  }

  return { valid: true, reason: 'Unequip valid' };
}

/**
 * Validate sell action
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to sell
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateSell(player, itemId) {
  if (!player || !itemId) {
    return { valid: false, reason: 'Invalid player or item ID' };
  }

  // Check if item exists in bag
  const bagItem = player.bag.find(item => item.id === itemId);
  if (!bagItem) {
    return { valid: false, reason: 'Item not found in bag' };
  }

  // Check if item is not locked
  if (bagItem.locked) {
    return { valid: false, reason: 'Item is locked and cannot be sold' };
  }

  return { valid: true, reason: 'Sell valid' };
}

/**
 * Validate forge action
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to upgrade
 * @param {Array} materials - Required materials
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateForge(player, itemId, materials) {
  if (!player || !itemId || !Array.isArray(materials)) {
    return { valid: false, reason: 'Invalid parameters' };
  }

  // Check if item exists in bag or equipment
  let item = player.bag.find(i => i.id === itemId) || 
             Object.values(player.equipment).find(i => i && i.id === itemId);
  
  if (!item) {
    return { valid: false, reason: 'Item not found' };
  }

  // Check if item is at max upgrade level (10)
  if (item.upgradeLevel >= 10) {
    return { valid: false, reason: 'Item is already at maximum upgrade level' };
  }

  // Check if player has enough gold
  const forgeCost = calculateForgeCost(item);
  if (player.gold < forgeCost) {
    return { valid: false, reason: `Insufficient gold: need ${forgeCost}, have ${player.gold}` };
  }

  // Check materials
  const requiredMaterials = getRequiredMaterials(item);
  for (const [materialId, amount] of Object.entries(requiredMaterials)) {
    const playerMaterials = player.materials[materialId] || 0;
    if (playerMaterials < amount) {
      return { valid: false, reason: `Insufficient ${materialId}: need ${amount}, have ${playerMaterials}` };
    }
  }

  return { valid: true, reason: 'Forge valid' };
}

/**
 * Validate zone change
 * @param {Object} player - Player state
 * @param {string} newZone - Target zone ID
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateZoneChange(player, newZone) {
  if (!player || !newZone) {
    return { valid: false, reason: 'Invalid player or zone' };
  }

  // Check if zone exists
  if (!ZONE_UNLOCK_REQUIREMENTS.hasOwnProperty(newZone)) {
    return { valid: false, reason: 'Zone does not exist' };
  }

  // Check level requirement
  const requiredLevel = ZONE_UNLOCK_REQUIREMENTS[newZone];
  if (player.level < requiredLevel) {
    return { valid: false, reason: `Level ${requiredLevel} required to access ${newZone}` };
  }

  // Check if already in zone
  if (player.zone === newZone) {
    return { valid: false, reason: 'Already in this zone' };
  }

  return { valid: true, reason: 'Zone change valid' };
}

/**
 * Validate gold spend
 * @param {Object} player - Player state
 * @param {number} amount - Amount to spend
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateGoldSpend(player, amount) {
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
// 3. GAME LOGIC FUNCTIONS (Apply Changes)
// =============================================================================

/**
 * Apply level up - calculate new stats
 * @param {Object} player - Player state
 * @returns {Object} New player state
 */
function applyLevelUp(player) {
  const newPlayer = { ...player };
  const newLevel = player.level + 1;
  
  // Calculate EXP overflow
  const expRequired = getExpRequiredForLevel(player.level);
  const expOverflow = player.exp - expRequired;

  // Get stat growth for class
  const growth = STAT_GROWTH_PER_LEVEL[player.class] || STAT_GROWTH_PER_LEVEL.warrior;

  // Apply stat growth with randomness (±20%)
  const randomFactor = () => 0.8 + Math.random() * 0.4;

  newPlayer.level = newLevel;
  newPlayer.exp = expOverflow;
  
  // Update stats with growth
  newPlayer.stats = {
    strength: Math.floor((player.stats.strength || 10) + growth.strength * randomFactor()),
    agility: Math.floor((player.stats.agility || 10) + growth.agility * randomFactor()),
    intelligence: Math.floor((player.stats.intelligence || 10) + growth.intelligence * randomFactor()),
    vitality: Math.floor((player.stats.vitality || 10) + growth.vitality * randomFactor())
  };

  // Recalculate max HP based on vitality
  newPlayer.maxHp = calculateMaxHp(newPlayer);
  newPlayer.hp = newPlayer.maxHp; // Full heal on level up

  // Update max MP based on intelligence
  newPlayer.maxMp = calculateMaxMp(newPlayer);
  newPlayer.mp = newPlayer.maxMp; // Full MP restore

  return newPlayer;
}

/**
 * Apply item drop - add to bag
 * @param {Object} player - Player state
 * @param {Object} item - Item to add
 * @returns {Object} New player state
 */
function applyItemDrop(player, item) {
  const newPlayer = { ...player };
  newPlayer.bag = [...player.bag, item];
  
  // Check bag capacity (max 50 items)
  if (newPlayer.bag.length > 50) {
    // Remove oldest items if over capacity
    newPlayer.bag = newPlayer.bag.slice(-50);
  }

  return newPlayer;
}

/**
 * Apply equip - equip item
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to equip
 * @returns {Object} New player state
 */
function applyEquip(player, itemId) {
  const newPlayer = { ...player };
  const bagIndex = player.bag.findIndex(item => item.id === itemId);
  
  if (bagIndex === -1) return player;

  const item = player.bag[bagIndex];
  const slot = getItemSlot(item.type);

  // Unequip current item in slot if any
  if (newPlayer.equipment[slot]) {
    newPlayer.bag = [...newPlayer.bag, newPlayer.equipment[slot]];
  }

  // Remove from bag and add to equipment
  newPlayer.bag = [...player.bag.slice(0, bagIndex), ...player.bag.slice(bagIndex + 1)];
  newPlayer.equipment = { ...player.equipment, [slot]: item };

  // Recalculate stats
  newPlayer.stats = recalculateStats(newPlayer);

  return newPlayer;
}

/**
 * Apply unequip - unequip to bag
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to unequip
 * @returns {Object} New player state
 */
function applyUnequip(player, itemId) {
  const newPlayer = { ...player };
  const slot = getItemSlotById(itemId);

  if (!newPlayer.equipment[slot] || newPlayer.equipment[slot].id !== itemId) {
    return player;
  }

  // Move to bag
  newPlayer.bag = [...player.bag, newPlayer.equipment[slot]];
  newPlayer.equipment = { ...player.equipment, [slot]: null };

  // Recalculate stats
  newPlayer.stats = recalculateStats(newPlayer);

  return newPlayer;
}

/**
 * Apply sell - remove from bag, add gold
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to sell
 * @returns {Object} New player state
 */
function applySell(player, itemId) {
  const newPlayer = { ...player };
  const bagIndex = player.bag.findIndex(item => item.id === itemId);
  
  if (bagIndex === -1) return player;

  const item = player.bag[bagIndex];
  const sellPrice = calculateSellPrice(item);

  // Remove from bag and add gold
  newPlayer.bag = [...player.bag.slice(0, bagIndex), ...player.bag.slice(bagIndex + 1)];
  newPlayer.gold = player.gold + sellPrice;

  return newPlayer;
}

/**
 * Apply forge - upgrade or destroy item
 * @param {Object} player - Player state
 * @param {string} itemId - Item ID to upgrade
 * @returns {Object} New player state
 */
function applyForge(player, itemId) {
  const newPlayer = { ...player };
  
  // Find item
  let item = player.bag.find(i => i.id === itemId) || 
             Object.values(player.equipment).find(i => i && i.id === itemId);
  
  if (!item) return player;

  // Deduct gold
  const forgeCost = calculateForgeCost(item);
  newPlayer.gold = player.gold - forgeCost;

  // Deduct materials
  const requiredMaterials = getRequiredMaterials(item);
  newPlayer.materials = { ...player.materials };
  for (const [materialId, amount] of Object.entries(requiredMaterials)) {
    newPlayer.materials[materialId] = (newPlayer.materials[materialId] || 0) - amount;
  }

  // Roll for success
  const successChance = FORGE_SUCCESS_RATES[item.rarity] || 0.5;
  const success = Math.random() < successChance;

  if (success) {
    // Upgrade item
    item = { ...item, upgradeLevel: item.upgradeLevel + 1 };
    
    // Update stats based on upgrade
    item.stats = {
      attack: Math.floor(item.stats.attack * 1.1),
      defense: Math.floor(item.stats.defense * 1.1),
      hp: Math.floor(item.stats.hp * 1.05)
    };
  } else {
    // Destroy item or downgrade
    if (item.upgradeLevel > 0) {
      // Downgrade
      item = { ...item, upgradeLevel: item.upgradeLevel - 1 };
      item.stats = {
        attack: Math.floor(item.stats.attack / 1.1),
        defense: Math.floor(item.stats.defense / 1.1),
        hp: Math.floor(item.stats.hp / 1.05)
      };
    } else {
      // Destroy item
      if (player.bag.some(i => i.id === itemId)) {
        newPlayer.bag = player.bag.filter(i => i.id !== itemId);
      } else {
        const slot = getItemSlotById(itemId);
        newPlayer.equipment = { ...player.equipment, [slot]: null };
      }
      
      // Recalculate stats if item was equipped
      newPlayer.stats = recalculateStats(newPlayer);
      return newPlayer;
    }
  }

  // Update item in bag or equipment
  if (player.bag.some(i => i.id === itemId)) {
    newPlayer.bag = player.bag.map(i => i.id === itemId ? item : i);
  } else {
    const slot = getItemSlotById(itemId);
    newPlayer.equipment = { ...player.equipment, [slot]: item };
  }

  // Recalculate stats if item was equipped
  newPlayer.stats = recalculateStats(newPlayer);

  return newPlayer;
}

/**
 * Apply zone change
 * @param {Object} player - Player state
 * @param {string} newZone - Target zone
 * @returns {Object} New player state
 */
function applyZoneChange(player, newZone) {
  const newPlayer = { ...player };
  newPlayer.zone = newZone;
  
  // Reset combat state
  newPlayer.currentMonster = null;
  newPlayer.inCombat = false;
  
  // Restore some HP/MP when changing zones
  newPlayer.hp = Math.min(player.hp + Math.floor(player.maxHp * 0.1), player.maxHp);
  newPlayer.mp = Math.min(player.mp + Math.floor(player.maxMp * 0.2), player.maxMp);

  return newPlayer;
}

/**
 * Apply gold spend
 * @param {Object} player - Player state
 * @param {number} amount - Amount to spend
 * @returns {Object} New player state
 */
function applyGoldSpend(player, amount) {
  const newPlayer = { ...player };
  newPlayer.gold = player.gold - amount;
  return newPlayer;
}

// =============================================================================
// 4. HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate combat damage
 * @param {Object} attacker - Attacker stats
 * @param {Object} defender - Defender stats
 * @returns {number} Damage dealt
 */
function calculateDamage(attacker, defender) {
  // Base damage from attack
  const baseDamage = attacker.attack || 10;
  
  // Defense reduction
  const defense = defender.defense || 5;
  
  // Critical hit chance (10% base)
  const critChance = 0.1 + (attacker.agility || 0) * 0.001;
  const isCrit = Math.random() < critChance;
  
  // Critical multiplier
  const critMultiplier = isCrit ? 1.5 : 1.0;
  
  // Random variance (±10%)
  const variance = 0.9 + Math.random() * 0.2;
  
  // Calculate final damage
  let damage = (baseDamage - defense * 0.5) * critMultiplier * variance;
  
  // Minimum damage is 1
  damage = Math.max(1, Math.floor(damage));

  return { damage, isCrit };
}

/**
 * Calculate EXP reward
 * @param {number} monsterLevel - Monster level
 * @param {number} playerLevel - Player level
 * @returns {number} EXP gained
 */
function calculateExpReward(monsterLevel, playerLevel) {
  // Base EXP from monster level
  const baseExp = monsterLevel * 10;
  
  // Level difference penalty
  const levelDiff = playerLevel - monsterLevel;
  let multiplier = 1.0;
  
  if (levelDiff > 5) {
    // Too high level - reduced EXP
    multiplier = Math.max(0.1, 1.0 - (levelDiff - 5) * 0.1);
  } else if (levelDiff < -5) {
    // Too low level - bonus EXP
    multiplier = 1.0 + Math.abs(levelDiff + 5) * 0.05;
  }

  return Math.floor(baseExp * multiplier);
}

/**
 * Generate random loot
 * @param {number} monsterLevel - Monster level
 * @param {number} luck - Player luck stat
 * @returns {Object|null} Generated item or null
 */
function generateLoot(monsterLevel, luck = 0) {
  // Drop chance based on luck (base 30%)
  const dropChance = 0.3 + luck * 0.005;
  if (Math.random() > dropChance) {
    return null;
  }

  // Determine rarity
  const rarityRoll = Math.random();
  let rarity = 'common';
  let cumulative = 0;
  
  for (const [r, chance] of Object.entries(RARITY_CHANCES)) {
    cumulative += chance;
    if (rarityRoll <= cumulative) {
      rarity = r;
      break;
    }
  }

  // Generate item based on monster level and rarity
  const baseAttack = Math.floor(monsterLevel * 2 + Math.random() * 5);
  const baseDefense = Math.floor(monsterLevel * 1.5 + Math.random() * 3);
  const baseHp = Math.floor(monsterLevel * 10 + Math.random() * 20);

  // Rarity multipliers
  const rarityMultipliers = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.5,
    epic: 2.0,
    legendary: 3.0
  };

  const multiplier = rarityMultipliers[rarity] || 1.0;

  // Determine item type
  const itemTypes = ['weapon', 'armor', 'accessory'];
  const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

  // Generate unique ID
  const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: itemId,
    name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${itemType}`,
    type: itemType,
    rarity,
    upgradeLevel: 0,
    levelRequirement: Math.max(1, monsterLevel - 2),
    stats: {
      attack: Math.floor(baseAttack * multiplier),
      defense: Math.floor(baseDefense * multiplier),
      hp: Math.floor(baseHp * multiplier)
    },
    value: Math.floor(100 * multiplier * monsterLevel)
  };
}

/**
 * Calculate sell price
 * @param {Object} item - Item to sell
 * @returns {number} Gold value
 */
function calculateSellPrice(item) {
  if (!item) return 0;

  // Base value from item
  const baseValue = item.value || 100;

  // Upgrade bonus
  const upgradeMultiplier = 1 + (item.upgradeLevel || 0) * 0.2;

  // Rarity multiplier
  const rarityMultipliers = {
    common: 1.0,
    uncommon: 1.5,
    rare: 2.0,
    epic: 3.0,
    legendary: 5.0
  };
  const rarityMultiplier = rarityMultipliers[item.rarity] || 1.0;

  // Sell price is 30% of value
  return Math.floor(baseValue * upgradeMultiplier * rarityMultiplier * 0.3);
}

/**
 * Calculate forge cost
 * @param {Object} item - Item to forge
 * @returns {number} Gold cost
 */
function calculateForgeCost(item) {
  if (!item) return 0;

  const baseCost = 100;
  const levelMultiplier = item.upgradeLevel || 0;
  const rarityMultiplier = {
    common: 1,
    uncommon: 1.5,
    rare: 2,
    epic: 3,
    legendary: 5
  }[item.rarity] || 1;

  return Math.floor(baseCost * (1 + levelMultiplier * 0.5) * rarityMultiplier);
}

/**
 * Get required materials for forge
 * @param {Object} item - Item to forge
 * @returns {Object} Materials needed
 */
function getRequiredMaterials(item) {
  if (!item) return {};

  const baseMaterials = {
    'iron_ore': 5 + (item.upgradeLevel || 0) * 2,
    'magic_dust': 2 + Math.floor((item.upgradeLevel || 0) * 0.5)
  };

  // Add rarity-specific materials
  if (item.rarity === 'epic' || item.rarity === 'legendary') {
    baseMaterials['rare_gem'] = 1 + Math.floor((item.upgradeLevel || 0) * 0.2);
  }

  return baseMaterials;
}

// =============================================================================
// HELPER: Slot Mapping
// =============================================================================

/**
 * Get equipment slot for item type
 */
function getItemSlot(itemType) {
  const slotMap = {
    'weapon': 'weapon',
    'armor': 'armor',
    'accessory': 'accessory',
    'helmet': 'helmet',
    'shield': 'shield'
  };
  return slotMap[itemType] || 'accessory';
}

/**
 * Get equipment slot by item ID
 */
function getItemSlotById(itemId) {
  // This would require lookup against player.equipment
  // For simplicity, return 'accessory' as default
  return 'accessory';
}

/**
 * Calculate max HP based on stats
 */
function calculateMaxHp(player) {
  const baseHp = 100;
  const vitalityBonus = (player.stats.vitality || 0) * 10;
  const equipmentBonus = Object.values(player.equipment)
    .filter(item => item && item.stats.hp)
    .reduce((sum, item) => sum + item.stats.hp, 0);
  
  return baseHp + vitalityBonus + equipmentBonus;
}

/**
 * Calculate max MP based on stats
 */
function calculateMaxMp(player) {
  const baseMp = 50;
  const intelligenceBonus = (player.stats.intelligence || 0) * 5;
  return baseMp + intelligenceBonus;
}

/**
 * Recalculate all player stats from equipment
 */
function recalculateStats(player) {
  const baseStats = {
    strength: 10,
    agility: 10,
    intelligence: 10,
    vitality: 10
  };

  // Add level bonuses
  const growth = STAT_GROWTH_PER_LEVEL[player.class] || STAT_GROWTH_PER_LEVEL.warrior;
  for (let i = 1; i < player.level; i++) {
    baseStats.strength += growth.strength;
    baseStats.agility += growth.agility;
    baseStats.intelligence += growth.intelligence;
    baseStats.vitality += growth.vitality;
  }

  // Add equipment bonuses
  Object.values(player.equipment).forEach(item => {
    if (item && item.stats) {
      if (item.stats.strength) baseStats.strength += item.stats.strength;
      if (item.stats.agility) baseStats.agility += item.stats.agility;
      if (item.stats.intelligence) baseStats.intelligence += item.stats.intelligence;
      if (item.stats.vitality) baseStats.vitality += item.stats.vitality;
    }
  });

  return {
    strength: Math.floor(baseStats.strength),
    agility: Math.floor(baseStats.agility),
    intelligence: Math.floor(baseStats.intelligence),
    vitality: Math.floor(baseStats.vitality)
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Constants
  EXP_PER_LEVEL,
  STAT_GROWTH_PER_LEVEL,
  RARITY_CHANCES,
  FORGE_SUCCESS_RATES,
  ZONE_UNLOCK_REQUIREMENTS,
  
  // Helper functions
  getExpRequiredForLevel,
  calculateDamage,
  calculateExpReward,
  generateLoot,
  calculateSellPrice,
  calculateForgeCost,
  getRequiredMaterials,
  
  // Validation functions
  validateItemDrop,
  validateLevelUp,
  validateEquip,
  validateUnequip,
  validateSell,
  validateForge,
  validateZoneChange,
  validateGoldSpend,
  
  // Apply functions
  applyLevelUp,
  applyItemDrop,
  applyEquip,
  applyUnequip,
  applySell,
  applyForge,
  applyZoneChange,
  applyGoldSpend,
  
  // Internal helpers (for testing)
  calculateMaxHp,
  calculateMaxMp,
  recalculateStats,
  getItemSlot,
  getItemSlotById
};