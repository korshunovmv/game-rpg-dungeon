import { randInt } from './utils.js';

const EPITHETS_BARELY = ['Злопамятный', 'Измученный', 'Озлобленный', 'Кровожадный'];
const EPITHETS_SLAYER = ['Смертоносный', 'Жуткий', 'Проклятый', 'Непобедимый'];

export function makeLegendName(baseName, reason) {
  const pool = reason === 'slayer' ? EPITHETS_SLAYER : EPITHETS_BARELY;
  const epithet = pool[randInt(0, pool.length - 1)];
  return `${epithet} ${baseName}`;
}

export function createLegendEntry(monster, reason, floor, heroLevel) {
  const baseName = monster.baseName ?? monster.name;
  return {
    key: `${baseName}:${reason}:${Date.now()}`,
    baseName,
    displayName: makeLegendName(baseName, reason),
    reason,
    originFloor: floor,
    heroLevel,
    spawns: 0,
    avenged: false,
  };
}

export function registerLegendaryFoe(registry, monster, reason, floor, heroLevel) {
  if (monster.isLegendary) return null;

  const baseName = monster.baseName ?? monster.name;
  const existing = registry.find(
    (e) => e.baseName === baseName && e.reason === reason && !e.avenged
  );

  if (existing) {
    existing.heroLevel = Math.max(existing.heroLevel, heroLevel);
    existing.originFloor = Math.min(existing.originFloor, floor);
    return existing;
  }

  const entry = createLegendEntry(monster, reason, floor, heroLevel);
  registry.push(entry);
  return entry;
}

export function trackCombatRound(monster, hero, heroDamageTaken = 0) {
  if (!monster || monster.isLegendary) return;

  if (!monster.combatTrack) {
    monster.combatTrack = {
      damageTaken: 0,
      minHeroHp: hero.hp,
      rounds: 0,
    };
  }

  monster.combatTrack.rounds += 1;
  monster.combatTrack.damageTaken += heroDamageTaken;
  monster.combatTrack.minHeroHp = Math.min(monster.combatTrack.minHeroHp, hero.hp);
}

export function wasBarelyWon(hero, monster) {
  if (!monster || monster.isLegendary) return false;

  const track = monster.combatTrack;
  const hpPct = hero.hp / hero.maxHp;

  if (hpPct <= 0.28) return true;
  if (track && track.minHeroHp / hero.maxHp <= 0.32) return true;
  if (track && track.damageTaken >= hero.maxHp * 0.45) return true;
  if (track && track.rounds >= 5) return true;

  return false;
}

export function spawnLegendMonster(legend, pos, floor, index) {
  const tier = legend.spawns;
  const mult = 1.25 + tier * 0.18;
  const hp = Math.floor((10 + floor * 5 + randInt(2, 8)) * mult);
  const atk = Math.floor((3 + floor + randInt(1, 3)) * mult);

  return {
    id: `leg-${index}-${Date.now()}`,
    x: pos.x,
    y: pos.y,
    baseName: legend.baseName,
    name: legend.displayName,
    hp,
    maxHp: hp,
    atk,
    xp: Math.floor((8 + floor * 4) * mult),
    alive: true,
    isLegendary: true,
    legendKey: legend.key,
    legendReason: legend.reason,
    color: legend.reason === 'slayer' ? '#ff2244' : '#ff8844',
  };
}

export function spawnLegendaryMonsters(dungeon, floor, pool, legends, occupied) {
  if (!legends.length || !pool.length) return [];

  const candidates = legends.filter((l) => !l.avenged && floor >= l.originFloor);
  if (!candidates.length) return [];

  const spawned = [];
  const count = Math.min(candidates.length, floor >= 5 ? 2 : 1);

  for (let i = 0; i < count && pool.length; i++) {
    const legend = candidates[i];
    const pos = pool.pop();
    occupied.add(`${pos.x},${pos.y}`);
    legend.spawns += 1;
    spawned.push({
      monster: spawnLegendMonster(legend, pos, floor, i),
      legend,
    });
  }

  return spawned;
}

export function markLegendAvenged(registry, legendKey) {
  const entry = registry.find((e) => e.key === legendKey);
  if (entry) entry.avenged = true;
  return entry;
}

export function getActiveLegends(registry) {
  return registry.filter((e) => !e.avenged);
}

export function getLegendReasonText(reason) {
  if (reason === 'slayer') return 'убил героя';
  return 'тяжёлая победа';
}
