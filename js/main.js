import { CANVAS_W, CANVAS_H } from './config.js';
import { VERSION } from './version.js';
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { drawClassPreview } from './sprites.js';
import { getTotalAtk, getTotalDef } from './items.js';
import { getLuck } from './luck.js';
import { describeLegacyGift } from './legacy.js';

class UI {
  constructor() {
    this.logEl = document.getElementById('log');
    this.overlay = document.getElementById('overlay');
    this.classSelect = document.getElementById('class-select');
    this.heroName = document.getElementById('hero-name');
    this.heroHp = document.getElementById('hero-hp');
    this.heroGold = document.getElementById('hero-gold');
    this.heroLevel = document.getElementById('hero-level');
    this.heroFloor = document.getElementById('hero-floor');
    this.heroClass = document.getElementById('hero-class');
    this.heroAtk = document.getElementById('hero-atk');
    this.heroDef = document.getElementById('hero-def');
    this.heroLuck = document.getElementById('hero-luck');
    this.heroWeapon = document.getElementById('hero-weapon');
    this.heroArmor = document.getElementById('hero-armor');
    this.heroMinions = document.getElementById('hero-minions');
    this.minionsRow = document.getElementById('minions-row');
    this.heroSkills = document.getElementById('hero-skills');
    this.heroLegends = document.getElementById('hero-legends');
    this.heroLegacy = document.getElementById('hero-legacy');
    this.skillSelect = document.getElementById('skill-select');
    this.skillGrid = document.getElementById('skill-grid');
    this.skillPickHandler = null;
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

  updateStats(hero, minionCount = 0, maxMinions = 0) {
    this.heroName.textContent = hero.name;
    this.heroHp.textContent = `${Math.max(0, hero.hp)}/${hero.maxHp}`;
    this.heroAtk.textContent = String(getTotalAtk(hero));
    this.heroDef.textContent = String(getTotalDef(hero));
    this.heroLuck.textContent = String(getLuck(hero));
    this.heroWeapon.textContent = hero.weapon?.name ?? '—';
    this.heroArmor.textContent = hero.armor?.name ?? '—';
    if (hero.profession === 'necromancer') {
      this.minionsRow.style.display = 'flex';
      this.heroMinions.textContent =
        maxMinions > 0 ? `${minionCount}/${maxMinions}` : String(minionCount);
    } else {
      this.minionsRow.style.display = 'none';
    }
    this.heroGold.textContent = String(hero.gold);
    this.heroLevel.textContent = String(hero.level);
    this.heroFloor.textContent = String(hero.floor);
    this.heroClass.textContent = hero.professionName;
  }

  updateSkills(skills = []) {
    if (!this.heroSkills) return;
    this.heroSkills.innerHTML = '';
    if (!skills.length) {
      const li = document.createElement('li');
      li.innerHTML = '<span>—</span><span></span>';
      this.heroSkills.appendChild(li);
      return;
    }
    for (const skill of skills) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${skill.name}</span><span>${skill.level}</span>`;
      this.heroSkills.appendChild(li);
    }
  }

  updateLegends(legends = []) {
    if (!this.heroLegends) return;
    this.heroLegends.innerHTML = '';
    if (!legends.length) {
      const li = document.createElement('li');
      li.textContent = 'Пока пусто';
      this.heroLegends.appendChild(li);
      return;
    }
    for (const legend of legends) {
      const li = document.createElement('li');
      const tag = legend.reason === 'slayer' ? 'убийца' : 'реванш';
      li.innerHTML = `<span class="legend-name">${legend.displayName}</span> — ${tag}, эт.${legend.originFloor}`;
      this.heroLegends.appendChild(li);
    }
  }

  updateLegacyList(legacies = []) {
    if (!this.heroLegacy) return;
    this.heroLegacy.innerHTML = '';
    if (!legacies.length) {
      const li = document.createElement('li');
      li.textContent = 'Пока пусто';
      this.heroLegacy.appendChild(li);
      return;
    }
    for (const legacy of legacies) {
      const li = document.createElement('li');
      li.innerHTML =
        `<span class="legend-name">${legacy.heroName}</span> — эт.${legacy.floor} (${legacy.x}, ${legacy.y}): ${describeLegacyGift(legacy.gift)}`;
      this.heroLegacy.appendChild(li);
    }
  }

  showSkillSelect(choices, onPick) {
    this.skillPickHandler = onPick;
    this.skillGrid.innerHTML = '';
    for (const skill of choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'skill-card';
      const levelText = skill.level > 0 ? `Текущий: ${skill.level} → ${skill.nextLevel}` : 'Новый навык';
      btn.innerHTML = `
        <span class="skill-card-name">${skill.name}</span>
        <span class="skill-card-desc">${skill.desc}</span>
        <span class="skill-card-level">${levelText}</span>
      `;
      btn.addEventListener('click', () => {
        if (this.skillPickHandler) {
          this.skillPickHandler(skill.id);
        }
      });
      this.skillGrid.appendChild(btn);
    }
    this.skillSelect.classList.add('visible');
  }

  hideSkillSelect() {
    this.skillSelect.classList.remove('visible');
    this.skillPickHandler = null;
  }

  showOverlay(text) {
    this.overlay.textContent = text;
    this.overlay.classList.add('visible');
  }

  hideOverlay() {
    this.overlay.classList.remove('visible');
  }
}

function setupMobileViewport(canvas) {
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  const preventGestureZoom = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  document.addEventListener('touchmove', preventGestureZoom, { passive: false });
  window.addEventListener('orientationchange', () => {
    window.scrollTo(0, 0);
  });
}

function main() {
  const canvas = document.getElementById('game');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  setupMobileViewport(canvas);

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
    ui.hideSkillSelect();
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
