import { randInt, shuffle, manhattan } from './utils.js';
import { isWalkable } from './dungeon.js';
import { WEAPONS, ARMORS, POTIONS, collectItem } from './items.js';

const MIMIC_CHANCE = 0.28;

function createRareChestLoot(floor, luck = 5) {
  const roll = Math.random();

  if (roll < 0.26) {
    return {
      type: 'gold',
      value: 15 + floor * 10 + Math.floor(luck * 1.5),
      rare: true,
    };
  }

  if (roll < 0.46) {
    const potion = POTIONS.potion_large;
    return {
      type: 'potion_large',
      name: potion.name,
      heal: potion.heal + Math.floor(floor * 3) + 10,
      color: potion.color,
      rare: true,
    };
  }

  if (roll < 0.73) {
    const minIdx = Math.min(Math.floor(floor / 2) + 1, WEAPONS.length - 1);
    const weapon = { ...WEAPONS[randInt(minIdx, WEAPONS.length - 1)] };
    weapon.atk += 1 + Math.floor(floor / 4);
    weapon.name = `Редкий ${weapon.name.toLowerCase()}`;
    return {
      type: 'weapon',
      spriteId: weapon.id,
      name: weapon.name,
      atk: weapon.atk,
      color: weapon.color ?? '#ffd700',
      rare: true,
    };
  }

  const minIdx = Math.min(Math.floor(floor / 2) + 1, ARMORS.length - 1);
  const armor = { ...ARMORS[randInt(minIdx, ARMORS.length - 1)] };
  armor.def += 1 + Math.floor(floor / 6);
  armor.hp = (armor.hp ?? 0) + 3 + Math.floor(floor / 3);
  armor.name = `Редкая ${armor.name.toLowerCase()}`;
  return {
    type: 'armor',
    spriteId: armor.id,
    name: armor.name,
    def: armor.def,
    hp: armor.hp ?? 0,
    atk: armor.atk ?? 0,
    color: armor.color ?? '#aaaacc',
    rare: true,
  };
}

export function createMimic(floor, pos) {
  const hp = Math.floor((14 + floor * 5 + randInt(2, 10)) * 1.15);
  const atk = Math.floor((3 + floor + randInt(1, 4)) * 1.25);

  return {
    id: `mimic-${Date.now()}-${randInt(0, 9999)}`,
    x: pos.x,
    y: pos.y,
    name: 'мимик',
    baseName: 'мимик',
    hp,
    maxHp: hp,
    atk,
    xp: 10 + floor * 5,
    alive: true,
    isMimic: true,
    color: '#cc6644',
  };
}

export function describeChestLoot(loot) {
  if (!loot) return 'пусто';
  if (loot.type === 'gold') return `${loot.value} золота`;
  if (loot.type.startsWith('potion')) return loot.name;
  if (loot.type === 'weapon') return `${loot.name} (+${loot.atk} ATK)`;
  if (loot.type === 'armor') return `${loot.name} (+${loot.def} DEF)`;
  return loot.name ?? 'сокровище';
}

export function spawnChests(dungeon, floor, occupied = new Set(), luck = 5) {
  const { rooms, spawn, stairs, map } = dungeon;
  if (rooms.length < 2) return [];

  const candidates = shuffle(
    rooms.filter(
      (room) =>
        (room.cx !== spawn.x || room.cy !== spawn.y)
        && manhattan(room.cx, room.cy, stairs.x, stairs.y) > 4
    )
  );

  const maxCount = Math.min(1 + Math.floor(floor / 2), candidates.length, 3);
  const chests = [];

  for (let i = 0; i < maxCount; i++) {
    const room = candidates[i];
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = room.cx + randInt(-2, 2);
      const y = room.cy + randInt(-2, 2);
      const k = `${x},${y}`;
      if (occupied.has(k)) continue;
      if (x === stairs.x && y === stairs.y) continue;
      if (!isWalkable(map, x, y)) continue;

      const isMimic = Math.random() < MIMIC_CHANCE;
      const chest = {
        id: `chest-${chests.length}-${Date.now()}`,
        x,
        y,
        opened: false,
        isMimic,
        rare: true,
      };

      if (isMimic) {
        chest.monster = createMimic(floor, { x, y });
      } else {
        chest.loot = createRareChestLoot(floor, luck);
      }

      chests.push(chest);
      occupied.add(k);
      break;
    }
  }

  return chests;
}

export function openChestLoot(hero, chest) {
  if (!chest.loot) return null;
  const item = {
    ...chest.loot,
    x: chest.x,
    y: chest.y,
    collected: false,
  };
  return collectItem(hero, item);
}

export function chestPriority(chest, hero) {
  if (chest.opened) return 0;
  if (!chest.loot) return 900;

  const loot = chest.loot;
  if (loot.type === 'weapon') {
    const gain = loot.atk - (hero.weapon?.atk ?? 0);
    return 920 + (gain > 0 ? gain * 12 : 0);
  }
  if (loot.type === 'armor') {
    const cur = (hero.armor?.def ?? 0) * 2 + (hero.armor?.hp ?? 0);
    const next = loot.def * 2 + (loot.hp ?? 0);
    return 910 + (next > cur ? (next - cur) * 10 : 0);
  }
  if (loot.type.startsWith('potion')) {
    const missing = hero.maxHp - hero.hp;
    return missing > 0 ? 880 + loot.heal / missing : 700;
  }
  return 860;
}

export function isUnopenedChest(chest) {
  return chest && !chest.opened;
}
