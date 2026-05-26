import { TILES } from './config.js';
import { generateDungeon, spawnEntities, isWalkable } from './dungeon.js';
import { createHero, combatRound, collectItem, gainXp, updateFacing } from './hero.js';
import { getExplorationTarget, getVisibleTiles, wanderStep, moveMonstersTowardHero, canAttackTarget } from './ai.js';
import { key } from './utils.js';
import { GAME_SPEED } from './config.js';
import { getProfession, getAttackRange, canDisarmTraps } from './classes.js';
import { getTrapAt, triggerTrap, tickPoison, disarmTrap, revealTrapsForThief } from './traps.js';
import { useHealer, purchaseFromMerchant } from './items.js';
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
} from './necromancy.js';
import {
  growSkillOnLevelUp,
  learnRandomSkill,
  shouldPickSkillOnLevel,
  getHeroSkillsList,
  getHeroVision,
} from './skills.js';

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
    this.state = 'class-select';
    this.map = null;
    this.hero = null;
    this.monsters = [];
    this.items = [];
    this.traps = [];
    this.healers = [];
    this.merchant = null;
    this.minions = [];
  }

  start(professionId) {
    this.profession = professionId;
    this.paused = false;
    this.ui.clearLog();
    this.newDungeon(1);
  }

  newDungeon(floor = 1) {
    const dungeon = generateDungeon(floor);
    this.map = dungeon.map;
    this.stairs = dungeon.stairs;
    this.rooms = dungeon.rooms;

    if (floor === 1) {
      this.hero = createHero(dungeon.spawn, this.profession);
      this.minions = [];
      this.ui.log(`${this.hero.professionName} ${this.hero.name} входит в подземелье`, 'info');
    } else {
      this.hero.x = dungeon.spawn.x;
      this.hero.y = dungeon.spawn.y;
    }

    this.hero.floor = floor;
    const entities = spawnEntities(dungeon, floor, this.hero);
    this.monsters = entities.monsters;
    this.items = entities.items;
    this.traps = entities.traps;
    this.healers = entities.healers;
    this.merchant = entities.merchant ?? null;
    this.explored = new Set();
    this.visible = new Set();
    this.currentPath = [];
    this.accumulator = 0;
    this.state = 'playing';
    this.revealAroundHero();
    this.ui.log(`Этаж ${floor}.`, 'info');
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
    this.renderer.shakeScreen(4);
    this.renderer.addParticle(this.hero.x, this.hero.y, result.particleColor, 25);
    this.log(result.message, 'trap');

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
    if (result.type === 'heal') {
      const cureText = result.cured ? ', яд снят' : '';
      this.log(`${seller}: ${result.name} за ${result.price} зол. (+${result.value} HP${cureText})`, 'shop');
      this.renderer.addParticle(this.hero.x, this.hero.y, '#44ff88', 25);
    } else if (result.type === 'weapon') {
      this.log(`${seller}: ${result.name} (+${result.atk} ATK) за ${result.price} зол.`, 'shop');
      this.renderer.addParticle(this.hero.x, this.hero.y, '#cccccc', 20);
    } else if (result.type === 'armor') {
      this.log(`${seller}: ${result.name} (+${result.def} DEF) за ${result.price} зол.`, 'shop');
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

  tick() {
    if (this.paused || this.state !== 'playing') return;

    this.frame += 1;
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
        this.hero.alive = false;
        this.state = 'dead';
        this.log('Герой пал от отравления...', 'death');
        this.ui.showOverlay('💀 ГЕРОЙ ПОГИБ\n\nНажмите «Новое подземелье»');
        return;
      }
    }

    if (this.hero.hp <= 0) {
      this.hero.alive = false;
      this.state = 'dead';
      this.log('Герой пал в подземелье...', 'death');
      this.ui.showOverlay('💀 ГЕРОЙ ПОГИБ\n\nНажмите «Новое подземелье»');
      this.syncStats();
      return;
    }

    if (this.hero.slowed > 0) {
      this.hero.slowed -= 1;
      this.log('Заклинивание... пропуск хода', 'trap');
      return;
    }

    const attackingMonster = moveMonstersTowardHero(this.map, this.hero, this.monsters);
    if (attackingMonster) {
      this.currentPath = [];
      this.doCombat(attackingMonster, true);
      return;
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
      this.merchant
    );

    if (action.type === 'fight') {
      this.doCombat(action.target, false, action.distance ?? 1);
      return;
    }

    if (action.type === 'disarm') {
      this.doDisarm(action.target);
      return;
    }

    if (action.type === 'heal') {
      this.doHeal(action.target);
      return;
    }

    if (action.type === 'shop') {
      this.doShop(action.target);
      return;
    }

    if (action.type === 'loot') {
      this.doLoot(action.target);
      return;
    }

    if (action.type === 'room-loot') {
      if (action.path?.length) {
        this.currentPath = [...action.path];
      }
    } else if (action.type === 'disarm-move') {
      if (action.path?.length) {
        this.currentPath = [...action.path];
      }
    } else if (action.type === 'heal-move') {
      if (action.path?.length) {
        this.currentPath = [...action.path];
      }
    } else if (action.type === 'merchant-move') {
      if (action.path?.length) {
        this.currentPath = [...action.path];
      }
    } else if (action.type === 'move' || action.type === 'explore' || action.type === 'stairs') {
      if (!this.currentPath.length && action.path) {
        this.currentPath = [...action.path];
      }
    }

    if (this.currentPath.length) {
      const next = this.currentPath.shift();
      const blocked = this.monsters.some(
        (m) => m.alive && m.x === next.x && m.y === next.y
      );
      if (blocked) {
        this.currentPath = [];
        return;
      }

      updateFacing(this.hero, next.x - this.hero.x, next.y - this.hero.y);
      this.applyHeroMove(next.x, next.y);
      return;
    }

    if (action.type === 'stairs' && action.path?.length) {
      this.currentPath = [...action.path];
      return;
    }

    const wander = wanderStep(this.map, this.hero.x, this.hero.y);
    if (wander) {
      this.applyHeroMove(wander.x, wander.y);
    }
  }

  doCombat(monster, monsterInitiated = false, distance = 1) {
    if (!canAttackTarget(this.map, this.hero.x, this.hero.y, monster.x, monster.y, getAttackRange(this.hero))) {
      return;
    }

    const result = combatRound(this.hero, monster, distance, this.monsters);
    const spellColor = result.spell?.color ?? '#ff4466';
    this.renderer.shakeScreen(result.spell?.id === 'arcane' ? 5 : 3);
    this.renderer.addParticle(monster.x, monster.y, spellColor, 25);

    if (monsterInitiated) {
      this.log(`${monster.name} нападает!`, 'combat');
    }

    if (result.healed) {
      this.log(`${result.attackLabel}: +${result.healed} HP`, 'info');
    } else if (result.shielded) {
      this.log(`${result.attackLabel}! (+${result.spell?.defBonus ?? 4} DEF)`, 'info');
      if (result.heroDmg > 0) {
        this.log(`Контрудар по ${monster.name}: −${result.heroDmg} HP`, 'combat');
      }
    } else {
      const rangeNote = result.ranged ? ' (дист.)' : '';
      const critNote = result.crit ? ' Крит!' : '';
      this.log(`${result.attackLabel}${rangeNote} по ${monster.name}: −${result.heroDmg} HP${critNote}`, 'combat');
    }

    if (result.drained > 0) {
      this.log(`Поглощено: +${result.drained} HP`, 'info');
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
        this.onMonsterSlain(hit.monster);
      }
    }

    if (result.monsterDead) {
      monster.alive = false;
      this.onMonsterSlain(monster);
    } else if (result.monsterDmg > 0) {
      this.log(`${monster.name} бьёт: −${result.monsterDmg} HP`, 'combat');
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

    if (result.type === 'gold') {
      let bonusText = '';
      if (result.bonus) bonusText += ` (+${result.bonus} бонус)`;
      if (result.luckBonus) bonusText += ` (+${result.luckBonus} удача)`;
      if (result.skillBonus) bonusText += ` (+${result.skillBonus} навык)`;
      this.log(`+${result.value} золота${bonusText}`, 'loot');
      this.renderer.addParticle(item.x, item.y, '#ffd700', 25);
    } else if (result.type === 'heal') {
      const cureText = result.cured ? ', яд снят' : '';
      this.log(`${result.name}: +${result.value} HP${cureText}`, 'loot');
      this.renderer.addParticle(item.x, item.y, '#44ff88', 25);
    } else if (result.type === 'weapon') {
      if (result.equipped) {
        this.log(`Экипировано: ${result.name} (+${result.atk} ATK)`, 'loot');
      } else {
        this.log(`${result.name} продан (слабее текущего)`, 'loot');
      }
      this.renderer.addParticle(item.x, item.y, '#cccccc', 20);
    } else if (result.type === 'armor') {
      if (result.equipped) {
        this.log(`Экипировано: ${result.name} (+${result.def} DEF)`, 'loot');
      } else {
        this.log(`${result.name} продан`, 'loot');
      }
      this.renderer.addParticle(item.x, item.y, '#888899', 20);
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
    const dungeon = generateDungeon(nextFloor);
    this.map = dungeon.map;
    this.stairs = dungeon.stairs;
    this.rooms = dungeon.rooms;
    this.hero.x = dungeon.spawn.x;
    this.hero.y = dungeon.spawn.y;
    this.hero.floor = nextFloor;
    this.hero.poison = 0;
    this.hero.slowed = 0;
    const entities = spawnEntities(dungeon, nextFloor, this.hero);
    this.monsters = entities.monsters;
    this.items = entities.items;
    this.traps = entities.traps;
    this.healers = entities.healers;
    this.merchant = entities.merchant ?? null;
    this.minions = [];
    this.explored = new Set();
    this.currentPath = [];
    this.revealAroundHero();
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
      hero: this.hero,
      monsters: this.monsters,
      items: this.items,
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
    this.traps = [];
    this.healers = [];
    this.merchant = null;
    this.minions = [];
    this.currentPath = [];
    this.accumulator = 0;
    this.ui.clearLog();
    return true;
  }
}
