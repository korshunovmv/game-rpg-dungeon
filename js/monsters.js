import { randInt, isMeleeAdjacent, manhattan } from './utils.js';
import { getTotalDef } from './items.js';

export const MONSTER_TYPES = {
  goblin: {
    name: 'гоблин',
    hpMod: 1,
    atkMod: 1,
    color: '#44aa44',
  },
  skeleton: {
    name: 'скелет',
    hpMod: 0.95,
    atkMod: 1,
    color: '#ddddcc',
  },
  slime: {
    name: 'слизь',
    hpMod: 1.25,
    atkMod: 0.75,
    color: '#66cc88',
  },
  ratling: {
    name: 'крысолюд',
    hpMod: 0.85,
    atkMod: 0.9,
    color: '#aa8866',
  },
  ghost: {
    name: 'призрак',
    hpMod: 0.75,
    atkMod: 1.05,
    color: '#aaaaff',
    ranged: true,
    attackRange: 3,
    projectileKind: 'bolt',
    projectileColor: '#aaaaff',
  },
  orc: {
    name: 'орк',
    hpMod: 1.3,
    atkMod: 1.15,
    color: '#cc5544',
  },
  archer: {
    name: 'лучник',
    hpMod: 0.8,
    atkMod: 1,
    color: '#88aa44',
    ranged: true,
    attackRange: 4,
    projectileKind: 'arrow',
    projectileColor: '#ccaa66',
  },
  shaman: {
    name: 'шаман',
    hpMod: 0.9,
    atkMod: 1.1,
    color: '#66aa66',
    ranged: true,
    attackRange: 3,
    projectileKind: 'bolt',
    projectileColor: '#88ff88',
  },
};

const SPAWN_POOL = [
  { id: 'goblin', weight: 18 },
  { id: 'skeleton', weight: 16 },
  { id: 'slime', weight: 14 },
  { id: 'ratling', weight: 12 },
  { id: 'ghost', weight: 10 },
  { id: 'orc', weight: 12 },
  { id: 'archer', weight: 10 },
  { id: 'shaman', weight: 8 },
];

const RANGED_BY_BASE = {
  призрак: MONSTER_TYPES.ghost,
  лучник: MONSTER_TYPES.archer,
  шаман: MONSTER_TYPES.shaman,
};

function pickMonsterType() {
  const total = SPAWN_POOL.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of SPAWN_POOL) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return SPAWN_POOL[0].id;
}

export function getMonsterAttackRange(monster) {
  return monster.attackRange ?? 1;
}

export function canMonsterHitHero(monster, hero) {
  if (isMeleeAdjacent(monster.x, monster.y, hero.x, hero.y)) {
    return true;
  }
  if (!monster.ranged) return false;
  return manhattan(monster.x, monster.y, hero.x, hero.y) <= getMonsterAttackRange(monster);
}

export function canMonsterAttackAtDistance(monster, distance) {
  if (distance <= 1) return true;
  return !!monster.ranged && distance <= getMonsterAttackRange(monster);
}

export function calcMonsterDamage(monster, hero) {
  if (!canMonsterHitHero(monster, hero)) return 0;

  const def = getTotalDef(hero) + (hero.magicShield ?? 0);
  const atk = Math.max(
    1,
    (monster.atk ?? 2) - (monster.curseAtkRed ?? 0) - (monster.weakenAtkRed ?? 0)
  );
  const inMelee = isMeleeAdjacent(monster.x, monster.y, hero.x, hero.y);

  if (inMelee) {
    return Math.max(1, atk + randInt(-1, 1) - def);
  }

  return Math.max(1, atk + randInt(-1, 1) - Math.floor(def * 0.55));
}

export function applyMonsterAttack(hero, monster) {
  if (hero?.dodgeBonus && Math.random() < Math.min(0.75, hero.dodgeBonus)) {
    return 0;
  }
  const dmg = calcMonsterDamage(monster, hero);
  if (dmg > 0) hero.hp -= dmg;
  return dmg;
}

export function createMonster(floor, pos, index) {
  const typeId = pickMonsterType();
  const type = MONSTER_TYPES[typeId];
  const hp = Math.floor((8 + floor * 4 + randInt(0, 6)) * (type.hpMod ?? 1));
  const atk = Math.floor((2 + floor + randInt(0, 2)) * (type.atkMod ?? 1));

  return {
    id: `m-${index}-${Date.now()}`,
    x: pos.x,
    y: pos.y,
    name: type.name,
    baseName: type.name,
    hp,
    maxHp: hp,
    atk,
    xp: 5 + floor * 3 + (type.ranged ? 2 : 0),
    alive: true,
    color: type.color,
    ranged: type.ranged ?? false,
    attackRange: type.attackRange ?? 1,
    projectileKind: type.projectileKind ?? 'arrow',
    projectileColor: type.projectileColor ?? '#cc8888',
    weakened: 0,
    weakenAtkRed: 0,
  };
}

export function applyRangedTraits(monster, baseName) {
  const template = RANGED_BY_BASE[baseName];
  if (!template?.ranged) return monster;

  monster.ranged = true;
  monster.attackRange = template.attackRange ?? 3;
  monster.projectileKind = template.projectileKind ?? 'arrow';
  monster.projectileColor = template.projectileColor ?? '#cc8888';
  if (template.color && !monster.color) monster.color = template.color;
  return monster;
}

export function monsterSnipeRound(hero, monster) {
  const monsterDmg = applyMonsterAttack(hero, monster);
  const manh = manhattan(monster.x, monster.y, hero.x, hero.y);
  return {
    heroDmg: 0,
    monsterDmg,
    monsterDead: false,
    heroDead: hero.hp <= 0,
    attackLabel: '',
    ranged: true,
    monsterShot: true,
    shotDistance: manh,
  };
}
