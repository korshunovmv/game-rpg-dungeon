import { randInt, manhattan } from './utils.js';
import { calcMonsterDamage, canMonsterHitHero } from './monsters.js';

function getTotalAtk(hero) {
  return hero.atk + (hero.weapon?.atk ?? 0) + (hero.armor?.atk ?? 0);
}

function getTotalDef(hero) {
  return hero.def + (hero.armor?.def ?? 0);
}

export const SPELLS = {
  fireball: {
    id: 'fireball',
    name: 'Огненный шар',
    color: '#ff6600',
    range: 3,
    mult: 1.15,
    bonus: 4,
  },
  ice: {
    id: 'ice',
    name: 'Ледяной луч',
    color: '#66ccff',
    range: 3,
    mult: 0.95,
    bonus: 2,
    slow: 2,
  },
  lightning: {
    id: 'lightning',
    name: 'Молния',
    color: '#ffff44',
    range: 4,
    mult: 1.0,
    bonus: 3,
    executeBelow: 0.35,
    executeMult: 1.75,
  },
  arcane: {
    id: 'arcane',
    name: 'Тайная волна',
    color: '#bb66ff',
    range: 2,
    mult: 0.8,
    bonus: 2,
    aoe: 1,
  },
  heal: {
    id: 'heal',
    name: 'Исцеление',
    color: '#44ffaa',
    range: 0,
    healPct: 0.28,
  },
  shield: {
    id: 'shield',
    name: 'Магический щит',
    color: '#4488ff',
    range: 0,
    defBonus: 5,
  },
};

export function getMageAttackRange() {
  return SPELLS.lightning.range;
}

export function chooseSpell(hero, monster, monsters, distance) {
  const hpPct = hero.hp / hero.maxHp;
  const mHpPct = monster.hp / monster.maxHp;
  const nearby = monsters.filter(
    (m) => m.alive && m !== monster && manhattan(monster.x, monster.y, m.x, m.y) <= 1
  ).length;

  if (hpPct < 0.42 && (distance > 1 || mHpPct > 0.5)) {
    return SPELLS.heal;
  }

  if (hpPct < 0.55 && distance <= 1 && !hero.magicShield) {
    return SPELLS.shield;
  }

  if (nearby >= 1 && distance <= SPELLS.arcane.range) {
    return SPELLS.arcane;
  }

  if (mHpPct <= SPELLS.lightning.executeBelow && distance <= SPELLS.lightning.range) {
    return SPELLS.lightning;
  }

  if (distance <= 1 && monster.atk >= 4) {
    return SPELLS.ice;
  }

  if (distance <= SPELLS.fireball.range) {
    return SPELLS.fireball;
  }

  return SPELLS.ice;
}

function calcSpellDamage(hero, spell, monster) {
  let dmg = Math.max(1, Math.floor(getTotalAtk(hero) * spell.mult) + spell.bonus + randInt(-1, 2));

  if (spell.executeBelow && monster.hp / monster.maxHp <= spell.executeBelow) {
    dmg = Math.floor(dmg * spell.executeMult);
  }

  return dmg;
}

function applyMonsterCounter(hero, monster) {
  if (monster.hp <= 0) return 0;
  if (!canMonsterHitHero(monster, hero)) return 0;
  return calcMonsterDamage(monster, hero);
}

export function mageCombatRound(hero, monster, monsters, distance = 1) {
  const spell = chooseSpell(hero, monster, monsters, distance);
  const result = {
    heroDmg: 0,
    monsterDmg: 0,
    monsterDead: false,
    heroDead: false,
    attackLabel: spell.name,
    spell,
    ranged: distance > 1,
    aoeHits: [],
    healed: 0,
    shielded: false,
  };

  hero.magicShield = 0;

  if (spell.id === 'heal') {
    const amount = Math.floor(hero.maxHp * spell.healPct) + randInt(2, 6);
    result.healed = Math.min(amount, hero.maxHp - hero.hp);
    hero.hp += result.healed;
    result.monsterDmg = applyMonsterCounter(hero, monster);
    hero.hp -= result.monsterDmg;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  if (spell.id === 'shield') {
    hero.magicShield = spell.defBonus;
    result.shielded = true;
    result.heroDmg = Math.max(1, Math.floor(getTotalAtk(hero) * 0.4) + randInt(0, 2));
    monster.hp -= result.heroDmg;
    result.monsterDmg = applyMonsterCounter(hero, monster);
    hero.hp -= result.monsterDmg;
    result.monsterDead = monster.hp <= 0;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  result.heroDmg = calcSpellDamage(hero, spell, monster);
  monster.hp -= result.heroDmg;

  if (spell.slow && monster.hp > 0) {
    monster.slowed = Math.max(monster.slowed ?? 0, spell.slow);
  }

  if (spell.aoe && monster.hp > 0) {
    for (const other of monsters) {
      if (!other.alive || other === monster) continue;
      if (manhattan(monster.x, monster.y, other.x, other.y) > spell.aoe) continue;
      const splash = Math.max(1, Math.floor(result.heroDmg * 0.55));
      other.hp -= splash;
      if (other.hp <= 0) other.alive = false;
      result.aoeHits.push({ monster: other, name: other.name, damage: splash, dead: other.hp <= 0 });
    }
  }

  result.monsterDead = monster.hp <= 0;
  if (monster.hp <= 0) monster.alive = false;

  if (monster.hp > 0) {
    result.monsterDmg = applyMonsterCounter(hero, monster);
    hero.hp -= result.monsterDmg;
  }

  result.heroDead = hero.hp <= 0;
  return result;
}
