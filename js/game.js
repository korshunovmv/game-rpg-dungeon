import { TILES } from './config.js';
import { generateDungeon, spawnEntities, isWalkable } from './dungeon.js';
import { createHero, combatRound, collectItem, gainXp, updateFacing } from './hero.js';
import { getExplorationTarget, getVisibleTiles, wanderStep, moveMonstersTowardHero, wanderIdleMonsters, canAttackTarget, canMonsterAttackHero, getHeroFightDistance, getMonsterFightDistance, canStep, findUnstickStep, getHeroBlockedSet } from './ai.js';
import { key, isMeleeAdjacent } from './utils.js';
import { GAME_SPEED } from './config.js';
import { getProfession, getAttackRange, canDisarmTraps } from './classes.js';
import { getTrapAt, triggerTrap, tickPoison, disarmTrap, revealTrapsForThief } from './traps.js';
import { useHealer, purchaseFromMerchant, useHealFlask, useManaFlask, getHealFlaskCount, getManaFlaskCount, tickHeroBuffs } from './items.js';
import { formatRarityLabel } from './rarity.js';
import { usesMana } from './classes.js';
import { pickBestPurchase, merchantHasStock, hasWorthwhilePurchase } from './merchant.js';
import { getAliveBoss } from './bosses.js';
import { rollLuck } from './luck.js';
import {
  processMinions,
  tickMonsterDecay,
  tickMonsterCurses,
  tryRaiseSkeleton,
  getMaxMinions,
  countAliveMinions,
  tickNecroEffects,
} from './necromancy.js';
import {
  growSkillOnLevelUp,
  learnRandomSkill,
  shouldPickSkillOnLevel,
  getHeroSkillsList,
  getHeroVision,
} from './skills.js';
import {
  registerLegendaryFoe,
  trackCombatRound,
  wasBarelyWon,
  markLegendAvenged,
  getActiveLegends,
  getLegendReasonText,
} from './nemesis.js';
import {
  getUnclaimedLegacies,
  getLegacyForFloor,
  registerDeathLegacy,
  placeGraveOnFloor,
  describeLegacyGift,
} from './legacy.js';
import { monsterSnipeRound } from './monsters.js';
import { openChestLoot, describeChestLoot } from './chests.js';
import { tickMageEffects } from './magic.js';

export class Game {
  constructor(renderer, ui) {
    this.renderer = renderer;
    this.ui = ui;
    this.paused = false;
    this.speed = GAME_SPEED.normal;
    this.fast = false;
    this.frame = 0;
    this.accumulator = 0;
    this.profession = null;
    this.gender = 'male';
    this.state = 'class-select';
    this.map = null;
    this.hero = null;
    this.monsters = [];
    this.items = [];
    this.chests = [];
    this.traps = [];
    this.healers = [];
    this.merchant = null;
    this.minions = [];
    this.legendaryFoes = [];
    this.pendingLegacies = [];
    this.floorSeeds = {};
    this.lockedFeature = null;
    this.lastCombatMonster = null;
    this.combatFocus = null;
    this.lastHeroPos = null;
    this.stuckTicks = 0;
    this.recentPositions = [];
  }

  start(professionId, gender = 'male') {
    this.profession = professionId;
    this.gender = gender;
    this.paused = false;
    this.ui.clearLog();
    this.newDungeon(1);
  }

  resolveFloorSeed(floor) {
    const legacy = getLegacyForFloor(floor, this.pendingLegacies);
    if (legacy?.seed != null) return legacy.seed >>> 0;
    if (this.floorSeeds[floor] != null) return this.floorSeeds[floor];
    const seed = (Math.random() * 0xffffffff) >>> 0;
    this.floorSeeds[floor] = seed;
    return seed;
  }

  spawnLegacyGrave(floor) {
    const legacy = getLegacyForFloor(floor, this.pendingLegacies);
    if (!legacy) return null;

    const grave = placeGraveOnFloor(this.items, this.monsters, this.map, legacy);
    if (!grave) return null;

    this.log(
      `На этаже ${floor} (${legacy.x}, ${legacy.y}) павший ${legacy.heroName} оставил ${describeLegacyGift(legacy.gift)}`,
      'legacy'
    );
    return grave;
  }

  loadFloorEntities(dungeon, floor) {
    const entities = spawnEntities(dungeon, floor, this.hero, this.legendaryFoes);
    this.monsters = entities.monsters;
    this.items = entities.items;
    this.chests = entities.chests ?? [];
    this.traps = entities.traps;
    this.healers = entities.healers;
    this.merchant = entities.merchant ?? null;
    this.lockedFeature = entities.lockedFeature ?? null;
    this.logLegendSpawns(entities.legendSpawns ?? []);
    this.spawnLegacyGrave(floor);
  }

  newDungeon(floor = 1) {
    if (floor === 1) {
      this.pendingLegacies = getUnclaimedLegacies();
      this.floorSeeds = {};
    }

    const seed = this.resolveFloorSeed(floor);
    const dungeon = generateDungeon(floor, seed);
    this.map = dungeon.map;
    this.roomTypeMap = dungeon.roomTypeMap;
    this.stairs = dungeon.stairs;
    this.rooms = dungeon.rooms;

    if (floor === 1) {
      this.hero = createHero(dungeon.spawn, this.profession, this.gender);
      this.minions = [];
      this.legendaryFoes = [];
      this.ui.log(`${this.hero.professionName} ${this.hero.name} входит в подземелье`, 'info');
      const pending = this.pendingLegacies.length;
      if (pending) {
        this.ui.log(`В подземелье ${pending} невзятое наследие павших героев`, 'legacy');
      }
    } else {
      this.hero.x = dungeon.spawn.x;
      this.hero.y = dungeon.spawn.y;
    }

    this.hero.floor = floor;
    this.loadFloorEntities(dungeon, floor);
    this.explored = new Set();
    this.visible = new Set();
    this.currentPath = [];
    this.combatFocus = null;
    this.lastHeroPos = key(this.hero.x, this.hero.y);
    this.stuckTicks = 0;
    this.recentPositions = [this.lastHeroPos];
    this.accumulator = 0;
    this.state = 'playing';
    this.revealAroundHero();
    this.ui.log(`Этаж ${floor}.`, 'info');
    const roomTypes = [...new Set((this.rooms ?? []).map((room) => room.typeLabel).filter(Boolean))];
    if (roomTypes.length) {
      this.ui.log(`Обнаружены комнаты: ${roomTypes.join(', ')}`, 'info');
    }
    if (this.lockedFeature?.door) {
      this.ui.log('На этаже есть запертая дверь: ищите ключ', 'info');
    }
    const boss = getAliveBoss(this.monsters);
    if (boss) {
      this.ui.log(`БОСС: ${boss.name} охраняет лестницу!`, 'boss');
    }
    this.syncStats();
    this.ui.hideOverlay();
  }

  revealAroundHero() {
    const vision = getHeroVision(this.hero);
    const vis = getVisibleTiles(this.hero.x, this.hero.y, vision);
    vis.forEach((k) => this.explored.add(k));
    this.visible = vis;
    if (canDisarmTraps(this.hero)) {
      revealTrapsForThief(this.traps, vis);
    }
    this.tryMeetMerchant();
  }

  tryMeetMerchant() {
    if (!this.merchant || this.merchant.met || !merchantHasStock(this.merchant)) return;

    const onTile =
      this.merchant.x === this.hero.x && this.merchant.y === this.hero.y;
    const inSight = this.visible.has(key(this.merchant.x, this.merchant.y));

    if (onTile || inSight) {
      this.merchant.met = true;
      this.log(`${this.merchant.name}: «Стой, путник! У меня есть что предложить.»`, 'shop');
    }
  }

  applyHeroMove(nx, ny) {
    updateFacing(this.hero, nx - this.hero.x, ny - this.hero.y);
    this.hero.x = nx;
    this.hero.y = ny;
    this.checkTrap();
    this.checkHealer();
    this.checkChest();
    this.checkMerchant();

    if (this.hero.hp <= 0) return;

    if (this.map[ny][nx] === TILES.STAIRS) {
      if (this.isBossBlocking()) {
        this.log('Лестница запечатана — победите босса!', 'boss');
        return;
      }
      this.descendStairs();
    }
  }

  isBossBlocking() {
    return getAliveBoss(this.monsters) !== null;
  }

  checkTrap() {
    const trap = getTrapAt(this.traps, this.hero.x, this.hero.y);
    if (!trap) return;

    if (canDisarmTraps(this.hero)) {
      this.doDisarm(trap);
      return;
    }

    if (rollLuck(this.hero, 0.03)) {
      this.log('Удача! Ловушка не сработала', 'info');
      return;
    }

    const result = triggerTrap(trap, this.hero, this.map, this.traps);
    this.log(result.message, 'trap');

    if (trap.type === 'arrow') {
      this.renderer.addProjectile(trap.x, trap.y, this.hero.x, this.hero.y, {
        kind: 'arrow',
        color: '#cccccc',
        speed: 0.22,
        onComplete: () => {
          this.renderer.shakeScreen(4);
          this.renderer.addParticle(this.hero.x, this.hero.y, result.particleColor, 25);
        },
      });
    } else {
      this.renderer.shakeScreen(4);
      this.renderer.addParticle(this.hero.x, this.hero.y, result.particleColor, 25);
    }

    if (result.teleported) {
      this.currentPath = [];
      this.revealAroundHero();
      const chain = getTrapAt(this.traps, this.hero.x, this.hero.y);
      if (chain) this.checkTrap();
    }

    this.syncStats();
  }

  checkHealer() {
    const healer = this.healers.find(
      (h) => !h.used && h.x === this.hero.x && h.y === this.hero.y
    );
    if (healer && this.hero.hp < this.hero.maxHp) {
      this.doHeal(healer);
    }
  }

  doHeal(healer) {
    const result = useHealer(healer, this.hero);
    if (!result) return;
    this.renderer.addParticle(this.hero.x, this.hero.y, '#44ffff', 30);
    const cured = result.curedPoison ? ', яд снят' : '';
    this.log(`Лечебный алтарь: +${result.healed} HP${cured}`, 'info');
    this.syncStats();
  }

  checkChest() {
    const chest = this.chests.find(
      (c) => !c.opened && c.x === this.hero.x && c.y === this.hero.y
    );
    if (chest) {
      this.doOpenChest(chest);
    }
  }

  logLootResult(result, x, y) {
    if (!result) return;

    if (result.type === 'gold') {
      let bonusText = '';
      if (result.bonus) bonusText += ` (+${result.bonus} бонус)`;
      if (result.luckBonus) bonusText += ` (+${result.luckBonus} удача)`;
      if (result.skillBonus) bonusText += ` (+${result.skillBonus} навык)`;
      this.log(`+${result.value} золота${bonusText}`, 'loot');
      this.renderer.addParticle(x, y, '#ffd700', 25);
    } else if (result.type === 'heal') {
      const cureText = result.cured ? ', яд снят' : '';
      this.log(`${result.name}: +${result.value} HP${cureText}`, 'loot');
      this.renderer.addParticle(x, y, '#44ff88', 25);
    } else if (result.type === 'heal_flask') {
      this.log(`${result.name} → флаконы лечения: ${result.count}`, 'loot');
      this.renderer.addParticle(x, y, '#44ff88', 25);
    } else if (result.type === 'mana_flask') {
      this.log(`${result.name} → флаконы маны: ${result.count}`, 'loot');
      this.renderer.addParticle(x, y, '#4488ff', 25);
    } else if (result.type === 'elixir') {
      if (result.statLabel && result.amount != null) {
        this.log(`${result.name}: +${result.amount} ${result.statLabel} на ${result.turns} ход.`, 'loot');
      } else if (result.effectLabel) {
        if (result.effectLabel === 'сопротивление яду') {
          const pct = Math.round((result.resistPct ?? 0) * 100);
          this.log(`${result.name}: ${pct}% ${result.effectLabel} на ${result.turns} ход.`, 'loot');
        } else if (result.effectLabel === 'шанс уклонения') {
          const pct = Math.round((result.dodgePct ?? 0) * 100);
          this.log(`${result.name}: +${pct}% ${result.effectLabel} на ${result.turns} ход.`, 'loot');
        } else if (result.effectLabel === 'бонус золота') {
          const pct = Math.round((result.goldPct ?? 0) * 100);
          this.log(`${result.name}: +${pct}% к золоту на ${result.turns} ход.`, 'loot');
        } else {
          this.log(`${result.name}: ${result.effectLabel} на ${result.turns} ход.`, 'loot');
        }
      }
      this.renderer.addParticle(x, y, '#bb88ff', 28);
    } else if (result.type === 'weapon') {
      const label = formatRarityLabel(result.rarity);
      if (result.equipped) {
        this.log(`Экипировано: ${label}${result.name} (+${result.atk} ATK)`, 'loot');
      } else if (result.unusable) {
        this.log(`${label}${result.name} не подходит классу, продано`, 'loot');
      } else {
        this.log(`${label}${result.name} продан (слабее текущего)`, 'loot');
      }
      this.renderer.addParticle(x, y, '#cccccc', 20);
    } else if (result.type === 'armor') {
      const label = formatRarityLabel(result.rarity);
      if (result.equipped) {
        this.log(`Экипировано: ${label}${result.name} (+${result.def} DEF)`, 'loot');
      } else if (result.unusable) {
        this.log(`${label}${result.name} не подходит классу, продано`, 'loot');
      } else {
        this.log(`${label}${result.name} продан`, 'loot');
      }
      this.renderer.addParticle(x, y, '#888899', 20);
    } else if (result.type === 'locked_key') {
      this.log(`${result.name}: дверь отперта`, 'loot');
      this.unlockLockedDoor(result.unlockDoor);
      this.renderer.addParticle(x, y, '#ffdd66', 28);
    } else if (result.type === 'locked_skill') {
      this.log(`Реликвия: навык «${result.name}» (ур. ${result.level})`, 'loot');
      this.renderer.addParticle(x, y, '#aa88ff', 35);
    }
  }

  unlockLockedDoor(door) {
    if (!door || door.x == null || door.y == null) return;
    if (!this.map?.[door.y]) return;
    if (this.map[door.y][door.x] !== TILES.LOCKED_DOOR) return;
    this.map[door.y][door.x] = TILES.DOOR;
    this.log('Запертая дверь открылась', 'info');
  }

  doOpenChest(chest) {
    if (!chest || chest.opened) return;

    chest.opened = true;

    if (chest.isMimic) {
      const monster = chest.monster;
      monster.x = chest.x;
      monster.y = chest.y;
      monster.alive = true;
      this.monsters.push(monster);
      this.log('Сундук оживает — это мимик!', 'chest');
      this.renderer.shakeScreen(8);
      this.renderer.addParticle(chest.x, chest.y, '#cc6644', 40);
      this.doCombat(monster, true, 1);
      return;
    }

    const preview = describeChestLoot(chest.loot);
    const result = openChestLoot(this.hero, chest);
    this.log(`Сундук: ${preview}`, 'chest');
    this.logLootResult(result, chest.x, chest.y);
    this.renderer.addParticle(chest.x, chest.y, '#ffd700', 30);
    this.syncStats();
  }

  checkMerchant() {
    if (!this.merchant || !merchantHasStock(this.merchant)) return;
    if (this.merchant.x !== this.hero.x || this.merchant.y !== this.hero.y) return;

    this.tryMeetMerchant();

    if (hasWorthwhilePurchase(this.hero, this.merchant)) {
      this.doShop(this.merchant);
    }
  }

  doShop(merchant) {
    const item = pickBestPurchase(this.hero, merchant);
    if (!item) return;

    const result = purchaseFromMerchant(this.hero, item);
    if (!result) return;

    const seller = merchant.name ?? 'Торговец';
    if (result.type === 'heal_flask') {
      this.log(`${seller}: ${result.name} за ${result.price} зол. (лечение: ${result.count})`, 'shop');
      this.renderer.addParticle(this.hero.x, this.hero.y, '#44ff88', 25);
    } else if (result.type === 'mana_flask') {
      this.log(`${seller}: ${result.name} за ${result.price} зол. (мана: ${result.count})`, 'shop');
      this.renderer.addParticle(this.hero.x, this.hero.y, '#4488ff', 25);
    } else if (result.type === 'weapon') {
      this.log(
        `${seller}: ${formatRarityLabel(result.rarity)}${result.name} (+${result.atk} ATK) за ${result.price} зол.`,
        'shop'
      );
      this.renderer.addParticle(this.hero.x, this.hero.y, '#cccccc', 20);
    } else if (result.type === 'armor') {
      this.log(
        `${seller}: ${formatRarityLabel(result.rarity)}${result.name} (+${result.def} DEF) за ${result.price} зол.`,
        'shop'
      );
      this.renderer.addParticle(this.hero.x, this.hero.y, '#888899', 20);
    }
    this.syncStats();
  }

  doDisarm(trap) {
    const result = disarmTrap(trap);
    this.renderer.addParticle(trap.x, trap.y, result.particleColor, 20);
    this.log(result.message, 'info');
    this.syncStats();
  }

  syncStats() {
    const minions = countAliveMinions(this.minions ?? []);
    const maxMinions = this.hero?.profession === 'necromancer' ? getMaxMinions(this.hero) : 0;
    this.ui.updateStats(this.hero, minions, maxMinions);
    this.ui.updateSkills(getHeroSkillsList(this.hero));
    this.ui.updateLegends(getActiveLegends(this.legendaryFoes));
    this.ui.updateLegacyList(this.pendingLegacies ?? getUnclaimedLegacies());
  }

  logLegendSpawns(spawns) {
    for (const { monster, legend } of spawns) {
      const reason = getLegendReasonText(legend.reason);
      this.log(`${monster.name} вернулся! (${reason}, этаж ${legend.originFloor})`, 'nemesis');
    }
  }

  noteLegendaryFoe(monster, reason) {
    const entry = registerLegendaryFoe(
      this.legendaryFoes,
      monster,
      reason,
      this.hero.floor,
      this.hero.level
    );
    if (!entry) return;

    const reasonText = getLegendReasonText(reason);
    this.log(`Запомнен враг: ${entry.displayName} (${reasonText})`, 'nemesis');
    this.ui.updateLegends(getActiveLegends(this.legendaryFoes));
  }

  handleHeroDeath(killer = null) {
    if (killer && killer.alive !== false) {
      this.noteLegendaryFoe(killer, 'slayer');
    }

    const floorSeed = this.floorSeeds[this.hero.floor];
    const legacy = registerDeathLegacy(
      this.hero,
      this.hero.floor,
      this.hero.x,
      this.hero.y,
      floorSeed
    );
    if (legacy) {
      this.pendingLegacies = getUnclaimedLegacies();
      this.log(
        `${this.hero.name} пал и оставил ${describeLegacyGift(legacy.gift)} на этаже ${legacy.floor}`,
        'legacy'
      );
    }

    this.hero.alive = false;
    this.state = 'dead';
  }

  processLevelUps(levels) {
    for (const lv of levels) {
      const grown = growSkillOnLevelUp(this.hero);
      const skillLevel = this.hero.skills[grown.id];
      this.log(`Уровень ${lv}! ${grown.name} → ${skillLevel}`, 'info');
      if (shouldPickSkillOnLevel(lv)) {
        const learned = learnRandomSkill(this.hero);
        if (learned) {
          this.log(`Случайный навык: ${learned.name} (ур. ${learned.level})`, 'info');
        }
      }
    }
    this.syncStats();
  }

  log(msg, type = '') {
    this.ui.log(msg, type);
  }

  getCombatProjectile(result, onComplete) {
    if (result.healed || result.shielded) return null;
    if (!result.ranged || result.heroDmg <= 0) return null;

    const spellId = result.spell?.id;
    if (spellId === 'heal' || spellId === 'shield' || spellId === 'boneArmor') return null;

    const speeds = {
      fireball: 0.14,
      ice: 0.17,
      lightning: 0.32,
      arcane: 0.13,
      deathBolt: 0.2,
      drain: 0.15,
      curse: 0.16,
      plague: 0.15,
    };

    if (spellId) {
      return {
        kind: spellId,
        speed: speeds[spellId] ?? 0.16,
        color: result.spell.color,
        trail: spellId === 'fireball' ? '#ff6600' : spellId === 'ice' ? '#66ccff' : null,
        onComplete,
      };
    }

    if (this.hero.profession === 'archer') {
      return { kind: 'arrow', speed: 0.2, color: '#d4c4a0', onComplete };
    }

    return { kind: 'bolt', speed: 0.16, color: '#ff4466', onComplete };
  }

  getMonsterProjectile(monster, onComplete) {
    return {
      kind: monster.projectileKind ?? 'arrow',
      speed: 0.2,
      color: monster.projectileColor ?? '#cc8888',
      onComplete,
    };
  }

  tryUseConsumables() {
    if (!this.hero || this.hero.hp <= 0) return;

    if (this.hero.hp < this.hero.maxHp && getHealFlaskCount(this.hero) > 0) {
      const hpRatio = this.hero.hp / this.hero.maxHp;
      if (hpRatio < 0.45 || this.hero.poison > 0) {
        const result = useHealFlask(this.hero);
        if (result?.healed > 0 || result?.cured) {
          const cured = result.cured ? ', яд снят' : '';
          this.log(`Флакон лечения: +${result.healed} HP${cured}`, 'info');
          this.renderer.addParticle(this.hero.x, this.hero.y, '#44ff88', 20);
        }
      }
    }

    if (usesMana(this.hero) && getManaFlaskCount(this.hero) > 0) {
      const manaRatio = this.hero.mana / this.hero.maxMana;
      if (manaRatio < 0.35) {
        const result = useManaFlask(this.hero);
        if (result?.restored > 0) {
          this.log(`Флакон маны: +${result.restored} MP`, 'info');
          this.renderer.addParticle(this.hero.x, this.hero.y, '#4488ff', 20);
        }
      }
    }
  }

  tick() {
    if (this.paused || this.state !== 'playing') return;

    this.frame += 1;
    const mageEffects = tickMageEffects(this.hero) ?? [];
    for (const effect of mageEffects) {
      if (effect.expired === 'haste') this.log('Эффект "Ускорение" рассеялся', 'info');
      if (effect.expired === 'prismWard') this.log('Призматический барьер угас', 'info');
      if (effect.expired === 'mirrorSkin') this.log('Зеркальная кожа рассеялась', 'info');
    }
    const necroEffects = tickNecroEffects(this.hero) ?? [];
    for (const effect of necroEffects) {
      if (effect.expired === 'shadowVeil') this.log('Покров теней рассеялся', 'info');
      if (effect.expired === 'soulWard') this.log('Духовный заслон исчез', 'info');
    }
    const expiredBuffs = tickHeroBuffs(this.hero);
    for (const buff of expiredBuffs) {
      this.log(`Эффект спал: ${buff.name} (−${buff.amount} ${buff.statLabel})`, 'info');
    }
    this.revealAroundHero();

    tickMonsterCurses(this.monsters);
    for (const hit of tickMonsterDecay(this.monsters)) {
      this.log(`Чума: ${hit.monster.name} −${hit.damage} HP`, 'trap');
      if (hit.dead) {
        hit.monster.alive = false;
        this.onMonsterSlain(hit.monster);
      }
      this.syncStats();
    }

    for (const ev of processMinions(this.minions, this.monsters, this.map)) {
      if (ev.type === 'attack') {
        this.log(`Скелет бьёт ${ev.monster.name}: −${ev.damage} HP`, 'combat');
        this.renderer.addParticle(ev.monster.x, ev.monster.y, '#ccccaa', 15);
      }
      if (ev.type === 'kill') {
        this.onMonsterSlain(ev.monster);
      }
    }

    const poison = tickPoison(this.hero);
    if (poison) {
      this.log(`Яд: −${poison.damage} HP (${poison.remaining} ход.)`, 'trap');
      this.syncStats();
      if (this.hero.hp <= 0) {
        this.handleHeroDeath(this.lastCombatMonster);
        this.log('Герой пал от отравления...', 'death');
        this.ui.showOverlay('💀 ГЕРОЙ ПОГИБ\n\nНажмите «Новое подземелье»');
        return;
      }
    }

    if (this.hero.hp <= 0) {
      this.handleHeroDeath(this.lastCombatMonster);
      this.log('Герой пал в подземелье...', 'death');
      this.ui.showOverlay('💀 ГЕРОЙ ПОГИБ\n\nНажмите «Новое подземелье»');
      this.syncStats();
      return;
    }

    if (this.hero.slowed > 0) {
      if (this.hero.hasteBonus > 0 && Math.random() < 0.65) {
        this.hero.slowed = Math.max(0, this.hero.slowed - 1);
      } else {
        this.hero.slowed -= 1;
        this.log('Заклинивание... пропуск хода', 'trap');
        return;
      }
    }

    this.tryUseConsumables();
    this.syncStats();

    const hunterAttack = moveMonstersTowardHero(this.map, this.hero, this.monsters);
    const wanderAttack = wanderIdleMonsters(
      this.map,
      this.hero,
      this.monsters,
      this.minions,
      !hunterAttack
    );
    const attack = hunterAttack || wanderAttack;
    if (attack) {
      const meleeEngaged = isMeleeAdjacent(
        attack.monster.x,
        attack.monster.y,
        this.hero.x,
        this.hero.y
      );
      if (meleeEngaged) {
        this.currentPath = [];
      }
      this.doCombat(attack.monster, true, attack.distance ?? 1);
      if (this.hero.hp <= 0 || this.state !== 'playing') {
        return;
      }
      if (meleeEngaged) {
        return;
      }
      this.combatFocus = attack.monster;
      this.currentPath = [];
    }

    if (this.combatFocus && !this.combatFocus.alive) {
      this.combatFocus = null;
    }

    const action = getExplorationTarget(
      this.map,
      this.hero,
      this.explored,
      this.monsters,
      this.items,
      this.rooms,
      this.traps,
      this.healers,
      this.merchant,
      this.chests,
      this.combatFocus,
      this.visible,
      this.minions
    );

    const prevPos = this.lastHeroPos;
    let moved = false;

    if (!this.shouldDeferInstantAction(action)) {
      if (action.type === 'fight') {
        this.currentPath = [];
        this.doCombat(action.target, false, action.distance ?? 1);
        this.trackHeroMovement(prevPos, false, true);
        return;
      }

      if (action.type === 'disarm') {
        this.currentPath = [];
        this.doDisarm(action.target);
        this.trackHeroMovement(prevPos, false, true);
        return;
      }

      if (action.type === 'heal') {
        this.currentPath = [];
        this.doHeal(action.target);
        this.trackHeroMovement(prevPos, false, true);
        return;
      }

      if (action.type === 'shop') {
        this.currentPath = [];
        this.doShop(action.target);
        this.trackHeroMovement(prevPos, false, true);
        return;
      }

      if (action.type === 'loot') {
        this.currentPath = [];
        this.doLoot(action.target);
        this.trackHeroMovement(prevPos, false, true);
        return;
      }

      if (action.type === 'chest') {
        this.currentPath = [];
        this.doOpenChest(action.target);
        this.trackHeroMovement(prevPos, false, true);
        return;
      }
    } else {
      this.currentPath = [];
    }

    const PATH_ACTIONS = new Set([
      'room-loot',
      'disarm-move',
      'heal-move',
      'merchant-move',
      'chest-move',
      'chase',
      'move',
      'explore',
      'stairs',
    ]);

    if (PATH_ACTIONS.has(action.type)) {
      this.currentPath = action.path?.length ? [...action.path] : [];
      if (action.type === 'chase' && action.goal?.x != null && action.goal?.alive !== false) {
        this.combatFocus = action.goal;
      }
    } else {
      this.currentPath = [];
    }

    if (this.combatFocus?.alive && action.type === 'wait') {
      this.combatFocus = null;
    }

    if (this.currentPath.length) {
      const next = this.currentPath.shift();
      const blocker = this.monsters.find(
        (m) => m.alive && m.x === next.x && m.y === next.y
      );
      if (blocker) {
        this.currentPath = [];
        this.doCombat(blocker, false, getHeroFightDistance(this.hero, blocker));
        this.trackHeroMovement(prevPos, false, true);
        return;
      }

      const occupied = getHeroBlockedSet(this.hero, this.monsters, this.minions, {
        blockMinions: false,
      });
      occupied.delete(key(this.hero.x, this.hero.y));
      if (!canStep(this.map, this.hero.x, this.hero.y, next.x, next.y, occupied)) {
        this.currentPath = [];
      } else {
        updateFacing(this.hero, next.x - this.hero.x, next.y - this.hero.y);
        this.applyHeroMove(next.x, next.y);
        moved = true;
        this.trackHeroMovement(prevPos, moved);
        return;
      }
    }

    const wanderBlocked = getHeroBlockedSet(this.hero, this.monsters, this.minions, {
      blockMinions: false,
    });
    wanderBlocked.delete(key(this.hero.x, this.hero.y));

    const shouldForceUnstick = this.stuckTicks >= 2
      || action.type === 'wait'
      || this.shouldDeferInstantAction(action);

    if (shouldForceUnstick) {
      const unstick = findUnstickStep(
        this.map,
        this.hero.x,
        this.hero.y,
        this.explored,
        wanderBlocked,
        {
          visible: this.visible,
          monsters: this.monsters,
          hero: this.hero,
          stairs: getAliveBoss(this.monsters) ? null : this.stairs,
          avoidKeys: this.recentPositions,
        }
      );
      if (unstick) {
        updateFacing(this.hero, unstick.x - this.hero.x, unstick.y - this.hero.y);
        this.applyHeroMove(unstick.x, unstick.y);
        moved = true;
        this.trackHeroMovement(prevPos, moved);
        return;
      }
    }

    const wander = wanderStep(this.map, this.hero.x, this.hero.y, wanderBlocked);
    if (wander) {
      updateFacing(this.hero, wander.x - this.hero.x, wander.y - this.hero.y);
      this.applyHeroMove(wander.x, wander.y);
      moved = true;
    }

    this.trackHeroMovement(prevPos, moved);
  }

  shouldDeferInstantAction(action) {
    if (this.stuckTicks < 2) return false;

    switch (action.type) {
      case 'shop':
      case 'wait':
        return true;
      case 'fight':
        if (!action.target) return true;
        return !canAttackTarget(
          this.map,
          this.hero.x,
          this.hero.y,
          action.target.x,
          action.target.y,
          getAttackRange(this.hero)
        );
      case 'heal':
      case 'disarm':
      case 'loot':
      case 'chest':
        return this.stuckTicks >= 4;
      default:
        return false;
    }
  }

  trackHeroMovement(prevPos, moved, acted = false) {
    const curPos = key(this.hero.x, this.hero.y);
    if (!prevPos) {
      this.lastHeroPos = curPos;
      this.stuckTicks = 0;
      this.recentPositions = [curPos];
      return;
    }

    if (acted) {
      this.stuckTicks = 0;
      this.lastHeroPos = curPos;
      this.recentPositions.push(curPos);
      if (this.recentPositions.length > 6) {
        this.recentPositions.shift();
      }
      return;
    }

    if (moved && curPos !== prevPos) {
      this.stuckTicks = 0;
      this.lastHeroPos = curPos;
      this.recentPositions.push(curPos);
      if (this.recentPositions.length > 6) {
        this.recentPositions.shift();
      }
      return;
    }

    if (curPos === prevPos) {
      this.stuckTicks += 1;
    } else {
      this.stuckTicks = 0;
      this.lastHeroPos = curPos;
      this.recentPositions.push(curPos);
      if (this.recentPositions.length > 6) {
        this.recentPositions.shift();
      }
    }
  }

  doCombat(monster, monsterInitiated = false, distance = 1) {
    const heroRange = getAttackRange(this.hero);
    const heroCanAttack = canAttackTarget(
      this.map,
      this.hero.x,
      this.hero.y,
      monster.x,
      monster.y,
      heroRange
    );
    const monsterCanAttack = canMonsterAttackHero(this.map, monster, this.hero);
    const fightDist = getHeroFightDistance(this.hero, monster);
    const monsterShotDist = getMonsterFightDistance(monster, this.hero);

    if (!heroCanAttack && !monsterCanAttack) return;
    if (!monsterInitiated && !heroCanAttack) return;

    const result = heroCanAttack
      ? combatRound(this.hero, monster, fightDist, this.monsters)
      : monsterSnipeRound(this.hero, monster);

    this.lastCombatMonster = monster;
    trackCombatRound(monster, this.hero, result.monsterDmg ?? 0);
    const spellColor = result.spell?.color ?? '#ff4466';
    const impactFx = () => {
      this.renderer.shakeScreen(result.spell?.id === 'arcane' ? 5 : 3);
      this.renderer.addParticle(monster.x, monster.y, spellColor, 25);
    };
    const projectileOpts = this.getCombatProjectile(result, impactFx);
    if (projectileOpts) {
      this.renderer.addProjectile(
        this.hero.x,
        this.hero.y,
        monster.x,
        monster.y,
        projectileOpts
      );
    } else if (result.heroDmg > 0) {
      impactFx();
    }

    const heroImpactFx = () => {
      if (result.monsterDmg > 0) {
        this.renderer.shakeScreen(2);
        this.renderer.addParticle(
          this.hero.x,
          this.hero.y,
          monster.projectileColor ?? '#ff4466',
          20
        );
      }
    };
    if (result.monsterDmg > 0 && monsterShotDist > 1 && monster.ranged && !isMeleeAdjacent(
      monster.x,
      monster.y,
      this.hero.x,
      this.hero.y
    )) {
      this.renderer.addProjectile(
        monster.x,
        monster.y,
        this.hero.x,
        this.hero.y,
        this.getMonsterProjectile(monster, heroImpactFx)
      );
    } else if (result.monsterDmg > 0) {
      heroImpactFx();
    }

    if (monsterInitiated) {
      if (monsterShotDist > 1 && monster.ranged && !isMeleeAdjacent(
        monster.x,
        monster.y,
        this.hero.x,
        this.hero.y
      )) {
        this.log(`${monster.name} стреляет!`, 'combat');
      } else {
        this.log(`${monster.name} нападает!`, 'combat');
      }
    }

    if (result.healed) {
      this.log(`${result.attackLabel}: +${result.healed} HP`, 'info');
    } else if (result.shielded) {
      this.log(`${result.attackLabel}! (+${result.spell?.defBonus ?? 4} DEF)`, 'info');
      if (result.heroDmg > 0) {
        this.log(`Контрудар по ${monster.name}: −${result.heroDmg} HP`, 'combat');
      }
    } else if (result.heroDmg > 0) {
      const rangeNote = result.ranged ? ' (дист.)' : '';
      const critNote = result.crit ? ' Крит!' : '';
      this.log(`${result.attackLabel}${rangeNote} по ${monster.name}: −${result.heroDmg} HP${critNote}`, 'combat');
    }

    if (result.drained > 0) {
      this.log(`Поглощено: +${result.drained} HP`, 'info');
    }
    if (result.hasted) {
      this.log('Ускорение: шанс уклонения повышен!', 'info');
    }
    if (result.prismWard) {
      this.log('Призматический барьер активирован!', 'info');
    }
    if (result.mirrorSkin) {
      this.log('Зеркальная кожа: урон отражается во врага', 'info');
    }
    if (result.reflected > 0) {
      this.log(`Отражение: ${monster.name} получает ${result.reflected} урона`, 'combat');
    }
    if (result.veiled) {
      this.log('Покров теней: шанс уклонения повышен!', 'info');
    }
    if (result.soulWarded) {
      this.log('Духовный заслон создан!', 'info');
    }
    if (result.weakened) {
      this.log(`${monster.name} ослаблен! ATK снижен`, 'combat');
    }
    if (result.cursed) {
      this.log(`${monster.name} проклят! ATK снижен`, 'combat');
    }
    if (result.plagued) {
      this.log(`${monster.name} заражён чумой!`, 'combat');
    }

    for (const hit of result.aoeHits ?? []) {
      this.renderer.addParticle(hit.monster.x, hit.monster.y, spellColor, 18);
      this.log(`  ↳ ${hit.name}: −${hit.damage} HP`, 'combat');
      if (hit.dead) {
        hit.monster.alive = false;
        if (this.combatFocus === hit.monster) {
          this.combatFocus = null;
        }
        this.onMonsterSlain(hit.monster);
      }
    }

    if (result.monsterDead) {
      monster.alive = false;
      if (this.combatFocus === monster) {
        this.combatFocus = null;
      }
      this.onMonsterSlain(monster);
    } else if (result.monsterDmg > 0) {
      const shotNote = monsterShotDist > 1 && monster.ranged
        && !isMeleeAdjacent(monster.x, monster.y, this.hero.x, this.hero.y)
        ? ' (дист.)'
        : '';
      this.log(`${monster.name} бьёт${shotNote}: −${result.monsterDmg} HP`, 'combat');
    }

    if (this.hero.hp <= 0) {
      this.handleHeroDeath(monster);
      this.log('Герой пал в бою...', 'death');
      this.ui.showOverlay('💀 ГЕРОЙ ПОГИБ\n\nНажмите «Новое подземелье»');
    }

    this.syncStats();
  }

  tryRaiseMinion(monster) {
    if (this.hero.profession !== 'necromancer') return;

    const alive = countAliveMinions(this.minions);
    const max = getMaxMinions(this.hero);
    if (alive >= max) return;

    const sk = tryRaiseSkeleton(this.hero, monster, this.minions, this.map, this.monsters);
    if (sk) {
      this.minions.push(sk);
      this.log(`Поднят скелет-слуга! (${alive + 1}/${max})`, 'info');
      this.renderer.addParticle(sk.x, sk.y, '#ccccaa', 25);
    }
  }

  onMonsterSlain(monster) {
    if (monster.isLegendary && monster.legendKey) {
      markLegendAvenged(this.legendaryFoes, monster.legendKey);
      this.ui.updateLegends(getActiveLegends(this.legendaryFoes));
    } else if (wasBarelyWon(this.hero, monster)) {
      this.noteLegendaryFoe(monster, 'barely');
    }

    const prevMax = getMaxMinions(this.hero);
    const levels = gainXp(this.hero, monster.xp);
    const newMax = getMaxMinions(this.hero);
    if (this.hero.profession === 'necromancer' && newMax > prevMax) {
      this.log(`Лимит скелетов увеличен: ${newMax}`, 'info');
    }
    if (monster.isBoss) {
      this.hero.gold += monster.goldReward ?? 0;
      this.log(`${monster.name} повержен! Лестница открыта! +${monster.goldReward} золота`, 'boss');
      this.renderer.shakeScreen(10);
      this.renderer.addParticle(monster.x, monster.y, monster.color ?? '#ffd700', 45);
    } else if (monster.isMimic) {
      this.log(`${monster.name} повержен! +${monster.xp} XP`, 'combat');
      this.renderer.addParticle(monster.x, monster.y, '#cc6644', 35);
    } else if (monster.isLegendary) {
      this.log(`${monster.name} повержен! +${monster.xp} XP`, 'nemesis');
      this.renderer.addParticle(monster.x, monster.y, monster.color ?? '#ff8844', 35);
    } else {
      this.log(`${monster.name} повержен! +${monster.xp} XP`, 'combat');
      this.renderer.addParticle(monster.x, monster.y, '#ffd700', 30);
    }
    if (levels.length) {
      this.processLevelUps(levels);
    }
    this.tryRaiseMinion(monster);
  }

  doLoot(item) {
    const result = collectItem(this.hero, item);
    if (!result) return;
    this.logLootResult(result, item.x, item.y);
    if (result.type === 'legacy_weapon') {
      this.log(`Наследие ${result.heroName}: ${result.name} (+${result.atk} ATK)`, 'legacy');
      this.renderer.addParticle(item.x, item.y, '#ffcc88', 35);
    } else if (result.type === 'legacy_armor') {
      this.log(`Наследие ${result.heroName}: ${result.name} (+${result.def} DEF)`, 'legacy');
      this.renderer.addParticle(item.x, item.y, '#ffcc88', 35);
    } else if (result.type === 'legacy_skill') {
      this.log(`Наследие ${result.heroName}: навык «${result.name}» (ур. ${result.level})`, 'legacy');
      this.renderer.addParticle(item.x, item.y, '#aa88ff', 35);
    } else if (result.type === 'legacy_gold') {
      this.log(`Наследие ${result.heroName}: +${result.value} золота`, 'legacy');
      this.renderer.addParticle(item.x, item.y, '#ffd700', 30);
    }
    if (result.type?.startsWith('legacy_')) {
      this.pendingLegacies = getUnclaimedLegacies();
    }
    this.syncStats();
  }

  descendStairs() {
    if (this.isBossBlocking()) {
      this.log('Лестница запечатана — победите босса!', 'boss');
      return;
    }

    const nextFloor = this.hero.floor + 1;
    this.log(`Лестница найдена! Спуск на этаж ${nextFloor}`, 'info');
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 10 + (this.hero.bonusRegen ?? 0));
    const seed = this.resolveFloorSeed(nextFloor);
    const dungeon = generateDungeon(nextFloor, seed);
    this.map = dungeon.map;
    this.roomTypeMap = dungeon.roomTypeMap;
    this.stairs = dungeon.stairs;
    this.rooms = dungeon.rooms;
    this.hero.x = dungeon.spawn.x;
    this.hero.y = dungeon.spawn.y;
    this.hero.floor = nextFloor;
    this.hero.poison = 0;
    this.hero.slowed = 0;
    this.loadFloorEntities(dungeon, nextFloor);
    this.minions = [];
    this.explored = new Set();
    this.currentPath = [];
    this.revealAroundHero();
    if (this.lockedFeature?.door) {
      this.log('На этаже есть запертая дверь: ищите ключ', 'info');
    }
    const boss = getAliveBoss(this.monsters);
    if (boss) {
      this.log(`БОСС: ${boss.name} охраняет лестницу!`, 'boss');
    }
    this.syncStats();
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.renderer.updateParticles();
    this.accumulator += dt;
    while (this.accumulator >= this.speed) {
      this.accumulator -= this.speed;
      this.tick();
    }
  }

  render() {
    if (!this.map || !this.hero) {
      this.renderer.renderEmpty();
      return;
    }
    this.renderer.render({
      map: this.map,
      roomTypeMap: this.roomTypeMap,
      hero: this.hero,
      monsters: this.monsters,
      items: this.items,
      chests: this.chests,
      traps: this.traps,
      healers: this.healers,
      merchant: this.merchant,
      minions: this.minions,
      explored: this.explored,
      visible: this.visible,
      stairs: this.stairs,
      frame: this.frame,
    });
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  toggleSpeed() {
    this.fast = !this.fast;
    this.speed = this.fast ? GAME_SPEED.fast : GAME_SPEED.normal;
    return this.fast;
  }

  restart() {
    this.state = 'class-select';
    this.map = null;
    this.hero = null;
    this.monsters = [];
    this.items = [];
    this.chests = [];
    this.traps = [];
    this.healers = [];
    this.merchant = null;
    this.minions = [];
    this.legendaryFoes = [];
    this.pendingLegacies = getUnclaimedLegacies();
    this.floorSeeds = {};
    this.lockedFeature = null;
    this.lastCombatMonster = null;
    this.currentPath = [];
    this.accumulator = 0;
    this.ui.clearLog();
    return true;
  }
}
