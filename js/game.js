import { TILES } from './config.js';
import { generateDungeon, spawnEntities, isWalkable } from './dungeon.js';
import { createHero, combatRound, collectItem, gainXp, updateFacing } from './hero.js';
import { getExplorationTarget, getVisibleTiles, wanderStep, moveMonstersTowardHero } from './ai.js';
import { key } from './utils.js';
import { GAME_SPEED } from './config.js';
import { getProfession } from './classes.js';
import { getTrapAt, triggerTrap, tickPoison, disarmTrap, revealTrapsForThief } from './traps.js';
import { canDisarmTraps } from './classes.js';
import { useHealer } from './items.js';
import {
  processMinions,
  tickMonsterDecay,
  tickMonsterCurses,
  tryRaiseSkeleton,
} from './necromancy.js';

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
    const entities = spawnEntities(dungeon, floor);
    this.monsters = entities.monsters;
    this.items = entities.items;
    this.traps = entities.traps;
    this.healers = entities.healers;
    this.explored = new Set();
    this.visible = new Set();
    this.currentPath = [];
    this.accumulator = 0;
    this.state = 'playing';
    this.revealAroundHero();
    this.ui.log(`Этаж ${floor}.`, 'info');
    this.syncStats();
    this.ui.hideOverlay();
  }

  revealAroundHero() {
    const vision = getProfession(this.hero.profession).vision;
    const vis = getVisibleTiles(this.hero.x, this.hero.y, vision);
    vis.forEach((k) => this.explored.add(k));
    this.visible = vis;
    if (canDisarmTraps(this.hero)) {
      revealTrapsForThief(this.traps, vis);
    }
  }

  applyHeroMove(nx, ny) {
    updateFacing(this.hero, nx - this.hero.x, ny - this.hero.y);
    this.hero.x = nx;
    this.hero.y = ny;
    this.checkTrap();
    this.checkHealer();

    if (this.hero.hp <= 0) return;

    if (this.map[ny][nx] === TILES.STAIRS) {
      this.descendStairs();
    }
  }

  checkTrap() {
    const trap = getTrapAt(this.traps, this.hero.x, this.hero.y);
    if (!trap) return;

    if (canDisarmTraps(this.hero)) {
      this.doDisarm(trap);
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

  doDisarm(trap) {
    const result = disarmTrap(trap);
    this.renderer.addParticle(trap.x, trap.y, result.particleColor, 20);
    this.log(result.message, 'info');
    this.syncStats();
  }

  syncStats() {
    const minions = this.minions?.filter((s) => s.alive).length ?? 0;
    this.ui.updateStats(this.hero, minions);
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
        const levels = gainXp(this.hero, hit.monster.xp);
        this.log(`${hit.monster.name} повержен! +${hit.monster.xp} XP`, 'combat');
        levels.forEach((lv) => this.log(`Уровень ${lv}! Сила растёт!`, 'info'));
      }
      this.syncStats();
    }

    for (const ev of processMinions(this.minions, this.monsters, this.map)) {
      if (ev.type === 'attack') {
        this.log(`Скелет бьёт ${ev.monster.name}: −${ev.damage} HP`, 'combat');
        this.renderer.addParticle(ev.monster.x, ev.monster.y, '#ccccaa', 15);
      }
      if (ev.type === 'kill') {
        const levels = gainXp(this.hero, ev.monster.xp);
        this.log(`${ev.monster.name} повержен скелетом! +${ev.monster.xp} XP`, 'combat');
        levels.forEach((lv) => this.log(`Уровень ${lv}! Сила растёт!`, 'info'));
        this.tryRaiseMinion(ev.monster);
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
      this.healers
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
      this.log(`${result.attackLabel}${rangeNote} по ${monster.name}: −${result.heroDmg} HP`, 'combat');
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
        const levels = gainXp(this.hero, hit.monster.xp);
        this.log(`${hit.name} повержен! +${hit.monster.xp} XP`, 'combat');
        levels.forEach((lv) => this.log(`Уровень ${lv}! Сила растёт!`, 'info'));
        this.tryRaiseMinion(hit.monster);
      }
    }

    if (result.monsterDead) {
      monster.alive = false;
      const levels = gainXp(this.hero, monster.xp);
      this.log(`${monster.name} повержен! +${monster.xp} XP`, 'combat');
      levels.forEach((lv) => this.log(`Уровень ${lv}! Сила растёт!`, 'info'));
      this.renderer.addParticle(monster.x, monster.y, '#ffd700', 30);
      this.tryRaiseMinion(monster);
    } else if (result.monsterDmg > 0) {
      this.log(`${monster.name} бьёт: −${result.monsterDmg} HP`, 'combat');
    }

    this.syncStats();
  }

  tryRaiseMinion(monster) {
    const sk = tryRaiseSkeleton(this.hero, monster, this.minions, this.map, this.monsters);
    if (sk) {
      this.minions.push(sk);
      this.log('Поднят скелет-слуга!', 'info');
      this.renderer.addParticle(sk.x, sk.y, '#ccccaa', 25);
    }
  }

  doLoot(item) {
    const result = collectItem(this.hero, item);
    if (!result) return;

    if (result.type === 'gold') {
      const bonusText = result.bonus ? ` (+${result.bonus} бонус)` : '';
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
    const nextFloor = this.hero.floor + 1;
    this.log(`Лестница найдена! Спуск на этаж ${nextFloor}`, 'info');
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 10);
    const dungeon = generateDungeon(nextFloor);
    this.map = dungeon.map;
    this.stairs = dungeon.stairs;
    this.rooms = dungeon.rooms;
    this.hero.x = dungeon.spawn.x;
    this.hero.y = dungeon.spawn.y;
    this.hero.floor = nextFloor;
    this.hero.poison = 0;
    this.hero.slowed = 0;
    const entities = spawnEntities(dungeon, nextFloor);
    this.monsters = entities.monsters;
    this.items = entities.items;
    this.traps = entities.traps;
    this.healers = entities.healers;
    this.minions = [];
    this.explored = new Set();
    this.currentPath = [];
    this.revealAroundHero();
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
    this.minions = [];
    this.currentPath = [];
    this.accumulator = 0;
    this.ui.clearLog();
    return true;
  }
}
