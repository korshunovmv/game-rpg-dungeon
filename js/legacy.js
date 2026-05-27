import { isWalkable } from './dungeon.js';
import { MAP_W, MAP_H } from './config.js';
import { manhattan } from './utils.js';
import { getSkillDef, initHeroSkills, applySkillBonuses } from './skills.js';
import { recalcMaxHp } from './items.js';
import { resolveWeaponSpriteId, resolveArmorSpriteId } from './sprites.js';
import { canHeroEquipWeapon } from './classes.js';

const STORAGE_KEY = 'dungeon_legacies';
const MAX_LEGACIES = 8;

export function loadLegacies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveLegacies(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_LEGACIES)));
  } catch {
    /* ignore quota errors */
  }
}

function pickLegacyGift(hero) {
  const options = [];

  if (hero.weapon?.name) {
    options.push({
      kind: 'weapon',
      name: hero.weapon.name,
      atk: hero.weapon.atk ?? 1,
      color: hero.weapon.color ?? '#cccccc',
    });
  }

  if (hero.armor?.name) {
    options.push({
      kind: 'armor',
      name: hero.armor.name,
      def: hero.armor.def ?? 1,
      hp: hero.armor.hp ?? 0,
      atk: hero.armor.atk ?? 0,
      color: hero.armor.color ?? '#888899',
    });
  }

  for (const [id, level] of Object.entries(hero.skills ?? {})) {
    if (level > 0 && getSkillDef(id)) {
      options.push({ kind: 'skill', id, level });
    }
  }

  if (options.length) {
    return options[Math.floor(Math.random() * options.length)];
  }

  return {
    kind: 'gold',
    value: 15 + hero.level * 8 + hero.floor * 5 + Math.floor(hero.gold * 0.2),
  };
}

export function describeLegacyGift(gift) {
  if (!gift) return 'след';
  if (gift.kind === 'weapon') return `${gift.name} (+${gift.atk} ATK)`;
  if (gift.kind === 'armor') return `${gift.name} (+${gift.def} DEF)`;
  if (gift.kind === 'skill') {
    const def = getSkillDef(gift.id);
    return `${def?.name ?? gift.id} (ур. ${gift.level})`;
  }
  return `${gift.value} золота`;
}

export function registerDeathLegacy(hero, floor, x, y, floorSeed) {
  if (floorSeed == null) return null;

  const legacy = {
    id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    floor,
    x,
    y,
    seed: floorSeed >>> 0,
    heroName: hero.name,
    professionName: hero.professionName,
    gift: pickLegacyGift(hero),
    claimed: false,
    createdAt: Date.now(),
  };

  const list = loadLegacies()
    .filter((entry) => !entry.claimed && entry.floor !== floor);
  list.unshift(legacy);
  saveLegacies(list);
  return legacy;
}

export function claimLegacy(legacyId) {
  const list = loadLegacies();
  let found = null;
  for (const entry of list) {
    if (entry.id === legacyId) {
      entry.claimed = true;
      found = entry;
    }
  }
  saveLegacies(list);
  return found;
}

export function getUnclaimedLegacies() {
  return loadLegacies().filter((entry) => !entry.claimed);
}

export function getLegacyForFloor(floor, legacies = getUnclaimedLegacies()) {
  return legacies.find((entry) => entry.floor === floor) ?? null;
}

function findNearestFloor(map, x, y) {
  if (isWalkable(map, x, y)) return { x, y };

  let best = null;
  let bestDist = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!isWalkable(map, nx, ny)) continue;
      const d = manhattan(nx, ny, x, y);
      if (d < bestDist) {
        bestDist = d;
        best = { x: nx, y: ny };
      }
    }
  }

  if (best) return best;

  for (let r = 2; r <= 6; r++) {
    for (let ny = y - r; ny <= y + r; ny++) {
      for (let nx = x - r; nx <= x + r; nx++) {
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        if (!isWalkable(map, nx, ny)) continue;
        const d = manhattan(nx, ny, x, y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: nx, y: ny };
        }
      }
    }
    if (best) return best;
  }

  return null;
}

export function createGraveItem(legacy, x, y) {
  return {
    id: `grave-${legacy.id}`,
    legacyId: legacy.id,
    type: 'grave',
    x,
    y,
    heroName: legacy.heroName,
    professionName: legacy.professionName,
    gift: legacy.gift,
    giftLabel: describeLegacyGift(legacy.gift),
    collected: false,
  };
}

export function placeGraveOnFloor(items, monsters, map, legacy) {
  const pos = findNearestFloor(map, legacy.x, legacy.y);
  if (!pos) return null;

  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    if (m.alive && m.x === pos.x && m.y === pos.y) {
      monsters.splice(i, 1);
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (!item.collected && item.x === pos.x && item.y === pos.y) {
      items.splice(i, 1);
    }
  }

  const grave = createGraveItem(legacy, pos.x, pos.y);
  items.push(grave);
  return grave;
}

function equipLegacyWeapon(hero, gift) {
  hero.weapon = {
    name: gift.name,
    atk: gift.atk,
    color: gift.color,
    spriteId: gift.spriteId ?? resolveWeaponSpriteId(gift.name),
  };
}

function equipLegacyArmor(hero, gift) {
  hero.armor = {
    name: gift.name,
    def: gift.def,
    hp: gift.hp ?? 0,
    atk: gift.atk ?? 0,
    color: gift.color,
    spriteId: gift.spriteId ?? resolveArmorSpriteId(gift.name),
  };
  recalcMaxHp(hero);
}

function grantLegacySkill(hero, gift) {
  initHeroSkills(hero);
  const prev = hero.skills[gift.id] ?? 0;
  hero.skills[gift.id] = Math.max(prev, gift.level);
  applySkillBonuses(hero);
}

export function collectLegacyGrave(hero, item) {
  if (item.collected || item.type !== 'grave') return null;
  item.collected = true;

  const gift = item.gift;
  claimLegacy(item.legacyId);

  if (gift.kind === 'weapon') {
    if (canHeroEquipWeapon(hero, gift)) {
      equipLegacyWeapon(hero, gift);
      return {
        type: 'legacy_weapon',
        name: gift.name,
        atk: gift.atk,
        heroName: item.heroName,
        equipped: true,
      };
    }

    const value = 10 + gift.atk * 3;
    hero.gold += value;
    return {
      type: 'legacy_gold',
      value,
      heroName: item.heroName,
      unusableWeapon: gift.name,
    };
  }

  if (gift.kind === 'armor') {
    equipLegacyArmor(hero, gift);
    return {
      type: 'legacy_armor',
      name: gift.name,
      def: gift.def,
      heroName: item.heroName,
      equipped: true,
    };
  }

  if (gift.kind === 'skill') {
    grantLegacySkill(hero, gift);
    const def = getSkillDef(gift.id);
    return {
      type: 'legacy_skill',
      name: def?.name ?? gift.id,
      level: hero.skills[gift.id],
      heroName: item.heroName,
    };
  }

  hero.gold += gift.value;
  return {
    type: 'legacy_gold',
    value: gift.value,
    heroName: item.heroName,
  };
}
