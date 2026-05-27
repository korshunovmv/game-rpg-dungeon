import { MAP_W, MAP_H, MONSTER_VISION, MONSTER_WANDER_CHANCE } from './config.js';
import { TILES } from './config.js';
import { isWalkable } from './dungeon.js';
import { key, manhattan, chebyshev, isMeleeAdjacent } from './utils.js';
import { getAttackRange, getItemSearchRange, canDisarmTraps } from './classes.js';
import { getMonsterAttackRange } from './monsters.js';
import { getDisarmableTrap } from './traps.js';
import { isHealingItem, itemPriority } from './items.js';
import { hasWorthwhilePurchase, merchantHasStock } from './merchant.js';
import { getAliveBoss } from './bosses.js';
import { chestPriority, isUnopenedChest } from './chests.js';
import { getHeroVision } from './skills.js';

export function getHeroBlockedSet(hero, monsters, minions = []) {
  const blocked = new Set();
  if (hero) blocked.add(key(hero.x, hero.y));
  for (const monster of monsters) {
    if (monster.alive) blocked.add(key(monster.x, monster.y));
  }
  for (const minion of minions) {
    if (minion.alive) blocked.add(key(minion.x, minion.y));
  }
  return blocked;
}

const DIRS = [
  [0, -1], [1, 0], [0, 1], [-1, 0],
  [-1, -1], [1, -1], [1, 1], [-1, 1],
];

const CARDINAL_DIRS = DIRS.slice(0, 4);

export function canStep(map, fromX, fromY, toX, toY, blocked = new Set()) {
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

    const approach = findMonsterApproach(map, hx, hy, monster, blocked);
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
      candidates.push({ x, y, dist: manhattan(hx, hy, x, y) });
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);

  for (const tile of candidates.slice(0, 35)) {
    if (retreatFrom) {
      const now = manhattan(hx, hy, retreatFrom.x, retreatFrom.y);
      const then = manhattan(tile.x, tile.y, retreatFrom.x, retreatFrom.y);
      if (then > now) continue;
    }

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
        unexplored.push({ x, y });
      }
    }
  }

  for (const tile of unexplored.slice(0, 40)) {
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
    const approach = findMonsterApproach(map, hx, hy, monster, blocked);
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

function findMonsterApproach(map, hx, hy, monster, blocked) {
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
  visible = null
) {
  const { x: hx, y: hy } = hero;
  const attackRange = getAttackRange(hero);
  const itemRange = getItemSearchRange(hero);
  const needHeal = hero.hp / hero.maxHp < 0.45;
  const narrow = isNarrowPassage(map, hx, hy);
  const lootRange = narrow ? Math.min(itemRange, 5) : itemRange;
  const blocked = new Set(
    monsters.filter((m) => m.alive).map((m) => key(m.x, m.y))
  );

  const boss = getAliveBoss(monsters);
  if (boss && isMonsterKnown(boss, explored, visible, hero)) {
    const bossDist = manhattan(hx, hy, boss.x, boss.y);
    if (canAttackTarget(map, hx, hy, boss.x, boss.y, attackRange)) {
      return { type: 'fight', target: boss, distance: bossDist };
    }
  }

  const targetMonster = monsters
    .filter((m) => m.alive && isMonsterKnown(m, explored, visible, hero)
      && canAttackTarget(map, hx, hy, m.x, m.y, attackRange))
    .map((m) => ({ monster: m, dist: getHeroFightDistance(hero, m) }))
    .sort((a, b) => a.dist - b.dist)[0];

  if (targetMonster) {
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

    const focusApproach = findMonsterApproach(map, hx, hy, focusMonster, blocked);
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

  const nearestGuardian = getKnownMonsters(monsters, explored, visible, hero)[0]?.monster ?? null;

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

  const onHealer = healers.find((h) => !h.used && h.x === hx && h.y === hy);
  if (onHealer && hero.hp < hero.maxHp) {
    return { type: 'heal', target: onHealer };
  }

  const onChest = chests.find((c) => isUnopenedChest(c) && c.x === hx && c.y === hy);
  if (onChest) {
    return { type: 'chest', target: onChest };
  }

  const onItem = items.find((i) => !i.collected && i.x === hx && i.y === hy);
  if (onItem) {
    if (!needHeal || isHealingItem(onItem) || onItem.type === 'gold') {
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

  if (merchant && merchantHasStock(merchant)) {
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

  if (nearChest) {
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
    const roomChest = findNearestChestPath(map, hx, hy, roomChests, blocked, hero);
    if (roomChest?.path.length) {
      return { type: 'chest-move', path: roomChest.path, goal: roomChest.goal };
    }

    const roomItems = getUncollectedItemsInRoom(currentRoom, items);
    const roomLoot = findNearestItemPath(map, hx, hy, roomItems, blocked, hero, needHeal);
    if (roomLoot) {
      return { type: 'room-loot', path: roomLoot.path, goal: roomLoot.goal };
    }
  }

  const nearItem = items
    .filter((i) => !i.collected)
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
    const bossApproach = findMonsterApproach(map, hx, hy, boss, blocked);
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

export function moveMonstersTowardHero(map, hero, monsters) {
  const hunters = monsters
    .filter((m) => m.alive && canMonsterSeeHero(m, hero))
    .sort((a, b) => manhattan(a.x, a.y, hero.x, hero.y) - manhattan(b.x, b.y, hero.x, hero.y));

  const occupied = new Set(
    monsters.filter((m) => m.alive).map((m) => key(m.x, m.y))
  );

  for (const monster of hunters) {
    if ((monster.slowed ?? 0) > 0) {
      monster.slowed -= 1;
      continue;
    }

    const cheb = chebyshev(monster.x, monster.y, hero.x, hero.y);
    const manh = manhattan(monster.x, monster.y, hero.x, hero.y);

    if (canMonsterAttackHero(map, monster, hero)) {
      if (monster.ranged && cheb > 1) {
        return { monster, distance: manh };
      }
      if (cheb <= 1) {
        return { monster, distance: 1 };
      }
    }

    const blocked = new Set(occupied);
    blocked.delete(key(monster.x, monster.y));

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
