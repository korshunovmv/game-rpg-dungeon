import { CANVAS_W, CANVAS_H } from './config.js';
import { VERSION } from './version.js';
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { drawClassPreview } from './sprites.js';
import { getTotalAtk, getTotalDef } from './items.js';

class UI {
  constructor() {
    this.logEl = document.getElementById('log');
    this.overlay = document.getElementById('overlay');
    this.classSelect = document.getElementById('class-select');
    this.heroHp = document.getElementById('hero-hp');
    this.heroGold = document.getElementById('hero-gold');
    this.heroLevel = document.getElementById('hero-level');
    this.heroFloor = document.getElementById('hero-floor');
    this.heroClass = document.getElementById('hero-class');
    this.heroAtk = document.getElementById('hero-atk');
    this.heroDef = document.getElementById('hero-def');
    this.heroWeapon = document.getElementById('hero-weapon');
    this.heroArmor = document.getElementById('hero-armor');
    this.heroMinions = document.getElementById('hero-minions');
    this.minionsRow = document.getElementById('minions-row');
  }

  clearLog() {
    this.logEl.innerHTML = '';
  }

  showClassSelect() {
    this.classSelect.classList.add('visible');
  }

  hideClassSelect() {
    this.classSelect.classList.remove('visible');
  }

  log(message, type = '') {
    const li = document.createElement('li');
    li.textContent = message;
    if (type) li.classList.add(type);
    this.logEl.prepend(li);
    while (this.logEl.children.length > 30) {
      this.logEl.removeChild(this.logEl.lastChild);
    }
  }

  updateStats(hero, minionCount = 0) {
    this.heroHp.textContent = `${Math.max(0, hero.hp)}/${hero.maxHp}`;
    this.heroAtk.textContent = String(getTotalAtk(hero));
    this.heroDef.textContent = String(getTotalDef(hero));
    this.heroWeapon.textContent = hero.weapon?.name ?? '—';
    this.heroArmor.textContent = hero.armor?.name ?? '—';
    if (hero.profession === 'necromancer') {
      this.minionsRow.style.display = 'flex';
      this.heroMinions.textContent = String(minionCount);
    } else {
      this.minionsRow.style.display = 'none';
    }
    this.heroGold.textContent = String(hero.gold);
    this.heroLevel.textContent = String(hero.level);
    this.heroFloor.textContent = String(hero.floor);
    this.heroClass.textContent = hero.professionName;
  }

  showOverlay(text) {
    this.overlay.textContent = text;
    this.overlay.classList.add('visible');
  }

  hideOverlay() {
    this.overlay.classList.remove('visible');
  }
}

function main() {
  const canvas = document.getElementById('game');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const versionEl = document.getElementById('app-version');
  if (versionEl) {
    versionEl.textContent = `v${VERSION}`;
  }

  const ui = new UI();
  const renderer = new Renderer(canvas);
  const game = new Game(renderer, ui);

  ui.showClassSelect();

  document.querySelectorAll('.class-preview').forEach((canvas) => {
    drawClassPreview(canvas, canvas.dataset.class);
  });

  document.querySelectorAll('.class-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const profession = btn.dataset.class;
      ui.hideClassSelect();
      game.start(profession);
      document.getElementById('btn-pause').textContent = '⏸ Пауза';
    });
  });

  document.getElementById('btn-pause').addEventListener('click', () => {
    if (game.state !== 'playing') return;
    const paused = game.togglePause();
    document.getElementById('btn-pause').textContent = paused ? '▶ Продолжить' : '⏸ Пауза';
  });

  document.getElementById('btn-speed').addEventListener('click', () => {
    if (game.state !== 'playing') return;
    const fast = game.toggleSpeed();
    document.getElementById('btn-speed').textContent = fast ? '🐢 Скорость ×1' : '⚡ Скорость ×2';
  });

  document.getElementById('btn-new').addEventListener('click', () => {
    game.restart();
    ui.hideOverlay();
    ui.showClassSelect();
    document.getElementById('btn-pause').textContent = '⏸ Пауза';
  });

  let last = performance.now();

  function loop(now) {
    const dt = now - last;
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
