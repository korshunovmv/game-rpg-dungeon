import { randInt, chebyshev } from './utils.js';
import { getProfession, getAttackRange } from './classes.js';
import { getTotalAtk } from './items.js';
import { applyMonsterAttack, canMonsterHitHero } from './monsters.js';
import { mageCombatRound } from './magic.js';
import { necromancerCombatRound } from './necromancy.js';
import { rollLuck, luckCritBonus } from './luck.js';
import { generateHeroName } from './names.js';
import { initHeroSkills } from './skills.js';
import { getHeroMaxMana } from './attributes.js';

export function createHero(spawn, professionId = 'warrior') {
  const prof = getProfession(professionId);
  const baseAttributes = {
    strength: prof.attributes?.strength ?? 5,
    dexterity: prof.attributes?.dexterity ?? 5,
    intelligence: prof.attributes?.intelligence ?? 5,
    perception: prof.attributes?.perception ?? 5,
    endurance: prof.attributes?.endurance ?? 5,
  };
  const hero = {
    name: generateHeroName(),
    profession: professionId,
    professionName: prof.name,
    color: prof.color,
    x: spawn.x,
    y: spawn.y,
    hp: prof.hp,
    maxHp: prof.hp,
    baseMaxHp: prof.hp,
    atk: prof.atk,
    def: prof.def,
    ...baseAttributes,
    weapon: null,
    armor: null,
    level: 1,
    xp: 0,
    xpToLevel: 20,
    gold: 0,
    floor: 1,
    poison: 0,
    slowed: 0,
    magicShield: 0,
    healFlasks: [],
    manaFlasks: [],
    alive: true,
    facing: 'down',
    animFrame: 0,
    skills: {},
  };
  initHeroSkills(hero);
  if (professionId === 'mage' || professionId === 'necromancer') {
    hero.maxMana = getHeroMaxMana(hero);
    hero.mana = hero.maxMana;
  }
  return hero;
}

export function levelUp(hero) {
  const growth = getProfession(hero.profession).levelGrowth;
  hero.level += 1;
  hero.baseMaxHp += growth.hp;
  hero.hp = hero.baseMaxHp + (hero.armor?.hp ?? 0);
  hero.maxHp = hero.baseMaxHp + (hero.armor?.hp ?? 0);
  hero.atk += growth.atk;
  hero.def += growth.def;
  if (hero.maxMana) {
    const prevMaxMana = hero.maxMana;
    hero.maxMana = getHeroMaxMana(hero);
    hero.mana = Math.min(hero.maxMana, hero.mana + (hero.maxMana - prevMaxMana));
  }
  hero.xpToLevel = Math.floor(hero.xpToLevel * 1.5);
  return hero;
}

export function gainXp(hero, amount) {
  hero.xp += amount;
  const leveled = [];
  while (hero.xp >= hero.xpToLevel) {
    hero.xp -= hero.xpToLevel;
    levelUp(hero);
    leveled.push(hero.level);
  }
  return leveled;
}

export function combatRound(hero, monster, distance = 1, monsters = []) {
  if (hero.profession === 'mage') {
    return mageCombatRound(hero, monster, monsters, distance);
  }
  if (hero.profession === 'necromancer') {
    return necromancerCombatRound(hero, monster, monsters, distance);
  }

  const prof = getProfession(hero.profession);
  const heroRange = getAttackRange(hero);
  const fightDist = heroRange <= 1
    ? chebyshev(hero.x, hero.y, monster.x, monster.y)
    : distance;
  let heroDmg = 0;
  let crit = false;

  if (fightDist <= heroRange) {
    heroDmg = Math.max(1, getTotalAtk(hero) + randInt(-1, 2) - randInt(0, 1));
    if (prof.magicBonus) {
      heroDmg += prof.magicBonus + randInt(0, 2);
    }

    crit = rollLuck(hero, 0.04 + luckCritBonus(hero));
    if (crit) heroDmg = Math.floor(heroDmg * 1.5);
    monster.hp -= heroDmg;
  }

  let monsterDmg = 0;
  if (monster.hp > 0 && canMonsterHitHero(monster, hero)) {
    monsterDmg = applyMonsterAttack(hero, monster);
  }

  return {
    heroDmg,
    monsterDmg,
    monsterDead: monster.hp <= 0,
    heroDead: hero.hp <= 0,
    attackLabel: prof.attackLabel,
    ranged: heroRange > 1 && fightDist > 1,
    crit,
  };
}

export { collectItem } from './items.js';

export function updateFacing(hero, dx, dy) {
  if (dy < 0) hero.facing = 'up';
  else if (dy > 0) hero.facing = 'down';
  else if (dx < 0) hero.facing = 'left';
  else if (dx > 0) hero.facing = 'right';
}
