/**
 * Farborn Server - Comprehensive Game Data
 * All game constants, item definitions, monster data, and zone information
 */

// ============================================================
// CLASS STATS - Base stats per class
// ============================================================

export const CLASS_STATS = {
  warrior: {
    name: 'Warrior',
    description: 'A stalwart defender with high health and balanced attack.',
    baseHP: 150,
    baseATK: 25,
    baseDEF: 20,
    baseSPD: 10,
    baseMP: 50
  },
  mage: {
    name: 'Mage',
    description: 'A powerful spellcaster with devastating attacks but low health.',
    baseHP: 80,
    baseATK: 40,
    baseDEF: 10,
    baseSPD: 15,
    baseMP: 150
  },
  rogue: {
    name: 'Rogue',
    description: 'A swift assassin with high damage output and low defenses.',
    baseHP: 100,
    baseATK: 35,
    baseDEF: 12,
    baseSPD: 25,
    baseMP: 80
  },
  paladin: {
    name: 'Paladin',
    description: 'A holy warrior with high health and strong defenses.',
    baseHP: 130,
    baseATK: 22,
    baseDEF: 25,
    baseSPD: 8,
    baseMP: 80
  }
};

// ============================================================
// LEVEL TABLE - EXP requirements per level
// Formula: base * level^1.5
// ============================================================

const EXP_BASE = 100;
const EXP_MAX_LEVEL = 100;

export const LEVEL_TABLE = {};
for (let level = 1; level <= EXP_MAX_LEVEL; level++) {
  LEVEL_TABLE[level] = Math.floor(EXP_BASE * Math.pow(level, 1.5));
}

// ============================================================
// STAT GROWTH - Stats gained per level per class
// ============================================================

export const STAT_GROWTH = {
  warrior: {
    HP: 12,
    ATK: 2.5,
    DEF: 2.0,
    SPD: 0.5,
    MP: 5
  },
  mage: {
    HP: 6,
    ATK: 4.0,
    DEF: 1.0,
    SPD: 1.0,
    MP: 15
  },
  rogue: {
    HP: 8,
    ATK: 3.5,
    DEF: 1.2,
    SPD: 2.5,
    MP: 8
  },
  paladin: {
    HP: 11,
    ATK: 2.0,
    DEF: 2.5,
    SPD: 0.3,
    MP: 8
  }
};

// ============================================================
// RARITY TABLE - Item rarities with multipliers and drop rates
// ============================================================

export const RARITY_TABLE = {
  Common: {
    multiplier: 1.0,
    dropRate: 0.5339,
    color: '#b0b0b0',
    glow: false
  },
  Uncommon: {
    multiplier: 1.3,
    dropRate: 0.25,
    color: '#1eff00',
    glow: false
  },
  Rare: {
    multiplier: 1.8,
    dropRate: 0.15,
    color: '#0070dd',
    glow: false
  },
  Epic: {
    multiplier: 2.8,
    dropRate: 0.05,
    color: '#a335ee',
    glow: false
  },
  Legendary: {
    multiplier: 4.5,
    dropRate: 0.01,
    color: '#ff8000',
    glow: true
  },
  Mythic: {
    multiplier: 7.0,
    dropRate: 0.005,
    color: '#e6cc80',
    glow: true
  },
  Divine: {
    multiplier: 11.0,
    dropRate: 0.001,
    color: '#ff0000',
    glow: true
  },
  Archgod: {
    multiplier: 18.0,
    dropRate: 0.0001,
    color: '#ffffff',
    glow: true
  }
};

// Get rarity by drop chance
export function getRandomRarity() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [rarity, data] of Object.entries(RARITY_TABLE)) {
    cumulative += data.dropRate;
    if (rand <= cumulative) {
      return rarity;
    }
  }
  
  return 'Common'; // Fallback
}

// ============================================================
// ZONE DATA - Zone requirements and monster types
// ============================================================

export const ZONE_DATA = {
  1: {
    name: 'Green Meadows',
    description: 'A peaceful valley where new adventurers begin their journey.',
    levelRange: { min: 1, max: 10 },
    monsters: ['slime', 'goblin_worker', 'rat'],
    boss: 'king_slime',
    requiredGold: 0,
    expMultiplier: 1.0,
    goldMultiplier: 1.0
  },
  2: {
    name: 'Dark Forest',
    description: 'A dense, shadowy forest filled with cunning goblins.',
    levelRange: { min: 10, max: 20 },
    monsters: ['goblin_scout', 'goblin_warrior', 'spider'],
    boss: 'goblin_chief',
    requiredGold: 5000,
    expMultiplier: 1.2,
    goldMultiplier: 1.2
  },
  3: {
    name: 'Wolf Den',
    description: 'A treacherous mountain pass patrolled by fierce wolves.',
    levelRange: { min: 20, max: 30 },
    monsters: ['dire_wolf', 'shadow_wolf', 'warg'],
    boss: 'alpha_wolf',
    requiredGold: 15000,
    expMultiplier: 1.5,
    goldMultiplier: 1.5
  },
  4: {
    name: 'Orc Fortress',
    description: 'A heavily fortified stronghold of savage orcs.',
    levelRange: { min: 30, max: 40 },
    monsters: ['orc_brute', 'orc_shaman', 'orc_archer'],
    boss: 'orc_warchief',
    requiredGold: 30000,
    expMultiplier: 1.8,
    goldMultiplier: 1.8
  },
  5: {
    name: 'Dragon Peaks',
    description: 'Volcanic mountains where ancient dragons nest.',
    levelRange: { min: 40, max: 50 },
    monsters: ['wyvern', 'fire_drake', 'obsidian_golem'],
    boss: 'elder_dragon',
    requiredGold: 60000,
    expMultiplier: 2.0,
    goldMultiplier: 2.0
  },
  6: {
    name: 'Demon Realm',
    description: 'A nightmarish dimension of endless torment.',
    levelRange: { min: 50, max: 60 },
    monsters: ['imp', 'demon_knight', 'soul_eater'],
    boss: 'demon_lord',
    requiredGold: 100000,
    expMultiplier: 2.5,
    goldMultiplier: 2.5
  },
  7: {
    name: 'Crypt of the Dead',
    description: 'An ancient burial ground teeming with restless undead.',
    levelRange: { min: 60, max: 70 },
    monsters: ['skeleton_warrior', 'zombie_mage', 'ghost'],
    boss: 'lich_king',
    requiredGold: 150000,
    expMultiplier: 3.0,
    goldMultiplier: 3.0
  },
  8: {
    name: 'Elemental Nexus',
    description: 'A plane of pure elemental energy and chaos.',
    levelRange: { min: 70, max: 80 },
    monsters: ['fire_elemental', 'water_spirit', 'earth_giant'],
    boss: 'primordial',
    requiredGold: 200000,
    expMultiplier: 3.5,
    goldMultiplier: 3.5
  },
  9: {
    name: 'Celestial Realm',
    description: 'The divine realm where angels and fallen angels dwell.',
    levelRange: { min: 80, max: 90 },
    monsters: ['fallen_angel', 'seraph', 'divine_guardian'],
    boss: 'archangel',
    requiredGold: 300000,
    expMultiplier: 4.0,
    goldMultiplier: 4.0
  },
  10: {
    name: 'Void of Chaos',
    description: 'The realm of archgods, where reality itself bends.',
    levelRange: { min: 90, max: 100 },
    monsters: ['void_walker', 'chaos_spawn', 'reality_breaker'],
    boss: 'chaos_god',
    requiredGold: 500000,
    expMultiplier: 5.0,
    goldMultiplier: 5.0
  }
};

// ============================================================
// MONSTER DATA - Monster stats per zone
// ============================================================

export const MONSTER_DATA = {
  // Zone 1 - Green Meadows
  slime: {
    name: 'Slime',
    level: 1,
    hp: 50,
    atk: 8,
    def: 2,
    spd: 5,
    expReward: 25,
    goldReward: 10,
    dropChance: 0.3,
    drops: ['health_potion', 'slime_jelly']
  },
  goblin_worker: {
    name: 'Goblin Worker',
    level: 3,
    hp: 70,
    atk: 12,
    def: 5,
    spd: 8,
    expReward: 40,
    goldReward: 20,
    dropChance: 0.35,
    drops: ['health_potion', 'goblin_dagger', 'rusty_shield']
  },
  rat: {
    name: 'Giant Rat',
    level: 2,
    hp: 40,
    atk: 10,
    def: 3,
    spd: 12,
    expReward: 20,
    goldReward: 8,
    dropChance: 0.25,
    drops: ['health_potion', 'rat_fang']
  },
  king_slime: {
    name: 'King Slime',
    level: 10,
    hp: 500,
    atk: 30,
    def: 10,
    spd: 3,
    expReward: 250,
    goldReward: 100,
    dropChance: 1.0,
    drops: ['slime_crown', 'legendary_slime_jelly', 'health_potion'],
    isBoss: true
  },
  
  // Zone 2 - Dark Forest
  goblin_scout: {
    name: 'Goblin Scout',
    level: 12,
    hp: 120,
    atk: 25,
    def: 8,
    spd: 15,
    expReward: 80,
    goldReward: 40,
    dropChance: 0.3,
    drops: ['mana_potion', 'goblin_bow', 'leather_armor']
  },
  goblin_warrior: {
    name: 'Goblin Warrior',
    level: 15,
    hp: 180,
    atk: 35,
    def: 15,
    spd: 10,
    expReward: 120,
    goldReward: 60,
    dropChance: 0.35,
    drops: ['mana_potion', 'goblin_sword', 'iron_shield']
  },
  spider: {
    name: 'Giant Spider',
    level: 13,
    hp: 100,
    atk: 28,
    def: 6,
    spd: 18,
    expReward: 90,
    goldReward: 45,
    dropChance: 0.3,
    drops: ['mana_potion', 'spider_silk', 'poison_fang']
  },
  goblin_chief: {
    name: 'Goblin Chief',
    level: 20,
    hp: 1200,
    atk: 60,
    def: 25,
    spd: 12,
    expReward: 500,
    goldReward: 250,
    dropChance: 1.0,
    drops: ['goblin_chief_crown', 'chief_blade', 'mana_potion'],
    isBoss: true
  },
  
  // Zone 3 - Wolf Den
  dire_wolf: {
    name: 'Dire Wolf',
    level: 22,
    hp: 250,
    atk: 50,
    def: 18,
    spd: 25,
    expReward: 180,
    goldReward: 90,
    dropChance: 0.3,
    drops: ['health_potion', 'wolf_pelt', 'fang_necklace']
  },
  shadow_wolf: {
    name: 'Shadow Wolf',
    level: 25,
    hp: 300,
    atk: 60,
    def: 15,
    spd: 30,
    expReward: 220,
    goldReward: 110,
    dropChance: 0.35,
    drops: ['health_potion', 'shadow_cloak', 'dark_fang']
  },
  warg: {
    name: 'Warg',
    level: 28,
    hp: 350,
    atk: 55,
    def: 20,
    spd: 22,
    expReward: 250,
    goldReward: 125,
    dropChance: 0.3,
    drops: ['health_potion', 'warg_armor', 'beast_claw']
  },
  alpha_wolf: {
    name: 'Alpha Wolf',
    level: 30,
    hp: 2500,
    atk: 100,
    def: 40,
    spd: 28,
    expReward: 1000,
    goldReward: 500,
    dropChance: 1.0,
    drops: ['alpha_fang', 'wolf_king_pelt', 'health_potion'],
    isBoss: true
  },
  
  // Zone 4 - Orc Fortress
  orc_brute: {
    name: 'Orc Brute',
    level: 32,
    hp: 450,
    atk: 75,
    def: 35,
    spd: 12,
    expReward: 350,
    goldReward: 175,
    dropChance: 0.3,
    drops: ['health_potion', 'orc_axe', 'orc_plate']
  },
  orc_shaman: {
    name: 'Orc Shaman',
    level: 35,
    hp: 300,
    atk: 90,
    def: 20,
    spd: 15,
    expReward: 400,
    goldReward: 200,
    dropChance: 0.35,
    drops: ['mana_potion', 'shaman_staff', 'spirit_totem']
  },
  orc_archer: {
    name: 'Orc Archer',
    level: 33,
    hp: 280,
    atk: 85,
    def: 18,
    spd: 20,
    expReward: 380,
    goldReward: 190,
    dropChance: 0.3,
    drops: ['mana_potion', 'orc_bow', 'quiver_of_fury']
  },
  orc_warchief: {
    name: 'Orc Warchief',
    level: 40,
    hp: 5000,
    atk: 150,
    def: 60,
    spd: 15,
    expReward: 2500,
    goldReward: 1250,
    dropChance: 1.0,
    drops: ['warchief_banner', 'war_axe_of_domination', 'mana_potion'],
    isBoss: true
  },
  
  // Zone 5 - Dragon Peaks
  wyvern: {
    name: 'Wyvern',
    level: 42,
    hp: 600,
    atk: 110,
    def: 45,
    spd: 25,
    expReward: 550,
    goldReward: 275,
    dropChance: 0.3,
    drops: ['health_potion', 'wyvern_scale', 'dragon_breath']
  },
  fire_drake: {
    name: 'Fire Drake',
    level: 45,
    hp: 750,
    atk: 130,
    def: 50,
    spd: 20,
    expReward: 650,
    goldReward: 325,
    dropChance: 0.35,
    drops: ['health_potion', 'fire_drake_fang', 'molten_armor']
  },
  obsidian_golem: {
    name: 'Obsidian Golem',
    level: 48,
    hp: 900,
    atk: 90,
    def: 80,
    spd: 8,
    expReward: 700,
    goldReward: 350,
    dropChance: 0.3,
    drops: ['health_potion', 'obsidian_core', 'golem_fist']
  },
  elder_dragon: {
    name: 'Elder Dragon',
    level: 50,
    hp: 10000,
    atk: 250,
    def: 100,
    spd: 18,
    expReward: 5000,
    goldReward: 2500,
    dropChance: 1.0,
    drops: ['dragon_heart', 'elders_wing', 'dragon_crown'],
    isBoss: true
  },
  
  // Zone 6 - Demon Realm
  imp: {
    name: 'Imp',
    level: 52,
    hp: 500,
    atk: 150,
    def: 40,
    spd: 30,
    expReward: 800,
    goldReward: 400,
    dropChance: 0.3,
    drops: ['mana_potion', 'imp_staff', 'hellfire_orb']
  },
  demon_knight: {
    name: 'Demon Knight',
    level: 55,
    hp: 800,
    atk: 180,
    def: 70,
    spd: 22,
    expReward: 1000,
    goldReward: 500,
    dropChance: 0.35,
    drops: ['health_potion', 'demon_blade', 'dark_plate']
  },
  soul_eater: {
    name: 'Soul Eater',
    level: 58,
    hp: 600,
    atk: 200,
    def: 50,
    spd: 28,
    expReward: 1200,
    goldReward: 600,
    dropChance: 0.3,
    drops: ['mana_potion', 'soul_gem', 'void_cloak']
  },
  demon_lord: {
    name: 'Demon Lord',
    level: 60,
    hp: 15000,
    atk: 350,
    def: 120,
    spd: 25,
    expReward: 8000,
    goldReward: 4000,
    dropChance: 1.0,
    drops: ['demon_crown', 'lords_blade', 'abyssal_armor'],
    isBoss: true
  },
  
  // Zone 7 - Crypt of the Dead
  skeleton_warrior: {
    name: 'Skeleton Warrior',
    level: 62,
    hp: 700,
    atk: 180,
    def: 60,
    spd: 18,
    expReward: 1500,
    goldReward: 750,
    dropChance: 0.3,
    drops: ['health_potion', 'bone_sword', 'skeleton_shield']
  },
  zombie_mage: {
    name: 'Zombie Mage',
    level: 65,
    hp: 500,
    atk: 220,
    def: 40,
    spd: 15,
    expReward: 1800,
    goldReward: 900,
    dropChance: 0.35,
    drops: ['mana_potion', 'zombie_staff', 'rotted_robes']
  },
  ghost: {
    name: 'Ghost',
    level: 68,
    hp: 400,
    atk: 200,
    def: 100,
    spd: 35,
    expReward: 2000,
    goldReward: 1000,
    dropChance: 0.3,
    drops: ['mana_potion', 'ectoplasm', 'spectral_cloak']
  },
  lich_king: {
    name: 'Lich King',
    level: 70,
    hp: 20000,
    atk: 400,
    def: 150,
    spd: 20,
    expReward: 12000,
    goldReward: 6000,
    dropChance: 1.0,
    drops: ['phylactery', 'crown_of_undeath', 'staff_of_ages'],
    isBoss: true
  },
  
  // Zone 8 - Elemental Nexus
  fire_elemental: {
    name: 'Fire Elemental',
    level: 72,
    hp: 800,
    atk: 250,
    def: 60,
    spd: 25,
    expReward: 2500,
    goldReward: 1250,
    dropChance: 0.3,
    drops: ['health_potion', 'fire_core', 'flame_staff']
  },
  water_spirit: {
    name: 'Water Spirit',
    level: 75,
    hp: 700,
    atk: 230,
    def: 70,
    spd: 30,
    expReward: 2800,
    goldReward: 1400,
    dropChance: 0.35,
    drops: ['mana_potion', 'water_crystal', 'tidal_wave_orb']
  },
  earth_giant: {
    name: 'Earth Giant',
    level: 78,
    hp: 1200,
    atk: 200,
    def: 120,
    spd: 10,
    expReward: 3000,
    goldReward: 1500,
    dropChance: 0.3,
    drops: ['health_potion', 'earth_shard', 'stone_skin_armor']
  },
  primordial: {
    name: 'Primordial',
    level: 80,
    hp: 25000,
    atk: 500,
    def: 180,
    spd: 22,
    expReward: 18000,
    goldReward: 9000,
    dropChance: 1.0,
    drops: ['primordial_essence', 'elemental_crown', 'nexus_staff'],
    isBoss: true
  },
  
  // Zone 9 - Celestial Realm
  fallen_angel: {
    name: 'Fallen Angel',
    level: 82,
    hp: 900,
    atk: 280,
    def: 80,
    spd: 35,
    expReward: 3500,
    goldReward: 1750,
    dropChance: 0.3,
    drops: ['health_potion', 'fallen_wing', 'dark_halo']
  },
  seraph: {
    name: 'Seraph',
    level: 85,
    hp: 1000,
    atk: 300,
    def: 90,
    spd: 40,
    expReward: 4000,
    goldReward: 2000,
    dropChance: 0.35,
    drops: ['mana_potion', 'seraph_blade', 'holy_feathers']
  },
  divine_guardian: {
    name: 'Divine Guardian',
    level: 88,
    hp: 1500,
    atk: 250,
    def: 150,
    spd: 20,
    expReward: 4500,
    goldReward: 2250,
    dropChance: 0.3,
    drops: ['health_potion', 'guardian_shield', 'divine_plate']
  },
  archangel: {
    name: 'Archangel',
    level: 90,
    hp: 35000,
    atk: 600,
    def: 200,
    spd: 30,
    expReward: 25000,
    goldReward: 12500,
    dropChance: 1.0,
    drops: ['halo_of_light', 'divine_blade', 'celestial_armor'],
    isBoss: true
  },
  
  // Zone 10 - Void of Chaos
  void_walker: {
    name: 'Void Walker',
    level: 92,
    hp: 1200,
    atk: 350,
    def: 100,
    spd: 40,
    expReward: 5000,
    goldReward: 2500,
    dropChance: 0.3,
    drops: ['mana_potion', 'void_shard', 'reality_cloak']
  },
  chaos_spawn: {
    name: 'Chaos Spawn',
    level: 95,
    hp: 1500,
    atk: 400,
    def: 120,
    spd: 35,
    expReward: 6000,
    goldReward: 3000,
    dropChance: 0.35,
    drops: ['health_potion', 'chaos_gem', 'mutation_orb']
  },
  reality_breaker: {
    name: 'Reality Breaker',
    level: 98,
    hp: 2000,
    atk: 450,
    def: 150,
    spd: 30,
    expReward: 7000,
    goldReward: 3500,
    dropChance: 0.3,
    drops: ['health_potion', 'reality_stone', 'void_blade']
  },
  chaos_god: {
    name: 'Chaos God',
    level: 100,
    hp: 50000,
    atk: 800,
    def: 250,
    spd: 25,
    expReward: 50000,
    goldReward: 25000,
    dropChance: 1.0,
    drops: ['crown_of_chaos', 'godslayer', 'void_armor'],
    isBoss: true
  }
};

// ============================================================
// FORGE DATA - Forge costs and success rates
// ============================================================

export const FORGE_DATA = {
  baseCost: 1000,
  costMultiplier: 1.5, // Cost increases by 50% per level
  maxUpgradeLevel: 20,
  
  // Success rate: 70% - (upgradeLevel * 5%)
  getSuccessRate: (currentLevel) => {
    return Math.max(0.05, 0.70 - (currentLevel * 0.05));
  },
  
  // Destroy chance: 10% + (upgradeLevel * 2%)
  getDestroyChance: (currentLevel) => {
    return Math.min(0.50, 0.10 + (currentLevel * 0.02));
  },
  
  // Calculate cost for specific upgrade
  getUpgradeCost: (currentLevel) => {
    return Math.floor(FORGE_DATA.baseCost * Math.pow(FORGE_DATA.costMultiplier, currentLevel));
  },
  
  // Stat bonus per upgrade level
  statBonusPerLevel: {
    weapon: { ATK: 5 },
    armor: { DEF: 4, HP: 10 },
    accessory: { SPD: 1, HP: 5 }
  }
};

// ============================================================
// SKILL DATA - Skills per class
// ============================================================

export const SKILL_DATA = {
  warrior: {
    cleave: {
      name: 'Cleave',
      description: 'A powerful sweeping attack that hits all enemies.',
      manaCost: 30,
      cooldown: 3, // turns
      baseDamage: 1.5, // multiplier of ATK
      damageType: 'physical',
      aoe: true, // area of effect
      requiredLevel: 1
    },
    shield_bash: {
      name: 'Shield Bash',
      description: 'Bash with shield, stunning the target.',
      manaCost: 25,
      cooldown: 4,
      baseDamage: 1.2,
      damageType: 'physical',
      effect: 'stun',
      effectDuration: 1,
      requiredLevel: 5
    },
    whirlwind: {
      name: 'Whirlwind',
      description: 'Spin attack dealing massive damage to all nearby enemies.',
      manaCost: 50,
      cooldown: 6,
      baseDamage: 2.5,
      damageType: 'physical',
      aoe: true,
      requiredLevel: 10
    }
  },
  mage: {
    fireball: {
      name: 'Fireball',
      description: 'Launches an explosive fireball at the target.',
      manaCost: 35,
      cooldown: 2,
      baseDamage: 2.0,
      damageType: 'fire',
      requiredLevel: 1
    },
    ice_shard: {
      name: 'Ice Shard',
      description: 'Hurls a piercing shard of ice that slows the target.',
      manaCost: 30,
      cooldown: 3,
      baseDamage: 1.8,
      damageType: 'ice',
      effect: 'slow',
      effectDuration: 2,
      requiredLevel: 5
    },
    lightning: {
      name: 'Lightning',
      description: 'Calls down a devastating bolt of lightning.',
      manaCost: 60,
      cooldown: 5,
      baseDamage: 3.5,
      damageType: 'lightning',
      aoe: true,
      requiredLevel: 10
    }
  },
  rogue: {
    backstab: {
      name: 'Backstab',
      description: 'A致命 attack from behind dealing massive damage.',
      manaCost: 25,
      cooldown: 2,
      baseDamage: 2.5,
      damageType: 'physical',
      critMultiplier: 2.0,
      requiredLevel: 1
    },
    poison: {
      name: 'Poison',
      description: 'Coats weapon in deadly poison.',
      manaCost: 20,
      cooldown: 4,
      baseDamage: 1.0,
      damageType: 'poison',
      effect: 'poison',
      effectDuration: 3,
      effectDamage: 0.1, // 10% of ATK per turn
      requiredLevel: 5
    },
    shadow_strike: {
      name: 'Shadow Strike',
      description: 'Vanish into shadows and strike with lethal precision.',
      manaCost: 40,
      cooldown: 5,
      baseDamage: 3.0,
      damageType: 'physical',
      ignoreDefense: 0.5, // Ignores 50% of defense
      requiredLevel: 10
    }
  },
  paladin: {
    holy_smite: {
      name: 'Holy Smite',
      description: 'Strike with divine power, dealing holy damage.',
      manaCost: 35,
      cooldown: 2,
      baseDamage: 1.8,
      damageType: 'holy',
      effectiveAgainst: ['undead', 'demon'],
      requiredLevel: 1
    },
    heal: {
      name: 'Heal',
      description: 'Restore health to self or ally.',
      manaCost: 40,
      cooldown: 3,
      healAmount: 2.0, // multiplier of ATK
      targetSelf: true,
      requiredLevel: 3
    },
    divine_shield: {
      name: 'Divine Shield',
      description: 'Surrounds self with holy energy, blocking all damage.',
      manaCost: 60,
      cooldown: 8,
      effect: 'invulnerable',
      effectDuration: 2,
      requiredLevel: 8
    }
  }
};

// ============================================================
// ITEM DEFINITIONS - Weapons, Armor, Accessories
// ============================================================

export const WEAPON_DATA = {
  // Zone 1 weapons
  wooden_sword: {
    name: 'Wooden Sword',
    description: 'A basic wooden sword for beginners.',
    type: 'weapon',
    classRestriction: ['warrior', 'paladin'],
    baseATK: 5,
    requiredLevel: 1,
    sellPrice: 10,
    zones: [1]
  },
  goblin_dagger: {
    name: 'Goblin Dagger',
    description: 'A crude dagger stolen from goblins.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 8,
    requiredLevel: 1,
    sellPrice: 15,
    zones: [1]
  },
  apprentice_staff: {
    name: 'Apprentice Staff',
    description: 'A simple staff imbued with minor magic.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 6,
    baseMP: 10,
    requiredLevel: 1,
    sellPrice: 12,
    zones: [1]
  },
  
  // Zone 2 weapons
  goblin_sword: {
    name: 'Goblin Sword',
    description: 'A crude but effective blade.',
    type: 'weapon',
    classRestriction: ['warrior', 'paladin'],
    baseATK: 12,
    requiredLevel: 10,
    sellPrice: 50,
    zones: [2]
  },
  goblin_bow: {
    name: 'Goblin Bow',
    description: 'A short bow made from twisted wood.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 15,
    requiredLevel: 10,
    sellPrice: 55,
    zones: [2]
  },
  goblin_staff: {
    name: 'Goblin Staff',
    description: 'A staff topped with a glowing gem.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 14,
    baseMP: 20,
    requiredLevel: 10,
    sellPrice: 52,
    zones: [2]
  },
  
  // Zone 3 weapons
  wolf_fang_blade: {
    name: 'Wolf Fang Blade',
    description: 'A sword with a blade shaped like a wolf fang.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 20,
    baseSPD: 2,
    requiredLevel: 20,
    sellPrice: 120,
    zones: [3]
  },
  shadow_dagger: {
    name: 'Shadow Dagger',
    description: 'A dagger that seems to absorb light.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 22,
    baseSPD: 3,
    requiredLevel: 20,
    sellPrice: 130,
    zones: [3]
  },
  warg_claw_staff: {
    name: 'Warg Claw Staff',
    description: 'A staff made from warg claws and dark wood.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 25,
    baseMP: 30,
    requiredLevel: 20,
    sellPrice: 140,
    zones: [3]
  },
  
  // Zone 4 weapons
  orc_axe: {
    name: 'Orc Axe',
    description: 'A massive axe wielded by orc brutes.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 35,
    requiredLevel: 30,
    sellPrice: 250,
    zones: [4]
  },
  orc_bow: {
    name: 'Orc Bow',
    description: 'A powerful composite bow.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 40,
    requiredLevel: 30,
    sellPrice: 280,
    zones: [4]
  },
  shaman_staff: {
    name: 'Shaman Staff',
    description: 'A staff infused with primal magic.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 45,
    baseMP: 50,
    requiredLevel: 30,
    sellPrice: 300,
    zones: [4]
  },
  
  // Zone 5 weapons
  dragonbone_blade: {
    name: 'Dragonbone Blade',
    description: 'A blade forged from ancient dragon bones.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 60,
    baseDEF: 10,
    requiredLevel: 40,
    sellPrice: 500,
    zones: [5]
  },
  fire_drake_fang: {
    name: 'Fire Drake Fang',
    description: 'A dagger made from a fire drake\'s fang.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 70,
    baseSPD: 5,
    requiredLevel: 40,
    sellPrice: 550,
    zones: [5]
  },
  flame_staff: {
    name: 'Flame Staff',
    description: 'A staff wreathed in eternal flames.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 80,
    baseMP: 80,
    requiredLevel: 40,
    sellPrice: 600,
    zones: [5]
  },
  
  // Zone 6 weapons
  demon_blade: {
    name: 'Demon Blade',
    description: 'A cursed sword forged in the depths of hell.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 100,
    baseHP: -50,
    requiredLevel: 50,
    sellPrice: 800,
    zones: [6]
  },
  soul_reaper: {
    name: 'Soul Reaper',
    description: 'A scythe that harvests souls.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 110,
    baseSPD: 8,
    requiredLevel: 50,
    sellPrice: 850,
    zones: [6]
  },
  void_staff: {
    name: 'Void Staff',
    description: 'A staff that channels the power of the void.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 120,
    baseMP: 120,
    requiredLevel: 50,
    sellPrice: 900,
    zones: [6]
  },
  
  // Zone 7 weapons
  bone_sword: {
    name: 'Bone Sword',
    description: 'A sword carved from ancient bones.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 130,
    baseDEF: 15,
    requiredLevel: 60,
    sellPrice: 1200,
    zones: [7]
  },
  soul_edge: {
    name: 'Soul Edge',
    description: 'A blade that devours the souls of its victims.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 140,
    baseSPD: 10,
    requiredLevel: 60,
    sellPrice: 1300,
    zones: [7]
  },
  lich_staff: {
    name: 'Lich Staff',
    description: 'A staff of immense necrotic power.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 160,
    baseMP: 150,
    requiredLevel: 60,
    sellPrice: 1500,
    zones: [7]
  },
  
  // Zone 8 weapons
  primal_blade: {
    name: 'Primal Blade',
    description: 'A sword infused with elemental energy.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 180,
    baseDEF: 20,
    requiredLevel: 70,
    sellPrice: 2000,
    zones: [8]
  },
  chaos_edge: {
    name: 'Chaos Edge',
    description: 'A dagger that bends reality around it.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 200,
    baseSPD: 15,
    requiredLevel: 70,
    sellPrice: 2200,
    zones: [8]
  },
  primordial_staff: {
    name: 'Primordial Staff',
    description: 'A staff of pure elemental power.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 220,
    baseMP: 200,
    requiredLevel: 70,
    sellPrice: 2500,
    zones: [8]
  },
  
  // Zone 9 weapons
  divine_blade: {
    name: 'Divine Blade',
    description: 'A sword blessed by the heavens.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 250,
    baseDEF: 25,
    baseHP: 100,
    requiredLevel: 80,
    sellPrice: 3000,
    zones: [9]
  },
  seraph_dagger: {
    name: 'Seraph Dagger',
    description: 'A dagger forged from angelic feathers.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 280,
    baseSPD: 20,
    requiredLevel: 80,
    sellPrice: 3200,
    zones: [9]
  },
  celestial_staff: {
    name: 'Celestial Staff',
    description: 'A staff that channels divine magic.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 300,
    baseMP: 250,
    requiredLevel: 80,
    sellPrice: 3500,
    zones: [9]
  },
  
  // Zone 10 weapons
  godslayer: {
    name: 'Godslayer',
    description: 'A weapon said to be capable of slaying gods.',
    type: 'weapon',
    classRestriction: ['warrior'],
    baseATK: 400,
    baseDEF: 30,
    baseHP: 200,
    requiredLevel: 90,
    sellPrice: 5000,
    zones: [10]
  },
  void_reaper: {
    name: 'Void Reaper',
    description: 'A scythe that reaps from the void.',
    type: 'weapon',
    classRestriction: ['rogue'],
    baseATK: 450,
    baseSPD: 25,
    requiredLevel: 90,
    sellPrice: 5500,
    zones: [10]
  },
  chaos_staff: {
    name: 'Chaos Staff',
    description: 'A staff of absolute chaos and power.',
    type: 'weapon',
    classRestriction: ['mage'],
    baseATK: 500,
    baseMP: 300,
    requiredLevel: 90,
    sellPrice: 6000,
    zones: [10]
  }
};

export const ARMOR_DATA = {
  // Zone 1 armor
  leather_armor: {
    name: 'Leather Armor',
    description: 'Basic leather protection.',
    type: 'armor',
    classRestriction: ['warrior', 'rogue'],
    baseDEF: 5,
    baseHP: 20,
    requiredLevel: 1,
    sellPrice: 15,
    zones: [1]
  },
  cloth_robe: {
    name: 'Cloth Robe',
    description: 'A simple robe offering minimal protection.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 2,
    baseMP: 30,
    requiredLevel: 1,
    sellPrice: 10,
    zones: [1]
  },
  chain_mail: {
    name: 'Chain Mail',
    description: 'Interlocking metal rings for protection.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 8,
    baseHP: 30,
    requiredLevel: 1,
    sellPrice: 20,
    zones: [1]
  },
  
  // Zone 2 armor
  reinforced_leather: {
    name: 'Reinforced Leather',
    description: 'Leather reinforced with metal plates.',
    type: 'armor',
    classRestriction: ['warrior', 'rogue'],
    baseDEF: 12,
    baseHP: 40,
    requiredLevel: 10,
    sellPrice: 60,
    zones: [2]
  },
  mage_robe: {
    name: 'Mage Robe',
    description: 'A robe imbued with magical protection.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 5,
    baseMP: 50,
    requiredLevel: 10,
    sellPrice: 55,
    zones: [2]
  },
  iron_plate: {
    name: 'Iron Plate',
    description: 'Heavy iron armor for maximum protection.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 18,
    baseHP: 60,
    requiredLevel: 10,
    sellPrice: 70,
    zones: [2]
  },
  
  // Zone 3 armor
  wolf_pelt_armor: {
    name: 'Wolf Pelt Armor',
    description: 'Armor made from dire wolf pelts.',
    type: 'armor',
    classRestriction: ['warrior', 'rogue'],
    baseDEF: 20,
    baseHP: 70,
    baseSPD: 3,
    requiredLevel: 20,
    sellPrice: 150,
    zones: [3]
  },
  shadow_cloak: {
    name: 'Shadow Cloak',
    description: 'A cloak that blends with shadows.',
    type: 'armor',
    classRestriction: ['mage', 'rogue'],
    baseDEF: 10,
    baseMP: 70,
    baseSPD: 5,
    requiredLevel: 20,
    sellPrice: 160,
    zones: [3]
  },
  steel_plate: {
    name: 'Steel Plate',
    description: 'Heavy steel armor for maximum defense.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 28,
    baseHP: 100,
    requiredLevel: 20,
    sellPrice: 180,
    zones: [3]
  },
  
  // Zone 4 armor
  orc_plate: {
    name: 'Orc Plate',
    description: 'Heavy armor used by orc warriors.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 35,
    baseHP: 120,
    requiredLevel: 30,
    sellPrice: 280,
    zones: [4]
  },
  shaman_robes: {
    name: 'Shaman Robes',
    description: 'Robes imbued with primal magic.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 15,
    baseMP: 100,
    requiredLevel: 30,
    sellPrice: 260,
    zones: [4]
  },
  scout_leather: {
    name: 'Scout Leather',
    description: 'Light leather armor for mobility.',
    type: 'armor',
    classRestriction: ['rogue'],
    baseDEF: 18,
    baseHP: 50,
    baseSPD: 8,
    requiredLevel: 30,
    sellPrice: 250,
    zones: [4]
  },
  
  // Zone 5 armor
  dragon_scale_armor: {
    name: 'Dragon Scale Armor',
    description: 'Armor crafted from dragon scales.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 50,
    baseHP: 180,
    requiredLevel: 40,
    sellPrice: 500,
    zones: [5]
  },
  fire_dragon_robe: {
    name: 'Fire Dragon Robe',
    description: 'A robe infused with dragon fire.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 22,
    baseMP: 150,
    requiredLevel: 40,
    sellPrice: 480,
    zones: [5]
  },
  wyvern_leather: {
    name: 'Wyvern Leather',
    description: 'Light armor from wyvern hide.',
    type: 'armor',
    classRestriction: ['rogue'],
    baseDEF: 28,
    baseHP: 80,
    baseSPD: 12,
    requiredLevel: 40,
    sellPrice: 520,
    zones: [5]
  },
  
  // Zone 6 armor
  demon_plate: {
    name: 'Demon Plate',
    description: 'Armor forged in the fires of hell.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 70,
    baseHP: 250,
    requiredLevel: 50,
    sellPrice: 850,
    zones: [6]
  },
  void_robe: {
    name: 'Void Robe',
    description: 'A robe woven from void energy.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 30,
    baseMP: 200,
    requiredLevel: 50,
    sellPrice: 800,
    zones: [6]
  },
  shadow_plate: {
    name: 'Shadow Plate',
    description: 'Armor that seems to absorb light.',
    type: 'armor',
    classRestriction: ['rogue'],
    baseDEF: 38,
    baseHP: 120,
    baseSPD: 18,
    requiredLevel: 50,
    sellPrice: 820,
    zones: [6]
  },
  
  // Zone 7 armor
  bone_plate: {
    name: 'Bone Plate',
    description: 'Armor crafted from ancient bones.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 90,
    baseHP: 320,
    requiredLevel: 60,
    sellPrice: 1300,
    zones: [7]
  },
  lich_robe: {
    name: 'Lich Robe',
    description: 'A robe of immense necrotic power.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 40,
    baseMP: 280,
    requiredLevel: 60,
    sellPrice: 1250,
    zones: [7]
  },
  spectral_cloak: {
    name: 'Spectral Cloak',
    description: 'A cloak that phases through attacks.',
    type: 'armor',
    classRestriction: ['rogue'],
    baseDEF: 50,
    baseHP: 180,
    baseSPD: 25,
    requiredLevel: 60,
    sellPrice: 1350,
    zones: [7]
  },
  
  // Zone 8 armor
  elemental_plate: {
    name: 'Elemental Plate',
    description: 'Armor infused with elemental energy.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 110,
    baseHP: 400,
    requiredLevel: 70,
    sellPrice: 2200,
    zones: [8]
  },
  primordial_robe: {
    name: 'Primordial Robe',
    description: 'A robe of pure elemental power.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 50,
    baseMP: 350,
    requiredLevel: 70,
    sellPrice: 2100,
    zones: [8]
  },
  chaos_cloak: {
    name: 'Chaos Cloak',
    description: 'A cloak that bends reality.',
    type: 'armor',
    classRestriction: ['rogue'],
    baseDEF: 65,
    baseHP: 250,
    baseSPD: 32,
    requiredLevel: 70,
    sellPrice: 2300,
    zones: [8]
  },
  
  // Zone 9 armor
  divine_plate: {
    name: 'Divine Plate',
    description: 'Armor blessed by the heavens.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 140,
    baseHP: 500,
    requiredLevel: 80,
    sellPrice: 3500,
    zones: [9]
  },
  celestial_robe: {
    name: 'Celestial Robe',
    description: 'A robe woven from starlight.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 65,
    baseMP: 450,
    requiredLevel: 80,
    sellPrice: 3400,
    zones: [9]
  },
  angel_wing_cloak: {
    name: 'Angel Wing Cloak',
    description: 'A cloak made from angelic feathers.',
    type: 'armor',
    classRestriction: ['rogue'],
    baseDEF: 80,
    baseHP: 320,
    baseSPD: 40,
    requiredLevel: 80,
    sellPrice: 3600,
    zones: [9]
  },
  
  // Zone 10 armor
  void_armor: {
    name: 'Void Armor',
    description: 'Armor forged from the void itself.',
    type: 'armor',
    classRestriction: ['warrior', 'paladin'],
    baseDEF: 200,
    baseHP: 700,
    requiredLevel: 90,
    sellPrice: 6000,
    zones: [10]
  },
  chaos_robe: {
    name: 'Chaos Robe',
    description: 'A robe of absolute chaos and power.',
    type: 'armor',
    classRestriction: ['mage'],
    baseDEF: 90,
    baseMP: 600,
    requiredLevel: 90,
    sellPrice: 5800,
    zones: [10]
  },
  void_cloak: {
    name: 'Void Cloak',
    description: 'A cloak that exists between dimensions.',
    type: 'armor',
    classRestriction: ['rogue'],
    baseDEF: 110,
    baseHP: 450,
    baseSPD: 50,
    requiredLevel: 90,
    sellPrice: 6200,
    zones: [10]
  }
};

export const ACCESSORY_DATA = {
  // Zone 1 accessories
  wooden_ring: {
    name: 'Wooden Ring',
    description: 'A simple wooden ring.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 10,
    baseMP: 5,
    requiredLevel: 1,
    sellPrice: 8,
    zones: [1]
  },
  slippers: {
    name: 'Traveler\'s Slippers',
    description: 'Comfortable slippers for long journeys.',
    type: 'accessory',
    classRestriction: [],
    baseSPD: 2,
    requiredLevel: 1,
    sellPrice: 10,
    zones: [1]
  },
  
  // Zone 2 accessories
  goblin_amulet: {
    name: 'Goblin Amulet',
    description: 'An amulet with goblin markings.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 25,
    baseMP: 15,
    requiredLevel: 10,
    sellPrice: 40,
    zones: [2]
  },
  forest_boots: {
    name: 'Forest Boots',
    description: 'Boots designed for silent movement.',
    type: 'accessory',
    classRestriction: [],
    baseSPD: 5,
    requiredLevel: 10,
    sellPrice: 45,
    zones: [2]
  },
  
  // Zone 3 accessories
  wolf_fang_necklace: {
    name: 'Wolf Fang Necklace',
    description: 'A necklace made from wolf fangs.',
    type: 'accessory',
    classRestriction: [],
    baseATK: 8,
    baseSPD: 3,
    requiredLevel: 20,
    sellPrice: 100,
    zones: [3]
  },
  shadow_ring: {
    name: 'Shadow Ring',
    description: 'A ring that enhances stealth.',
    type: 'accessory',
    classRestriction: ['rogue'],
    baseSPD: 8,
    requiredLevel: 20,
    sellPrice: 110,
    zones: [3]
  },
  
  // Zone 4 accessories
  orc_talisman: {
    name: 'Orc Talisman',
    description: 'A talisman imbued with orcish power.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 60,
    baseATK: 12,
    requiredLevel: 30,
    sellPrice: 220,
    zones: [4]
  },
  war_drums: {
    name: 'War Drums',
    description: 'Drums that boost morale.',
    type: 'accessory',
    classRestriction: ['warrior'],
    baseATK: 15,
    requiredLevel: 30,
    sellPrice: 240,
    zones: [4]
  },
  
  // Zone 5 accessories
  dragon_heart_pendant: {
    name: 'Dragon Heart Pendant',
    description: 'A pendant containing a dragon heart fragment.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 100,
    baseATK: 20,
    requiredLevel: 40,
    sellPrice: 450,
    zones: [5]
  },
  fire_resist_ring: {
    name: 'Fire Resist Ring',
    description: 'A ring that grants fire resistance.',
    type: 'accessory',
    classRestriction: [],
    baseDEF: 15,
    requiredLevel: 40,
    sellPrice: 420,
    zones: [5]
  },
  
  // Zone 6 accessories
  demon_amulet: {
    name: 'Demon Amulet',
    description: 'An amulet that channels demonic energy.',
    type: 'accessory',
    classRestriction: [],
    baseMP: 80,
    baseATK: 25,
    requiredLevel: 50,
    sellPrice: 750,
    zones: [6]
  },
  soul_ring: {
    name: 'Soul Ring',
    description: 'A ring that steals souls.',
    type: 'accessory',
    classRestriction: ['rogue'],
    baseATK: 30,
    baseSPD: 10,
    requiredLevel: 50,
    sellPrice: 780,
    zones: [6]
  },
  
  // Zone 7 accessories
  bone_amulet: {
    name: 'Bone Amulet',
    description: 'An amulet made from ancient bones.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 150,
    baseDEF: 20,
    requiredLevel: 60,
    sellPrice: 1100,
    zones: [7]
  },
  lich_ring: {
    name: 'Lich Ring',
    description: 'A ring of immense necrotic power.',
    type: 'accessory',
    classRestriction: ['mage'],
    baseMP: 120,
    baseATK: 35,
    requiredLevel: 60,
    sellPrice: 1150,
    zones: [7]
  },
  
  // Zone 8 accessories
  elemental_core: {
    name: 'Elemental Core',
    description: 'A core of pure elemental energy.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 200,
    baseMP: 100,
    baseATK: 40,
    requiredLevel: 70,
    sellPrice: 2000,
    zones: [8]
  },
  chaos_orb: {
    name: 'Chaos Orb',
    description: 'An orb that bends reality.',
    type: 'accessory',
    classRestriction: [],
    baseSPD: 20,
    baseATK: 45,
    requiredLevel: 70,
    sellPrice: 2100,
    zones: [8]
  },
  
  // Zone 9 accessories
  divine_pendant: {
    name: 'Divine Pendant',
    description: 'A pendant blessed by the heavens.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 300,
    baseMP: 150,
    baseDEF: 25,
    requiredLevel: 80,
    sellPrice: 3200,
    zones: [9]
  },
  angel_ring: {
    name: 'Angel Ring',
    description: 'A ring made from angelic feathers.',
    type: 'accessory',
    classRestriction: [],
    baseATK: 55,
    baseSPD: 15,
    requiredLevel: 80,
    sellPrice: 3300,
    zones: [9]
  },
  
  // Zone 10 accessories
  void_core: {
    name: 'Void Core',
    description: 'A core of absolute void energy.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 500,
    baseMP: 250,
    baseATK: 70,
    requiredLevel: 90,
    sellPrice: 5500,
    zones: [10]
  },
  chaos_crown: {
    name: 'Chaos Crown',
    description: 'A crown of absolute chaos and power.',
    type: 'accessory',
    classRestriction: [],
    baseHP: 400,
    baseATK: 80,
    baseDEF: 30,
    requiredLevel: 90,
    sellPrice: 6000,
    zones: [10]
  }
};

// ============================================================
// CONSUMABLE DATA - Potions and other items
// ============================================================

export const CONSUMABLE_DATA = {
  health_potion: {
    name: 'Health Potion',
    description: 'Restores 100 HP.',
    type: 'consumable',
    effect: 'heal',
    effectValue: 100,
    sellPrice: 20,
    zones: [1, 2, 3, 4, 5]
  },
  mana_potion: {
    name: 'Mana Potion',
    description: 'Restores 80 MP.',
    type: 'consumable',
    effect: 'restoreMP',
    effectValue: 80,
    sellPrice: 25,
    zones: [1, 2, 3, 4, 5]
  },
  greater_health_potion: {
    name: 'Greater Health Potion',
    description: 'Restores 300 HP.',
    type: 'consumable',
    effect: 'heal',
    effectValue: 300,
    sellPrice: 100,
    zones: [6, 7, 8]
  },
  greater_mana_potion: {
    name: 'Greater Mana Potion',
    description: 'Restores 250 MP.',
    type: 'consumable',
    effect: 'restoreMP',
    effectValue: 250,
    sellPrice: 120,
    zones: [6, 7, 8]
  },
  supreme_health_potion: {
    name: 'Supreme Health Potion',
    description: 'Restores 1000 HP.',
    type: 'consumable',
    effect: 'heal',
    effectValue: 1000,
    sellPrice: 500,
    zones: [9, 10]
  },
  supreme_mana_potion: {
    name: 'Supreme Mana Potion',
    description: 'Restores 800 MP.',
    type: 'consumable',
    effect: 'restoreMP',
    effectValue: 800,
    sellPrice: 550,
    zones: [9, 10]
  },
  slime_jelly: {
    name: 'Slime Jelly',
    description: 'Sticky jelly that can be used in crafting.',
    type: 'material',
    sellPrice: 5,
    zones: [1]
  },
  spider_silk: {
    name: 'Spider Silk',
    description: 'Strong silk from giant spiders.',
    type: 'material',
    sellPrice: 15,
    zones: [2]
  },
  wolf_pelt: {
    name: 'Wolf Pelt',
    description: 'A thick wolf pelt.',
    type: 'material',
    sellPrice: 30,
    zones: [3]
  },
  dragon_scale: {
    name: 'Dragon Scale',
    description: 'A scale from an ancient dragon.',
    type: 'material',
    sellPrice: 200,
    zones: [5]
  },
  demon_essence: {
    name: 'Demon Essence',
    description: 'Essence extracted from demons.',
    type: 'material',
    sellPrice: 350,
    zones: [6]
  },
  bone_dust: {
    name: 'Bone Dust',
    description: 'Dust from ancient bones.',
    type: 'material',
    sellPrice: 500,
    zones: [7]
  }
};

// ============================================================
// CRAFTING RECIPES
// ============================================================

export const CRAFTING_RECIPES = {
  // Weapon recipes
  goblin_sword_recipe: {
    name: 'Goblin Sword',
    result: 'goblin_sword',
    materials: [
      { item: 'goblin_dagger', quantity: 3 },
      { item: 'slime_jelly', quantity: 5 }
    ],
    goldCost: 100,
    requiredLevel: 5
  },
  
  // Armor recipes
  reinforced_leather_recipe: {
    name: 'Reinforced Leather',
    result: 'reinforced_leather',
    materials: [
      { item: 'leather_armor', quantity: 2 },
      { item: 'spider_silk', quantity: 3 }
    ],
    goldCost: 150,
    requiredLevel: 8
  }
};

// ============================================================
// GAME CONSTANTS
// ============================================================

export const GAME_CONSTANTS = {
  MAX_INVENTORY_SIZE: 100,
  MAX_PARTY_SIZE: 4,
  DAILY_QUEST_LIMIT: 10,
  PVP_DAILY_LIMIT: 20,
  BASE_CRIT_CHANCE: 0.05, // 5%
  BASE_DODGE_CHANCE: 0.03, // 3%
  GOLD_PER_MONSTER_BASE: 10,
  EXP_PER_MONSTER_BASE: 25,
  MAX_LOGOUT_TIME: 24 * 60 * 60, // 24 hours in seconds
  MAX_OFFLINE_REWARDS: 12 * 60 * 60, // 12 hours max
  OFFLINE_EXP_RATE: 0.5, // 50% of online EXP
  OFFLINE_GOLD_RATE: 0.5 // 50% of online Gold
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getMonsterForZone(zone, levelRange) {
  const zoneMonsters = ZONE_DATA[zone]?.monsters || [];
  return zoneMonsters.map(monsterId => MONSTER_DATA[monsterId]).filter(Boolean);
}

export function getItemsForZone(zone) {
  const allItems = {};
  
  Object.entries(WEAPON_DATA).forEach(([id, item]) => {
    if (item.zones.includes(zone)) allItems[id] = item;
  });
  
  Object.entries(ARMOR_DATA).forEach(([id, item]) => {
    if (item.zones.includes(zone)) allItems[id] = item;
  });
  
  Object.entries(ACCESSORY_DATA).forEach(([id, item]) => {
    if (item.zones.includes(zone)) allItems[id] = item;
  });
  
  Object.entries(CONSUMABLE_DATA).forEach(([id, item]) => {
    if (item.zones && item.zones.includes(zone)) allItems[id] = item;
  });
  
  return allItems;
}

export function calculateItemStats(item, rarity, upgradeLevel = 0) {
  const rarityMultiplier = RARITY_TABLE[rarity]?.multiplier || 1.0;
  const stats = {};
  
  ['ATK', 'DEF', 'HP', 'MP', 'SPD'].forEach(stat => {
    if (item[`base${stat}`]) {
      const base = item[`base${stat}`];
      const rarityBonus = base * (rarityMultiplier - 1);
      const upgradeBonus = FORGE_DATA.statBonusPerLevel[item.type]?.[stat] || 0;
      stats[stat] = Math.floor(base + rarityBonus + (upgradeBonus * upgradeLevel));
    }
  });
  
  return stats;
}

// Export all data
export default {
  CLASS_STATS,
  LEVEL_TABLE,
  STAT_GROWTH,
  RARITY_TABLE,
  ZONE_DATA,
  MONSTER_DATA,
  FORGE_DATA,
  SKILL_DATA,
  WEAPON_DATA,
  ARMOR_DATA,
  ACCESSORY_DATA,
  CONSUMABLE_DATA,
  CRAFTING_RECIPES,
  GAME_CONSTANTS,
  getRandomRarity,
  getMonsterForZone,
  getItemsForZone,
  calculateItemStats
};
