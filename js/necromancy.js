import { randInt, manhattan, key } from './utils.js';
import { isWalkable } from './dungeon.js';
import { getProfession } from './classes.js';
import { getLuck, rollLuck } from './luck.js';
import { calcMonsterDamage, canMonsterHitHero } from './monsters.js';
import { ensureHeroMana } from './items.js';
import { getIntelligenceSpellBonus } from './attributes.js';

function getTotalAtk(hero) {
  return hero.atk + (hero.weapon?.atk ?? 0) + (hero.armor?.atk ?? 0) + getIntelligenceSpellBonus(hero);
}

function getTotalDef(hero) {
  return hero.def + (hero.armor?.def ?? 0);
}

export const NECRO_SPELLS = {
  deathBolt: {
    id: 'deathBolt',
    name: 'Стрела смерти',
    color: '#88ff44',
    range: 3,
    mult: 1.1,
    bonus: 3,
    manaCost: 5,
  },
  drain: {
    id: 'drain',
    name: 'Вампиризм',
    color: '#cc0044',
    range: 2,
    mult: 1.25,
    bonus: 2,
    lifesteal: 0.5,
    manaCost: 6,
  },
  curse: {
    id: 'curse',
    name: 'Проклятие',
    color: '#660066',
    range: 3,
    mult: 0.85,
    bonus: 1,
    curseAtk: 3,
    curseTurns: 3,
    manaCost: 5,
  },
  plague: {
    id: 'plague',
    name: 'Чума',
    color: '#448822',
    range: 2,
    mult: 0.9,
    bonus: 2,
    decayTurns: 3,
    decayDmg: 3,
    manaCost: 6,
  },
  boneArmor: {
    id: 'boneArmor',
    name: 'Костяная броня',
    color: '#ccccaa',
    range: 0,
    defBonus: 4,
    manaCost: 5,
  },
  shadowVeil: {
    id: 'shadowVeil',
    name: 'Покров теней',
    color: '#5f78d8',
    range: 0,
    dodgeBonus: 0.18,
    turns: 4,
    manaCost: 6,
  },
  soulWard: {
    id: 'soulWard',
    name: 'Духовный заслон',
    color: '#7fd4ff',
    range: 0,
    absorbPct: 0.35,
    absorbFlat: 4,
    turns: 3,
    manaCost: 7,
  },
};

export function getNecromancerAttackRange() {
  return NECRO_SPELLS.deathBolt.range;
}

export function getMaxMinions(hero) {
  if (hero.profession !== 'necromancer') return 0;
  const prof = getProfession(hero.profession);
  const base = prof.minionLimitBase ?? 2;
  const step = prof.minionLimitLevelStep ?? 2;
  return base + Math.floor(hero.level / step);
}

export function countAliveMinions(minions) {
  return minions.filter((s) => s.alive).length;
}

function chooseNecroSpell(hero, monster, monsters, distance) {
  const hpPct = hero.hp / hero.maxHp;

  if (hpPct < 0.4 && distance <= 1) {
    return NECRO_SPELLS.boneArmor;
  }

  if (!hero.necroSoulWard && hpPct < 0.5) {
    return NECRO_SPELLS.soulWard;
  }

  if (!hero.necroVeilTurns && hpPct < 0.68 && monster.atk >= 4) {
    return NECRO_SPELLS.shadowVeil;
  }

  if (hpPct < 0.5 && distance <= NECRO_SPELLS.drain.range) {
    return NECRO_SPELLS.drain;
  }

  const clustered = monsters.filter(
    (m) => m.alive && m !== monster && manhattan(monster.x, monster.y, m.x, m.y) <= 2
  ).length;

  if (clustered >= 1 && distance <= NECRO_SPELLS.plague.range) {
    return NECRO_SPELLS.plague;
  }

  if (monster.atk >= 5 && !(monster.cursed > 0)) {
    return NECRO_SPELLS.curse;
  }

  if (distance <= NECRO_SPELLS.drain.range && hpPct < 0.7) {
    return NECRO_SPELLS.drain;
  }

  return NECRO_SPELLS.deathBolt;
}

function applyCounter(hero, monster) {
  if (monster.hp <= 0) return 0;
  if (!canMonsterHitHero(monster, hero)) return 0;
  return calcMonsterDamage(monster, hero);
}

export function necromancerCombatRound(hero, monster, monsters, distance = 1) {
  const spell = chooseNecroSpell(hero, monster, monsters, distance);
  const result = {
    heroDmg: 0,
    monsterDmg: 0,
    monsterDead: false,
    heroDead: false,
    attackLabel: spell.name,
    spell,
    ranged: distance > 1,
    drained: 0,
    shielded: false,
    cursed: false,
    plagued: false,
    veiled: false,
    soulWarded: false,
  };

  hero.magicShield = 0;

  const manaCost = spell.manaCost ?? 0;
  if (manaCost && !ensureHeroMana(hero, manaCost)) {
    result.heroDmg = Math.max(1, Math.floor(getTotalAtk(hero) * 0.35) + randInt(0, 1));
    monster.hp -= result.heroDmg;
    result.attackLabel = 'Посох';
    result.monsterDmg = applyCounter(hero, monster);
    hero.hp -= result.monsterDmg;
    result.monsterDead = monster.hp <= 0;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  if (spell.id === 'boneArmor') {
    hero.magicShield = spell.defBonus;
    result.shielded = true;
    result.heroDmg = Math.max(1, Math.floor(getTotalAtk(hero) * 0.5) + randInt(0, 2));
    monster.hp -= result.heroDmg;
    result.monsterDmg = applyCounter(hero, monster);
    hero.hp -= result.monsterDmg;
    result.monsterDead = monster.hp <= 0;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  if (spell.id === 'shadowVeil') {
    const prev = hero.necroVeilDodge ?? 0;
    if (prev > 0) {
      hero.dodgeBonus = Math.max(0, (hero.dodgeBonus ?? 0) - prev);
    }
    hero.necroVeilDodge = spell.dodgeBonus ?? 0.18;
    hero.necroVeilTurns = spell.turns ?? 4;
    hero.dodgeBonus = (hero.dodgeBonus ?? 0) + hero.necroVeilDodge;
    result.veiled = true;
    result.monsterDmg = applyCounter(hero, monster);
    hero.hp -= result.monsterDmg;
    result.monsterDead = monster.hp <= 0;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  if (spell.id === 'soulWard') {
    hero.necroSoulWard = Math.floor(hero.maxHp * (spell.absorbPct ?? 0.35)) + (spell.absorbFlat ?? 4);
    hero.necroSoulWardTurns = spell.turns ?? 3;
    result.soulWarded = true;
    result.monsterDmg = applyCounter(hero, monster);
    if (result.monsterDmg > 0) {
      const absorbed = Math.min(hero.necroSoulWard, result.monsterDmg);
      hero.necroSoulWard -= absorbed;
      result.monsterDmg -= absorbed;
      if (hero.necroSoulWard <= 0) hero.necroSoulWardTurns = 0;
    }
    hero.hp -= result.monsterDmg;
    result.monsterDead = monster.hp <= 0;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  result.heroDmg = Math.max(
    1,
    Math.floor(getTotalAtk(hero) * spell.mult) + spell.bonus + randInt(-1, 2)
  );
  monster.hp -= result.heroDmg;

  if (spell.lifesteal && result.heroDmg > 0) {
    result.drained = Math.min(
      Math.floor(result.heroDmg * spell.lifesteal),
      hero.maxHp - hero.hp
    );
    hero.hp += result.drained;
  }

  if (spell.curseTurns && monster.hp > 0) {
    monster.cursed = spell.curseTurns;
    monster.curseAtkRed = spell.curseAtk;
    result.cursed = true;
  }

  if (spell.decayTurns && monster.hp > 0) {
    monster.decay = Math.max(monster.decay ?? 0, spell.decayTurns);
    monster.decayDmg = spell.decayDmg;
    result.plagued = true;
  }

  result.monsterDead = monster.hp <= 0;
  if (monster.hp <= 0) monster.alive = false;

  if (monster.hp > 0) {
    result.monsterDmg = applyCounter(hero, monster);
    hero.hp -= result.monsterDmg;
  }

  result.heroDead = hero.hp <= 0;
  return result;
}

export function tickNecroEffects(hero) {
  if (!hero) return null;
  const events = [];

  if (hero.necroVeilTurns > 0) {
    hero.necroVeilTurns -= 1;
    if (hero.necroVeilTurns <= 0) {
      const dodge = hero.necroVeilDodge ?? 0;
      if (dodge > 0) {
        hero.dodgeBonus = Math.max(0, (hero.dodgeBonus ?? 0) - dodge);
      }
      hero.necroVeilDodge = 0;
      events.push({ expired: 'shadowVeil' });
    }
  }

  if (hero.necroSoulWardTurns > 0) {
    hero.necroSoulWardTurns -= 1;
    if (hero.necroSoulWardTurns <= 0) {
      hero.necroSoulWard = 0;
      events.push({ expired: 'soulWard' });
    }
  }

  return events.length ? events : null;
}

export function tickMonsterDecay(monsters) {
  const hits = [];
  for (const m of monsters) {
    if (!m.alive || !m.decay || m.decay <= 0) continue;
    m.decay -= 1;
    const dmg = m.decayDmg ?? 3;
    m.hp -= dmg;
    hits.push({ monster: m, damage: dmg, dead: m.hp <= 0 });
    if (m.hp <= 0) m.alive = false;
  }
  return hits;
}

export function tickMonsterCurses(monsters) {
  for (const m of monsters) {
    if (!m.alive || !m.cursed || m.cursed <= 0) continue;
    m.cursed -= 1;
    if (m.cursed <= 0) m.curseAtkRed = 0;
  }
  for (const m of monsters) {
    if (!m.alive || !m.weakened || m.weakened <= 0) continue;
    m.weakened -= 1;
    if (m.weakened <= 0) m.weakenAtkRed = 0;
  }
}

export function tryRaiseSkeleton(hero, monster, minions, map, monsters) {
  if (hero.profession !== 'necromancer') return null;
  if (countAliveMinions(minions) >= getMaxMinions(hero)) return null;
  const raiseChance = Math.min(0.9, 0.65 + getLuck(hero) * 0.012 + (hero.bonusNecro ?? 0));
  if (Math.random() > raiseChance) return null;

  const occupied = new Set([
    key(hero.x, hero.y),
    ...monsters.filter((m) => m.alive).map((m) => key(m.x, m.y)),
    ...minions.filter((s) => s.alive).map((s) => key(s.x, s.y)),
  ]);

  const spots = [{ x: monster.x, y: monster.y }];
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    spots.push({ x: monster.x + dx, y: monster.y + dy });
  }

  for (const pos of spots) {
    const k = key(pos.x, pos.y);
    if (!isWalkable(map, pos.x, pos.y) || occupied.has(k)) continue;
    return {
      id: `sk-${Date.now()}-${randInt(0, 999)}`,
      x: pos.x,
      y: pos.y,
      hp: 10 + hero.level * 2,
      maxHp: 10 + hero.level * 2,
      atk: 3 + Math.floor(hero.level / 2),
      name: 'скелет',
      alive: true,
    };
  }
  return null;
}

export function processMinions(minions, monsters, map) {
  const events = [];
  const alive = minions.filter((s) => s.alive);

  for (const sk of alive) {
    const target = monsters
      .filter((m) => m.alive && manhattan(sk.x, sk.y, m.x, m.y) <= 1)
      .sort((a, b) => manhattan(sk.x, sk.y, a.x, a.y) - manhattan(sk.x, sk.y, b.x, b.y))[0];

    if (target) {
      const dmg = Math.max(1, sk.atk + randInt(-1, 1));
      target.hp -= dmg;
      events.push({ type: 'attack', skeleton: sk, monster: target, damage: dmg });
      if (target.hp <= 0) {
        target.alive = false;
        events.push({ type: 'kill', skeleton: sk, monster: target });
      }
      continue;
    }

    const nearest = monsters
      .filter((m) => m.alive)
      .map((m) => ({ m, d: manhattan(sk.x, sk.y, m.x, m.y) }))
      .sort((a, b) => a.d - b.d)[0];

    if (!nearest || nearest.d <= 1) continue;

    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    let best = null;
    for (const [dx, dy] of dirs) {
      const nx = sk.x + dx;
      const ny = sk.y + dy;
      if (!isWalkable(map, nx, ny)) continue;
      const blocked = monsters.some((m) => m.alive && m.x === nx && m.y === ny)
        || minions.some((s) => s.alive && s !== sk && s.x === nx && s.y === ny);
      if (blocked) continue;
      const d = manhattan(nx, ny, nearest.m.x, nearest.m.y);
      if (!best || d < best.d) best = { x: nx, y: ny, d };
    }

    if (best) {
      sk.x = best.x;
      sk.y = best.y;
      events.push({ type: 'move', skeleton: sk });
    }
  }

  return events;
}
