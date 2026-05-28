import { MAP_W, MAP_H, MONSTER_VISION, MONSTER_WANDER_CHANCE } from './config.js';
import { TILES } from './config.js';
import { isWalkable } from './dungeon.js';
import { key, manhattan, chebyshev, isMeleeAdjacent } from './utils.js';
import { getAttackRange, getItemSearchRange, canDisarmTraps } from './classes.js';
import { getMonsterAttackRange } from './monsters.js';
import { getDisarmableTrap } from './traps.js';
import { isHealingItem, isElixirItem, isScrollItem, itemPriority } from './items.js';
import { hasWorthwhilePurchase, merchantHasStock } from './merchant.js';
import { getAliveBoss } from './bosses.js';
import { chestPriority, isUnopenedChest } from './chests.js';
import { getHeroVision } from './skills.js';

export function getHeroBlockedSet(hero, monsters, minions = [], options = {}) {
  const { blockMinions = true } = options;
  const blocked = new Set();
  if (hero) blocked.add(key(hero.x, hero.y));
  for (const monster of monsters) {
    if (monster.alive) blocked.add(key(monster.x, monster.y));
  }
  if (blockMinions) {
    for (const minion of minions) {
      if (minion.alive) blocked.add(key(minion.x, minion.y));
    }
  }
  return blocked;
}

const DIRS = [
  [0, -1], [1, 0], [0, 1], [-1, 0],
  [-1, -1], [1, -1], [1, 1], [-1, 1],
];

const CARDINAL_DIRS = DIRS.slice(0, 4);

export function canStep(map, fromX, fromY, toX, toY, blocked = new Set()) {
  const tile = map[toY]?.[toX];
  if (tile === TILES.LOCKED_DOOR) return false;
  if (!isWalkable(map, toX, toY) || blocked.has(key(toX, toY))) return false;

  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx !== 0 && dy !== 0) {
    if (!isWalkable(map, fromX + dx, fromY) || blocked.has(key(fromX + dx, fromY))) {
      return false;
    }
    if (!isWalkable(map, fromX, fromY + dy) || blocked.has(key(fromX, fromY + dy))) {
      return false;
    }
  }

  return true;
}

export function findApproachPath(map, sx, sy, tx, ty, blocked = new Set()) {
  let best = null;

  for (const [dx, dy] of DIRS) {
    const ax = tx + dx;
    const ay = ty + dy;
    const ak = key(ax, ay);
    if (!isWalkable(map, ax, ay) || blocked.has(ak)) continue;

    const path = findPath(map, sx, sy, ax, ay, blocked);
    const onTile = sx === ax && sy === ay;
    if (!path?.length && !onTile) continue;

    const len = path?.length ?? 0;
    if (!best || len < best.path.length) {
      best = { path: path ?? [], goal: { x: ax, y: ay, targetX: tx, targetY: ty } };
    }
  }

  return best;
}

function findAttackPositionPath(map, sx, sy, monster, hero, blocked = new Set()) {
  const attackRange = getAttackRange(hero);
  if (attackRange <= 1) {
    return findApproachPath(map, sx, sy, monster.x, monster.y, blocked);
  }

  let best = null;
  for (let y = monster.y - attackRange; y <= monster.y + attackRange; y += 1) {
    for (let x = monster.x - attackRange; x <= monster.x + attackRange; x += 1) {
      const tileKey = key(x, y);
      const onTile = sx === x && sy === y;
      if (!isWalkable(map, x, y) || (!onTile && blocked.has(tileKey))) continue;
      if (!canAttackTarget(map, x, y, monster.x, monster.y, attackRange)) continue;

      const path = findPath(map, sx, sy, x, y, blocked);
      if (!path?.length && !onTile) continue;

      const len = path?.length ?? 0;
      const dist = manhattan(x, y, monster.x, monster.y);
      if (!best || len < best.path.length || (len === best.path.length && dist > best.distance)) {
        best = {
          path: path ?? [],
          goal: { x, y, targetX: monster.x, targetY: monster.y },
          distance: dist,
        };
      }
    }
  }

  return best;
}

function getKnownMonsters(monsters, explored, visible, hero) {
  return monsters
    .filter((m) => m.alive && isMonsterKnown(m, explored, visible, hero))
    .map((m) => ({ monster: m, dist: manhattan(hero.x, hero.y, m.x, m.y) }))
    .sort((a, b) => a.dist - b.dist);
}

function findGuardianEngagement(map, hx, hy, hero, monsters, explored, visible, blocked) {
  const attackRange = getAttackRange(hero);

  for (const { monster } of getKnownMonsters(monsters, explored, visible, hero)) {
    if (canAttackTarget(map, hx, hy, monster.x, monster.y, attackRange)) {
      return null;
    }

    const approach = findMonsterApproach(map, hx, hy, monster, blocked, hero);
    if (approach?.path.length) {
      return { type: 'chase', path: approach.path, goal: monster };
    }
  }

  return null;
}

function findFrontierPath(map, hx, hy, explored, blocked, retreatFrom = null) {
  const candidates = [];

  for (const ek of explored) {
    const [x, y] = ek.split(',').map(Number);
    if (!isWalkable(map, x, y)) continue;

    let isFrontier = false;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!isWalkable(map, nx, ny)) continue;
      if (!explored.has(key(nx, ny))) {
        isFrontier = true;
        break;
      }
    }

    if (isFrontier) {
      let retreatScore = 0;
      if (retreatFrom) {
        const now = manhattan(hx, hy, retreatFrom.x, retreatFrom.y);
        const then = manhattan(x, y, retreatFrom.x, retreatFrom.y);
        retreatScore = then - now;
      }
      candidates.push({ x, y, dist: manhattan(hx, hy, x, y), retreatScore });
    }
  }

  // Prefer goals that increase distance from a known threat,
  // but do not hard-filter alternatives to avoid corridor loops.
  candidates.sort((a, b) => b.retreatScore - a.retreatScore || a.dist - b.dist);

  for (const tile of candidates.slice(0, 35)) {
    const path = findPath(map, hx, hy, tile.x, tile.y, blocked);
    if (path?.length) {
      return { path, goal: tile };
    }
  }

  return null;
}

function isMonsterKnown(monster, explored, visible, hero) {
  const k = key(monster.x, monster.y);
  if (explored.has(k) || (visible?.has(k) ?? false)) return true;
  if (!hero) return false;
  return manhattan(hero.x, hero.y, monster.x, monster.y) <= getHeroVision(hero);
}

function isNarrowPassage(map, x, y) {
  let exits = 0;
  for (const [dx, dy] of CARDINAL_DIRS) {
    if (isWalkable(map, x + dx, y + dy)) exits += 1;
  }
  return exits <= 2;
}

function bfsToNearestUnexplored(map, sx, sy, explored, blocked) {
  const startK = key(sx, sy);
  const queue = [{ x: sx, y: sy }];
  const cameFrom = new Map([[startK, null]]);

  while (queue.length) {
    const { x, y } = queue.shift();
    const ck = key(x, y);

    if (!explored.has(ck) && isWalkable(map, x, y) && !blocked.has(ck)) {
      const path = [];
      let cur = ck;
      while (cameFrom.get(cur) !== null) {
        const [px, py] = cur.split(',').map(Number);
        path.unshift({ x: px, y: py });
        cur = cameFrom.get(cur);
      }
      if (path.length) {
        const [gx, gy] = ck.split(',').map(Number);
        return { path, goal: { x: gx, y: gy } };
      }
      continue;
    }

    for (const [dx, dy] of CARDINAL_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = key(nx, ny);
      if (cameFrom.has(nk)) continue;
      if (!canStep(map, x, y, nx, ny, blocked)) continue;
      cameFrom.set(nk, ck);
      queue.push({ x: nx, y: ny });
    }
  }

  return null;
}

function findExplorationPath(map, hx, hy, explored, blocked, retreatFrom = null) {
  const direct = bfsToNearestUnexplored(map, hx, hy, explored, blocked);
  if (direct) return direct;

  const unexplored = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!isWalkable(map, x, y)) continue;
      if (!explored.has(key(x, y))) {
        const dist = manhattan(hx, hy, x, y);
        const tie = (((x * 73856093) ^ (y * 19349663)) >>> 0) & 1023;
        unexplored.push({ x, y, dist, tie });
      }
    }
  }

  unexplored.sort((a, b) => a.dist - b.dist || a.tie - b.tie);

  for (const tile of unexplored.slice(0, 60)) {
    const approach = findApproachPath(map, hx, hy, tile.x, tile.y, blocked);
    if (approach?.path.length) {
      return { path: approach.path, goal: approach.goal };
    }
  }

  return findFrontierPath(map, hx, hy, explored, blocked, retreatFrom);
}

function findKnownMonsterApproach(map, hx, hy, monsters, explored, visible, blocked, hero) {
  const sorted = monsters
    .filter((m) => m.alive && isMonsterKnown(m, explored, visible, hero))
    .map((m) => ({ monster: m, dist: manhattan(hx, hy, m.x, m.y) }))
    .sort((a, b) => a.dist - b.dist);

  for (const { monster } of sorted) {
    const approach = findMonsterApproach(map, hx, hy, monster, blocked, hero);
    if (approach?.path.length) {
      return { path: approach.path, goal: monster };
    }
  }

  return null;
}

function findStairsPath(map, hx, hy, blocked) {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] !== TILES.STAIRS) continue;
      const path = findPath(map, hx, hy, x, y, blocked);
      if (path?.length) {
        return { path, goal: { x, y } };
      }
    }
  }
  return null;
}

export function findUnstickStep(map, hx, hy, explored, blocked, options = {}) {
  const { visible = null, stairs = null, avoidKeys = [], hero = null } = options;
  const avoid = new Set(avoidKeys);
  const monsters = options.monsters ?? [];
  const known = hero
    ? getKnownMonsters(monsters, explored, visible, hero)
    : [];
  const nearestGuardian = known[0]?.monster ?? null;

  const guardianEngage = hero
    ? findGuardianEngagement(map, hx, hy, hero, monsters, explored, visible, blocked)
    : null;
  if (guardianEngage?.path[0]) return guardianEngage.path[0];

  const explore = bfsToNearestUnexplored(map, hx, hy, explored, blocked);
  if (explore?.path[0]) return explore.path[0];

  if (stairs) {
    const stairPath = findPath(map, hx, hy, stairs.x, stairs.y, blocked);
    if (stairPath?.[0]) return stairPath[0];
  }

  const scored = CARDINAL_DIRS
    .map(([dx, dy]) => ({ x: hx + dx, y: hy + dy }))
    .filter(({ x, y }) => canStep(map, hx, hy, x, y, blocked))
    .map(({ x, y }) => {
      let score = 0;
      const nk = key(x, y);
      if (avoid.has(nk)) score -= 30;
      if (!explored.has(nk)) score += 10;

      if (nearestGuardian) {
        const curDist = manhattan(hx, hy, nearestGuardian.x, nearestGuardian.y);
        const nextDist = manhattan(x, y, nearestGuardian.x, nearestGuardian.y);
        if (nextDist > curDist) score -= 100;
        else score += (curDist - nextDist) * 8;
      }

      for (const [ddx, ddy] of CARDINAL_DIRS) {
        const cx = x + ddx;
        const cy = y + ddy;
        if (isWalkable(map, cx, cy) && !explored.has(key(cx, cy))) {
          score += 4;
        }
      }

      return { x, y, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0] ?? null;
}

function findMonsterApproach(map, hx, hy, monster, blocked, hero = null) {
  if (hero) {
    return findAttackPositionPath(map, hx, hy, monster, hero, blocked);
  }
  return findApproachPath(map, hx, hy, monster.x, monster.y, blocked);
}

export function findPath(map, sx, sy, gx, gy, blocked = new Set()) {
  if (sx === gx && sy === gy) return [];
  if (!isWalkable(map, gx, gy)) return null;

  const startK = key(sx, sy);
  const goalK = key(gx, gy);
  const open = [{ x: sx, y: sy, f: manhattan(sx, sy, gx, gy), g: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[startK, 0]]);
  const closed = new Set();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const ck = key(current.x, current.y);

    if (closed.has(ck)) continue;
    closed.add(ck);

    if (ck === goalK) {
      const path = [];
      let cur = goalK;
      while (cur !== startK) {
        const [px, py] = cur.split(',').map(Number);
        path.unshift({ x: px, y: py });
        cur = cameFrom.get(cur);
      }
      return path;
    }

    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      if (!canStep(map, current.x, current.y, nx, ny, blocked)) continue;

      const stepCost = dx !== 0 && dy !== 0 ? 1.4 : 1;
      const tentative = current.g + stepCost;
      if (tentative >= (gScore.get(nk) ?? Infinity)) continue;

      cameFrom.set(nk, ck);
      gScore.set(nk, tentative);
      open.push({
        x: nx,
        y: ny,
        g: tentative,
        f: tentative + manhattan(nx, ny, gx, gy),
      });
    }
  }

  return null;
}

function blocksLineOfSight(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  const tile = map[y][x];
  return tile === TILES.WALL || tile === TILES.VOID;
}

export function hasLineOfSight(map, x0, y0, x1, y1) {
  if (x0 === x1 && y0 === y1) return true;

  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const xInc = x0 < x1 ? 1 : -1;
  const yInc = y0 < y1 ? 1 : -1;
  let error = dx - dy;
  const dx2 = dx * 2;
  const dy2 = dy * 2;

  for (;;) {
    if (x === x1 && y === y1) return true;

    if (x !== x0 || y !== y0) {
      if (blocksLineOfSight(map, x, y)) return false;
    }

    if (error > 0) {
      x += xInc;
      error -= dy2;
    } else if (error < 0) {
      y += yInc;
      error += dx2;
    } else {
      x += xInc;
      y += yInc;
      error += dx2 - dy2;
    }
  }
}

export function canAttackTarget(map, x0, y0, x1, y1, maxRange) {
  if (maxRange <= 1) {
    return isMeleeAdjacent(x0, y0, x1, y1);
  }

  const dist = manhattan(x0, y0, x1, y1);
  if (dist > maxRange) return false;
  if (dist <= 1) return true;
  return hasLineOfSight(map, x0, y0, x1, y1);
}

export function getHeroFightDistance(hero, target) {
  const range = getAttackRange(hero);
  if (range <= 1) {
    return chebyshev(hero.x, hero.y, target.x, target.y);
  }
  return manhattan(hero.x, hero.y, target.x, target.y);
}

export function getMonsterFightDistance(monster, hero) {
  if (isMeleeAdjacent(monster.x, monster.y, hero.x, hero.y)) {
    return 1;
  }
  return manhattan(monster.x, monster.y, hero.x, hero.y);
}

export function getVisibleTiles(px, py, radius = 6) {
  const visible = new Set();
  for (let y = py - radius; y <= py + radius; y++) {
    for (let x = px - radius; x <= px + radius; x++) {
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      if (manhattan(px, py, x, y) <= radius) {
        visible.add(key(x, y));
      }
    }
  }
  return visible;
}

function getRoomAt(rooms, x, y) {
  return rooms.find(
    (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h
  ) ?? null;
}

function getUncollectedItemsInRoom(room, items) {
  return items.filter(
    (i) => !i.collected
      && i.x >= room.x && i.x < room.x + room.w
      && i.y >= room.y && i.y < room.y + room.h
  );
}

function isLockedReward(item) {
  return item.type === 'locked_skill';
}

function isCollectibleWhileLowHp(item) {
  return isHealingItem(item)
    || isElixirItem(item)
    || isScrollItem(item)
    || item.type === 'gold'
    || item.type === 'locked_key'
    || isLockedReward(item);
}

function getUnopenedChestsInRoom(room, chests) {
  return chests.filter(
    (c) => isUnopenedChest(c)
      && c.x >= room.x && c.x < room.x + room.w
      && c.y >= room.y && c.y < room.y + room.h
  );
}

function findNearestChestPath(map, hx, hy, chestList, blocked, hero) {
  const sorted = chestList
    .map((chest) => ({
      chest,
      dist: manhattan(hx, hy, chest.x, chest.y),
      score: chestPriority(chest, hero),
    }))
    .sort((a, b) => b.score - a.score || a.dist - b.dist);

  for (const { chest } of sorted) {
    const path = findPath(map, hx, hy, chest.x, chest.y, blocked);
    if (path?.length || (chest.x === hx && chest.y === hy)) {
      return { path: path ?? [], goal: chest };
    }
  }
  return null;
}

function findNearestItemPath(map, hx, hy, itemList, blocked, hero = null, needHeal = false) {
  const sorted = itemList
    .map((item) => ({
      item,
      dist: manhattan(hx, hy, item.x, item.y),
      score: needHeal && isHealingItem(item)
        ? itemPriority(item, hero) + 100
        : itemPriority(item, hero),
    }))
    .sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.01) return b.score - a.score;
      return a.dist - b.dist;
    });

  for (const { item } of sorted) {
    const path = findPath(map, hx, hy, item.x, item.y, blocked);
    if (path?.length) {
      return { path, goal: item };
    }
  }
  return null;
}

function findHealerPath(map, hx, hy, healers, blocked) {
  const sorted = healers
    .filter((h) => !h.used)
    .map((h) => ({ healer: h, dist: manhattan(hx, hy, h.x, h.y) }))
    .sort((a, b) => a.dist - b.dist);

  for (const { healer } of sorted) {
    const path = findPath(map, hx, hy, healer.x, healer.y, blocked);
    if (path?.length) {
      return { path, goal: healer };
    }
  }
  return null;
}

export function getExplorationTarget(
  map,
  hero,
  explored,
  monsters,
  items,
  rooms = [],
  traps = [],
  healers = [],
  merchant = null,
  chests = [],
  focusMonster = null,
  visible = null,
  minions = []
) {
  const { x: hx, y: hy } = hero;
  const attackRange = getAttackRange(hero);
  const itemRange = getItemSearchRange(hero);
  const hpRatio = hero.hp / Math.max(1, hero.maxHp);
  const needHeal = hpRatio < 0.45;
  const panicMode = hpRatio < 0.35;
  const narrow = isNarrowPassage(map, hx, hy);
  const lootRange = narrow ? Math.min(itemRange, 5) : itemRange;
  const blocked = new Set(
    monsters.filter((m) => m.alive).map((m) => key(m.x, m.y))
  );
  const knownMonsters = getKnownMonsters(monsters, explored, visible, hero);
  const nearThreats = knownMonsters.filter((e) => e.dist <= 3);
  const immediateThreat = nearThreats.some(
    (e) => e.dist <= 1 || canMonsterAttackHero(map, e.monster, hero)
  );
  const dangerScore = nearThreats.reduce((sum, e) => {
    const pressure = e.dist <= 1 ? 1.35 : e.dist <= 2 ? 0.85 : 0.45;
    return sum + (e.monster.atk ?? 2) * pressure;
  }, 0);
  const highDanger = immediateThreat || (dangerScore >= 7 && hpRatio < 0.72);
  const avoidGreed = highDanger || panicMode;

  const boss = getAliveBoss(monsters);
  if (!panicMode && boss && isMonsterKnown(boss, explored, visible, hero)) {
    const bossDist = manhattan(hx, hy, boss.x, boss.y);
    if (canAttackTarget(map, hx, hy, boss.x, boss.y, attackRange)) {
      return { type: 'fight', target: boss, distance: bossDist };
    }
  }

  const onHealer = healers.find((h) => !h.used && h.x === hx && h.y === hy);
  const onItem = items.find((i) => !i.collected && i.x === hx && i.y === hy);
  if (panicMode && (immediateThreat || dangerScore >= 6)) {
    if (onHealer && hero.hp < hero.maxHp) {
      return { type: 'heal', target: onHealer };
    }
    if (onItem && isCollectibleWhileLowHp(onItem)) {
      return { type: 'loot', target: onItem };
    }

    const healItems = items.filter((i) => !i.collected && isHealingItem(i));
    const healPath = findNearestItemPath(map, hx, hy, healItems, blocked, hero, true);
    if (healPath) {
      return { type: 'room-loot', path: healPath.path, goal: healPath.goal };
    }

    const healerPath = findHealerPath(map, hx, hy, healers, blocked);
    if (healerPath) {
      return { type: 'heal-move', path: healerPath.path, goal: healerPath.goal };
    }

    const retreatFrom = knownMonsters[0]?.monster ?? null;
    const retreatPath = findExplorationPath(map, hx, hy, explored, blocked, retreatFrom);
    if (retreatPath?.path.length) {
      return { type: 'explore', path: retreatPath.path, goal: retreatPath.goal };
    }
  }

  const targetMonster = monsters
    .filter((m) => m.alive && isMonsterKnown(m, explored, visible, hero)
      && canAttackTarget(map, hx, hy, m.x, m.y, attackRange))
    .map((m) => ({ monster: m, dist: getHeroFightDistance(hero, m) }))
    .sort((a, b) => a.dist - b.dist)[0];

  if (targetMonster && !panicMode) {
    return {
      type: 'fight',
      target: targetMonster.monster,
      distance: targetMonster.dist,
    };
  }

  if (focusMonster?.alive && isMonsterKnown(focusMonster, explored, visible, hero)) {
    if (canAttackTarget(map, hx, hy, focusMonster.x, focusMonster.y, attackRange)) {
      return {
        type: 'fight',
        target: focusMonster,
        distance: getHeroFightDistance(hero, focusMonster),
      };
    }

    const focusApproach = findMonsterApproach(map, hx, hy, focusMonster, blocked, hero);
    if (focusApproach?.path.length) {
      return { type: 'chase', path: focusApproach.path, goal: focusMonster };
    }
  }

  const guardianEngage = findGuardianEngagement(
    map, hx, hy, hero, monsters, explored, visible, blocked
  );
  if (guardianEngage) {
    return guardianEngage;
  }

  const nearestGuardian = knownMonsters[0]?.monster ?? null;

  if (canDisarmTraps(hero)) {
    const adjacentTrap = getDisarmableTrap(traps, hx, hy, 1);
    if (adjacentTrap) {
      return { type: 'disarm', target: adjacentTrap };
    }

    const nearbyTrap = traps
      .filter((t) => !t.disarmed && !t.triggered && t.revealed)
      .map((t) => ({ trap: t, dist: manhattan(hx, hy, t.x, t.y) }))
      .filter((e) => e.dist > 1 && e.dist <= (narrow ? 4 : itemRange))
      .sort((a, b) => a.dist - b.dist)[0];

    if (nearbyTrap) {
      const path = findPath(map, hx, hy, nearbyTrap.trap.x, nearbyTrap.trap.y, blocked);
      if (path?.length) {
        return { type: 'disarm-move', path, goal: nearbyTrap.trap };
      }
    }
  }

  if (onHealer && hero.hp < hero.maxHp) {
    return { type: 'heal', target: onHealer };
  }

  const onChest = chests.find((c) => isUnopenedChest(c) && c.x === hx && c.y === hy);
  if (onChest && !avoidGreed) {
    return { type: 'chest', target: onChest };
  }

  if (onItem) {
    if ((!needHeal || isCollectibleWhileLowHp(onItem))
      && (!avoidGreed || isCollectibleWhileLowHp(onItem))) {
      return { type: 'loot', target: onItem };
    }
  }

  if (needHeal) {
    const healItems = items.filter((i) => !i.collected && isHealingItem(i));
    const healPath = findNearestItemPath(map, hx, hy, healItems, blocked, hero, true);
    if (healPath) {
      return { type: 'room-loot', path: healPath.path, goal: healPath.goal };
    }

    const healerPath = findHealerPath(map, hx, hy, healers, blocked);
    if (healerPath) {
      return { type: 'heal-move', path: healerPath.path, goal: healerPath.goal };
    }
  }

  const nearKey = items
    .filter((i) => !i.collected && i.type === 'locked_key')
    .map((i) => ({ item: i, dist: manhattan(hx, hy, i.x, i.y) }))
    .sort((a, b) => a.dist - b.dist)[0];
  if (nearKey) {
    const path = findPath(map, hx, hy, nearKey.item.x, nearKey.item.y, blocked);
    if (path?.length) {
      return { type: 'move', path, goal: nearKey.item };
    }
  }

  if (!avoidGreed && merchant && merchantHasStock(merchant)) {
    if (merchant.x === hx && merchant.y === hy && hasWorthwhilePurchase(hero, merchant)) {
      return { type: 'shop', target: merchant };
    }

    if (hero.gold >= 8 && hasWorthwhilePurchase(hero, merchant)) {
      const path = findPath(map, hx, hy, merchant.x, merchant.y, blocked);
      if (path?.length) {
        return { type: 'merchant-move', path, goal: merchant };
      }
    }
  }

  const unopenedChests = chests.filter((c) => isUnopenedChest(c));
  const nearChest = unopenedChests
    .map((c) => ({ chest: c, dist: manhattan(hx, hy, c.x, c.y), score: chestPriority(c, hero) }))
    .filter((e) => e.dist <= lootRange)
    .sort((a, b) => b.score - a.score || a.dist - b.dist)[0];

  if (nearChest && !avoidGreed) {
    if (nearChest.dist === 0) {
      return { type: 'chest', target: nearChest.chest };
    }
    const path = findPath(map, hx, hy, nearChest.chest.x, nearChest.chest.y, blocked);
    if (path?.length) {
      return { type: 'chest-move', path, goal: nearChest.chest };
    }
  }

  const currentRoom = getRoomAt(rooms, hx, hy);
  if (currentRoom) {
    const roomChests = getUnopenedChestsInRoom(currentRoom, chests);
    if (!avoidGreed) {
      const roomChest = findNearestChestPath(map, hx, hy, roomChests, blocked, hero);
      if (roomChest?.path.length) {
        return { type: 'chest-move', path: roomChest.path, goal: roomChest.goal };
      }
    }

    const roomItems = getUncollectedItemsInRoom(currentRoom, items);
    const roomLoot = findNearestItemPath(map, hx, hy, roomItems, blocked, hero, needHeal);
    if (roomLoot) {
      return { type: 'room-loot', path: roomLoot.path, goal: roomLoot.goal };
    }
  }

  const nearItem = items
    .filter((i) => !i.collected && (!avoidGreed || isCollectibleWhileLowHp(i)))
    .map((i) => ({ item: i, dist: manhattan(hx, hy, i.x, i.y), score: itemPriority(i, hero) }))
    .filter((e) => e.dist <= lootRange)
    .sort((a, b) => b.score - a.score || a.dist - b.dist)[0];

  if (nearItem) {
    const path = findPath(map, hx, hy, nearItem.item.x, nearItem.item.y, blocked);
    if (path?.length) {
      return { type: 'move', path, goal: nearItem.item };
    }
  }

  const onItemFallback = items.find((i) => !i.collected && i.x === hx && i.y === hy);
  if (onItemFallback) {
    return { type: 'loot', target: onItemFallback };
  }

  const explorePath = findExplorationPath(
    map, hx, hy, explored, blocked, nearestGuardian
  );
  if (explorePath) {
    return { type: 'explore', path: explorePath.path, goal: explorePath.goal };
  }

  const knownApproach = findKnownMonsterApproach(
    map, hx, hy, monsters, explored, visible, blocked, hero
  );
  if (knownApproach) {
    return { type: 'chase', path: knownApproach.path, goal: knownApproach.goal };
  }

  if (boss && isMonsterKnown(boss, explored, visible, hero)) {
    const bossApproach = findMonsterApproach(map, hx, hy, boss, blocked, hero);
    if (bossApproach?.path.length) {
      return { type: 'move', path: bossApproach.path, goal: boss };
    }
  }

  if (!boss) {
    const stairsPath = findStairsPath(map, hx, hy, blocked);
    if (stairsPath) {
      return { type: 'stairs', path: stairsPath.path, goal: stairsPath.goal };
    }
  }

  return { type: 'wait' };
}

export function wanderStep(map, x, y, blocked = new Set()) {
  const options = CARDINAL_DIRS.filter(([dx, dy]) => canStep(map, x, y, x + dx, y + dy, blocked));
  if (!options.length) return null;
  const [dx, dy] = options[Math.floor(Math.random() * options.length)];
  return { x: x + dx, y: y + dy };
}

export function canMonsterSeeHero(monster, hero) {
  return manhattan(monster.x, monster.y, hero.x, hero.y) <= MONSTER_VISION;
}

export function canMonsterAttackHero(map, monster, hero) {
  const range = getMonsterAttackRange(monster);

  if (isMeleeAdjacent(monster.x, monster.y, hero.x, hero.y)) {
    return true;
  }

  if (!monster.ranged) return false;

  const dist = manhattan(monster.x, monster.y, hero.x, hero.y);
  if (dist > range) return false;
  return hasLineOfSight(map, monster.x, monster.y, hero.x, hero.y);
}

function findBestRetreatStep(map, monster, hero, occupied, options = {}) {
  const { preferRanged = false } = options;
  const currentDist = manhattan(monster.x, monster.y, hero.x, hero.y);
  const range = getMonsterAttackRange(monster);
  let best = null;

  for (const [dx, dy] of CARDINAL_DIRS) {
    const nx = monster.x + dx;
    const ny = monster.y + dy;
    if (!canStep(map, monster.x, monster.y, nx, ny, occupied)) continue;
    const nextDist = manhattan(nx, ny, hero.x, hero.y);
    const los = hasLineOfSight(map, nx, ny, hero.x, hero.y);
    const inRange = nextDist <= range;

    let score = (nextDist - currentDist) * 8 + nextDist * 1.2;
    if (preferRanged) {
      if (nextDist <= 1) score -= 20;
      if (los && inRange && nextDist > 1) score += 9;
      if (!los) score -= 2;
    }

    if (!best || score > best.score) {
      best = { x: nx, y: ny, score };
    }
  }

  return best;
}

function findRangedFiringStep(map, monster, hero, occupied) {
  const range = getMonsterAttackRange(monster);
  let best = null;

  for (const [dx, dy] of CARDINAL_DIRS) {
    const nx = monster.x + dx;
    const ny = monster.y + dy;
    if (!canStep(map, monster.x, monster.y, nx, ny, occupied)) continue;
    const dist = manhattan(nx, ny, hero.x, hero.y);
    if (dist <= 1 || dist > range) continue;
    if (!hasLineOfSight(map, nx, ny, hero.x, hero.y)) continue;

    const score = dist;
    if (!best || score > best.score) {
      best = { x: nx, y: ny, score };
    }
  }

  return best;
}

export function moveMonstersTowardHero(map, hero, monsters) {
  const hunters = monsters
    .filter((m) => m.alive && canMonsterSeeHero(m, hero))
    .sort((a, b) => manhattan(a.x, a.y, hero.x, hero.y) - manhattan(b.x, b.y, hero.x, hero.y));

  const occupied = new Set(
    monsters.filter((m) => m.alive).map((m) => key(m.x, m.y))
  );

  for (const monster of hunters) {
    if ((monster.enragedHasteTurns ?? 0) > 0) {
      monster.enragedHasteTurns -= 1;
    }
    if ((monster.slowed ?? 0) > 0) {
      const resistSlow = (monster.isBoss && (monster.enragedHasteTurns ?? 0) > 0) ? 0.6 : 0;
      if (Math.random() >= resistSlow) {
        monster.slowed -= 1;
        continue;
      }
    }

    const cheb = chebyshev(monster.x, monster.y, hero.x, hero.y);
    const manh = manhattan(monster.x, monster.y, hero.x, hero.y);
    const hpRatio = monster.hp / Math.max(1, monster.maxHp);
    const lowHpRetreat = !!monster.fragile && hpRatio <= (monster.retreatHpPct ?? 0.3);
    const preferRanged = !!monster.ranged;

    const blocked = new Set(occupied);
    blocked.delete(key(monster.x, monster.y));

    if (preferRanged && cheb <= 1) {
      const retreat = findBestRetreatStep(map, monster, hero, blocked, { preferRanged: true });
      if (retreat) {
        occupied.delete(key(monster.x, monster.y));
        monster.x = retreat.x;
        monster.y = retreat.y;
        occupied.add(key(monster.x, monster.y));
      }
    }

    if (lowHpRetreat && manh <= 3) {
      const retreat = findBestRetreatStep(map, monster, hero, blocked, { preferRanged });
      if (retreat) {
        occupied.delete(key(monster.x, monster.y));
        monster.x = retreat.x;
        monster.y = retreat.y;
        occupied.add(key(monster.x, monster.y));
      }
    }

    if (canMonsterAttackHero(map, monster, hero)) {
      const currentCheb = chebyshev(monster.x, monster.y, hero.x, hero.y);
      const currentManh = manhattan(monster.x, monster.y, hero.x, hero.y);
      if (monster.ranged && cheb > 1) {
        return { monster, distance: currentManh };
      }
      if (currentCheb <= 1) {
        return { monster, distance: 1 };
      }
    }

    if (monster.ranged) {
      const firingStep = findRangedFiringStep(map, monster, hero, blocked);
      if (firingStep) {
        occupied.delete(key(monster.x, monster.y));
        monster.x = firingStep.x;
        monster.y = firingStep.y;
        occupied.add(key(monster.x, monster.y));
        if (canMonsterAttackHero(map, monster, hero)) {
          return { monster, distance: manhattan(monster.x, monster.y, hero.x, hero.y) };
        }
      }
    }

    const path = findPath(map, monster.x, monster.y, hero.x, hero.y, blocked);
    if (!path?.length) continue;

    const next = path[0];
    if (next.x === hero.x && next.y === hero.y) {
      return { monster, distance: 1 };
    }

    const nextKey = key(next.x, next.y);
    if (occupied.has(nextKey)) continue;

    occupied.delete(key(monster.x, monster.y));
    monster.x = next.x;
    monster.y = next.y;
    occupied.add(nextKey);

    const newCheb = chebyshev(monster.x, monster.y, hero.x, hero.y);
    const newManh = manhattan(monster.x, monster.y, hero.x, hero.y);
    if (canMonsterAttackHero(map, monster, hero)) {
      if (monster.ranged && newCheb > 1) {
        return { monster, distance: newManh };
      }
      if (newCheb <= 1) {
        return { monster, distance: 1 };
      }
    }
  }

  return null;
}

export function wanderIdleMonsters(map, hero, monsters, minions = [], checkCombat = true) {
  const occupied = new Set(
    monsters.filter((m) => m.alive).map((m) => key(m.x, m.y))
  );
  occupied.add(key(hero.x, hero.y));
  for (const minion of minions) {
    if (minion.alive) occupied.add(key(minion.x, minion.y));
  }

  const idle = monsters.filter(
    (m) =>
      m.alive &&
      !canMonsterSeeHero(m, hero) &&
      !m.isBoss &&
      !m.isMimic &&
      (m.slowed ?? 0) <= 0
  );

  for (let i = idle.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [idle[i], idle[j]] = [idle[j], idle[i]];
  }

  for (const monster of idle) {
    if (Math.random() > MONSTER_WANDER_CHANCE) continue;

    const blocked = new Set(occupied);
    blocked.delete(key(monster.x, monster.y));

    const step = wanderStep(map, monster.x, monster.y, blocked);
    if (!step) continue;

    occupied.delete(key(monster.x, monster.y));
    monster.x = step.x;
    monster.y = step.y;
    occupied.add(key(step.x, step.y));

    if (!checkCombat) continue;

    if (canMonsterSeeHero(monster, hero) && canMonsterAttackHero(map, monster, hero)) {
      const manh = manhattan(monster.x, monster.y, hero.x, hero.y);
      const cheb = chebyshev(monster.x, monster.y, hero.x, hero.y);
      if (monster.ranged && cheb > 1) {
        return { monster, distance: manh };
      }
      if (cheb <= 1) {
        return { monster, distance: 1 };
      }
    }
  }

  return null;
}
