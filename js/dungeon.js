import { MAP_W, MAP_H, TILES } from './config.js';
import { randInt, shuffle, createSeededRng } from './utils.js';
import { spawnTraps } from './traps.js';
import { createLootItem, spawnHealers } from './items.js';
import { spawnMerchant } from './merchant.js';
import { isBossFloor, createBoss, findBossPosition } from './bosses.js';
import { getLuck } from './luck.js';
import { spawnLegendaryMonsters } from './nemesis.js';

function createEmpty(w, h, fill = TILES.VOID) {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      map[y][x] = TILES.FLOOR;
    }
  }
}

function roomsOverlap(a, b, pad = 1) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function createRoom(attempts = 80, rng = null) {
  const ri = rng?.randInt ?? randInt;
  const rooms = [];
  for (let i = 0; i < attempts; i++) {
    const w = ri(4, 9);
    const h = ri(4, 7);
    const x = ri(1, MAP_W - w - 2);
    const y = ri(1, MAP_H - h - 2);
    const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
    if (!rooms.some((r) => roomsOverlap(room, r))) {
      rooms.push(room);
    }
  }
  return rooms;
}

function connectRooms(map, a, b) {
  let x = a.cx;
  let y = a.cy;
  while (x !== b.cx) {
    map[y][x] = TILES.FLOOR;
    x += x < b.cx ? 1 : -1;
  }
  while (y !== b.cy) {
    map[y][x] = TILES.FLOOR;
    y += y < b.cy ? 1 : -1;
  }
}

export function generateDungeon(floor = 1, seed = null) {
  const rng = seed != null ? createSeededRng(seed >>> 0) : null;
  const sh = rng?.shuffle ?? shuffle;
  const map = createEmpty(MAP_W, MAP_H, TILES.WALL);
  const rooms = createRoom(10 + Math.floor(floor / 2), rng);

  if (rooms.length === 0) {
    map[Math.floor(MAP_H / 2)][Math.floor(MAP_W / 2)] = TILES.FLOOR;
    return {
      map,
      spawn: { x: Math.floor(MAP_W / 2), y: Math.floor(MAP_H / 2) },
      stairs: { x: Math.floor(MAP_W / 2) + 1, y: Math.floor(MAP_H / 2) },
      rooms: [],
    };
  }

  rooms.forEach((room) => carveRoom(map, room));

  const ordered = sh(rooms);
  for (let i = 1; i < ordered.length; i++) {
    connectRooms(map, ordered[i - 1], ordered[i]);
  }

  const spawn = { x: rooms[0].cx, y: rooms[0].cy };
  const farRoom = rooms.reduce((best, room) => {
    const d = Math.abs(room.cx - spawn.x) + Math.abs(room.cy - spawn.y);
    const bestD = Math.abs(best.cx - spawn.x) + Math.abs(best.cy - spawn.y);
    return d > bestD ? room : best;
  }, rooms[0]);

  map[farRoom.cy][farRoom.cx] = TILES.STAIRS;

  return {
    map,
    spawn,
    stairs: { x: farRoom.cx, y: farRoom.cy },
    rooms,
  };
}

export function isWalkable(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const t = map[y][x];
  return t === TILES.FLOOR || t === TILES.DOOR || t === TILES.STAIRS;
}

export function spawnEntities(dungeon, floor, hero = null, legends = []) {
  const luck = getLuck(hero);
  const { map, rooms, spawn, stairs } = dungeon;
  const monsters = [];
  const items = [];
  const floorTiles = [];

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === TILES.FLOOR && !(x === spawn.x && y === spawn.y)) {
        floorTiles.push({ x, y });
      }
    }
  }

  const monsterCount = isBossFloor(floor)
    ? Math.min(floorTiles.length / 12, 4 + floor)
    : Math.min(floorTiles.length / 8, 8 + floor * 2);
  const itemCount = Math.min(floorTiles.length / 10, 8 + floor);

  const pool = shuffle(floorTiles.filter((t) => !(t.x === stairs.x && t.y === stairs.y)));

  const names = ['гоблин', 'скелет', 'слизь', 'крысолюд', 'призрак', 'орк'];
  for (let i = 0; i < monsterCount && pool.length; i++) {
    const pos = pool.pop();
    const name = names[randInt(0, names.length - 1)];
    const hp = 8 + floor * 4 + randInt(0, 6);
    monsters.push({
      id: `m-${i}-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      name,
      baseName: name,
      hp,
      maxHp: hp,
      atk: 2 + floor + randInt(0, 2),
      xp: 5 + floor * 3,
      alive: true,
    });
  }

  const occupied = new Set([
    ...monsters.map((m) => `${m.x},${m.y}`),
  ]);

  const legendSpawns = spawnLegendaryMonsters(dungeon, floor, pool, legends, occupied);
  for (const { monster } of legendSpawns) {
    monsters.push(monster);
  }

  for (let i = 0; i < itemCount && pool.length; i++) {
    const pos = pool.pop();
    items.push(createLootItem(pos, floor, i, luck));
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
  const healers = spawnHealers(dungeon, floor, occupied);
  if (healers.length) healers.forEach((h) => occupied.add(`${h.x},${h.y}`));
  const merchant = spawnMerchant(dungeon, floor, occupied, luck);

  return { monsters, items, traps, healers, merchant, legendSpawns };
}
