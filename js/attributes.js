function getStat(hero, stat, fallback = 5) {
  return hero?.[stat] ?? fallback;
}

export function getStrengthAtkBonus(hero) {
  const value = getStat(hero, 'strength');
  return Math.max(0, Math.floor((value - 5) / 2));
}

export function getDexterityCritBonus(hero) {
  const value = getStat(hero, 'dexterity');
  return Math.max(0, (value - 5) * 0.005);
}

export function getIntelligenceSpellBonus(hero) {
  const value = getStat(hero, 'intelligence');
  return Math.max(0, Math.floor((value - 5) / 2));
}

export function getIntelligenceManaBonus(hero) {
  const value = getStat(hero, 'intelligence');
  return Math.max(0, (value - 5) * 2);
}

export function getPerceptionVisionBonus(hero) {
  const value = getStat(hero, 'perception');
  return Math.max(0, Math.floor((value - 5) / 2));
}

export function getEnduranceHpBonus(hero) {
  const value = getStat(hero, 'endurance');
  return Math.max(0, (value - 5) * 4);
}

export function getHeroMaxMana(hero) {
  if (!hero || (hero.profession !== 'mage' && hero.profession !== 'necromancer')) {
    return 0;
  }
  return 20 + hero.level * 2 + getIntelligenceManaBonus(hero);
}
