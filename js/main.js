import { CANVAS_W, CANVAS_H } from './config.js';
import { VERSION } from './version.js';
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { drawClassPreview } from './sprites.js';
import { getTotalAtk, getTotalDef } from './items.js';
import { getTotalSpellScrolls } from './items.js';
import { getLuck } from './luck.js';
import { usesMana } from './classes.js';
import { describeLegacyGift } from './legacy.js';
import { getItemRarity, getRarityDef } from './rarity.js';

const SAVE_SLOT_COUNT = 3;
const SAVE_KEY_PREFIX = 'game-save-slot-';

function saveSlotKey(slotId) {
  return `${SAVE_KEY_PREFIX}${slotId}`;
}

function readSlot(slotId) {
  try {
    const raw = localStorage.getItem(saveSlotKey(slotId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSlot(slotId, payload) {
  try {
    localStorage.setItem(saveSlotKey(slotId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function clearSlot(slotId) {
  try {
    localStorage.removeItem(saveSlotKey(slotId));
    return true;
  } catch {
    return false;
  }
}

function describeSlot(data) {
  if (!data?.snapshot?.hero) {
    return {
      title: 'Пустая ячейка',
      desc: 'Нажмите, чтобы начать новую игру',
      status: null,
      statusClass: '',
      meta: '',
      hasSave: false,
    };
  }
  const hero = data.snapshot.hero;
  const biome = data.snapshot.biome?.name ?? '—';
  const alive = hero.alive !== false;
  const status = alive ? 'Жив' : 'Мёртв';
  const statusClass = alive ? 'alive' : 'dead';
  const updated = data.updatedAt ? new Date(data.updatedAt) : null;
  const updatedText = updated
    ? `${String(updated.getDate()).padStart(2, '0')}.${String(updated.getMonth() + 1).padStart(2, '0')} ${String(updated.getHours()).padStart(2, '0')}:${String(updated.getMinutes()).padStart(2, '0')}`
    : 'н/д';
  return {
    title: `${hero.name} (${hero.professionName ?? hero.profession})`,
    desc: `Этаж ${hero.floor}, ур. ${hero.level}, ${hero.gold} зол. • ${biome}`,
    status,
    statusClass,
    meta: `Сохранено: ${updatedText}`,
    hasSave: true,
  };
}

class UI {
  constructor() {
    this.logEl = document.getElementById('log');
    this.overlay = document.getElementById('overlay');
    this.classSelect = document.getElementById('class-select');
    this.saveSelect = document.getElementById('save-select');
    this.saveGrid = document.getElementById('save-grid');
    this.heroName = document.getElementById('hero-name');
    this.heroHp = document.getElementById('hero-hp');
    this.heroMana = document.getElementById('hero-mana');
    this.heroManaRow = document.getElementById('hero-mana-row');
    this.heroGold = document.getElementById('hero-gold');
    this.heroLevel = document.getElementById('hero-level');
    this.heroFloor = document.getElementById('hero-floor');
    this.heroClass = document.getElementById('hero-class');
    this.heroGender = document.getElementById('hero-gender');
    this.heroAtk = document.getElementById('hero-atk');
    this.heroDef = document.getElementById('hero-def');
    this.heroLuck = document.getElementById('hero-luck');
    this.heroStrength = document.getElementById('hero-strength');
    this.heroDexterity = document.getElementById('hero-dexterity');
    this.heroIntelligence = document.getElementById('hero-intelligence');
    this.heroPerception = document.getElementById('hero-perception');
    this.heroEndurance = document.getElementById('hero-endurance');
    this.heroScrolls = document.getElementById('hero-scrolls');
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
    this.savePickHandler = null;
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

  showSaveSelect(slots, onPick, onDelete = null) {
    this.savePickHandler = onPick;
    this.saveGrid.innerHTML = '';
    for (const slot of slots) {
      const wrap = document.createElement('div');
      wrap.className = 'save-slot';
      wrap.addEventListener('click', () => {
        if (this.savePickHandler) this.savePickHandler(slot.slotId);
      });

      const mainBtn = document.createElement('div');
      mainBtn.className = 'save-slot-main';
      const statusClass = slot.statusClass ? `save-slot-status ${slot.statusClass}` : 'save-slot-status';
      const statusText = slot.status ? `<span class="${statusClass}">Статус: ${slot.status}</span>` : '';
      mainBtn.innerHTML = `
        <span class="save-slot-title">Ячейка ${slot.slotId}: ${slot.title}</span>
        <span class="save-slot-desc">${slot.desc}</span>
        ${statusText}
        <span class="save-slot-meta">${slot.meta}</span>
      `;
      wrap.appendChild(mainBtn);

      if (slot.hasSave && onDelete) {
        const actions = document.createElement('div');
        actions.className = 'save-slot-actions';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'save-slot-delete';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          onDelete(slot.slotId);
        });
        actions.appendChild(deleteBtn);
        wrap.appendChild(actions);
      }

      this.saveGrid.appendChild(wrap);
    }
    this.saveSelect.classList.add('visible');
  }

  hideSaveSelect() {
    this.saveSelect.classList.remove('visible');
    this.savePickHandler = null;
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

  setEquipLabel(el, equip) {
    if (!el) return;
    if (!equip) {
      el.textContent = '—';
      el.style.color = '';
      el.removeAttribute('title');
      return;
    }
    const def = getRarityDef(getItemRarity(equip));
    el.textContent = equip.name;
    el.style.color = def.color;
    el.title = def.name;
  }

  updateStats(hero, minionCount = 0, maxMinions = 0) {
    this.heroName.textContent = hero.name;
    this.heroHp.textContent = `${Math.max(0, hero.hp)}/${hero.maxHp}`;
    if (usesMana(hero)) {
      this.heroManaRow.style.display = 'flex';
      this.heroMana.textContent = `${Math.max(0, hero.mana)}/${hero.maxMana}`;
    } else {
      this.heroManaRow.style.display = 'none';
    }
    this.heroAtk.textContent = String(getTotalAtk(hero));
    this.heroDef.textContent = String(getTotalDef(hero));
    this.heroLuck.textContent = String(getLuck(hero));
    this.heroStrength.textContent = String(hero.strength ?? 0);
    this.heroDexterity.textContent = String(hero.dexterity ?? 0);
    this.heroIntelligence.textContent = String(hero.intelligence ?? 0);
    this.heroPerception.textContent = String(hero.perception ?? 0);
    this.heroEndurance.textContent = String(hero.endurance ?? 0);
    this.heroScrolls.textContent = String(getTotalSpellScrolls(hero));
    this.setEquipLabel(this.heroWeapon, hero.weapon);
    this.setEquipLabel(this.heroArmor, hero.armor);
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
    this.heroGender.textContent = hero.gender === 'female' ? 'Женский' : 'Мужской';
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
  let activeSlot = null;

  document.querySelectorAll('.class-preview').forEach((canvas) => {
    drawClassPreview(canvas, canvas.dataset.class);
  });

  function collectSlotDescriptors() {
    const slots = [];
    for (let slotId = 1; slotId <= SAVE_SLOT_COUNT; slotId++) {
      const data = readSlot(slotId);
      const desc = describeSlot(data);
      slots.push({ slotId, ...desc, data });
    }
    return slots;
  }

  function saveGameProgress() {
    if (!activeSlot) return;
    const snapshot = game.getSnapshot?.();
    if (!snapshot) return;
    writeSlot(activeSlot, {
      version: 1,
      updatedAt: Date.now(),
      snapshot,
    });
  }

  function openSlotSelect() {
    ui.hideClassSelect();
    const refresh = () => {
      ui.showSaveSelect(collectSlotDescriptors(), (slotId) => {
        activeSlot = slotId;
        game.setActiveSaveSlot(slotId);
        const slot = readSlot(slotId);
        ui.hideSaveSelect();
        if (slot?.snapshot && game.loadSnapshot(slot.snapshot)) {
          ui.log(`Загружена ячейка ${slotId}`, 'info');
          document.getElementById('btn-pause').textContent = '⏸ Пауза';
          saveGameProgress();
          return;
        }
        ui.showClassSelect();
      }, (slotId) => {
        clearSlot(slotId);
        if (activeSlot === slotId) {
          activeSlot = null;
          game.setActiveSaveSlot(null);
        }
        refresh();
      });
    };
    refresh();
  }

  openSlotSelect();

  document.querySelectorAll('.class-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const profession = btn.dataset.class;
      const gender =
        document.querySelector('input[name="hero-gender"]:checked')?.value ?? 'male';
      ui.hideClassSelect();
      game.start(profession, gender);
      document.getElementById('btn-pause').textContent = '⏸ Пауза';
      saveGameProgress();
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
    openSlotSelect();
    document.getElementById('btn-pause').textContent = '⏸ Пауза';
  });

  document.getElementById('btn-home').addEventListener('click', () => {
    game.restart();
    ui.hideOverlay();
    ui.hideSkillSelect();
    openSlotSelect();
    document.getElementById('btn-pause').textContent = '⏸ Пауза';
  });

  let last = performance.now();

  function loop(now) {
    const dt = now - last;
    last = now;
    game.update(dt);
    saveGameProgress();
    game.render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
