import { randInt, shuffle } from './utils.js';
import { POTIONS, WEAPONS, ARMORS, MANA_POTIONS } from './items.js';
import { luckMerchantChance } from './luck.js';
import { canHeroEquipWeapon, canHeroEquipArmor } from './classes.js';
import { buildWeapon, buildArmor, getRarityDef, getItemRarity } from './rarity.js';

const MERCHANT_NAMES = ['Странник', 'Купец', 'Бродячий торговец'];
const SPAWN_CHANCE = 0.32;

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

function weaponPrice(weapon, floor) {
  const rarityMult = getRarityDef(getItemRarity(weapon)).sellMult;
  return Math.floor((12 + weapon.atk * 8 + floor * 4) * rarityMult);
}

function armorPrice(armor, floor) {
  const rarityMult = getRarityDef(getItemRarity(armor)).sellMult;
  return Math.floor((15 + armor.def * 10 + (armor.hp ?? 0) * 2 + floor * 4) * rarityMult);
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

  const manaPotion = MANA_POTIONS.mana_potion;
  stock.push({
    id: `s-m-${Date.now()}`,
    type: 'mana_potion',
    name: manaPotion.name,
    restore: manaPotion.restore + Math.floor(floor * 2),
    color: manaPotion.color,
    price: 10 + Math.floor(floor * 3),
    sold: false,
  });

  const weapon = buildWeapon(pickWeaponBase(floor), floor, 5, { minRarity: 'uncommon' });
  stock.push({
    id: `s-w-${Date.now()}`,
    type: 'weapon',
    spriteId: weapon.spriteId,
    name: weapon.name,
    atk: weapon.atk,
    color: weapon.color,
    rarity: weapon.rarity,
    price: weaponPrice(weapon, floor),
    sold: false,
  });

  const armor = buildArmor(pickArmorBase(floor), floor, 5, { minRarity: 'uncommon' });
  stock.push({
    id: `s-a-${Date.now()}`,
    type: 'armor',
    spriteId: armor.spriteId,
    name: armor.name,
    def: armor.def,
    hp: armor.hp ?? 0,
    atk: armor.atk ?? 0,
    color: armor.color,
    rarity: armor.rarity,
    price: armorPrice(armor, floor),
    sold: false,
  });

  if (Math.random() < 0.5) {
    const extraWeapon = Math.random() < 0.5;
    if (extraWeapon) {
      const extra = buildWeapon(pickWeaponBase(floor + 1), floor + 1, 6);
      stock.push({
        id: `s-w2-${Date.now()}`,
        type: 'weapon',
        spriteId: extra.spriteId,
        name: extra.name,
        atk: extra.atk,
        color: extra.color,
        rarity: extra.rarity,
        price: weaponPrice(extra, floor + 1),
        sold: false,
      });
    } else {
      const extra = buildArmor(pickArmorBase(floor + 1), floor + 1, 6);
      stock.push({
        id: `s-a2-${Date.now()}`,
        type: 'armor',
        spriteId: extra.spriteId,
        name: extra.name,
        def: extra.def,
        hp: extra.hp ?? 0,
        atk: extra.atk ?? 0,
        color: extra.color,
        rarity: extra.rarity,
        price: armorPrice(extra, floor + 1),
        sold: false,
      });
    }
  }

  return stock;
}

export function spawnMerchant(dungeon, floor, occupied = new Set(), luck = 5) {
  if (Math.random() > luckMerchantChance(SPAWN_CHANCE, luck)) return null;

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

  if (item.type.startsWith('mana_potion')) {
    if (!hero.maxMana) return 0;
    const missing = hero.maxMana - hero.mana;
    if (missing < 4) return 0;
    return (item.restore / item.price) * (hero.mana / hero.maxMana < 0.5 ? 2 : 1);
  }

  if (item.type === 'weapon') {
    if (!canHeroEquipWeapon(hero, item)) return 0;
    const gain = item.atk - weaponScore(hero.weapon);
    if (gain <= 0) return 0;
    return (gain * 12) / item.price;
  }

  if (item.type === 'armor') {
    if (!canHeroEquipArmor(hero, item)) return 0;
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
