import { getHealFlaskCount, getManaFlaskCount, getTotalSpellScrolls } from './items.js';
import { COLORS, TILE, MAP_W, MAP_H, TILES } from './config.js';
import { key } from './utils.js';
import {
  drawHeroSprite,
  drawHeroDeath,
  drawLootWeapon,
  drawLootArmor,
  drawChestSprite,
} from './sprites.js';
import { drawMonsterSprite } from './monsterSprites.js';
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
      case 'blizzard':
        ctx.fillStyle = p.color ?? '#9fe8ff';
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
        ctx.fillStyle = '#e6fbff';
        ctx.fillRect(cx - 1, cy - 4, 2, 8);
        ctx.fillRect(cx - 4, cy - 1, 8, 2);
        break;
      case 'meteor':
        ctx.fillStyle = p.color ?? '#ff7844';
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
        ctx.fillStyle = '#ffcc66';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        ctx.fillStyle = '#ff884466';
        ctx.fillRect(cx - dx * 2, cy - dy * 2, 3, 3);
        break;
      case 'weaken':
        this.drawOrb(ctx, cx, cy, p.color ?? '#b58cff', 4);
        ctx.fillStyle = '#e5d0ff88';
        ctx.fillRect(cx - 4, cy - 1, 8, 2);
        break;
      case 'haste':
        this.drawOrb(ctx, cx, cy, p.color ?? '#66ffd6', 3);
        ctx.fillStyle = '#b8fff1';
        ctx.fillRect(cx - 2, cy - 2, 1, 1);
        ctx.fillRect(cx + 1, cy + 1, 1, 1);
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

  drawTile(map, roomTypeMap, x, y, explored, visible, camX, camY, theme) {
    const k = key(x, y);
    const seen = explored.has(k);
    const lit = visible.has(k);
    if (!seen) return;

    const { sx, sy } = this.worldToScreen(x, y, camX, camY);
    const tile = map[y][x];
    const ctx = this.ctx;

    if (!lit) {
      drawFogTile(ctx, sx, sy, theme, tile === TILES.WALL || tile === TILES.LOCKED_DOOR);
      return;
    }

    switch (tile) {
      case TILES.WALL:
        drawWallTile(ctx, sx, sy, map, x, y, theme);
        break;
      case TILES.LOCKED_DOOR:
      case TILES.DOOR:
        drawFloorTile(ctx, sx, sy, theme, x, y, roomTypeMap?.[y]?.[x] ?? null);
        ctx.fillStyle = '#5a3b20';
        ctx.fillRect(sx + 4, sy + 2, 8, 12);
        ctx.fillStyle = '#8b5e34';
        ctx.fillRect(sx + 5, sy + 3, 6, 10);
        ctx.fillStyle = '#3c2514';
        ctx.fillRect(sx + 4, sy + 2, 1, 12);
        ctx.fillRect(sx + 11, sy + 2, 1, 12);
        if (tile === TILES.LOCKED_DOOR) {
          ctx.fillStyle = '#ffdd66';
          ctx.fillRect(sx + 8, sy + 7, 2, 2);
          ctx.fillRect(sx + 7, sy + 9, 4, 1);
        } else {
          ctx.fillStyle = '#ddbb88';
          ctx.fillRect(sx + 9, sy + 8, 1, 1);
        }
        break;
      case TILES.STAIRS:
        drawStairsTile(ctx, sx, sy, theme);
        break;
      default:
        drawFloorTile(ctx, sx, sy, theme, x, y, roomTypeMap?.[y]?.[x] ?? null);
        break;
    }
  }

  drawItem(item, camX, camY) {
    if (item.collected) return;
    const { sx, sy } = this.worldToScreen(item.x, item.y, camX, camY);
    const ctx = this.ctx;
    const bob = Math.sin(Date.now() / 200 + item.x) * 1;

    if (item.type === 'gold') {
      // Coin pouch with a small bounce and highlight.
      ctx.fillStyle = '#0d0d16';
      ctx.fillRect(sx + 4, sy + 12 + bob, 8, 2);
      ctx.fillStyle = '#1a1a28';
      ctx.fillRect(sx + 5, sy + 11 + bob, 6, 1);

      ctx.fillStyle = '#6a3f1f';
      ctx.fillRect(sx + 5, sy + 4 + bob, 6, 2);
      ctx.fillStyle = '#8a5a2e';
      ctx.fillRect(sx + 4, sy + 6 + bob, 8, 6);
      ctx.fillStyle = '#5a3218';
      ctx.fillRect(sx + 4, sy + 6 + bob, 1, 6);
      ctx.fillRect(sx + 11, sy + 6 + bob, 1, 6);
      ctx.fillRect(sx + 5, sy + 11 + bob, 6, 1);

      ctx.fillStyle = '#c89a4d';
      ctx.fillRect(sx + 5, sy + 6 + bob, 6, 1);
      ctx.fillStyle = '#4a2a12';
      ctx.fillRect(sx + 6, sy + 5 + bob, 4, 1);
      ctx.fillRect(sx + 6, sy + 7 + bob, 4, 1);

      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(sx + 6, sy + 8 + bob, 3, 2);
      ctx.fillRect(sx + 9, sy + 9 + bob, 1, 1);
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(sx + 7, sy + 8 + bob, 1, 1);
      return;
    }

    if (item.type.startsWith('potion')) {
      const color = item.color ?? COLORS.potion;
      const fillH = item.type === 'potion_large' ? 6 : item.type === 'potion_small' ? 3 : 5;

      ctx.fillStyle = '#0d0d16';
      ctx.fillRect(sx + 5, sy + 13 + bob, 6, 1);

      // Bottle body
      ctx.fillStyle = '#cfd8e6';
      ctx.fillRect(sx + 5, sy + 5 + bob, 6, 7);
      ctx.fillRect(sx + 6, sy + 3 + bob, 4, 2);
      ctx.fillStyle = '#9aa7ba';
      ctx.fillRect(sx + 5, sy + 5 + bob, 1, 7);
      ctx.fillRect(sx + 10, sy + 5 + bob, 1, 7);

      // Cork and neck ring
      ctx.fillStyle = '#7a532f';
      ctx.fillRect(sx + 6, sy + 2 + bob, 4, 1);
      ctx.fillStyle = '#5b3a1f';
      ctx.fillRect(sx + 6, sy + 4 + bob, 4, 1);

      // Liquid fill
      const liquidY = sy + 12 + bob - fillH;
      ctx.fillStyle = color;
      ctx.fillRect(sx + 6, liquidY, 4, fillH);
      ctx.fillStyle = '#ffffff66';
      ctx.fillRect(sx + 6, liquidY, 1, Math.max(1, fillH - 1));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 8, sy + 6 + bob, 1, 1);
      return;
    }

    if (item.type.startsWith('mana_potion')) {
      const color = item.color ?? '#4488ff';
      const fillH = item.type === 'mana_potion_large' ? 6 : 4;

      ctx.fillStyle = '#0d0d16';
      ctx.fillRect(sx + 5, sy + 13 + bob, 6, 1);

      // Bottle body
      ctx.fillStyle = '#c7d6ff';
      ctx.fillRect(sx + 5, sy + 5 + bob, 6, 7);
      ctx.fillRect(sx + 6, sy + 3 + bob, 4, 2);
      ctx.fillStyle = '#8ea5d6';
      ctx.fillRect(sx + 5, sy + 5 + bob, 1, 7);
      ctx.fillRect(sx + 10, sy + 5 + bob, 1, 7);

      // Crystal cap
      ctx.fillStyle = '#7ea2ff';
      ctx.fillRect(sx + 6, sy + 2 + bob, 4, 1);
      ctx.fillStyle = '#5e80dd';
      ctx.fillRect(sx + 6, sy + 4 + bob, 4, 1);

      // Mana fill
      const liquidY = sy + 12 + bob - fillH;
      ctx.fillStyle = color;
      ctx.fillRect(sx + 6, liquidY, 4, fillH);
      ctx.fillStyle = '#aaccff88';
      ctx.fillRect(sx + 6, liquidY + 1, 4, 1);
      ctx.fillStyle = '#e6f0ff';
      ctx.fillRect(sx + 8, sy + 6 + bob, 1, 1);
      return;
    }

    if (item.type.startsWith('elixir_')) {
      const color = item.color ?? '#cc66ff';
      ctx.fillStyle = '#0d0d16';
      ctx.fillRect(sx + 5, sy + 13 + bob, 6, 1);
      ctx.fillStyle = '#e2d8f2';
      ctx.fillRect(sx + 5, sy + 5 + bob, 6, 7);
      ctx.fillRect(sx + 6, sy + 3 + bob, 4, 2);
      ctx.fillStyle = '#b9aacd';
      ctx.fillRect(sx + 5, sy + 5 + bob, 1, 7);
      ctx.fillRect(sx + 10, sy + 5 + bob, 1, 7);
      ctx.fillStyle = '#7a532f';
      ctx.fillRect(sx + 6, sy + 2 + bob, 4, 1);
      ctx.fillStyle = color;
      ctx.fillRect(sx + 6, sy + 8 + bob, 4, 4);
      ctx.fillStyle = '#ffffff77';
      ctx.fillRect(sx + 6, sy + 8 + bob, 1, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 8, sy + 6 + bob, 1, 1);
      return;
    }

    if (item.type.startsWith('scroll_')) {
      const color = item.color ?? '#dcb8ff';
      ctx.fillStyle = '#0d0d16';
      ctx.fillRect(sx + 4, sy + 13 + bob, 8, 1);
      ctx.fillStyle = '#d9c59a';
      ctx.fillRect(sx + 4, sy + 5 + bob, 8, 7);
      ctx.fillStyle = '#b79e72';
      ctx.fillRect(sx + 4, sy + 5 + bob, 1, 7);
      ctx.fillRect(sx + 11, sy + 5 + bob, 1, 7);
      ctx.fillStyle = '#9c8257';
      ctx.fillRect(sx + 5, sy + 4 + bob, 6, 1);
      ctx.fillRect(sx + 5, sy + 12 + bob, 6, 1);
      ctx.fillStyle = color;
      ctx.fillRect(sx + 6, sy + 7 + bob, 4, 3);
      ctx.fillStyle = '#fff3d7';
      ctx.fillRect(sx + 7, sy + 8 + bob, 1, 1);
      return;
    }

    if (item.type === 'locked_key') {
      ctx.fillStyle = '#ffdd66';
      ctx.fillRect(sx + 5, sy + 7 + bob, 6, 2);
      ctx.fillRect(sx + 9, sy + 6 + bob, 2, 4);
      ctx.fillRect(sx + 4, sy + 6 + bob, 2, 4);
      ctx.fillStyle = '#aa8833';
      ctx.fillRect(sx + 6, sy + 8 + bob, 1, 2);
      ctx.fillRect(sx + 8, sy + 8 + bob, 1, 2);
      return;
    }

    if (item.type === 'locked_skill') {
      ctx.fillStyle = '#7a52c8';
      ctx.fillRect(sx + 5, sy + 4 + bob, 6, 8);
      ctx.fillStyle = '#b08cff';
      ctx.fillRect(sx + 6, sy + 5 + bob, 4, 1);
      ctx.fillRect(sx + 6, sy + 9 + bob, 4, 1);
      ctx.fillStyle = '#ffdd88';
      ctx.fillRect(sx + 7, sy + 7 + bob, 2, 2);
      return;
    }

    if (item.type === 'weapon') {
      drawLootWeapon(ctx, sx, sy, item, bob);
      return;
    }

    if (item.type === 'armor') {
      drawLootArmor(ctx, sx, sy, item, bob);
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
    drawChestSprite(this.ctx, sx, sy, chest, frame);
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
        // Rusty base plate
        ctx.fillStyle = '#2a1b1b';
        ctx.fillRect(sx + 2, sy + 11, 12, 3);
        ctx.fillStyle = '#5e3838';
        ctx.fillRect(sx + 3, sy + 10, 10, 2);
        ctx.fillStyle = '#7a4c4c';
        ctx.fillRect(sx + 4, sy + 10, 8, 1);

        // Steel spikes
        ctx.fillStyle = '#c8c8d2';
        for (let i = 0; i < 4; i++) {
          const px = sx + 3 + i * 3;
          const top = sy + 7 + pulse;
          ctx.fillRect(px + 1, top, 1, 1);
          ctx.fillRect(px, top + 1, 3, 2);
          ctx.fillStyle = '#8f8fa2';
          ctx.fillRect(px, top + 2, 1, 1);
          ctx.fillStyle = '#c8c8d2';
        }
        break;
      case 'arrow':
        // Wall slit
        ctx.fillStyle = '#2a2a34';
        ctx.fillRect(sx + 2, sy + 6, 12, 4);
        ctx.fillStyle = '#3f3f52';
        ctx.fillRect(sx + 3, sy + 7, 10, 2);

        // Loaded bolt
        ctx.fillStyle = '#6b4a2a';
        ctx.fillRect(sx + 5, sy + 8 + pulse, 6, 1);
        ctx.fillStyle = '#b7b7c6';
        ctx.fillRect(sx + 11, sy + 7 + pulse, 2, 3);
        ctx.fillStyle = '#e0e0ef';
        ctx.fillRect(sx + 12, sy + 8 + pulse, 1, 1);
        break;
      case 'poison':
        // Toxic puddle
        ctx.fillStyle = '#163015';
        ctx.fillRect(sx + 3, sy + 10, 10, 4);
        ctx.fillStyle = '#2a5a28';
        ctx.fillRect(sx + 4, sy + 9, 8, 4);
        ctx.fillStyle = type.color;
        ctx.fillRect(sx + 5, sy + 10 + pulse, 6, 2);
        ctx.fillStyle = '#a9ff77';
        ctx.fillRect(sx + 6, sy + 10 + pulse, 2, 1);

        // Vapour bubbles
        ctx.fillStyle = '#7be84c';
        ctx.fillRect(sx + 5, sy + 8 + pulse, 1, 1);
        ctx.fillRect(sx + 10, sy + 7, 1, 1);
        ctx.fillRect(sx + 8, sy + 6 + pulse, 1, 1);
        break;
      case 'fire':
        // Brazier base
        ctx.fillStyle = '#2f2217';
        ctx.fillRect(sx + 4, sy + 10, 8, 4);
        ctx.fillStyle = '#4b3726';
        ctx.fillRect(sx + 5, sy + 9, 6, 2);

        // Flames
        ctx.fillStyle = '#ff5a1f';
        ctx.fillRect(sx + 5, sy + 8 + pulse, 2, 4);
        ctx.fillRect(sx + 8, sy + 7 + pulse, 2, 5);
        ctx.fillRect(sx + 10, sy + 8 + pulse, 2, 4);
        ctx.fillStyle = '#ffbe3b';
        ctx.fillRect(sx + 7, sy + 7 + pulse, 3, 3);
        ctx.fillStyle = '#fff1a6';
        ctx.fillRect(sx + 8, sy + 8 + pulse, 1, 1);
        break;
      case 'teleport':
        // Arcane frame
        ctx.fillStyle = '#2a1242';
        ctx.fillRect(sx + 3, sy + 3, 10, 10);
        ctx.fillStyle = '#4b2670';
        ctx.fillRect(sx + 4, sy + 4, 8, 8);

        // Rune cross
        ctx.fillStyle = type.color;
        ctx.fillRect(sx + 5, sy + 7 + pulse, 6, 2);
        ctx.fillRect(sx + 7, sy + 5 + pulse, 2, 6);
        ctx.fillStyle = '#f0b5ff';
        ctx.fillRect(sx + 7, sy + 7, 2, 2);

        // Orbit sparks
        ctx.fillStyle = '#d387ff';
        ctx.fillRect(sx + 5, sy + 5, 1, 1);
        ctx.fillRect(sx + 10, sy + 5, 1, 1);
        ctx.fillRect(sx + 5, sy + 10, 1, 1);
        ctx.fillRect(sx + 10, sy + 10, 1, 1);
        break;
      case 'slow':
        // Frost patch
        ctx.fillStyle = '#1f324d';
        ctx.fillRect(sx + 3, sy + 10, 10, 4);
        ctx.fillStyle = '#2f4f75';
        ctx.fillRect(sx + 4, sy + 9, 8, 3);

        // Cold bands
        ctx.fillStyle = '#6ea6d8';
        ctx.fillRect(sx + 4, sy + 10 + pulse, 8, 1);
        ctx.fillRect(sx + 5, sy + 12, 6, 1);

        // Snowflake mark
        ctx.fillStyle = type.color;
        ctx.fillRect(sx + 7, sy + 6, 2, 4);
        ctx.fillRect(sx + 6, sy + 7, 4, 2);
        ctx.fillStyle = '#d6f1ff';
        ctx.fillRect(sx + 8, sy + 8, 1, 1);
        break;
      default:
        ctx.fillStyle = type?.color ?? '#ff8800';
        ctx.fillRect(sx + 4, sy + 4, 8, 8);
    }
  }

  drawMonster(monster, camX, camY, frame) {
    if (!monster.alive) return;
    const { sx, sy } = this.worldToScreen(monster.x, monster.y, camX, camY);
    const bob = Math.sin(frame / 5 + monster.x) * 0.5;
    drawMonsterSprite(this.ctx, sx, sy, monster, bob);
  }

  drawMinion(minion, camX, camY, frame) {
    if (!minion.alive) return;
    const { sx, sy } = this.worldToScreen(minion.x, minion.y, camX, camY);
    const ctx = this.ctx;
    const wobble = Math.sin(frame / 6 + minion.x) * 0.5;
    const y = sy + wobble;
    const pulse = Math.sin(frame / 9 + minion.y) * 0.5;

    // Ground shadow
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(sx + 4, y + 14, 8, 1);
    ctx.fillStyle = '#191926';
    ctx.fillRect(sx + 6, y + 13, 4, 1);

    // Skull and jaw
    ctx.fillStyle = '#d9d7bf';
    ctx.fillRect(sx + 5, y + 2, 6, 4);
    ctx.fillRect(sx + 6, y + 6, 4, 2);
    ctx.fillStyle = '#b8b59f';
    ctx.fillRect(sx + 5, y + 2, 6, 1);
    ctx.fillRect(sx + 5, y + 5, 1, 2);
    ctx.fillRect(sx + 10, y + 5, 1, 2);
    ctx.fillStyle = '#8f8c79';
    ctx.fillRect(sx + 7, y + 7, 2, 1);

    // Ribcage and spine
    ctx.fillStyle = '#cecbb2';
    ctx.fillRect(sx + 5, y + 8, 6, 4);
    ctx.fillRect(sx + 7, y + 6, 2, 7);
    ctx.fillStyle = '#a8a58f';
    ctx.fillRect(sx + 5, y + 9, 6, 1);
    ctx.fillRect(sx + 5, y + 11, 6, 1);
    ctx.fillRect(sx + 6, y + 8, 1, 4);
    ctx.fillRect(sx + 9, y + 8, 1, 4);

    // Arms and legs
    ctx.fillStyle = '#bdb99f';
    ctx.fillRect(sx + 3, y + 8, 2, 4);
    ctx.fillRect(sx + 11, y + 8, 2, 4);
    ctx.fillRect(sx + 5, y + 12, 2, 2);
    ctx.fillRect(sx + 9, y + 12, 2, 2);
    ctx.fillStyle = '#8a866f';
    ctx.fillRect(sx + 3, y + 11, 2, 1);
    ctx.fillRect(sx + 11, y + 11, 2, 1);
    ctx.fillRect(sx + 5, y + 13, 2, 1);
    ctx.fillRect(sx + 9, y + 13, 2, 1);

    // Bone ward glyph
    ctx.fillStyle = '#6e4c3a';
    ctx.fillRect(sx + 6, y + 9, 4, 2);
    ctx.fillStyle = '#d7b88a';
    ctx.fillRect(sx + 7, y + 9, 2, 1);
    ctx.fillRect(sx + 7, y + 10, 1, 1);

    // Necromantic eyes
    ctx.fillStyle = '#6dff7c';
    ctx.fillRect(sx + 6, y + 4, 1, 1);
    ctx.fillRect(sx + 9, y + 4, 1, 1);
    ctx.fillStyle = '#caffcc';
    ctx.fillRect(sx + 6, y + 4 + pulse, 1, 1);
    ctx.fillRect(sx + 9, y + 4 + pulse, 1, 1);
  }

  drawHero(hero, camX, camY, frame) {
    const { sx, sy } = this.worldToScreen(hero.x, hero.y, camX, camY);
    const bounce = Math.sin(frame / 4) * (hero.alive ? 1 : 0);

    drawHeroSprite(this.ctx, sx, sy, hero, hero.facing, bounce);

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
        else if (tile === TILES.LOCKED_DOOR) ctx.fillStyle = '#aa8833';
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
    const { map, roomTypeMap = null, hero, monsters, items, chests = [], traps = [], healers = [], merchant = null, minions = [], explored, visible, frame } = state;
    const ctx = this.ctx;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const camX = hero.x;
    const camY = hero.y;
    const theme = getDungeonTheme(hero.floor ?? 1);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.drawTile(map, roomTypeMap, x, y, explored, visible, camX, camY, theme);
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
    this.drawHeroBars(hero);
  }

  drawResourceBar(x, y, width, height, ratio, fillColor, label) {
    const ctx = this.ctx;
    const clamped = Math.max(0, Math.min(1, ratio));
    const fillW = clamped > 0 ? Math.max(2, Math.floor(width * clamped)) : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, fillW, height);
    ctx.strokeStyle = '#3d3d6b';
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e8ff';
    ctx.fillText(label, x + width, y - 2);
  }

  drawHeroBars(hero) {
    if (!hero?.maxHp) return;

    const barW = 112;
    const barH = 8;
    const x = this.canvas.width - barW - 10;
    const hp = Math.max(0, hero.hp);
    const hpRatio = hp / hero.maxHp;
    const hpColor = hpRatio <= 0.25 ? '#ff2244' : hpRatio <= 0.5 ? '#ff8844' : '#44ff88';

    this.drawResourceBar(x, 16, barW, barH, hpRatio, hpColor, `HP ${hp}/${hero.maxHp}`);

    if (hero.maxMana) {
      const mana = Math.max(0, hero.mana);
      const manaRatio = mana / hero.maxMana;
      const manaColor = manaRatio <= 0.2 ? '#224488' : '#66aaff';
      this.drawResourceBar(x, 34, barW, barH, manaRatio, manaColor, `MP ${mana}/${hero.maxMana}`);
    }

    this.drawFlaskCounts(hero, x, hero.maxMana ? 50 : 32);
  }

  drawFlaskIcon(sx, sy, color, highlight = '#ffffff') {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy + 2, 4, 6);
    ctx.fillRect(sx + 1, sy, 2, 2);
    ctx.fillStyle = highlight;
    ctx.fillRect(sx + 1, sy + 3, 2, 2);
  }

  drawFlaskCounts(hero, x, y) {
    const ctx = this.ctx;
    const healCount = getHealFlaskCount(hero);
    const manaCount = getManaFlaskCount(hero);
    const scrollCount = getTotalSpellScrolls(hero);
    const panelW = 112;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - 3, y - 3, panelW + 6, 16);
    ctx.strokeStyle = '#3d3d6b';
    ctx.strokeRect(x + 0.5, y + 0.5, panelW - 1, 15);

    this.drawFlaskIcon(x + 4, y + 4, COLORS.potion);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#44ff88';
    ctx.fillText(String(healCount), x + 12, y + 11);

    this.drawFlaskIcon(x + 58, y + 4, '#4488ff', '#aaccff');
    ctx.fillStyle = '#66aaff';
    ctx.fillText(String(manaCount), x + 66, y + 11);

    ctx.fillStyle = '#d9c59a';
    ctx.fillRect(x + 86, y + 5, 7, 6);
    ctx.fillStyle = '#b79e72';
    ctx.fillRect(x + 86, y + 5, 1, 6);
    ctx.fillRect(x + 92, y + 5, 1, 6);
    ctx.fillStyle = '#b18cff';
    ctx.fillRect(x + 88, y + 7, 3, 2);
    ctx.fillStyle = '#dcb8ff';
    ctx.fillText(String(scrollCount), x + 98, y + 11);
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
