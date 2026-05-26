export const PROFESSIONS = {
  warrior: {
    id: 'warrior',
    name: 'Воин',
    icon: '🛡',
    desc: 'Много HP и брони',
    color: '#cc4444',
    hp: 55,
    atk: 7,
    def: 3,
    vision: 6,
    attackRange: 1,
    attackLabel: 'Удар',
    levelGrowth: { hp: 10, atk: 2, def: 2 },
  },
  archer: {
    id: 'archer',
    name: 'Лучник',
    icon: '🏹',
    desc: 'Атакует с 3 клеток',
    color: '#44aa44',
    hp: 35,
    atk: 6,
    def: 1,
    vision: 7,
    attackRange: 3,
    attackLabel: 'Выстрел',
    levelGrowth: { hp: 6, atk: 2, def: 1 },
  },
  mage: {
    id: 'mage',
    name: 'Маг',
    icon: '✦',
    desc: '6 заклинаний: огонь, лёд, молния...',
    color: '#8844ff',
    hp: 28,
    atk: 9,
    def: 0,
    vision: 6,
    attackRange: 2,
    attackLabel: 'Магия',
    magicBonus: 3,
    levelGrowth: { hp: 5, atk: 3, def: 0 },
  },
  thief: {
    id: 'thief',
    name: 'Вор',
    icon: '🗡',
    desc: '+50% золота, обезвреживает ловушки',
    color: '#aaaa44',
    hp: 32,
    atk: 5,
    def: 2,
    vision: 6,
    attackRange: 1,
    attackLabel: 'Кинжал',
    goldBonus: 0.5,
    itemRange: 14,
    canDisarmTraps: true,
    levelGrowth: { hp: 6, atk: 1, def: 1 },
  },
  necromancer: {
    id: 'necromancer',
    name: 'Некромант',
    icon: '💀',
    desc: 'Тёмная магия, вампиризм, скелеты',
    color: '#3a6644',
    hp: 30,
    atk: 7,
    def: 1,
    vision: 6,
    attackRange: 3,
    attackLabel: 'Некромантия',
    levelGrowth: { hp: 5, atk: 2, def: 1 },
  },
};

export function getProfession(id) {
  return PROFESSIONS[id] ?? PROFESSIONS.warrior;
}

export function getAttackRange(hero) {
  if (hero.profession === 'mage') return 4;
  if (hero.profession === 'necromancer') return 3;
  return getProfession(hero.profession).attackRange;
}

export function getItemSearchRange(hero) {
  const prof = getProfession(hero.profession);
  return prof.itemRange ?? 8;
}

export function canDisarmTraps(hero) {
  return !!getProfession(hero.profession).canDisarmTraps;
}
