import { randInt, shuffle } from './utils.js';
import { getProfession } from './classes.js';

export const POTIONS = {
  potion_small: { id: 'potion_small', name: 'Малое зелье', heal: 15, color: '#66cc66' },
  potion: { id: 'potion', name: 'Зелье', heal: 30, color: '#44ff88' },
  potion_large: { id: 'potion_large', name: 'Большое зелье', heal: 55, color: '#00ffaa' },
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
  { type: 'weapon', weight: 18 },
  { type: 'armor', weight: 16 },
];

function pickLootType() {
  const total = LOOT_TABLE.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of LOOT_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'gold';
}

function scaleWeapon(floor) {
  const pool = [...WEAPONS];
  const minIdx = Math.min(Math.floor(floor / 2), pool.length - 1);
  const idx = randInt(minIdx, pool.length - 1);
  const w = { ...pool[idx] };
  if (floor > 3) w.atk += Math.floor(floor / 4);
  return w;
}

function scaleArmor(floor) {
  const pool = [...ARMORS];
  const minIdx = Math.min(Math.floor(floor / 2), pool.length - 1);
  const idx = randInt(minIdx, pool.length - 1);
  const a = { ...pool[idx] };
  if (floor > 4) a.def += 1;
  return a;
}

export function createLootItem(pos, floor, index) {
  const kind = pickLootType();

  if (kind === 'gold') {
    return {
      id: `i-${index}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      type: 'gold',
      value: randInt(3, 8) + floor * 2,
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

  if (kind === 'weapon') {
    const weapon = scaleWeapon(floor);
    return {
      id: `i-${index}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      type: 'weapon',
      name: weapon.name,
      atk: weapon.atk,
      color: weapon.color,
      collected: false,
    };
  }

  const armor = scaleArmor(floor);
  return {
    id: `i-${index}-${Date.now()}`,
    x: pos.x,
    y: pos.y,
    type: 'armor',
    name: armor.name,
    def: armor.def,
    hp: armor.hp ?? 0,
    atk: armor.atk ?? 0,
    color: armor.color,
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
  return hero.atk + (hero.weapon?.atk ?? 0) + (hero.armor?.atk ?? 0);
}

export function getTotalDef(hero) {
  return hero.def + (hero.armor?.def ?? 0);
}

export function recalcMaxHp(hero) {
  const bonus = hero.armor?.hp ?? 0;
  const prevMax = hero.maxHp;
  hero.maxHp = hero.baseMaxHp + bonus;
  if (hero.maxHp > prevMax) {
    hero.hp += hero.maxHp - prevMax;
  }
  hero.hp = Math.min(hero.hp, hero.maxHp);
}

function equipWeapon(hero, weapon) {
  hero.weapon = { name: weapon.name, atk: weapon.atk, color: weapon.color };
}

function equipArmor(hero, armor) {
  hero.armor = {
    name: armor.name,
    def: armor.def,
    hp: armor.hp ?? 0,
    atk: armor.atk ?? 0,
    color: armor.color,
  };
  recalcMaxHp(hero);
}

function weaponScore(w) {
  return w?.atk ?? 0;
}

function armorScore(a) {
  if (!a) return 0;
  return (a.def ?? 0) * 2 + (a.hp ?? 0) + (a.atk ?? 0);
}

export function collectItem(hero, item) {
  if (item.collected) return null;
  item.collected = true;
  const prof = getProfession(hero.profession);

  if (item.type === 'gold') {
    const bonus = prof.goldBonus ? Math.floor(item.value * prof.goldBonus) : 0;
    const total = item.value + bonus;
    hero.gold += total;
    return { type: 'gold', value: total, bonus };
  }

  if (item.type.startsWith('potion')) {
    const hadPoison = hero.poison > 0;
    const healed = Math.min(item.heal, hero.maxHp - hero.hp);
    hero.hp += healed;
    if (hadPoison) hero.poison = 0;
    return { type: 'heal', name: item.name, value: healed, cured: hadPoison };
  }

  if (item.type === 'weapon') {
    const newW = { name: item.name, atk: item.atk, color: item.color };
    if (weaponScore(newW) > weaponScore(hero.weapon)) {
      equipWeapon(hero, newW);
      return { type: 'weapon', name: item.name, atk: item.atk, equipped: true };
    }
    hero.gold += 2 + item.atk;
    return { type: 'weapon', name: item.name, atk: item.atk, equipped: false };
  }

  if (item.type === 'armor') {
    const newA = {
      name: item.name,
      def: item.def,
      hp: item.hp ?? 0,
      atk: item.atk ?? 0,
      color: item.color,
    };
    if (armorScore(newA) > armorScore(hero.armor)) {
      equipArmor(hero, newA);
      return {
        type: 'armor',
        name: item.name,
        def: item.def,
        equipped: true,
      };
    }
    hero.gold += 3 + item.def;
    return { type: 'armor', name: item.name, def: item.def, equipped: false };
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

export function itemPriority(item, hero) {
  if (isHealingItem(item)) {
    const missing = hero.maxHp - hero.hp;
    if (missing <= 0) return 0;
    return item.heal / missing;
  }
  if (item.type === 'weapon') {
    const gain = item.atk - (hero.weapon?.atk ?? 0);
    return gain > 0 ? gain * 10 : 1;
  }
  if (item.type === 'armor') {
    const cur = armorScore(hero.armor);
    const next = armorScore(item);
    return next > cur ? (next - cur) * 8 : 1;
  }
  return 5;
}
