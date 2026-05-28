import { shuffle } from './utils.js';
import { getProfession } from './classes.js';
import { recalcMaxHp } from './items.js';
import { getPerceptionVisionBonus } from './attributes.js';

export const SKILL_DEFS = {
  strength: {
    id: 'strength',
    name: 'Сила',
    desc: '+1 ATK за уровень',
    classes: ['warrior', 'archer'],
  },
  vitality: {
    id: 'vitality',
    name: 'Живучесть',
    desc: '+4 HP за уровень',
  },
  toughness: {
    id: 'toughness',
    name: 'Твёрдость',
    desc: '+1 DEF за уровень',
    classes: ['warrior'],
  },
  fortune: {
    id: 'fortune',
    name: 'Удача',
    desc: '+1 удачи за уровень',
    classes: ['thief', 'archer'],
  },
  greed: {
    id: 'greed',
    name: 'Жадность',
    desc: '+3% золота за уровень',
    classes: ['thief'],
  },
  precision: {
    id: 'precision',
    name: 'Меткость',
    desc: '+2% крита за уровень',
    classes: ['archer', 'warrior'],
  },
  vision: {
    id: 'vision',
    name: 'Зоркость',
    desc: '+1 обзор за уровень',
    classes: ['archer', 'thief'],
  },
  arcane: {
    id: 'arcane',
    name: 'Тайна',
    desc: '+1 маг. урона за уровень',
    classes: ['mage', 'necromancer'],
  },
  necromancy: {
    id: 'necromancy',
    name: 'Некромантия',
    desc: '+3% поднять скелета',
    classes: ['necromancer'],
  },
  regeneration: {
    id: 'regeneration',
    name: 'Регенерация',
    desc: '+2 HP при спуске',
  },
};

export const CLASS_STARTER_SKILL = {
  warrior: 'strength',
  archer: 'precision',
  mage: 'arcane',
  thief: 'fortune',
  necromancer: 'necromancy',
};

const MAX_SKILL_LEVEL = 10;

const CLASS_SKILL_WEIGHTS = {
  warrior: {
    toughness: 3.2,
    vitality: 2.4,
    strength: 2.1,
    precision: 1.15,
  },
  archer: {
    precision: 3.1,
    vision: 2.6,
    strength: 1.6,
    fortune: 1.5,
  },
  thief: {
    fortune: 2.9,
    greed: 2.6,
    vision: 1.8,
    vitality: 1.35,
  },
  mage: {
    arcane: 3.4,
    vitality: 1.6,
    regeneration: 1.45,
  },
  necromancer: {
    necromancy: 3.25,
    arcane: 2.3,
    vitality: 1.65,
    regeneration: 1.35,
  },
};

export function initHeroSkills(hero) {
  hero.skills = hero.skills ?? {};
  const starter = CLASS_STARTER_SKILL[hero.profession];
  if (starter && !hero.skills[starter]) {
    hero.skills[starter] = 1;
  }
  applySkillBonuses(hero);
}

export function getSkillLevel(hero, skillId) {
  return hero.skills?.[skillId] ?? 0;
}

export function getSkillDef(skillId) {
  return SKILL_DEFS[skillId];
}

export function applySkillBonuses(hero) {
  const s = hero.skills ?? {};
  hero.bonusAtk = (s.strength ?? 0) * 1;
  hero.bonusDef = (s.toughness ?? 0) * 1;
  hero.bonusHp = (s.vitality ?? 0) * 4;
  hero.bonusLuck = (s.fortune ?? 0) * 1;
  hero.bonusVision = (s.vision ?? 0) * 1;
  hero.bonusCrit = (s.precision ?? 0) * 0.02;
  hero.bonusGoldPct = (s.greed ?? 0) * 0.03;
  hero.bonusMagic = (s.arcane ?? 0) * 1;
  hero.bonusNecro = (s.necromancy ?? 0) * 0.03;
  hero.bonusRegen = (s.regeneration ?? 0) * 2;
  recalcMaxHp(hero);
}

export function getHeroVision(hero) {
  const prof = getProfession(hero.profession);
  return prof.vision + (hero.bonusVision ?? 0) + getPerceptionVisionBonus(hero);
}

export function getHeroSkillsList(hero) {
  return Object.entries(hero.skills ?? {})
    .filter(([, lv]) => lv > 0)
    .map(([id, lv]) => ({ ...SKILL_DEFS[id], level: lv }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function pickSkillToGrow(hero) {
  const growable = Object.keys(hero.skills ?? {}).filter(
    (id) => hero.skills[id] > 0 && hero.skills[id] < MAX_SKILL_LEVEL
  );
  if (growable.length) {
    const classWeights = CLASS_SKILL_WEIGHTS[hero.profession] ?? {};
    const weighted = growable.map((id) => {
      const lv = hero.skills[id] ?? 0;
      const weight = (classWeights[id] ?? 1) * (1 + (MAX_SKILL_LEVEL - lv) * 0.05);
      return { id, weight: Math.max(0.1, weight) };
    });
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.id;
    }
    return weighted[0].id;
  }

  const pool = Object.keys(SKILL_DEFS).filter((id) => isSkillAvailable(hero, id));
  if (pool.length) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return CLASS_STARTER_SKILL[hero.profession] ?? 'vitality';
}

export function growSkillOnLevelUp(hero) {
  initHeroSkills(hero);
  const skillId = pickSkillToGrow(hero);
  hero.skills[skillId] = Math.min(MAX_SKILL_LEVEL, (hero.skills[skillId] ?? 0) + 1);
  applySkillBonuses(hero);
  return SKILL_DEFS[skillId];
}

export function learnSkill(hero, skillId) {
  initHeroSkills(hero);
  const def = SKILL_DEFS[skillId];
  if (!def) return null;
  const next = Math.min(MAX_SKILL_LEVEL, (hero.skills[skillId] ?? 0) + 1);
  hero.skills[skillId] = next;
  applySkillBonuses(hero);
  return { ...def, level: next };
}

export function learnRandomSkill(hero) {
  const pool = Object.keys(SKILL_DEFS).filter((id) => isSkillAvailable(hero, id));
  if (!pool.length) return null;
  const skillId = pool[Math.floor(Math.random() * pool.length)];
  return learnSkill(hero, skillId);
}

function isSkillAvailable(hero, skillId) {
  const def = SKILL_DEFS[skillId];
  if (!def) return false;
  if (def.classes && !def.classes.includes(hero.profession)) return false;
  return getSkillLevel(hero, skillId) < MAX_SKILL_LEVEL;
}

export function rollSkillChoices(hero, count = 3) {
  const pool = Object.keys(SKILL_DEFS).filter((id) => isSkillAvailable(hero, id));
  if (!pool.length) return [];
  return shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((id) => ({
      ...SKILL_DEFS[id],
      level: getSkillLevel(hero, id),
      nextLevel: Math.min(MAX_SKILL_LEVEL, getSkillLevel(hero, id) + 1),
    }));
}

export function shouldPickSkillOnLevel(level) {
  return level > 0 && level % 3 === 0;
}
