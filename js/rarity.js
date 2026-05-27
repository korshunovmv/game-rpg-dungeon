export const RARITIES = {
  common: {
    id: 'common',
    name: 'Обычный',
    color: '#aaaaaa',
    glow: null,
    statBonus: 0,
    sellMult: 1,
  },
  uncommon: {
    id: 'uncommon',
    name: 'Необычный',
    color: '#44cc66',
    glow: '#55ee77',
    statBonus: 1,
    sellMult: 1.6,
  },
  rare: {
    id: 'rare',
    name: 'Редкий',
    color: '#4488ff',
    glow: '#66aaff',
    statBonus: 2,
    sellMult: 2.5,
  },
  epic: {
    id: 'epic',
    name: 'Эпический',
    color: '#aa55ff',
    glow: '#cc77ff',
    statBonus: 3,
    sellMult: 4,
  },
  legendary: {
    id: 'legendary',
    name: 'Легендарный',
    color: '#ffaa22',
    glow: '#ffcc44',
    statBonus: 5,
    sellMult: 7,
  },
};

export const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_PREFIX = {
  uncommon: 'Улучшенный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
};

const RARITY_PRIORITY = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function getRarityDef(rarity = 'common') {
  return RARITIES[rarity] ?? RARITIES.common;
}

export function getItemRarity(item) {
  if (item?.rarity && RARITIES[item.rarity]) return item.rarity;
  if (item?.rare) return 'rare';
  return 'common';
}

export function rollRarity(floor = 1, luck = 5, options = {}) {
  const minRarity = options.minRarity ?? 'common';
  const minIdx = Math.max(0, RARITY_TIERS.indexOf(minRarity));

  const weights = {
    common: Math.max(4, 54 - floor * 2 - luck * 0.5),
    uncommon: 24 + floor * 0.9 + luck * 0.25,
    rare: 13 + floor * 1.1 + luck * 0.45,
    epic: 5 + floor * 0.55 + luck * 0.2,
    legendary: 1 + floor * 0.2 + luck * 0.12,
  };

  const tiers = RARITY_TIERS.filter((_, idx) => idx >= minIdx);
  const total = tiers.reduce((sum, tier) => sum + weights[tier], 0);
  let roll = Math.random() * total;

  for (const tier of tiers) {
    roll -= weights[tier];
    if (roll <= 0) return tier;
  }

  return minRarity;
}

export function formatEquipName(baseName, rarity = 'common') {
  const prefix = RARITY_PREFIX[rarity];
  if (!prefix) return baseName;

  const lower = baseName.toLowerCase();
  if (Object.values(RARITY_PREFIX).some((p) => lower.startsWith(p.toLowerCase()))) {
    return baseName;
  }

  const name = baseName.charAt(0).toLowerCase() + baseName.slice(1);
  return `${prefix} ${name}`;
}

export function buildWeapon(base, floor, luck = 5, options = {}) {
  const rarity = options.rarity ?? rollRarity(floor, luck, options);
  const def = getRarityDef(rarity);
  const weapon = {
    ...base,
    atk: base.atk + def.statBonus,
    rarity,
    spriteId: base.id,
  };

  if (floor > 3) weapon.atk += Math.floor(floor / 4);
  if (floor > 7 && RARITY_PRIORITY[rarity] >= RARITY_PRIORITY.rare) {
    weapon.atk += 1;
  }

  weapon.name = formatEquipName(base.name, rarity);
  weapon.color = RARITY_PRIORITY[rarity] >= RARITY_PRIORITY.rare
    ? def.color
    : base.color;

  return weapon;
}

export function buildArmor(base, floor, luck = 5, options = {}) {
  const rarity = options.rarity ?? rollRarity(floor, luck, options);
  const def = getRarityDef(rarity);
  const armor = {
    ...base,
    def: base.def + def.statBonus,
    hp: (base.hp ?? 0) + Math.floor(def.statBonus / 2),
    atk: base.atk ?? 0,
    rarity,
    spriteId: base.id,
  };

  if (floor > 4) armor.def += 1;
  if (floor > 6 && RARITY_PRIORITY[rarity] >= RARITY_PRIORITY.uncommon) {
    armor.hp += 2;
  }
  if (RARITY_PRIORITY[rarity] >= RARITY_PRIORITY.epic) {
    armor.atk += 1;
  }

  armor.name = formatEquipName(base.name, rarity);
  armor.color = RARITY_PRIORITY[rarity] >= RARITY_PRIORITY.rare
    ? def.color
    : base.color;

  return armor;
}

export function describeRarity(rarity = 'common') {
  const def = getRarityDef(rarity);
  return def.name;
}

export function formatRarityLabel(rarity = 'common') {
  if (rarity === 'common') return '';
  return `[${describeRarity(rarity)}] `;
}

export function getEquipSellValue(item) {
  const rarity = getItemRarity(item);
  const def = getRarityDef(rarity);
  const base = item.type === 'weapon' || item.atk != null
    ? 2 + (item.atk ?? 0)
    : 3 + (item.def ?? 0) + Math.floor((item.hp ?? 0) / 2);
  return Math.floor(base * def.sellMult);
}

export function rarityPriorityBonus(item) {
  const rarity = getItemRarity(item);
  return RARITY_PRIORITY[rarity] * 12;
}

export function hasRarityGlow(rarity = 'common') {
  return RARITY_PRIORITY[rarity] >= RARITY_PRIORITY.uncommon;
}
