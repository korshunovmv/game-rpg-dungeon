import { randInt } from './utils.js';
import { MAP_W, MAP_H, TILES } from './config.js';

function isWalkable(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const t = map[y][x];
  return t === TILES.FLOOR || t === TILES.DOOR || t === TILES.STAIRS;
}

const BOSS_TEMPLATES = [
  { name: 'Король гоблинов', color: '#44cc44' },
  { name: 'Лich-архивариус', color: '#aa44ff' },
  { name: 'Дракон-тень', color: '#ff6600' },
  { name: 'Повелитель орков', color: '#cc2222' },
  { name: 'Королева пауков', color: '#cc44aa' },
  { name: 'Железный страж', color: '#888899' },
];

const BOSS_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]];

export function isBossFloor(floor) {
  return floor > 0 && floor % 5 === 0;
}

export function getAliveBoss(monsters) {
  return monsters.find((m) => m.alive && m.isBoss) ?? null;
}

export function findBossPosition(map, stairs, occupied = new Set()) {
  for (const [dx, dy] of BOSS_DIRS) {
    const x = stairs.x + dx;
    const y = stairs.y + dy;
    const k = `${x},${y}`;
    if (isWalkable(map, x, y) && !occupied.has(k)) {
      return { x, y };
    }
  }

  if (isWalkable(map, stairs.x, stairs.y) && !occupied.has(`${stairs.x},${stairs.y}`)) {
    return { x: stairs.x, y: stairs.y };
  }

  return null;
}

export function createBoss(floor, pos) {
  const tier = Math.floor(floor / 5);
  const template = BOSS_TEMPLATES[(tier - 1) % BOSS_TEMPLATES.length];
  const hp = 55 + tier * 45 + floor * 12 + randInt(0, 15);
  const atk = 6 + tier * 4 + Math.floor(floor / 2) + randInt(0, 2);

  return {
    id: `boss-${floor}-${Date.now()}`,
    x: pos.x,
    y: pos.y,
    name: template.name,
    hp,
    maxHp: hp,
    atk,
    xp: 45 + tier * 55 + floor * 18,
    goldReward: 25 + tier * 30 + floor * 8,
    alive: true,
    isBoss: true,
    color: template.color,
    tier,
  };
}
