import { randInt, shuffle, manhattan } from './utils.js';
import { isWalkable } from './dungeon.js';
import { WEAPONS, ARMORS, POTIONS, ELIXIRS, SCROLLS, collectItem } from './items.js';
import { canHeroEquipWeapon, canHeroEquipArmor } from './classes.js';
import { buildWeapon, buildArmor, rarityPriorityBonus } from './rarity.js';

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

  if (roll < 0.56) {
    const list = Object.values(ELIXIRS);
    const elixir = list[randInt(0, list.length - 1)];
    return {
      type: elixir.id,
      name: elixir.name,
      stat: elixir.stat,
      statLabel: elixir.statLabel,
      amount: elixir.amount + Math.floor(floor / 7),
      turns: elixir.turns + floor * 2,
      color: elixir.color,
      rare: true,
    };
  }

  if (roll < 0.68) {
    const list = Object.values(SCROLLS);
    const scroll = list[randInt(0, list.length - 1)];
    return {
      type: scroll.id,
      name: scroll.name,
      effect: scroll.effect,
      heal: scroll.heal,
      restore: scroll.restore,
      damage: scroll.damage,
      radius: scroll.radius,
      slow: scroll.slow,
      shield: scroll.shield,
      turns: scroll.turns,
      color: scroll.color,
      rare: true,
    };
  }

  if (roll < 0.73) {
    const base = WEAPONS[randInt(
      Math.min(Math.floor(floor / 2) + 1, WEAPONS.length - 1),
      WEAPONS.length - 1
    )];
    return { type: 'weapon', ...buildWeapon(base, floor, luck, { minRarity: 'rare' }) };
  }

  const base = ARMORS[randInt(
    Math.min(Math.floor(floor / 2) + 1, ARMORS.length - 1),
    ARMORS.length - 1
  )];
  return { type: 'armor', ...buildArmor(base, floor, luck, { minRarity: 'rare' }) };
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
  if (loot.type.startsWith('mana_potion')) return loot.name;
  if (loot.type.startsWith('elixir_')) {
    if (loot.statLabel && loot.amount != null) {
      return `${loot.name} (+${loot.amount} ${loot.statLabel})`;
    }
    if (loot.effectLabel === 'сопротивление яду') {
      return `${loot.name} (${Math.round((loot.resistPct ?? 0) * 100)}% к яду)`;
    }
    if (loot.effectLabel === 'шанс уклонения') {
      return `${loot.name} (+${Math.round((loot.dodgePct ?? 0) * 100)}% уклонения)`;
    }
    if (loot.effectLabel === 'бонус золота') {
      return `${loot.name} (+${Math.round((loot.goldPct ?? 0) * 100)}% золота)`;
    }
    return loot.name;
  }
  if (loot.type.startsWith('scroll_')) {
    return loot.name;
  }
  if (loot.type === 'weapon') return `${loot.name} (+${loot.atk} ATK)`;
  if (loot.type === 'armor') {
    const hpNote = loot.hp ? `, +${loot.hp} HP` : '';
    return `${loot.name} (+${loot.def} DEF${hpNote})`;
  }
  return loot.name ?? 'сокровище';
}

export function spawnChests(dungeon, floor, occupied = new Set(), luck = 5) {
  const { rooms, spawn, stairs, map } = dungeon;
  const mimicChance = dungeon?.biome?.mimicChance ?? MIMIC_CHANCE;
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

      const isMimic = Math.random() < mimicChance;
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
    if (!canHeroEquipWeapon(hero, loot)) return 700;
    const gain = loot.atk - (hero.weapon?.atk ?? 0);
    return 920 + (gain > 0 ? gain * 12 : 0) + rarityPriorityBonus(loot);
  }
  if (loot.type === 'armor') {
    if (!canHeroEquipArmor(hero, loot)) return 700;
    const cur = (hero.armor?.def ?? 0) * 2 + (hero.armor?.hp ?? 0);
    const next = loot.def * 2 + (loot.hp ?? 0);
    return 910 + (next > cur ? (next - cur) * 10 : 0) + rarityPriorityBonus(loot);
  }
  if (loot.type.startsWith('potion')) {
    const missing = hero.maxHp - hero.hp;
    return missing > 0 ? 880 + loot.heal / missing : 700;
  }
  if (loot.type.startsWith('mana_potion')) {
    if (!hero.maxMana) return 700;
    const missing = hero.maxMana - hero.mana;
    return missing > 0 ? 870 + loot.restore / missing : 680;
  }
  if (loot.type.startsWith('elixir_')) {
    if (loot.effect === 'poison_resist') return 890;
    if (loot.effect === 'evasion') return 885;
    if (loot.effect === 'gold_bonus') return 875;
    if (loot.effect === 'haste') return 880;
    return 875 + loot.amount * 2;
  }
  if (loot.type.startsWith('scroll_')) {
    if (loot.effect === 'heal') return 892;
    if (loot.effect === 'barrier') return 889;
    if (loot.effect === 'fireburst') return 886;
    if (loot.effect === 'frostnova') return 884;
    if (loot.effect === 'mana') return 872;
    return 875;
  }
  return 860;
}

export function isUnopenedChest(chest) {
  return chest && !chest.opened;
}
