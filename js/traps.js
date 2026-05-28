import { MAP_W, MAP_H, TILES } from './config.js';
import { randInt, shuffle, manhattan } from './utils.js';

function isWalkableTile(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const t = map[y][x];
  return t === TILES.FLOOR || t === TILES.DOOR || t === TILES.STAIRS;
}

export const TRAP_TYPES = {
  spike: {
    id: 'spike',
    name: 'Шипы',
    hidden: false,
    color: '#cc4444',
    baseDamage: 8,
  },
  arrow: {
    id: 'arrow',
    name: 'Стрела',
    hidden: true,
    color: '#aaaaaa',
    baseDamage: 6,
  },
  poison: {
    id: 'poison',
    name: 'Яд',
    hidden: true,
    color: '#44ff44',
    baseDamage: 4,
    poisonTicks: 3,
  },
  fire: {
    id: 'fire',
    name: 'Огонь',
    hidden: false,
    color: '#ff8800',
    baseDamage: 10,
  },
  teleport: {
    id: 'teleport',
    name: 'Телепорт',
    hidden: true,
    color: '#aa44ff',
    baseDamage: 0,
  },
  slow: {
    id: 'slow',
    name: 'Сеть',
    hidden: true,
    color: '#4488ff',
    baseDamage: 2,
    slowTicks: 2,
  },
};

const TRAP_IDS = Object.keys(TRAP_TYPES);

function pickWeightedTrapId(weights = null) {
  if (!weights) return TRAP_IDS[randInt(0, TRAP_IDS.length - 1)];
  const entries = TRAP_IDS.map((id) => ({ id, w: Math.max(0.01, weights[id] ?? 1) }));
  const total = entries.reduce((sum, e) => sum + e.w, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.w;
    if (roll <= 0) return entry.id;
  }
  return entries[entries.length - 1].id;
}

export function spawnTraps(dungeon, floor, occupied = new Set()) {
  const { map, spawn, stairs } = dungeon;
  const tiles = [];
  const trapFactor = dungeon?.biome?.trapFactor ?? 1;
  const trapWeights = dungeon?.biome?.trapWeights ?? null;
  const hiddenTrapBonus = dungeon?.biome?.hiddenTrapBonus ?? 0;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!isWalkableTile(map, x, y)) continue;
      const k = `${x},${y}`;
      if (occupied.has(k)) continue;
      if (x === spawn.x && y === spawn.y) continue;
      if (x === stairs.x && y === stairs.y) continue;
      tiles.push({ x, y });
    }
  }

  const baseCount = Math.min(3 + floor, 10, Math.floor(tiles.length / 10));
  const count = Math.max(1, Math.floor(baseCount * trapFactor));
  const pool = shuffle(tiles);
  const traps = [];

  for (let i = 0; i < count && pool.length; i++) {
    const pos = pool.pop();
    const typeId = pickWeightedTrapId(trapWeights);
    const type = TRAP_TYPES[typeId];
    const hiddenChance = Math.min(0.95, Math.max(0.05, (type.hidden ? 1 : 0) + hiddenTrapBonus));
    const hidden = Math.random() < hiddenChance;
    traps.push({
      id: `t-${i}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      type: typeId,
      hidden,
      triggered: false,
      disarmed: false,
      revealed: !hidden,
    });
  }

  return traps;
}

export function getTrapAt(traps, x, y) {
  return traps.find((t) => t.x === x && t.y === y && !t.triggered && !t.disarmed) ?? null;
}

export function revealTrapsForThief(traps, visible) {
  for (const trap of traps) {
    if (!trap.disarmed && !trap.triggered && visible.has(`${trap.x},${trap.y}`)) {
      trap.revealed = true;
    }
  }
}

export function getDisarmableTrap(traps, hx, hy, maxDist = 1) {
  return traps
    .filter((t) => !t.disarmed && !t.triggered && t.revealed
      && manhattan(hx, hy, t.x, t.y) <= maxDist)
    .sort((a, b) => manhattan(hx, hy, a.x, a.y) - manhattan(hx, hy, b.x, b.y))[0] ?? null;
}

export function disarmTrap(trap) {
  trap.disarmed = true;
  trap.revealed = true;
  const type = TRAP_TYPES[trap.type];
  return {
    message: `Обезврежена ловушка: ${type.name}`,
    particleColor: '#44ff88',
  };
}

function pickTeleportTarget(map, hero, traps) {
  const options = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!isWalkableTile(map, x, y)) continue;
      if (x === hero.x && y === hero.y) continue;
      if (traps.some((t) => !t.triggered && !t.disarmed && t.x === x && t.y === y)) continue;
      options.push({ x, y });
    }
  }
  if (!options.length) return null;
  return options[randInt(0, options.length - 1)];
}

export function triggerTrap(trap, hero, map, traps) {
  const type = TRAP_TYPES[trap.type];
  trap.triggered = true;
  trap.revealed = true;

  const floor = hero.floor;
  const biomeDamageMult = hero?.currentBiome?.trapDamageMult ?? 1;
  const damage = Math.max(0, Math.floor((type.baseDamage + Math.floor(floor * 1.5)) * biomeDamageMult));
  const result = {
    message: '',
    damage: 0,
    particleColor: type.color,
    teleported: false,
  };

  switch (trap.type) {
    case 'spike':
      result.damage = damage;
      result.message = `Ловушка: ${type.name}! −${damage} HP`;
      break;
    case 'arrow':
      result.damage = damage + randInt(0, 3);
      result.message = `Из стены летит стрела! −${result.damage} HP`;
      break;
    case 'poison':
      result.damage = damage;
      {
        const resist = Math.min(0.9, hero.poisonResistPct ?? 0);
        const ticks = Math.max(1, Math.ceil((type.poisonTicks ?? 3) * (1 - resist)));
        hero.poison = (hero.poison ?? 0) + ticks;
      }
      result.message = `Ядовитый газ! −${damage} HP, отравление`;
      break;
    case 'fire':
      result.damage = damage + randInt(0, 4);
      result.message = `Огненная ловушка! −${result.damage} HP`;
      break;
    case 'teleport': {
      const dest = pickTeleportTarget(map, hero, traps);
      if (dest) {
        hero.x = dest.x;
        hero.y = dest.y;
        result.teleported = true;
        result.message = 'Магическая ловушка! Телепорт...';
      } else {
        result.message = 'Магическая ловушка сработала!';
      }
      break;
    }
    case 'slow':
      result.damage = damage;
      hero.slowed = (hero.slowed ?? 0) + (type.slowTicks ?? 2);
      result.message = `Сеть! −${damage} HP, движение замедлено`;
      break;
    default:
      result.message = 'Ловушка!';
  }

  if (result.damage > 0) {
    hero.hp -= result.damage;
  }

  return result;
}

export function tickPoison(hero) {
  if (!hero.poison || hero.poison <= 0) return null;
  hero.poison -= 1;
  const resist = Math.min(0.85, hero.poisonResistPct ?? 0);
  const dmg = Math.max(1, Math.ceil(3 * (1 - resist)));
  hero.hp -= dmg;
  return { damage: dmg, remaining: hero.poison };
}
