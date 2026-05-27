import { getProfession } from './classes.js';
import { getDexterityCritBonus } from './attributes.js';

export function getLuck(hero) {
  if (!hero) return 5;
  const prof = getProfession(hero.profession);
  const base = prof.luck ?? 5;
  const perLevel = prof.levelGrowth?.luck ?? 0;
  return base + perLevel * (hero.level - 1) + Math.floor((hero.level - 1) / 3) + (hero.bonusLuck ?? 0);
}

export function rollLuck(hero, baseChance) {
  const luck = getLuck(hero);
  const chance = Math.min(0.85, baseChance + luck * 0.008);
  return Math.random() < chance;
}

export function luckGoldBonus(hero, amount) {
  return Math.floor(amount * getLuck(hero) * 0.03);
}

export function applyLuckLootWeights(table, luck = 5) {
  return table.map((entry) => {
    let weight = entry.weight;
    if (entry.type === 'weapon' || entry.type === 'armor') {
      weight += Math.floor(luck * 0.6);
    } else if (entry.type === 'potion_large') {
      weight += Math.floor(luck * 0.4);
    } else if (entry.type === 'potion') {
      weight += Math.floor(luck * 0.2);
    } else if (entry.type === 'elixir') {
      weight += Math.floor(luck * 0.35);
    } else if (entry.type === 'gold') {
      weight = Math.max(8, weight - Math.floor(luck * 0.25));
    }
    return { ...entry, weight: Math.max(1, weight) };
  });
}

export function luckMerchantChance(baseChance, luck = 5) {
  return Math.min(0.75, baseChance + luck * 0.012);
}

export function luckCritBonus(hero) {
  return getLuck(hero) * 0.01 + (hero.bonusCrit ?? 0) + getDexterityCritBonus(hero);
}
