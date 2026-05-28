import { randInt, manhattan } from './utils.js';
import { calcMonsterDamage, canMonsterHitHero } from './monsters.js';
import { ensureHeroMana } from './items.js';
import { getIntelligenceSpellBonus } from './attributes.js';

function getTotalAtk(hero) {
  return hero.atk + (hero.weapon?.atk ?? 0) + (hero.armor?.atk ?? 0) + getIntelligenceSpellBonus(hero);
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
    manaCost: 5,
  },
  ice: {
    id: 'ice',
    name: 'Ледяной луч',
    color: '#66ccff',
    range: 3,
    mult: 0.95,
    bonus: 2,
    slow: 2,
    manaCost: 4,
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
    manaCost: 6,
  },
  arcane: {
    id: 'arcane',
    name: 'Тайная волна',
    color: '#bb66ff',
    range: 2,
    mult: 0.8,
    bonus: 2,
    aoe: 1,
    manaCost: 7,
  },
  heal: {
    id: 'heal',
    name: 'Исцеление',
    color: '#44ffaa',
    range: 0,
    healPct: 0.28,
    manaCost: 8,
  },
  shield: {
    id: 'shield',
    name: 'Магический щит',
    color: '#4488ff',
    range: 0,
    defBonus: 5,
    manaCost: 6,
  },
  blizzard: {
    id: 'blizzard',
    name: 'Ледяная буря',
    color: '#9fe8ff',
    range: 3,
    mult: 0.75,
    bonus: 2,
    aoe: 2,
    aoeMult: 0.5,
    slow: 2,
    manaCost: 8,
  },
  meteor: {
    id: 'meteor',
    name: 'Метеор',
    color: '#ff7844',
    range: 4,
    mult: 1.05,
    bonus: 5,
    aoe: 1,
    aoeMult: 0.7,
    manaCost: 9,
  },
  weaken: {
    id: 'weaken',
    name: 'Ослабление',
    color: '#b58cff',
    range: 3,
    mult: 0.55,
    bonus: 1,
    debuffAtk: 3,
    debuffTurns: 3,
    manaCost: 5,
  },
  haste: {
    id: 'haste',
    name: 'Ускорение',
    color: '#66ffd6',
    range: 0,
    hasteDodge: 0.15,
    hasteTurns: 4,
    manaCost: 6,
  },
  prismWard: {
    id: 'prismWard',
    name: 'Призматический барьер',
    color: '#7fb6ff',
    range: 0,
    shieldPct: 0.45,
    shieldFlat: 6,
    shieldTurns: 3,
    manaCost: 8,
  },
  mirrorSkin: {
    id: 'mirrorSkin',
    name: 'Зеркальная кожа',
    color: '#9cf5ff',
    range: 0,
    reflectPct: 0.4,
    reflectTurns: 3,
    manaCost: 7,
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

  if (hpPct < 0.36 && (distance > 1 || mHpPct > 0.4)) {
    return SPELLS.heal;
  }

  if (!hero.mageHasteTurns && hpPct < 0.7 && (distance <= 2 || monster.atk >= 5)) {
    return SPELLS.haste;
  }

  if (!hero.prismShield && hpPct < 0.52 && distance <= 2) {
    return SPELLS.prismWard;
  }

  if (!hero.mirrorSkinTurns && hpPct < 0.62 && monster.atk >= 5) {
    return SPELLS.mirrorSkin;
  }

  if (hpPct < 0.55 && distance <= 1 && !hero.magicShield) {
    return SPELLS.shield;
  }

  if (nearby >= 2 && distance <= SPELLS.blizzard.range) {
    return SPELLS.blizzard;
  }

  if (nearby >= 1 && distance <= SPELLS.meteor.range && monster.hp > monster.maxHp * 0.35) {
    return SPELLS.meteor;
  }

  if (monster.atk >= 5 && !(monster.weakened > 0) && distance <= SPELLS.weaken.range) {
    return SPELLS.weaken;
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

function applyMageHaste(hero, spell) {
  const prevBonus = hero.mageHasteBonus ?? 0;
  if (prevBonus > 0) {
    hero.dodgeBonus = Math.max(0, (hero.dodgeBonus ?? 0) - prevBonus);
  }
  hero.mageHasteBonus = spell.hasteDodge ?? 0.15;
  hero.mageHasteTurns = spell.hasteTurns ?? 4;
  hero.dodgeBonus = (hero.dodgeBonus ?? 0) + hero.mageHasteBonus;
  return true;
}

export function tickMageEffects(hero) {
  if (!hero) return null;
  const events = [];

  if (hero.mageHasteTurns > 0) {
    hero.mageHasteTurns -= 1;
    if (hero.mageHasteTurns <= 0) {
      const bonus = hero.mageHasteBonus ?? 0;
      if (bonus > 0) {
        hero.dodgeBonus = Math.max(0, (hero.dodgeBonus ?? 0) - bonus);
      }
      hero.mageHasteBonus = 0;
      events.push({ expired: 'haste' });
    }
  }

  if (hero.prismShieldTurns > 0) {
    hero.prismShieldTurns -= 1;
    if (hero.prismShieldTurns <= 0) {
      hero.prismShield = 0;
      events.push({ expired: 'prismWard' });
    }
  }

  if (hero.mirrorSkinTurns > 0) {
    hero.mirrorSkinTurns -= 1;
    if (hero.mirrorSkinTurns <= 0) {
      hero.mirrorReflectPct = 0;
      events.push({ expired: 'mirrorSkin' });
    }
  }

  return events.length ? events : null;
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
    hasted: false,
    weakened: false,
    prismWard: false,
    mirrorSkin: false,
    reflected: 0,
  };

  hero.magicShield = 0;

  const manaCost = spell.manaCost ?? 0;
  if (manaCost && !ensureHeroMana(hero, manaCost)) {
    result.heroDmg = Math.max(1, Math.floor(getTotalAtk(hero) * 0.35) + randInt(0, 1));
    monster.hp -= result.heroDmg;
    result.attackLabel = 'Посох';
    result.monsterDmg = applyMonsterCounter(hero, monster);
    hero.hp -= result.monsterDmg;
    result.monsterDead = monster.hp <= 0;
    result.heroDead = hero.hp <= 0;
    return result;
  }

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

  if (spell.id === 'haste') {
    result.hasted = applyMageHaste(hero, spell);
    result.monsterDmg = applyMonsterCounter(hero, monster);
    hero.hp -= result.monsterDmg;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  if (spell.id === 'prismWard') {
    hero.prismShield = Math.floor(hero.maxHp * (spell.shieldPct ?? 0.4)) + (spell.shieldFlat ?? 5);
    hero.prismShieldTurns = spell.shieldTurns ?? 3;
    result.prismWard = true;
    result.monsterDmg = applyMonsterCounter(hero, monster);
    if (result.monsterDmg > 0) {
      const absorbed = Math.min(hero.prismShield, result.monsterDmg);
      hero.prismShield -= absorbed;
      result.monsterDmg -= absorbed;
      if (hero.prismShield <= 0) hero.prismShieldTurns = 0;
    }
    hero.hp -= result.monsterDmg;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  if (spell.id === 'mirrorSkin') {
    hero.mirrorReflectPct = spell.reflectPct ?? 0.35;
    hero.mirrorSkinTurns = spell.reflectTurns ?? 3;
    result.mirrorSkin = true;
    result.monsterDmg = applyMonsterCounter(hero, monster);
    if (result.monsterDmg > 0) {
      result.reflected = Math.max(1, Math.floor(result.monsterDmg * hero.mirrorReflectPct));
      monster.hp -= result.reflected;
    }
    hero.hp -= result.monsterDmg;
    result.monsterDead = monster.hp <= 0;
    if (result.monsterDead) monster.alive = false;
    result.heroDead = hero.hp <= 0;
    return result;
  }

  result.heroDmg = calcSpellDamage(hero, spell, monster);
  monster.hp -= result.heroDmg;

  if (spell.slow && monster.hp > 0) {
    monster.slowed = Math.max(monster.slowed ?? 0, spell.slow);
  }

  if (spell.aoe) {
    for (const other of monsters) {
      if (!other.alive || other === monster) continue;
      if (manhattan(monster.x, monster.y, other.x, other.y) > spell.aoe) continue;
      const splash = Math.max(1, Math.floor(result.heroDmg * (spell.aoeMult ?? 0.55)));
      other.hp -= splash;
      if (other.hp <= 0) other.alive = false;
      if (spell.slow && other.hp > 0) {
        other.slowed = Math.max(other.slowed ?? 0, spell.slow);
      }
      result.aoeHits.push({ monster: other, name: other.name, damage: splash, dead: other.hp <= 0 });
    }
  }

  if (spell.debuffTurns && monster.hp > 0) {
    monster.weakened = Math.max(monster.weakened ?? 0, spell.debuffTurns);
    monster.weakenAtkRed = Math.max(monster.weakenAtkRed ?? 0, spell.debuffAtk ?? 2);
    result.weakened = true;
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
