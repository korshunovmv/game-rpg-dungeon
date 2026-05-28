import { MAP_W, MAP_H, TILES } from './config.js';
import { randInt, shuffle, createSeededRng } from './utils.js';
import { spawnTraps } from './traps.js';
import { createLootItem, spawnHealers } from './items.js';
import { spawnMerchant } from './merchant.js';
import { isBossFloor, createBoss, findBossPosition } from './bosses.js';
import { getLuck } from './luck.js';
import { spawnLegendaryMonsters } from './nemesis.js';
import { createMonster } from './monsters.js';
import { spawnChests } from './chests.js';
import { SKILL_DEFS } from './skills.js';

function createEmpty(w, h, fill = TILES.VOID) {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function createRoomTypeMap(rooms) {
  const roomTypeMap = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(null));
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (roomTypeMap[y]?.[x] != null) continue;
        roomTypeMap[y][x] = room.type;
      }
    }
  }
  return roomTypeMap;
}

const ROOM_TYPES = [
  'library',
  'dining',
  'bedroom',
  'hall',
  'cave',
  'forest',
  'glade',
];

const ROOM_TYPE_LABELS = {
  library: 'библиотека',
  dining: 'столовая',
  bedroom: 'спальня',
  hall: 'зал',
  cave: 'пещера',
  forest: 'лес',
  glade: 'поляна',
};

const ROOM_SIZE_RULES = {
  library: { w: [6, 10], h: [5, 8] },
  dining: { w: [7, 11], h: [5, 8] },
  bedroom: { w: [4, 7], h: [4, 6] },
  hall: { w: [8, 12], h: [6, 9] },
  cave: { w: [6, 11], h: [5, 9] },
  forest: { w: [6, 11], h: [6, 10] },
  glade: { w: [7, 12], h: [7, 11] },
};

const BIOMES = [
  {
    id: 'ruins',
    name: 'Руины',
    label: 'древние руины',
    themeId: 'catacombs',
    layoutProfile: { overlapPad: 1, sizeBias: 0, corridorMode: 'mix', extraLinks: [1, 2], wideChance: 0.08 },
    roomAttemptsBonus: 1,
    roomPool: ['library', 'hall', 'dining', 'bedroom'],
    monsterFactor: 1.0,
    itemFactor: 1.0,
    trapFactor: 1.0,
    healerFactor: 1.0,
    chestFactor: 1.0,
    merchantLuckDelta: 0,
    mimicChance: 0.26,
    trapDamageMult: 1.0,
    hiddenTrapBonus: 0,
    trapWeights: { spike: 1.1, arrow: 1.0, poison: 0.9, fire: 0.8, teleport: 0.9, slow: 1.0 },
  },
  {
    id: 'wild',
    name: 'Дикие заросли',
    label: 'заросшие катакомбы',
    themeId: 'mossy',
    layoutProfile: { overlapPad: 0, sizeBias: 1, corridorMode: 'dogleg', extraLinks: [2, 4], wideChance: 0.2 },
    roomAttemptsBonus: 3,
    roomPool: ['forest', 'glade', 'cave', 'hall'],
    monsterFactor: 1.08,
    itemFactor: 1.0,
    trapFactor: 1.18,
    healerFactor: 0.9,
    chestFactor: 1.12,
    merchantLuckDelta: -1,
    mimicChance: 0.36,
    trapDamageMult: 1.05,
    hiddenTrapBonus: 0.12,
    trapWeights: { spike: 0.9, arrow: 1.0, poison: 1.45, fire: 0.7, teleport: 1.15, slow: 1.3 },
  },
  {
    id: 'frozen',
    name: 'Мерзлый склеп',
    label: 'ледяные глубины',
    themeId: 'ice',
    layoutProfile: { overlapPad: 2, sizeBias: 0, corridorMode: 'vh', extraLinks: [0, 1], wideChance: 0.05 },
    roomAttemptsBonus: -1,
    roomPool: ['hall', 'bedroom', 'library', 'glade'],
    monsterFactor: 0.95,
    itemFactor: 1.08,
    trapFactor: 0.85,
    healerFactor: 1.15,
    chestFactor: 1.0,
    merchantLuckDelta: 1,
    mimicChance: 0.18,
    trapDamageMult: 0.92,
    hiddenTrapBonus: -0.08,
    trapWeights: { spike: 0.9, arrow: 1.0, poison: 0.8, fire: 0.45, teleport: 0.95, slow: 1.6 },
  },
  {
    id: 'inferno',
    name: 'Пылающие недра',
    label: 'раскаленные недра',
    themeId: 'lava',
    layoutProfile: { overlapPad: 1, sizeBias: 2, corridorMode: 'hv', extraLinks: [2, 3], wideChance: 0.15 },
    roomAttemptsBonus: 0,
    roomPool: ['cave', 'hall', 'dining'],
    monsterFactor: 1.15,
    itemFactor: 0.95,
    trapFactor: 1.32,
    healerFactor: 0.75,
    chestFactor: 1.05,
    merchantLuckDelta: -2,
    mimicChance: 0.24,
    trapDamageMult: 1.18,
    hiddenTrapBonus: -0.05,
    trapWeights: { spike: 1.25, arrow: 0.9, poison: 0.7, fire: 1.75, teleport: 0.85, slow: 0.8 },
  },
  {
    id: 'abyssal',
    name: 'Бездна',
    label: 'теневая бездна',
    themeId: 'abyss',
    layoutProfile: { overlapPad: 1, sizeBias: 1, corridorMode: 'mix', extraLinks: [3, 5], wideChance: 0.12 },
    roomAttemptsBonus: 2,
    roomPool: ['cave', 'library', 'hall', 'forest'],
    monsterFactor: 1.1,
    itemFactor: 1.12,
    trapFactor: 1.05,
    healerFactor: 0.85,
    chestFactor: 1.2,
    merchantLuckDelta: 0,
    mimicChance: 0.34,
    trapDamageMult: 1.08,
    hiddenTrapBonus: 0.1,
    trapWeights: { spike: 0.95, arrow: 1.15, poison: 1.25, fire: 0.85, teleport: 1.45, slow: 1.1 },
  },
];

function setTileSafe(map, x, y, tile) {
  if (!map[y] || map[y][x] == null) return;
  map[y][x] = tile;
}

function carveCenterPlaza(map, room, radius = 2) {
  for (let y = room.cy - radius; y <= room.cy + radius; y++) {
    for (let x = room.cx - radius; x <= room.cx + radius; x++) {
      if (!isInsideRoom(room, x, y)) continue;
      setTileSafe(map, x, y, TILES.FLOOR);
    }
  }
}

function carveRoomStyle(map, room) {
  const seed = room.styleSeed ?? 0;
  const seededHash = (x, y, salt = 0) => {
    const v = (((x + 17) * 73856093) ^ ((y + 31) * 19349663) ^ seed ^ salt) >>> 0;
    return v;
  };
  switch (room.type) {
    case 'library': {
      const rowOffset = seed & 1;
      for (let y = room.y + 1 + rowOffset; y < room.y + room.h - 1; y += 2) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (Math.abs(x - room.cx) <= 1) continue;
          setTileSafe(map, x, y, TILES.WALL);
        }
      }
      break;
    }
    case 'dining': {
      const tableW = Math.max(3, room.w - 4);
      const tx = room.cx - Math.floor(tableW / 2);
      const ty = room.cy;
      for (let x = tx; x < tx + tableW; x++) {
        setTileSafe(map, x, ty, TILES.WALL);
      }
      break;
    }
    case 'bedroom': {
      const beds = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.h - 2 },
      ];
      for (const b of beds) {
        if (!isInsideRoom(room, b.x, b.y)) continue;
        setTileSafe(map, b.x, b.y, TILES.WALL);
      }
      break;
    }
    case 'hall': {
      const pillars = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.h - 2 },
        { x: room.x + room.w - 2, y: room.y + room.h - 2 },
      ];
      for (const p of pillars) {
        if (Math.abs(p.x - room.cx) <= 1 && Math.abs(p.y - room.cy) <= 1) continue;
        setTileSafe(map, p.x, p.y, TILES.WALL);
      }
      break;
    }
    case 'cave': {
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (Math.abs(x - room.cx) <= 1 || Math.abs(y - room.cy) <= 1) continue;
          const hash = seededHash(x, y, 0x9e3779b9);
          if ((hash & 3) === 0) setTileSafe(map, x, y, TILES.WALL);
        }
      }
      break;
    }
    case 'forest': {
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (Math.abs(x - room.cx) <= 1 || Math.abs(y - room.cy) <= 1) continue;
          const hash = seededHash(x, y, 0x85ebca6b);
          if ((hash % 5) === 0) setTileSafe(map, x, y, TILES.WALL);
        }
      }
      break;
    }
    case 'glade': {
      for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
        if (Math.abs(x - room.cx) > 1) {
          setTileSafe(map, x, room.y + 1, TILES.WALL);
          setTileSafe(map, x, room.y + room.h - 2, TILES.WALL);
        }
      }
      for (let y = room.y + 2; y < room.y + room.h - 2; y++) {
        if (Math.abs(y - room.cy) > 1) {
          setTileSafe(map, room.x + 1, y, TILES.WALL);
          setTileSafe(map, room.x + room.w - 2, y, TILES.WALL);
        }
      }
      break;
    }
    default:
      break;
  }

  // Always keep a guaranteed walkable center for corridors and room spawns.
  carveCenterPlaza(map, room, 2);
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      map[y][x] = TILES.FLOOR;
    }
  }
  carveRoomStyle(map, room);
}

function roomsOverlap(a, b, pad = 1) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function createRoom(attempts = 80, rng = null, options = {}) {
  const { overlapPad = 1, sizeBias = 0, roomPool = ROOM_TYPES } = options;
  const ri = rng?.randInt ?? randInt;
  const rooms = [];
  for (let i = 0; i < attempts; i++) {
    const type = roomPool[ri(0, roomPool.length - 1)];
    const size = ROOM_SIZE_RULES[type];
    const maxW = Math.min(MAP_W - 4, size.w[1] + sizeBias);
    const maxH = Math.min(MAP_H - 4, size.h[1] + sizeBias);
    const w = ri(size.w[0], Math.max(size.w[0], maxW));
    const h = ri(size.h[0], Math.max(size.h[0], maxH));
    const x = ri(1, MAP_W - w - 2);
    const y = ri(1, MAP_H - h - 2);
    const room = {
      x,
      y,
      w,
      h,
      cx: Math.floor(x + w / 2),
      cy: Math.floor(y + h / 2),
      type,
      typeLabel: ROOM_TYPE_LABELS[type],
      styleSeed: ri(0, 0x7fffffff),
    };
    if (!rooms.some((r) => roomsOverlap(room, r, overlapPad))) {
      rooms.push(room);
    }
  }
  return rooms;
}

function carveCorridorTile(map, x, y, wide = false) {
  if (!map[y] || map[y][x] == null) return;
  map[y][x] = TILES.FLOOR;
  if (!wide) return;
  if (map[y + 1]?.[x] != null && map[y + 1][x] !== TILES.VOID) map[y + 1][x] = TILES.FLOOR;
  if (map[y - 1]?.[x] != null && map[y - 1][x] !== TILES.VOID) map[y - 1][x] = TILES.FLOOR;
  if (map[y]?.[x + 1] != null && map[y][x + 1] !== TILES.VOID) map[y][x + 1] = TILES.FLOOR;
  if (map[y]?.[x - 1] != null && map[y][x - 1] !== TILES.VOID) map[y][x - 1] = TILES.FLOOR;
}

function connectRooms(map, a, b, mode = 'hv', rng = null, wideChance = 0) {
  const ri = rng?.randInt ?? randInt;
  const random01 = rng?.random ?? Math.random;
  const wide = random01() < wideChance;
  let x = a.cx;
  let y = a.cy;
  const horizontalFirst = mode === 'vh' ? false : mode === 'mix' ? random01() < 0.5 : true;

  const carveHorizontal = (targetX) => {
    while (x !== targetX) {
      carveCorridorTile(map, x, y, wide);
      x += x < targetX ? 1 : -1;
    }
  };
  const carveVertical = (targetY) => {
    while (y !== targetY) {
      carveCorridorTile(map, x, y, wide);
      y += y < targetY ? 1 : -1;
    }
  };

  if (mode === 'dogleg') {
    const pivotX = ri(Math.min(a.cx, b.cx), Math.max(a.cx, b.cx));
    const pivotY = ri(Math.min(a.cy, b.cy), Math.max(a.cy, b.cy));
    carveHorizontal(pivotX);
    carveVertical(pivotY);
    carveHorizontal(b.cx);
    carveVertical(b.cy);
  } else if (horizontalFirst) {
    carveHorizontal(b.cx);
    carveVertical(b.cy);
  } else {
    carveVertical(b.cy);
    carveHorizontal(b.cx);
  }
  carveCorridorTile(map, b.cx, b.cy, wide);
}

function makeKey(x, y) {
  return `${x},${y}`;
}

function isInsideRoom(room, x, y) {
  return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
}

function corridorNeighbors(map, x, y) {
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  return dirs.filter(([dx, dy]) => map[y + dy]?.[x + dx] === TILES.FLOOR);
}

function pickLockedDoorCandidate(map, room, spawn) {
  const candidates = [];
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      if (map[y][x] !== TILES.FLOOR) continue;
      const neighbors = corridorNeighbors(map, x, y);
      if (neighbors.length !== 1) continue;

      const [dx, dy] = neighbors[0];
      const outsideX = x + dx;
      const outsideY = y + dy;
      if (isInsideRoom(room, outsideX, outsideY)) continue;

      const dist = Math.abs(spawn.x - x) + Math.abs(spawn.y - y);
      candidates.push({ x, y, dist });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.dist - a.dist);
  return candidates[0];
}

function floorTilesInRoom(map, room, blocked = new Set()) {
  const tiles = [];
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      if (map[y]?.[x] !== TILES.FLOOR) continue;
      const k = makeKey(x, y);
      if (blocked.has(k)) continue;
      tiles.push({ x, y });
    }
  }
  return tiles;
}

function pickRoomReward(floor, luck, random01, ri) {
  const roll = random01();
  if (roll < 0.34) {
    const potions = ['potion_large', 'mana_potion_large'];
    const kind = potions[ri(0, potions.length - 1)];
    if (kind === 'mana_potion_large') {
      return {
        type: 'mana_potion_large',
        name: 'Большой флакон маны',
        restore: 28 + Math.floor(floor * 2),
        color: '#66aaff',
        unique: true,
      };
    }
    return {
      type: 'potion_large',
      name: 'Большое зелье',
      heal: 55 + Math.floor(floor * 2),
      color: '#00ffaa',
      unique: true,
    };
  }

  if (roll < 0.67) {
    return {
      type: 'gold',
      value: 20 + floor * 6 + Math.floor(luck * 1.5),
      unique: true,
    };
  }

  const skillPool = Object.values(SKILL_DEFS);
  const skill = skillPool[ri(0, skillPool.length - 1)];
  return {
    type: 'locked_skill',
    skillId: skill.id,
    name: `Реликвия: ${skill.name}`,
    unique: true,
  };
}

function createLockedRoomFeature(dungeon, floor, luck = 5, rng = null) {
  const { map, rooms, spawn, stairs } = dungeon;
  if (!rooms.length || isBossFloor(floor)) return null;
  const random01 = rng?.random ?? Math.random;
  const ri = rng?.randInt ?? randInt;
  if (random01() > 0.45) return null;

  const sortedRooms = [...rooms]
    .filter((r) => !(r.cx === spawn.x && r.cy === spawn.y))
    .sort((a, b) => {
      const da = Math.abs(a.cx - spawn.x) + Math.abs(a.cy - spawn.y);
      const db = Math.abs(b.cx - spawn.x) + Math.abs(b.cy - spawn.y);
      return db - da;
    });

  let chosenRoom = null;
  let door = null;
  for (const room of sortedRooms) {
    const candidate = pickLockedDoorCandidate(map, room, spawn);
    if (!candidate) continue;
    chosenRoom = room;
    door = candidate;
    break;
  }
  if (!chosenRoom || !door) return null;

  map[door.y][door.x] = TILES.LOCKED_DOOR;
  const doorKey = makeKey(door.x, door.y);

  const blocked = new Set([doorKey, makeKey(spawn.x, spawn.y), makeKey(stairs.x, stairs.y)]);
  const keyCandidates = [];
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (map[y][x] !== TILES.FLOOR) continue;
      if (isInsideRoom(chosenRoom, x, y)) continue;
      const k = makeKey(x, y);
      if (blocked.has(k)) continue;
      keyCandidates.push({ x, y, dist: Math.abs(x - door.x) + Math.abs(y - door.y) });
    }
  }
  if (!keyCandidates.length) {
    map[door.y][door.x] = TILES.FLOOR;
    return null;
  }
  keyCandidates.sort((a, b) => b.dist - a.dist);
  const keyTile = keyCandidates[Math.min(2, keyCandidates.length - 1)];

  const rewardTiles = floorTilesInRoom(map, chosenRoom, new Set([doorKey]));
  if (!rewardTiles.length) {
    map[door.y][door.x] = TILES.FLOOR;
    return null;
  }
  const rewardTile = rewardTiles[ri(0, rewardTiles.length - 1)];

  return {
    door: { x: door.x, y: door.y },
    room: chosenRoom,
    key: {
      id: `locked-key-${floor}-${Date.now()}`,
      x: keyTile.x,
      y: keyTile.y,
      type: 'locked_key',
      name: 'Ржавый ключ',
      color: '#ffdd66',
      collected: false,
      unlockDoor: { x: door.x, y: door.y },
      unique: true,
    },
    reward: {
      id: `locked-reward-${floor}-${Date.now()}`,
      x: rewardTile.x,
      y: rewardTile.y,
      collected: false,
      ...pickRoomReward(floor, luck, random01, ri),
    },
  };
}

export function generateDungeon(floor = 1, seed = null) {
  const rng = seed != null ? createSeededRng(seed >>> 0) : null;
  const sh = rng?.shuffle ?? shuffle;
  const ri = rng?.randInt ?? randInt;
  const random01 = rng?.random ?? Math.random;
  const map = createEmpty(MAP_W, MAP_H, TILES.WALL);
  const biome = BIOMES[(Math.max(1, floor) + ri(0, BIOMES.length - 1)) % BIOMES.length];
  const profile = biome.layoutProfile;
  const roomAttempts = Math.max(6, 9 + Math.floor(floor / 2) + ri(0, 4) + (biome.roomAttemptsBonus ?? 0));
  const rooms = createRoom(roomAttempts, rng, {
    overlapPad: profile.overlapPad,
    sizeBias: profile.sizeBias,
    roomPool: biome.roomPool ?? ROOM_TYPES,
  });

  if (rooms.length === 0) {
    map[Math.floor(MAP_H / 2)][Math.floor(MAP_W / 2)] = TILES.FLOOR;
    return {
      map,
      roomTypeMap: Array.from({ length: MAP_H }, () => Array(MAP_W).fill(null)),
      spawn: { x: Math.floor(MAP_W / 2), y: Math.floor(MAP_H / 2) },
      stairs: { x: Math.floor(MAP_W / 2) + 1, y: Math.floor(MAP_H / 2) },
      rooms: [],
    };
  }

  rooms.forEach((room) => carveRoom(map, room));

  const ordered = sh(rooms);
  for (let i = 1; i < ordered.length; i++) {
    connectRooms(map, ordered[i - 1], ordered[i], profile.corridorMode, rng, profile.wideChance);
  }

  const extraLinks = ri(profile.extraLinks[0], profile.extraLinks[1]);
  for (let i = 0; i < extraLinks; i++) {
    const a = ordered[ri(0, ordered.length - 1)];
    const b = ordered[ri(0, ordered.length - 1)];
    if (!a || !b || a === b) continue;
    const mode = random01() < 0.5 ? 'mix' : 'dogleg';
    connectRooms(map, a, b, mode, rng, profile.wideChance * 0.8);
  }

  const spawnRoom = ordered[0] ?? rooms[0];
  const spawn = { x: spawnRoom.cx, y: spawnRoom.cy };
  const farRoom = rooms.reduce((best, room) => {
    const d = Math.abs(room.cx - spawn.x) + Math.abs(room.cy - spawn.y);
    const bestD = Math.abs(best.cx - spawn.x) + Math.abs(best.cy - spawn.y);
    return d > bestD ? room : best;
  }, rooms[0]);

  map[farRoom.cy][farRoom.cx] = TILES.STAIRS;

  const baseDungeon = {
    map,
    roomTypeMap: createRoomTypeMap(rooms),
    spawn,
    stairs: { x: farRoom.cx, y: farRoom.cy },
    rooms,
  };

  const lockedFeature = createLockedRoomFeature(baseDungeon, floor, 5, rng);

  return {
    map,
    roomTypeMap: baseDungeon.roomTypeMap,
    spawn,
    stairs: { x: farRoom.cx, y: farRoom.cy },
    rooms,
    biome,
    lockedFeature,
    seed: seed != null ? (seed >>> 0) : null,
  };
}

export function isWalkable(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const t = map[y][x];
  return t === TILES.FLOOR || t === TILES.DOOR || t === TILES.STAIRS;
}

export function spawnEntities(dungeon, floor, hero = null, legends = []) {
  const biome = dungeon?.biome ?? null;
  const luck = getLuck(hero) + (biome?.merchantLuckDelta ?? 0);
  const { map, rooms, spawn, stairs, lockedFeature = null } = dungeon;
  const monsters = [];
  const items = [];
  const floorTiles = [];
  const lockedRoomTiles = new Set();
  if (lockedFeature?.room) {
    for (let y = lockedFeature.room.y; y < lockedFeature.room.y + lockedFeature.room.h; y += 1) {
      for (let x = lockedFeature.room.x; x < lockedFeature.room.x + lockedFeature.room.w; x += 1) {
        lockedRoomTiles.add(makeKey(x, y));
      }
    }
  }

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === TILES.FLOOR
        && !(x === spawn.x && y === spawn.y)
        && !lockedRoomTiles.has(makeKey(x, y))) {
        floorTiles.push({ x, y });
      }
    }
  }

  const monsterFactor = biome?.monsterFactor ?? 1;
  const itemFactor = biome?.itemFactor ?? 1;
  const chestFactor = biome?.chestFactor ?? 1;
  const healerFactor = biome?.healerFactor ?? 1;
  const monsterCount = isBossFloor(floor)
    ? Math.min(floorTiles.length / 12, 4 + floor)
    : Math.min(floorTiles.length / 8, 8 + floor * 2);
  const finalMonsterCount = Math.max(1, Math.floor(monsterCount * monsterFactor));
  const itemCount = Math.min(floorTiles.length / 10, 8 + floor);
  const finalItemCount = Math.max(1, Math.floor(itemCount * itemFactor));

  const pool = shuffle(floorTiles.filter((t) => !(t.x === stairs.x && t.y === stairs.y)));

  for (let i = 0; i < finalMonsterCount && pool.length; i++) {
    const pos = pool.pop();
    monsters.push(createMonster(floor, pos, i));
  }

  const occupied = new Set([
    ...monsters.map((m) => `${m.x},${m.y}`),
  ]);

  const legendSpawns = spawnLegendaryMonsters(dungeon, floor, pool, legends, occupied);
  for (const { monster } of legendSpawns) {
    monsters.push(monster);
  }

  for (let i = 0; i < finalItemCount && pool.length; i++) {
    const pos = pool.pop();
    items.push(createLootItem(pos, floor, i, luck));
  }

  if (lockedFeature?.key) {
    items.push(lockedFeature.key);
  }
  if (lockedFeature?.reward) {
    items.push(lockedFeature.reward);
  }

  occupied.clear();
  for (const m of monsters) occupied.add(`${m.x},${m.y}`);
  for (const item of items) occupied.add(`${item.x},${item.y}`);

  if (isBossFloor(floor)) {
    const bossPos = findBossPosition(map, stairs, occupied);
    if (bossPos) {
      monsters.push(createBoss(floor, bossPos));
      occupied.add(`${bossPos.x},${bossPos.y}`);
    }
  }

  const traps = spawnTraps(dungeon, floor, occupied);
  traps.forEach((t) => occupied.add(`${t.x},${t.y}`));
  let healers = spawnHealers(dungeon, floor, occupied);
  if (healers.length) {
    const keep = Math.max(0, Math.floor(healers.length * healerFactor));
    if (keep < healers.length) {
      healers = shuffle(healers).slice(0, keep);
    }
    healers.forEach((h) => occupied.add(`${h.x},${h.y}`));
  }
  const merchant = spawnMerchant(dungeon, floor, occupied, luck);
  let chests = spawnChests(dungeon, floor, occupied, luck);
  if (chests.length) {
    const keepChest = Math.max(0, Math.floor(chests.length * chestFactor));
    if (keepChest < chests.length) {
      chests = shuffle(chests).slice(0, keepChest);
    }
  }

  return {
    monsters,
    items,
    traps,
    healers,
    merchant,
    chests,
    legendSpawns,
    biome,
    lockedFeature,
  };
}
