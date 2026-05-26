import { TILE, MAP_W, MAP_H, COLORS, TILES } from './config.js';
import { key } from './utils.js';
import { drawHeroSprite, drawHeroDeath } from './sprites.js';
import { TRAP_TYPES } from './traps.js';
import {
  getDungeonTheme,
  drawWallTile,
  drawFloorTile,
  drawStairsTile,
  drawFogTile,
} from './tiles.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.particles = [];
    this.projectiles = [];
    this.shake = 0;
  }

  addProjectile(fromX, fromY, toX, toY, options = {}) {
    if (fromX === toX && fromY === toY) return;

    this.projectiles.push({
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      speed: options.speed ?? 0.16,
      kind: options.kind ?? 'arrow',
      color: options.color ?? '#cccccc',
      trail: options.trail ?? null,
      onComplete: options.onComplete ?? null,
      done: false,
    });
  }

  updateProjectiles() {
    this.projectiles = this.projectiles.filter((p) => {
      const prev = p.progress;
      p.progress += p.speed;

      if (p.trail && prev < 1) {
        const t = Math.min(1, p.progress);
        const wx = p.fromX + (p.toX - p.fromX) * t;
        const wy = p.fromY + (p.toY - p.fromY) * t;
        this.addParticle(wx, wy, p.trail, 8);
      }

      if (!p.done && prev < 1 && p.progress >= 1) {
        p.done = true;
        if (p.onComplete) p.onComplete();
      }

      return p.progress < 1.05;
    });
  }

  drawArrow(ctx, cx, cy, dx, dy, color = '#d4c4a0') {
    const ax = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 1 : -1) : 0;
    const ay = Math.abs(dy) > Math.abs(dx) ? (dy >= 0 ? 1 : -1) : 0;

    ctx.fillStyle = '#664422';
    if (ax > 0) {
      ctx.fillRect(cx - 5, cy + 1, 4, 2);
      ctx.fillStyle = color;
      ctx.fillRect(cx - 1, cy, 5, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 3, cy + 1, 2, 2);
    } else if (ax < 0) {
      ctx.fillRect(cx + 1, cy + 1, 4, 2);
      ctx.fillStyle = color;
      ctx.fillRect(cx - 4, cy, 5, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 4, cy + 1, 2, 2);
    } else if (ay > 0) {
      ctx.fillRect(cx + 1, cy - 5, 2, 4);
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy - 1, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 1, cy + 3, 2, 2);
    } else if (ay < 0) {
      ctx.fillRect(cx + 1, cy + 1, 2, 4);
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy - 4, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 1, cy - 4, 2, 2);
    }
  }

  drawOrb(ctx, cx, cy, color, size = 4) {
    ctx.fillStyle = color;
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.fillStyle = '#ffffff88';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }

  drawLightning(ctx, sx, sy, ex, ey, color = '#ffff44') {
    const steps = 5;
    let px = sx;
    let py = sy;
    ctx.fillStyle = color;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const tx = sx + (ex - sx) * t + (i < steps ? (Math.random() - 0.5) * 4 : 0);
      const ty = sy + (ey - sy) * t + (i < steps ? (Math.random() - 0.5) * 4 : 0);
      const dx = tx - px;
      const dy = ty - py;
      const seg = Math.max(Math.abs(dx), Math.abs(dy), 1);
      ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round(Math.abs(dx) || 2)), Math.max(2, Math.round(Math.abs(dy) || 2)));
      px = tx;
      py = ty;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2);
  }

  drawProjectile(p, camX, camY) {
    const t = Math.min(1, p.progress);
    const wx = p.fromX + (p.toX - p.fromX) * t;
    const wy = p.fromY + (p.toY - p.fromY) * t;
    const start = this.worldToScreen(p.fromX, p.fromY, camX, camY);
    const end = this.worldToScreen(wx, wy, camX, camY);
    const cx = end.sx + TILE / 2;
    const cy = end.sy + TILE / 2;
    const sx = start.sx + TILE / 2;
    const sy = start.sy + TILE / 2;
    const dx = p.toX - p.fromX;
    const dy = p.toY - p.fromY;
    const ctx = this.ctx;

    switch (p.kind) {
      case 'fireball':
        this.drawOrb(ctx, cx, cy, p.color ?? '#ff6600', 5);
        this.drawOrb(ctx, cx - dx * 2, cy - dy * 2, '#cc5500', 3);
        break;
      case 'ice':
        ctx.fillStyle = p.color ?? '#66ccff';
        if (Math.abs(dx) >= Math.abs(dy)) {
          ctx.fillRect(cx - 3, cy - 1, 6, 3);
          ctx.fillRect(cx + 1, cy - 2, 2, 5);
        } else {
          ctx.fillRect(cx - 1, cy - 3, 3, 6);
          ctx.fillRect(cx - 2, cy + 1, 5, 2);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx, cy, 2, 2);
        break;
      case 'lightning':
        this.drawLightning(ctx, sx, sy, cx, cy, p.color ?? '#ffff44');
        break;
      case 'arcane':
        this.drawOrb(ctx, cx, cy, p.color ?? '#bb66ff', 4);
        ctx.fillStyle = '#dd99ff55';
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
        break;
      case 'deathBolt':
        ctx.fillStyle = p.color ?? '#88ff66';
        this.drawArrow(ctx, cx, cy, dx, dy, '#88ff66');
        ctx.fillStyle = '#224411';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      case 'drain':
      case 'curse':
      case 'plague':
        this.drawOrb(ctx, cx, cy, p.color ?? '#aa44aa', 3);
        ctx.fillStyle = '#ffffff44';
        ctx.fillRect(sx, sy, cx - sx || 2, cy - sy || 2);
        break;
      case 'bolt':
        this.drawOrb(ctx, cx, cy, p.color ?? '#8844ff', 3);
        break;
      case 'arrow':
      default:
        this.drawArrow(ctx, cx, cy, dx, dy, p.color ?? '#d4c4a0');
        break;
    }
  }

  drawProjectiles(camX, camY) {
    for (const p of this.projectiles) {
      this.drawProjectile(p, camX, camY);
    }
  }

  addParticle(x, y, color, life = 20) {
    this.particles.push({
      x: x * TILE + TILE / 2,
      y: y * TILE + TILE / 2,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 - 1,
      life,
      maxLife: life,
      color,
    });
  }

  shakeScreen(amount = 4) {
    this.shake = amount;
  }

  updateParticles() {
    this.updateProjectiles();
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 1;
      return p.life > 0;
    });
    if (this.shake > 0) this.shake *= 0.8;
    if (this.shake < 0.5) this.shake = 0;
  }

  worldToScreen(wx, wy, camX, camY) {
    const offsetX = this.canvas.width / 2 - camX * TILE - TILE / 2;
    const offsetY = this.canvas.height / 2 - camY * TILE - TILE / 2;
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    return {
      sx: wx * TILE + offsetX + shakeX,
      sy: wy * TILE + offsetY + shakeY,
    };
  }

  drawTile(map, x, y, explored, visible, camX, camY, theme) {
    const k = key(x, y);
    const seen = explored.has(k);
    const lit = visible.has(k);
    if (!seen) return;

    const { sx, sy } = this.worldToScreen(x, y, camX, camY);
    const tile = map[y][x];
    const ctx = this.ctx;

    if (!lit) {
      drawFogTile(ctx, sx, sy, theme, tile === TILES.WALL);
      return;
    }

    switch (tile) {
      case TILES.WALL:
        drawWallTile(ctx, sx, sy, map, x, y, theme);
        break;
      case TILES.STAIRS:
        drawStairsTile(ctx, sx, sy, theme);
        break;
      default:
        drawFloorTile(ctx, sx, sy, theme, x, y);
        break;
    }
  }

  drawItem(item, camX, camY) {
    if (item.collected) return;
    const { sx, sy } = this.worldToScreen(item.x, item.y, camX, camY);
    const ctx = this.ctx;
    const bob = Math.sin(Date.now() / 200 + item.x) * 1;

    if (item.type === 'gold') {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(sx + 5, sy + 6 + bob, 6, 5);
      ctx.fillRect(sx + 4, sy + 5 + bob, 8, 2);
      return;
    }

    if (item.type.startsWith('potion')) {
      const color = item.color ?? COLORS.potion;
      ctx.fillStyle = color;
      const h = item.type === 'potion_large' ? 7 : item.type === 'potion_small' ? 4 : 6;
      ctx.fillRect(sx + 6, sy + 4 + (6 - h) + bob, 4, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 7, sy + 5 + bob, 2, 2);
      return;
    }

    if (item.type === 'weapon') {
      ctx.fillStyle = item.color ?? '#cccccc';
      ctx.fillRect(sx + 4, sy + 5 + bob, 2, 8);
      ctx.fillRect(sx + 3, sy + 4 + bob, 4, 2);
      ctx.fillRect(sx + 6, sy + 7 + bob, 6, 2);
      return;
    }

    if (item.type === 'armor') {
      ctx.fillStyle = item.color ?? '#888899';
      ctx.fillRect(sx + 4, sy + 5 + bob, 8, 7);
      ctx.fillRect(sx + 5, sy + 4 + bob, 6, 2);
      ctx.fillStyle = '#ffffff44';
      ctx.fillRect(sx + 6, sy + 7 + bob, 4, 3);
      return;
    }

    if (item.type === 'grave') {
      ctx.fillStyle = '#665544';
      ctx.fillRect(sx + 5, sy + 8 + bob, 6, 6);
      ctx.fillRect(sx + 4, sy + 6 + bob, 8, 3);
      ctx.fillStyle = '#998877';
      ctx.fillRect(sx + 6, sy + 4 + bob, 4, 3);
      ctx.fillStyle = '#ffcc88';
      ctx.fillRect(sx + 7, sy + 9 + bob, 2, 2);
      ctx.fillRect(sx + 5, sy + 11 + bob, 6, 1);
      return;
    }
  }

  drawChest(chest, camX, camY, frame) {
    if (chest.isMimic && chest.opened) return;

    const { sx, sy } = this.worldToScreen(chest.x, chest.y, camX, camY);
    const ctx = this.ctx;
    const pulse = Math.sin(frame / 8 + chest.x) * 0.5;

    if (chest.opened) {
      ctx.fillStyle = '#553311';
      ctx.fillRect(sx + 3, sy + 10, 10, 5);
      ctx.fillRect(sx + 2, sy + 8, 12, 3);
      ctx.fillStyle = '#443322';
      ctx.fillRect(sx + 3, sy + 5, 10, 4);
      return;
    }

    ctx.fillStyle = '#553311';
    ctx.fillRect(sx + 3, sy + 10, 10, 5);
    ctx.fillStyle = '#775533';
    ctx.fillRect(sx + 2, sy + 8, 12, 4);
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(sx + 4, sy + 6 + pulse, 8, 2);
    ctx.fillRect(sx + 7, sy + 9, 2, 3);
    ctx.fillStyle = '#ffee88';
    ctx.fillRect(sx + 5, sy + 7 + pulse, 4, 2);
  }

  drawHealer(healer, camX, camY, frame) {
    if (healer.used) return;
    const { sx, sy } = this.worldToScreen(healer.x, healer.y, camX, camY);
    const ctx = this.ctx;
    const pulse = Math.sin(frame / 8) * 0.5;

    ctx.fillStyle = '#224444';
    ctx.fillRect(sx + 3, sy + 8, 10, 6);
    ctx.fillStyle = '#336666';
    ctx.fillRect(sx + 4, sy + 9, 8, 4);
    ctx.fillStyle = '#44ffff';
    ctx.fillRect(sx + 7, sy + 5 + pulse, 2, 6);
    ctx.fillRect(sx + 5, sy + 7 + pulse, 6, 2);
    ctx.fillStyle = '#88ffff';
    ctx.fillRect(sx + 6, sy + 3 + pulse, 4, 2);
  }

  drawMerchant(merchant, camX, camY, frame) {
    const { sx, sy } = this.worldToScreen(merchant.x, merchant.y, camX, camY);
    const ctx = this.ctx;
    const pulse = Math.sin(frame / 10) * 0.5;

    ctx.fillStyle = '#553311';
    ctx.fillRect(sx + 2, sy + 10, 12, 5);
    ctx.fillStyle = '#664422';
    ctx.fillRect(sx + 3, sy + 8, 10, 3);
    ctx.fillStyle = '#886633';
    ctx.fillRect(sx + 4, sy + 6, 8, 2);

    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(sx + 5 + pulse, sy + 12, 2, 2);
    ctx.fillRect(sx + 9 - pulse, sy + 11, 2, 2);
    ctx.fillRect(sx + 7, sy + 13, 2, 2);

    ctx.fillStyle = '#cc8844';
    ctx.fillRect(sx + 6, sy + 3, 4, 4);
    ctx.fillStyle = '#aa6633';
    ctx.fillRect(sx + 5, sy + 2, 6, 2);
    ctx.fillStyle = '#442211';
    ctx.fillRect(sx + 6, sy + 4, 4, 2);
  }

  drawTrap(trap, camX, camY, frame) {
    if (trap.triggered || trap.disarmed) return;
    if (!trap.revealed) return;

    const { sx, sy } = this.worldToScreen(trap.x, trap.y, camX, camY);
    const ctx = this.ctx;
    const pulse = Math.sin(frame / 6 + trap.x) * 0.5;
    const type = TRAP_TYPES[trap.type];

    switch (trap.type) {
      case 'spike':
        ctx.fillStyle = '#662222';
        ctx.fillRect(sx + 3, sy + 10, 10, 4);
        ctx.fillStyle = type.color;
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(sx + 3 + i * 3, sy + 8 + pulse, 2, 4);
        }
        break;
      case 'arrow':
        ctx.fillStyle = '#444444';
        ctx.fillRect(sx + 2, sy + 7, 12, 2);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(sx + 8, sy + 5 + pulse, 5, 2);
        ctx.fillRect(sx + 12, sy + 4 + pulse, 2, 4);
        break;
      case 'poison':
        ctx.fillStyle = '#114411';
        ctx.fillRect(sx + 3, sy + 9, 10, 5);
        ctx.fillStyle = type.color;
        ctx.fillRect(sx + 5, sy + 10 + pulse, 6, 3);
        ctx.fillRect(sx + 7, sy + 8, 2, 2);
        break;
      case 'fire':
        ctx.fillStyle = '#442200';
        ctx.fillRect(sx + 4, sy + 10, 8, 4);
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(sx + 5, sy + 8 + pulse, 2, 4);
        ctx.fillRect(sx + 8, sy + 7 + pulse, 2, 5);
        ctx.fillRect(sx + 11, sy + 8 + pulse, 2, 4);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(sx + 7, sy + 6 + pulse, 2, 3);
        break;
      case 'teleport':
        ctx.fillStyle = '#331155';
        ctx.fillRect(sx + 4, sy + 4, 8, 8);
        ctx.fillStyle = type.color;
        ctx.fillRect(sx + 5, sy + 7 + pulse, 6, 2);
        ctx.fillRect(sx + 7, sy + 5 + pulse, 2, 6);
        ctx.fillStyle = '#dd88ff';
        ctx.fillRect(sx + 7, sy + 7, 2, 2);
        break;
      case 'slow':
        ctx.fillStyle = '#223355';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(sx + 3 + i * 4, sy + 9 + pulse, 3, 2);
          ctx.fillRect(sx + 5 + i * 3, sy + 12, 2, 2);
        }
        ctx.fillStyle = type.color;
        ctx.fillRect(sx + 6, sy + 6, 4, 2);
        break;
      default:
        ctx.fillStyle = type?.color ?? '#ff8800';
        ctx.fillRect(sx + 4, sy + 4, 8, 8);
    }
  }

  drawMonster(monster, camX, camY, frame) {
    if (!monster.alive) return;
    if (monster.isBoss) {
      this.drawBoss(monster, camX, camY, frame);
      return;
    }
    if (monster.isMimic) {
      this.drawMimic(monster, camX, camY, frame);
      return;
    }
    const { sx, sy } = this.worldToScreen(monster.x, monster.y, camX, camY);
    const ctx = this.ctx;
    const wobble = Math.sin(frame / 5 + monster.x) * 0.5;

    ctx.fillStyle = monster.color ?? COLORS.monster;
    ctx.fillRect(sx + 3, sy + 5 + wobble, 10, 8);
    ctx.fillRect(sx + 4, sy + 3 + wobble, 8, 4);

    if (monster.isLegendary) {
      ctx.fillStyle = '#ffcc44';
      ctx.fillRect(sx + 4, sy + 1 + wobble, 8, 2);
    }

    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(sx + 5, sy + 5 + wobble, 2, 2);
    ctx.fillRect(sx + 9, sy + 5 + wobble, 2, 2);

    if (monster.ranged) {
      ctx.fillStyle = '#ccccaa';
      ctx.fillRect(sx + 11, sy + 7 + wobble, 3, 2);
      ctx.fillRect(sx + 12, sy + 6 + wobble, 2, 2);
    }

    const hpPct = monster.hp / monster.maxHp;
    ctx.fillStyle = '#330000';
    ctx.fillRect(sx + 2, sy + 1, 12, 2);
    ctx.fillStyle = '#ff0044';
    ctx.fillRect(sx + 2, sy + 1, 12 * hpPct, 2);
  }

  drawMimic(monster, camX, camY, frame) {
    const { sx, sy } = this.worldToScreen(monster.x, monster.y, camX, camY);
    const ctx = this.ctx;
    const pulse = Math.sin(frame / 4 + monster.x) * 0.8;

    ctx.fillStyle = '#553311';
    ctx.fillRect(sx + 2, sy + 8 + pulse, 12, 6);
    ctx.fillStyle = '#775533';
    ctx.fillRect(sx + 3, sy + 6 + pulse, 10, 4);
    ctx.fillStyle = '#cc6644';
    ctx.fillRect(sx + 4, sy + 4 + pulse, 8, 8);
    ctx.fillStyle = '#ff8866';
    ctx.fillRect(sx + 5, sy + 7 + pulse, 6, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 5, sy + 5 + pulse, 2, 2);
    ctx.fillRect(sx + 9, sy + 5 + pulse, 2, 2);
    ctx.fillStyle = '#220000';
    ctx.fillRect(sx + 5, sy + 6 + pulse, 2, 1);
    ctx.fillRect(sx + 9, sy + 6 + pulse, 2, 1);
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(sx + 6, sy + 9 + pulse, 4, 1);

    const hpPct = monster.hp / monster.maxHp;
    ctx.fillStyle = '#330000';
    ctx.fillRect(sx + 2, sy + 1, 12, 2);
    ctx.fillStyle = '#ff6644';
    ctx.fillRect(sx + 2, sy + 1, 12 * hpPct, 2);
  }

  drawBoss(boss, camX, camY, frame) {
    const { sx, sy } = this.worldToScreen(boss.x, boss.y, camX, camY);
    const ctx = this.ctx;
    const pulse = Math.sin(frame / 4 + boss.x) * 0.8;
    const color = boss.color ?? '#ff2244';

    ctx.fillStyle = '#220022';
    ctx.fillRect(sx + 1, sy + 2 + pulse, 14, 12);
    ctx.fillStyle = color;
    ctx.fillRect(sx + 2, sy + 4 + pulse, 12, 9);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(sx + 4, sy + 1 + pulse, 8, 3);
    ctx.fillRect(sx + 5, sy + 0 + pulse, 2, 2);
    ctx.fillRect(sx + 9, sy + 0 + pulse, 2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 4, sy + 6 + pulse, 3, 3);
    ctx.fillRect(sx + 9, sy + 6 + pulse, 3, 3);
    ctx.fillStyle = '#110011';
    ctx.fillRect(sx + 5, sy + 7 + pulse, 1, 1);
    ctx.fillRect(sx + 10, sy + 7 + pulse, 1, 1);

    const hpPct = boss.hp / boss.maxHp;
    ctx.fillStyle = '#330000';
    ctx.fillRect(sx + 1, sy - 1, 14, 3);
    ctx.fillStyle = '#ff0044';
    ctx.fillRect(sx + 1, sy - 1, 14 * hpPct, 3);
    ctx.fillStyle = color;
    ctx.fillRect(sx + 1, sy - 1, 14 * hpPct, 1);
  }

  drawMinion(minion, camX, camY, frame) {
    if (!minion.alive) return;
    const { sx, sy } = this.worldToScreen(minion.x, minion.y, camX, camY);
    const ctx = this.ctx;
    const wobble = Math.sin(frame / 6 + minion.x) * 0.5;

    ctx.fillStyle = '#ccccaa';
    ctx.fillRect(sx + 4, sy + 3 + wobble, 2, 3);
    ctx.fillRect(sx + 10, sy + 3 + wobble, 2, 3);
    ctx.fillRect(sx + 5, sy + 5 + wobble, 6, 7);
    ctx.fillRect(sx + 3, sy + 8 + wobble, 3, 4);
    ctx.fillRect(sx + 10, sy + 8 + wobble, 3, 4);
    ctx.fillStyle = '#88ff44';
    ctx.fillRect(sx + 5, sy + 4 + wobble, 2, 2);
    ctx.fillRect(sx + 9, sy + 4 + wobble, 2, 2);
  }

  drawHero(hero, camX, camY, frame) {
    const { sx, sy } = this.worldToScreen(hero.x, hero.y, camX, camY);
    const bounce = Math.sin(frame / 4) * (hero.alive ? 1 : 0);

    drawHeroSprite(this.ctx, sx, sy, hero.profession, hero.facing, bounce);

    if (!hero.alive) {
      drawHeroDeath(this.ctx, sx, sy);
    }
  }

  drawMinimap(map, explored, hero, stairs, camX, camY, theme, items = []) {
    const ctx = this.ctx;
    const scale = 3;
    const mx = 8;
    const my = 8;
    const mw = MAP_W * scale;
    const mh = MAP_H * scale;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!explored.has(key(x, y))) continue;
        const tile = map[y][x];
        if (tile === TILES.WALL) ctx.fillStyle = theme.minimapWall;
        else if (tile === TILES.STAIRS) ctx.fillStyle = theme.stairs;
        else ctx.fillStyle = theme.minimapFloor;
        ctx.fillRect(mx + x * scale, my + y * scale, scale, scale);
      }
    }

    ctx.fillStyle = hero.color || COLORS.hero;
    ctx.fillRect(mx + hero.x * scale, my + hero.y * scale, scale, scale);

    for (const item of items) {
      if (item.type !== 'grave' || item.collected) continue;
      if (!explored.has(key(item.x, item.y))) continue;
      ctx.fillStyle = '#cc8866';
      ctx.fillRect(mx + item.x * scale, my + item.y * scale, scale, scale);
    }

    ctx.strokeStyle = '#ffffff44';
    const vx = mx + (camX - 10) * scale;
    const vy = my + (camY - 7.5) * scale;
    ctx.strokeRect(vx, vy, 20 * scale, 15 * scale);
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  renderEmpty() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#3d3d6b';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Выберите профессию', this.canvas.width / 2, this.canvas.height / 2);
  }

  render(state) {
    const { map, hero, monsters, items, chests = [], traps = [], healers = [], merchant = null, minions = [], explored, visible, frame } = state;
    const ctx = this.ctx;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const camX = hero.x;
    const camY = hero.y;
    const theme = getDungeonTheme(hero.floor ?? 1);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.drawTile(map, x, y, explored, visible, camX, camY, theme);
      }
    }

    items.forEach((item) => {
      if (explored.has(key(item.x, item.y)) && visible.has(key(item.x, item.y))) {
        this.drawItem(item, camX, camY);
      }
    });

    chests.forEach((chest) => {
      if (explored.has(key(chest.x, chest.y)) && visible.has(key(chest.x, chest.y))) {
        this.drawChest(chest, camX, camY, frame);
      }
    });

    traps.forEach((trap) => {
      if (explored.has(key(trap.x, trap.y)) && visible.has(key(trap.x, trap.y))) {
        this.drawTrap(trap, camX, camY, frame);
      }
    });

    healers.forEach((healer) => {
      if (explored.has(key(healer.x, healer.y)) && visible.has(key(healer.x, healer.y))) {
        this.drawHealer(healer, camX, camY, frame);
      }
    });

    if (merchant && merchant.stock.some((i) => !i.sold)) {
      if (explored.has(key(merchant.x, merchant.y)) && visible.has(key(merchant.x, merchant.y))) {
        this.drawMerchant(merchant, camX, camY, frame);
      }
    }

    monsters.forEach((m) => {
      if (explored.has(key(m.x, m.y)) && visible.has(key(m.x, m.y))) {
        this.drawMonster(m, camX, camY, frame);
      }
    });

    minions.forEach((sk) => {
      if (explored.has(key(sk.x, sk.y)) && visible.has(key(sk.x, sk.y))) {
        this.drawMinion(sk, camX, camY, frame);
      }
    });

    this.drawHero(hero, camX, camY, frame);
    this.drawProjectiles(camX, camY);
    this.drawMinimap(map, explored, hero, state.stairs, camX, camY, theme, items);
    this.drawFloorLabel(theme, hero.floor ?? 1);
    this.drawParticles();
  }

  drawFloorLabel(theme, floor) {
    const ctx = this.ctx;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, this.canvas.height - 22, 210, 16);
    ctx.fillStyle = theme.stairs;
    ctx.fillText(`Этаж ${floor}: ${theme.name}`, 12, this.canvas.height - 10);
  }
}
