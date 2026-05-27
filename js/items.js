import { randInt, shuffle } from './utils.js';
import { getProfession, canHeroEquipWeapon, canHeroEquipArmor } from './classes.js';
import { applyLuckLootWeights, luckGoldBonus } from './luck.js';
import { collectLegacyGrave } from './legacy.js';
import { resolveWeaponSpriteId, resolveArmorSpriteId } from './sprites.js';
import { getStrengthAtkBonus, getEnduranceHpBonus } from './attributes.js';
import {
  buildWeapon,
  buildArmor,
  getItemRarity,
  getEquipSellValue,
  rarityPriorityBonus,
} from './rarity.js';
import { learnSkill, getSkillDef } from './skills.js';

export const POTIONS = {
  potion_small: { id: 'potion_small', name: 'Малое зелье', heal: 15, color: '#66cc66' },
  potion: { id: 'potion', name: 'Зелье', heal: 30, color: '#44ff88' },
  potion_large: { id: 'potion_large', name: 'Большое зелье', heal: 55, color: '#00ffaa' },
};

export const MANA_POTIONS = {
  mana_potion: { id: 'mana_potion', name: 'Флакон маны', restore: 14, color: '#4488ff' },
  mana_potion_large: {
    id: 'mana_potion_large',
    name: 'Большой флакон маны',
    restore: 28,
    color: '#66aaff',
  },
};

export const WEAPONS = [
  { id: 'dagger', name: 'Кинжал', atk: 1, color: '#aaaaaa' },
  { id: 'sword', name: 'Меч', atk: 2, color: '#cccccc' },
  { id: 'axe', name: 'Топор', atk: 3, color: '#888888' },
  { id: 'mace', name: 'Булава', atk: 3, color: '#666666' },
  { id: 'bow', name: 'Лук', atk: 2, color: '#66aa44' },
  { id: 'staff', name: 'Посох', atk: 4, color: '#8844ff' },
];

export const ARMORS = [
  { id: 'leather', name: 'Кожаная броня', def: 1, hp: 0, color: '#886633' },
  { id: 'chain', name: 'Кольчуга', def: 2, hp: 5, color: '#888899' },
  { id: 'plate', name: 'Латы', def: 3, hp: 10, color: '#aaaacc' },
  { id: 'robe', name: 'Мантия мага', def: 1, hp: 0, atk: 1, color: '#6644aa' },
  { id: 'hide', name: 'Шкурка', def: 1, hp: 3, color: '#775533' },
];

const LOOT_TABLE = [
  { type: 'gold', weight: 28 },
  { type: 'potion_small', weight: 14 },
  { type: 'potion', weight: 12 },
  { type: 'potion_large', weight: 6 },
  { type: 'mana_potion', weight: 8 },
  { type: 'mana_potion_large', weight: 4 },
  { type: 'weapon', weight: 18 },
  { type: 'armor', weight: 16 },
];

function pickLootType(luck = 5) {
  const table = applyLuckLootWeights(LOOT_TABLE, luck);
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'gold';
}

function pickWeaponBase(floor) {
  const pool = [...WEAPONS];
  const minIdx = Math.min(Math.floor(floor / 2), pool.length - 1);
  return pool[randInt(minIdx, pool.length - 1)];
}

function pickArmorBase(floor) {
  const pool = [...ARMORS];
  const minIdx = Math.min(Math.floor(floor / 2), pool.length - 1);
  return pool[randInt(minIdx, pool.length - 1)];
}

export function createLootItem(pos, floor, index, luck = 5) {
  const kind = pickLootType(luck);

  if (kind === 'gold') {
    return {
      id: `i-${index}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      type: 'gold',
      value: randInt(3, 8) + floor * 2 + Math.floor(luck * 0.4),
      collected: false,
    };
  }

  if (kind.startsWith('potion')) {
    const potion = POTIONS[kind];
    return {
      id: `i-${index}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      type: kind,
      name: potion.name,
      heal: potion.heal + Math.floor(floor * 2),
      color: potion.color,
      collected: false,
    };
  }

  if (kind.startsWith('mana_potion')) {
    const manaPotion = MANA_POTIONS[kind];
    return {
      id: `i-${index}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      type: kind,
      name: manaPotion.name,
      restore: manaPotion.restore + Math.floor(floor * 2),
      color: manaPotion.color,
      collected: false,
    };
  }

  if (kind === 'weapon') {
    const weapon = buildWeapon(pickWeaponBase(floor), floor, luck);
    return {
      id: `i-${index}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      type: 'weapon',
      spriteId: weapon.spriteId,
      name: weapon.name,
      atk: weapon.atk,
      color: weapon.color,
      rarity: weapon.rarity,
      collected: false,
    };
  }

  const armor = buildArmor(pickArmorBase(floor), floor, luck);
  return {
    id: `i-${index}-${Date.now()}`,
    x: pos.x,
    y: pos.y,
    type: 'armor',
    spriteId: armor.spriteId,
    name: armor.name,
    def: armor.def,
    hp: armor.hp ?? 0,
    atk: armor.atk ?? 0,
    color: armor.color,
    rarity: armor.rarity,
    collected: false,
  };
}

export function spawnHealers(dungeon, floor, occupied = new Set()) {
  const { rooms, spawn, stairs } = dungeon;
  if (rooms.length < 2) return [];

  const candidates = shuffle(
    rooms.filter((r) => r.cx !== spawn.x || r.cy !== spawn.y)
  ).slice(0, 1 + Math.floor(floor / 3));

  const healers = [];
  for (const room of candidates) {
    const x = room.cx + randInt(-1, 1);
    const y = room.cy + randInt(-1, 1);
    const k = `${x},${y}`;
    if (occupied.has(k)) continue;
    if (x === stairs.x && y === stairs.y) continue;
    healers.push({
      id: `h-${healers.length}-${Date.now()}`,
      x,
      y,
      used: false,
      healPct: 0.5 + Math.min(floor * 0.05, 0.3),
    });
  }
  return healers;
}

export function getTotalAtk(hero) {
  return (
    hero.atk
    + (hero.weapon?.atk ?? 0)
    + (hero.armor?.atk ?? 0)
    + (hero.bonusAtk ?? 0)
    + (hero.bonusMagic ?? 0)
    + getStrengthAtkBonus(hero)
  );
}

export function getTotalDef(hero) {
  return hero.def + (hero.armor?.def ?? 0) + (hero.bonusDef ?? 0);
}

export function recalcMaxHp(hero) {
  const bonus = hero.armor?.hp ?? 0;
  const prevMax = hero.maxHp;
  hero.maxHp = hero.baseMaxHp + bonus + (hero.bonusHp ?? 0) + getEnduranceHpBonus(hero);
  if (hero.maxHp > prevMax) {
    hero.hp += hero.maxHp - prevMax;
  }
  hero.hp = Math.min(hero.hp, hero.maxHp);
}

function equipWeapon(hero, weapon) {
  if (!canHeroEquipWeapon(hero, weapon)) return false;

  hero.weapon = {
    name: weapon.name,
    atk: weapon.atk,
    color: weapon.color,
    spriteId: weapon.spriteId ?? resolveWeaponSpriteId(weapon.name),
    rarity: getItemRarity(weapon),
  };
  return true;
}

function equipArmor(hero, armor) {
  if (!canHeroEquipArmor(hero, armor)) return false;

  hero.armor = {
    name: armor.name,
    def: armor.def,
    hp: armor.hp ?? 0,
    atk: armor.atk ?? 0,
    color: armor.color,
    spriteId: armor.spriteId ?? resolveArmorSpriteId(armor.name),
    rarity: getItemRarity(armor),
  };
  recalcMaxHp(hero);
  return true;
}

function weaponScore(w) {
  return w?.atk ?? 0;
}

function armorScore(a) {
  if (!a) return 0;
  return (a.def ?? 0) * 2 + (a.hp ?? 0) + (a.atk ?? 0);
}

export function getHealFlaskCount(hero) {
  return hero.healFlasks?.length ?? 0;
}

export function getManaFlaskCount(hero) {
  return hero.manaFlasks?.length ?? 0;
}

export function useHealFlask(hero) {
  if (!hero.healFlasks?.length) return null;

  const power = hero.healFlasks.shift();
  const hadPoison = hero.poison > 0;
  const healed = Math.min(power, hero.maxHp - hero.hp);
  hero.hp += healed;
  if (hadPoison) hero.poison = 0;

  return {
    healed,
    cured: hadPoison,
    remaining: hero.healFlasks.length,
  };
}

export function useManaFlask(hero) {
  if (!hero.maxMana || !hero.manaFlasks?.length) return null;

  const power = hero.manaFlasks.shift();
  const restored = Math.min(power, hero.maxMana - hero.mana);
  hero.mana += restored;

  return {
    restored,
    remaining: hero.manaFlasks.length,
  };
}

export function ensureHeroMana(hero, cost) {
  if (!hero.maxMana) return true;

  while (hero.mana < cost && hero.manaFlasks?.length) {
    useManaFlask(hero);
  }

  if (hero.mana < cost) return false;
  hero.mana -= cost;
  return true;
}

export function purchaseFromMerchant(hero, item) {
  if (item.sold || hero.gold < item.price) return null;

  hero.gold -= item.price;
  item.sold = true;

  if (item.type.startsWith('potion')) {
    hero.healFlasks.push(item.heal);
    return {
      type: 'heal_flask',
      name: item.name,
      count: hero.healFlasks.length,
      price: item.price,
    };
  }

  if (item.type.startsWith('mana_potion')) {
    hero.manaFlasks.push(item.restore);
    return {
      type: 'mana_flask',
      name: item.name,
      count: hero.manaFlasks.length,
      price: item.price,
    };
  }

  if (item.type === 'weapon') {
    if (!canHeroEquipWeapon(hero, item)) return null;

    if (equipWeapon(hero, item)) {
      return {
        type: 'weapon',
        name: item.name,
        atk: item.atk,
        rarity: getItemRarity(item),
        price: item.price,
        equipped: true,
      };
    }
    return null;
  }

  if (item.type === 'armor') {
    if (!canHeroEquipArmor(hero, item)) return null;

    if (equipArmor(hero, item)) {
      return {
        type: 'armor',
        name: item.name,
        def: item.def,
        rarity: getItemRarity(item),
        price: item.price,
        equipped: true,
      };
    }
    return null;
  }

  return null;
}

export function collectItem(hero, item) {
  if (item.collected) return null;
  if (item.type === 'grave') {
    return collectLegacyGrave(hero, item);
  }
  item.collected = true;
  const prof = getProfession(hero.profession);

  if (item.type === 'gold') {
    const bonus = prof.goldBonus ? Math.floor(item.value * prof.goldBonus) : 0;
    const luckBonus = luckGoldBonus(hero, item.value);
    const skillBonus = Math.floor((item.value + bonus) * (hero.bonusGoldPct ?? 0));
    const total = item.value + bonus + luckBonus + skillBonus;
    hero.gold += total;
    return { type: 'gold', value: total, bonus, luckBonus, skillBonus };
  }

  if (item.type.startsWith('potion')) {
    hero.healFlasks.push(item.heal);
    return {
      type: 'heal_flask',
      name: item.name,
      count: hero.healFlasks.length,
    };
  }

  if (item.type.startsWith('mana_potion')) {
    hero.manaFlasks.push(item.restore);
    return {
      type: 'mana_flask',
      name: item.name,
      count: hero.manaFlasks.length,
    };
  }

  if (item.type === 'locked_key') {
    return {
      type: 'locked_key',
      name: item.name,
      unlockDoor: item.unlockDoor,
    };
  }

  if (item.type === 'locked_skill') {
    const learned = learnSkill(hero, item.skillId);
    const def = getSkillDef(item.skillId);
    return {
      type: 'locked_skill',
      name: def?.name ?? item.name,
      level: learned?.level ?? 1,
    };
  }

  if (item.type === 'weapon') {
    if (!canHeroEquipWeapon(hero, item)) {
      hero.gold += getEquipSellValue(item);
      return {
        type: 'weapon',
        name: item.name,
        atk: item.atk,
        rarity: getItemRarity(item),
        equipped: false,
        unusable: true,
      };
    }

    const newW = {
      name: item.name,
      atk: item.atk,
      color: item.color,
      spriteId: item.spriteId,
      rarity: getItemRarity(item),
    };
    if (weaponScore(newW) > weaponScore(hero.weapon)) {
      equipWeapon(hero, newW);
      return {
        type: 'weapon',
        name: item.name,
        atk: item.atk,
        rarity: getItemRarity(item),
        equipped: true,
      };
    }
    hero.gold += getEquipSellValue(item);
    return {
      type: 'weapon',
      name: item.name,
      atk: item.atk,
      rarity: getItemRarity(item),
      equipped: false,
    };
  }

  if (item.type === 'armor') {
    if (!canHeroEquipArmor(hero, item)) {
      hero.gold += getEquipSellValue(item);
      return {
        type: 'armor',
        name: item.name,
        def: item.def,
        rarity: getItemRarity(item),
        equipped: false,
        unusable: true,
      };
    }

    const newA = {
      name: item.name,
      def: item.def,
      hp: item.hp ?? 0,
      atk: item.atk ?? 0,
      color: item.color,
      spriteId: item.spriteId,
      rarity: getItemRarity(item),
    };
    if (armorScore(newA) > armorScore(hero.armor)) {
      equipArmor(hero, newA);
      return {
        type: 'armor',
        name: item.name,
        def: item.def,
        rarity: getItemRarity(item),
        equipped: true,
      };
    }
    hero.gold += getEquipSellValue(item);
    return {
      type: 'armor',
      name: item.name,
      def: item.def,
      rarity: getItemRarity(item),
      equipped: false,
    };
  }

  return null;
}

export function useHealer(healer, hero) {
  if (healer.used) return null;
  healer.used = true;
  const hadPoison = hero.poison > 0;
  const amount = Math.floor(hero.maxHp * healer.healPct);
  const healed = Math.min(amount, hero.maxHp - hero.hp);
  hero.hp += healed;
  if (hadPoison) hero.poison = 0;
  return { healed, full: hero.hp >= hero.maxHp, curedPoison: hadPoison };
}

export function isHealingItem(item) {
  return item.type.startsWith('potion');
}

export function isManaItem(item) {
  return item.type.startsWith('mana_potion');
}

export function itemPriority(item, hero) {
  if (item.type === 'grave') return 1000;
  if (isManaItem(item) && hero.maxMana) {
    const missing = hero.maxMana - hero.mana;
    if (missing <= 0) return 1;
    return item.restore / missing;
  }
  if (isHealingItem(item)) {
    const missing = hero.maxHp - hero.hp;
    if (missing <= 0) return 0;
    return item.heal / missing;
  }
  if (item.type === 'weapon') {
    if (!canHeroEquipWeapon(hero, item)) return 0;
    const gain = item.atk - (hero.weapon?.atk ?? 0);
    const bonus = rarityPriorityBonus(item);
    return gain > 0 ? gain * 10 + bonus : 1 + bonus * 0.1;
  }
  if (item.type === 'armor') {
    if (!canHeroEquipArmor(hero, item)) return 0;
    const cur = armorScore(hero.armor);
    const next = armorScore(item);
    const bonus = rarityPriorityBonus(item);
    return next > cur ? (next - cur) * 8 + bonus : 1 + bonus * 0.1;
  }
  return 5;
}
