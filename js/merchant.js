import { randInt, shuffle } from './utils.js';
import { POTIONS, WEAPONS, ARMORS } from './items.js';

const MERCHANT_NAMES = ['Странник', 'Купец', 'Бродячий торговец'];
const SPAWN_CHANCE = 0.32;

function scaleWeapon(floor) {
  const pool = [...WEAPONS];
  const minIdx = Math.min(Math.floor(floor / 2), pool.length - 1);
  const w = { ...pool[randInt(minIdx, pool.length - 1)] };
  if (floor > 3) w.atk += Math.floor(floor / 4);
  return w;
}

function scaleArmor(floor) {
  const pool = [...ARMORS];
  const minIdx = Math.min(Math.floor(floor / 2), pool.length - 1);
  const a = { ...pool[randInt(minIdx, pool.length - 1)] };
  if (floor > 4) a.def += 1;
  return a;
}

function weaponScore(w) {
  return w?.atk ?? 0;
}

function armorScore(a) {
  if (!a) return 0;
  return (a.def ?? 0) * 2 + (a.hp ?? 0) + (a.atk ?? 0);
}

export function generateMerchantStock(floor) {
  const stock = [];
  const potionKeys = ['potion_small', 'potion', 'potion_large'];
  const pk = potionKeys[Math.min(Math.floor(floor / 2), potionKeys.length - 1)];
  const potion = POTIONS[pk];

  stock.push({
    id: `s-p-${Date.now()}`,
    type: pk,
    name: potion.name,
    heal: potion.heal + Math.floor(floor * 2),
    color: potion.color,
    price: 8 + Math.floor(floor * 3),
    sold: false,
  });

  const weapon = scaleWeapon(floor);
  stock.push({
    id: `s-w-${Date.now()}`,
    type: 'weapon',
    name: weapon.name,
    atk: weapon.atk,
    color: weapon.color,
    price: 12 + weapon.atk * 8 + floor * 4,
    sold: false,
  });

  const armor = scaleArmor(floor);
  stock.push({
    id: `s-a-${Date.now()}`,
    type: 'armor',
    name: armor.name,
    def: armor.def,
    hp: armor.hp ?? 0,
    atk: armor.atk ?? 0,
    color: armor.color,
    price: 15 + armor.def * 10 + (armor.hp ?? 0) * 2 + floor * 4,
    sold: false,
  });

  if (Math.random() < 0.5) {
    const extra = Math.random() < 0.5 ? scaleWeapon(floor + 1) : scaleArmor(floor + 1);
    if (extra.atk !== undefined) {
      stock.push({
        id: `s-w2-${Date.now()}`,
        type: 'weapon',
        name: extra.name,
        atk: extra.atk,
        color: extra.color,
        price: 18 + extra.atk * 9 + floor * 5,
        sold: false,
      });
    } else {
      stock.push({
        id: `s-a2-${Date.now()}`,
        type: 'armor',
        name: extra.name,
        def: extra.def,
        hp: extra.hp ?? 0,
        atk: extra.atk ?? 0,
        color: extra.color,
        price: 20 + extra.def * 11 + floor * 5,
        sold: false,
      });
    }
  }

  return stock;
}

export function spawnMerchant(dungeon, floor, occupied = new Set()) {
  if (Math.random() > SPAWN_CHANCE) return null;

  const { rooms, spawn, stairs } = dungeon;
  if (rooms.length < 2) return null;

  const candidates = shuffle(
    rooms.filter((r) => r.cx !== spawn.x || r.cy !== spawn.y)
  );

  for (const room of candidates) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = room.cx + randInt(-2, 2);
      const y = room.cy + randInt(-2, 2);
      const k = `${x},${y}`;
      if (occupied.has(k)) continue;
      if (x === stairs.x && y === stairs.y) continue;
      if (x === spawn.x && y === spawn.y) continue;

      return {
        id: `merchant-${Date.now()}`,
        x,
        y,
        name: MERCHANT_NAMES[randInt(0, MERCHANT_NAMES.length - 1)],
        stock: generateMerchantStock(floor),
      };
    }
  }

  return null;
}

export function shopItemScore(item, hero) {
  if (item.sold || hero.gold < item.price) return 0;

  if (item.type.startsWith('potion')) {
    const missing = hero.maxHp - hero.hp;
    if (missing < 8) return 0;
    return (item.heal / item.price) * (hero.hp / hero.maxHp < 0.6 ? 2 : 1);
  }

  if (item.type === 'weapon') {
    const gain = item.atk - weaponScore(hero.weapon);
    if (gain <= 0) return 0;
    return (gain * 12) / item.price;
  }

  if (item.type === 'armor') {
    const gain = armorScore(item) - armorScore(hero.armor);
    if (gain <= 0) return 0;
    return (gain * 10) / item.price;
  }

  return 0;
}

export function hasWorthwhilePurchase(hero, merchant) {
  if (!merchant) return false;
  return merchant.stock.some((item) => shopItemScore(item, hero) > 0.05);
}

export function pickBestPurchase(hero, merchant) {
  if (!merchant) return null;
  const sorted = merchant.stock
    .map((item) => ({ item, score: shopItemScore(item, hero) }))
    .filter((e) => e.score > 0.05)
    .sort((a, b) => b.score - a.score);
  return sorted[0]?.item ?? null;
}

export function merchantHasStock(merchant) {
  return merchant?.stock.some((i) => !i.sold) ?? false;
}
