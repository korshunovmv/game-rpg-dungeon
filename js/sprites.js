import { getItemRarity, hasRarityGlow } from './rarity.js';

const SKIN = '#ffccaa';
const OUTLINE = '#ffffff';
const EYE = '#223366';
const SHADOW = '#0a0a14';

function px(ctx, sx, sy, x, y, w, h, color, bounce = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(sx + x, sy + y + bounce, w, h);
}

function drawHeroShadow(ctx, sx, sy) {
  px(ctx, sx, sy, 3, 14, 10, 2, SHADOW, 0);
  px(ctx, sx, sy, 5, 13, 6, 1, '#151525', 0);
}

function drawEyes(ctx, sx, sy, facing, bounce) {
  if (facing === 'up') {
    px(ctx, sx, sy, 5, 4, 2, 1, EYE, bounce);
    px(ctx, sx, sy, 9, 4, 2, 1, EYE, bounce);
  } else if (facing === 'down') {
    px(ctx, sx, sy, 5, 6, 2, 2, EYE, bounce);
    px(ctx, sx, sy, 9, 6, 2, 2, EYE, bounce);
    px(ctx, sx, sy, 5, 6, 1, 1, '#ffffff', bounce);
    px(ctx, sx, sy, 9, 6, 1, 1, '#ffffff', bounce);
  } else if (facing === 'left') {
    px(ctx, sx, sy, 4, 6, 2, 2, EYE, bounce);
    px(ctx, sx, sy, 4, 6, 1, 1, '#ffffff', bounce);
  } else {
    px(ctx, sx, sy, 10, 6, 2, 2, EYE, bounce);
    px(ctx, sx, sy, 10, 6, 1, 1, '#ffffff', bounce);
  }
}

function resolveWeaponSpriteId(name = '') {
  const n = name.toLowerCase();
  if (n.includes('кинжал')) return 'dagger';
  if (n.includes('топор')) return 'axe';
  if (n.includes('булав')) return 'mace';
  if (n.includes('лук')) return 'bow';
  if (n.includes('посох')) return 'staff';
  if (n.includes('меч')) return 'sword';
  return 'sword';
}

function resolveArmorSpriteId(name = '') {
  const n = name.toLowerCase();
  if (n.includes('кольчуг')) return 'chain';
  if (n.includes('лат')) return 'plate';
  if (n.includes('манти')) return 'robe';
  if (n.includes('шкур')) return 'hide';
  if (n.includes('кожан')) return 'leather';
  return 'leather';
}

export { resolveWeaponSpriteId, resolveArmorSpriteId };

const DEFAULT_WEAPON = {
  warrior: 'sword',
  archer: 'bow',
  mage: 'staff',
  thief: 'dagger',
  necromancer: 'staff',
};

const DEFAULT_ARMOR_COLOR = {
  leather: '#886633',
  chain: '#888899',
  plate: '#aaaacc',
  robe: '#6644aa',
  hide: '#775533',
};

export function getHeroWeaponId(hero) {
  if (hero.weapon?.spriteId) return hero.weapon.spriteId;
  if (hero.weapon?.name) return resolveWeaponSpriteId(hero.weapon.name);
  return DEFAULT_WEAPON[hero.profession] ?? 'sword';
}

export function getHeroArmorId(hero) {
  if (hero.armor?.spriteId) return hero.armor.spriteId;
  if (hero.armor?.name) return resolveArmorSpriteId(hero.armor.name);
  return null;
}

function drawWarrior(ctx, sx, sy, facing, bounce) {
  drawHeroShadow(ctx, sx, sy);
  px(ctx, sx, sy, 2, 2, 12, 12, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 4, 10, 9, '#7a1f1f', bounce);
  px(ctx, sx, sy, 4, 5, 8, 5, '#b73333', bounce);
  px(ctx, sx, sy, 5, 5, 6, 5, SKIN, bounce);
  px(ctx, sx, sy, 4, 2, 8, 3, '#777788', bounce);
  px(ctx, sx, sy, 5, 1, 6, 2, '#aaaabb', bounce);
  px(ctx, sx, sy, 3, 5, 2, 4, '#5f1717', bounce);
  px(ctx, sx, sy, 11, 5, 2, 4, '#5f1717', bounce);
  px(ctx, sx, sy, 4, 10, 3, 3, '#4f1515', bounce);
  px(ctx, sx, sy, 9, 10, 3, 3, '#4f1515', bounce);
  px(ctx, sx, sy, 5, 13, 2, 1, '#332222', bounce);
  px(ctx, sx, sy, 9, 13, 2, 1, '#332222', bounce);
  px(ctx, sx, sy, 6, 4, 4, 1, '#dddddd', bounce);
  px(ctx, sx, sy, 6, 10, 4, 1, '#ddaa44', bounce);
  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawArcher(ctx, sx, sy, facing, bounce) {
  drawHeroShadow(ctx, sx, sy);
  px(ctx, sx, sy, 2, 2, 12, 12, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 4, 10, 9, '#1f5526', bounce);
  px(ctx, sx, sy, 4, 5, 8, 5, '#2f8a38', bounce);
  px(ctx, sx, sy, 5, 5, 6, 5, SKIN, bounce);
  px(ctx, sx, sy, 4, 3, 8, 3, '#3f7a35', bounce);
  px(ctx, sx, sy, 5, 2, 6, 2, '#55aa44', bounce);
  px(ctx, sx, sy, 10, 2, 3, 2, '#88cc66', bounce);
  px(ctx, sx, sy, 3, 6, 2, 4, '#183d1c', bounce);
  px(ctx, sx, sy, 11, 6, 2, 4, '#183d1c', bounce);
  px(ctx, sx, sy, 4, 10, 3, 3, '#183d1c', bounce);
  px(ctx, sx, sy, 9, 10, 3, 3, '#183d1c', bounce);
  px(ctx, sx, sy, 5, 13, 2, 1, '#112811', bounce);
  px(ctx, sx, sy, 9, 13, 2, 1, '#112811', bounce);
  px(ctx, sx, sy, 5, 10, 6, 1, '#886633', bounce);
  px(ctx, sx, sy, 4, 7, 1, 2, '#aa8855', bounce);
  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawMage(ctx, sx, sy, facing, bounce) {
  drawHeroShadow(ctx, sx, sy);
  px(ctx, sx, sy, 2, 1, 12, 13, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 5, 10, 8, '#4b1f8f', bounce);
  px(ctx, sx, sy, 4, 6, 8, 6, '#6732c8', bounce);
  px(ctx, sx, sy, 5, 6, 6, 5, SKIN, bounce);
  px(ctx, sx, sy, 4, 2, 8, 4, '#7733dd', bounce);
  px(ctx, sx, sy, 3, 1, 10, 2, '#8844ff', bounce);
  px(ctx, sx, sy, 6, 0, 4, 2, '#bb77ff', bounce);
  px(ctx, sx, sy, 7, 0, 2, 1, '#ffffff', bounce);
  px(ctx, sx, sy, 4, 4, 8, 2, '#3e1a77', bounce);
  px(ctx, sx, sy, 3, 8, 2, 4, '#35135f', bounce);
  px(ctx, sx, sy, 11, 8, 2, 4, '#35135f', bounce);
  px(ctx, sx, sy, 5, 12, 6, 2, '#2d104f', bounce);
  px(ctx, sx, sy, 6, 12, 4, 1, '#aa66ff', bounce);
  px(ctx, sx, sy, 7, 7, 2, 2, '#ccaaFF', bounce);
  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawThief(ctx, sx, sy, facing, bounce) {
  drawHeroShadow(ctx, sx, sy);
  px(ctx, sx, sy, 2, 2, 12, 12, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 4, 10, 9, '#2d2d18', bounce);
  px(ctx, sx, sy, 4, 6, 8, 5, '#4a4a22', bounce);
  px(ctx, sx, sy, 5, 5, 6, 4, SKIN, bounce);
  px(ctx, sx, sy, 4, 3, 8, 3, '#121208', bounce);
  px(ctx, sx, sy, 4, 4, 8, 2, '#090906', bounce);
  px(ctx, sx, sy, 6, 5, 4, 1, '#090906', bounce);
  px(ctx, sx, sy, 11, 4, 2, 2, '#ffd700', bounce);
  px(ctx, sx, sy, 12, 5, 1, 1, '#fff2aa', bounce);
  px(ctx, sx, sy, 3, 7, 2, 4, '#17170b', bounce);
  px(ctx, sx, sy, 11, 7, 2, 4, '#17170b', bounce);
  px(ctx, sx, sy, 4, 10, 3, 3, '#151508', bounce);
  px(ctx, sx, sy, 9, 10, 3, 3, '#151508', bounce);
  px(ctx, sx, sy, 5, 13, 2, 1, '#080804', bounce);
  px(ctx, sx, sy, 9, 13, 2, 1, '#080804', bounce);
  px(ctx, sx, sy, 5, 10, 6, 1, '#aa8844', bounce);
  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawNecromancer(ctx, sx, sy, facing, bounce) {
  drawHeroShadow(ctx, sx, sy);
  px(ctx, sx, sy, 2, 2, 12, 12, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 4, 10, 9, '#142814', bounce);
  px(ctx, sx, sy, 4, 6, 8, 6, '#1f3b1f', bounce);
  px(ctx, sx, sy, 5, 5, 6, 4, '#b8d0b8', bounce);
  px(ctx, sx, sy, 4, 2, 8, 3, '#1c2a1c', bounce);
  px(ctx, sx, sy, 4, 4, 8, 2, '#0b120b', bounce);
  px(ctx, sx, sy, 5, 4, 2, 2, '#88ff44', bounce);
  px(ctx, sx, sy, 9, 4, 2, 2, '#88ff44', bounce);
  px(ctx, sx, sy, 5, 4, 1, 1, '#ddff99', bounce);
  px(ctx, sx, sy, 9, 4, 1, 1, '#ddff99', bounce);
  px(ctx, sx, sy, 3, 7, 2, 5, '#0c180c', bounce);
  px(ctx, sx, sy, 11, 7, 2, 5, '#0c180c', bounce);
  px(ctx, sx, sy, 4, 11, 2, 3, '#d8d8aa', bounce);
  px(ctx, sx, sy, 10, 11, 2, 3, '#d8d8aa', bounce);
  px(ctx, sx, sy, 6, 12, 4, 2, '#44aa44', bounce);
  px(ctx, sx, sy, 7, 10, 2, 2, '#88ff44', bounce);
}

function overlayArmorLeather(ctx, sx, sy, color, bounce) {
  const body = color ?? '#886633';
  px(ctx, sx, sy, 4, 5, 8, 6, body, bounce);
  px(ctx, sx, sy, 3, 5, 2, 5, '#664422', bounce);
  px(ctx, sx, sy, 11, 5, 2, 5, '#664422', bounce);
  px(ctx, sx, sy, 5, 4, 6, 2, '#996644', bounce);
  px(ctx, sx, sy, 5, 6, 1, 4, '#553322', bounce);
  px(ctx, sx, sy, 8, 6, 1, 4, '#553322', bounce);
  px(ctx, sx, sy, 6, 7, 4, 1, '#aa8866', bounce);
  px(ctx, sx, sy, 4, 9, 2, 1, '#553322', bounce);
  px(ctx, sx, sy, 10, 9, 2, 1, '#553322', bounce);
}

function overlayArmorChain(ctx, sx, sy, color, bounce) {
  px(ctx, sx, sy, 4, 5, 8, 6, color ?? '#888899', bounce);
  px(ctx, sx, sy, 3, 4, 2, 7, '#555566', bounce);
  px(ctx, sx, sy, 11, 4, 2, 7, '#555566', bounce);
  px(ctx, sx, sy, 5, 3, 6, 2, '#bbbccc', bounce);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      px(ctx, sx, sy, 4 + col * 2 + (row % 2), 5 + row * 2, 1, 1, row % 2 ? '#ddeeff' : '#99aabb', bounce);
    }
  }
  px(ctx, sx, sy, 6, 4, 4, 1, '#ccccdd', bounce);
}

function overlayArmorPlate(ctx, sx, sy, color, bounce) {
  const plate = color ?? '#aaaacc';
  px(ctx, sx, sy, 3, 5, 10, 6, plate, bounce);
  px(ctx, sx, sy, 2, 4, 3, 3, '#777788', bounce);
  px(ctx, sx, sy, 11, 4, 3, 3, '#777788', bounce);
  px(ctx, sx, sy, 5, 3, 6, 2, '#ddddee', bounce);
  px(ctx, sx, sy, 6, 4, 4, 4, '#eeeeff', bounce);
  px(ctx, sx, sy, 7, 5, 2, 2, '#ffffff', bounce);
  px(ctx, sx, sy, 5, 9, 6, 1, '#666677', bounce);
  px(ctx, sx, sy, 4, 10, 2, 1, '#555566', bounce);
  px(ctx, sx, sy, 10, 10, 2, 1, '#555566', bounce);
}

function overlayArmorRobe(ctx, sx, sy, color, bounce) {
  const robe = color ?? '#6644aa';
  px(ctx, sx, sy, 4, 5, 8, 8, robe, bounce);
  px(ctx, sx, sy, 3, 6, 2, 7, '#442266', bounce);
  px(ctx, sx, sy, 11, 6, 2, 7, '#442266', bounce);
  px(ctx, sx, sy, 5, 2, 6, 4, '#553388', bounce);
  px(ctx, sx, sy, 6, 1, 4, 2, robe, bounce);
  px(ctx, sx, sy, 5, 7, 6, 1, '#8866cc', bounce);
  px(ctx, sx, sy, 7, 3, 2, 2, '#ccaaFF', bounce);
  px(ctx, sx, sy, 6, 12, 4, 2, '#553388', bounce);
}

function overlayArmorHide(ctx, sx, sy, color, bounce) {
  const fur = color ?? '#775533';
  px(ctx, sx, sy, 4, 5, 8, 6, fur, bounce);
  px(ctx, sx, sy, 3, 5, 2, 5, '#553311', bounce);
  px(ctx, sx, sy, 11, 5, 2, 5, '#553311', bounce);
  px(ctx, sx, sy, 5, 4, 6, 2, '#996644', bounce);
  px(ctx, sx, sy, 4, 6, 2, 1, '#ccaa88', bounce);
  px(ctx, sx, sy, 8, 7, 2, 1, '#ccaa88', bounce);
  px(ctx, sx, sy, 6, 8, 4, 1, '#aa8866', bounce);
  px(ctx, sx, sy, 5, 9, 1, 1, '#664422', bounce);
  px(ctx, sx, sy, 10, 9, 1, 1, '#664422', bounce);
}

const ARMOR_OVERLAYS = {
  leather: overlayArmorLeather,
  chain: overlayArmorChain,
  plate: overlayArmorPlate,
  robe: overlayArmorRobe,
  hide: overlayArmorHide,
};

function drawEquippedArmor(ctx, sx, sy, armorId, color, bounce) {
  const draw = ARMOR_OVERLAYS[armorId] ?? overlayArmorLeather;
  draw(ctx, sx, sy, color ?? DEFAULT_ARMOR_COLOR[armorId] ?? '#886633', bounce);
}

function heldWeaponSword(ctx, sx, sy, facing, color, bounce) {
  const blade = color ?? '#cccccc';
  const edge = '#eeeeee';
  if (facing === 'right') {
    px(ctx, sx, sy, 11, 3, 2, 10, blade, bounce);
    px(ctx, sx, sy, 12, 2, 1, 3, edge, bounce);
    px(ctx, sx, sy, 10, 11, 4, 2, '#888888', bounce);
    px(ctx, sx, sy, 11, 12, 2, 1, '#553322', bounce);
  } else if (facing === 'left') {
    px(ctx, sx, sy, 3, 3, 2, 10, blade, bounce);
    px(ctx, sx, sy, 3, 2, 1, 3, edge, bounce);
    px(ctx, sx, sy, 2, 11, 4, 2, '#888888', bounce);
    px(ctx, sx, sy, 3, 12, 2, 1, '#553322', bounce);
  } else if (facing === 'down') {
    px(ctx, sx, sy, 10, 6, 2, 8, blade, bounce);
    px(ctx, sx, sy, 11, 5, 1, 2, edge, bounce);
    px(ctx, sx, sy, 8, 13, 6, 2, '#888888', bounce);
  } else {
    px(ctx, sx, sy, 3, 3, 2, 8, blade, bounce);
    px(ctx, sx, sy, 3, 2, 1, 2, edge, bounce);
    px(ctx, sx, sy, 9, 2, 2, 6, '#888888', bounce);
  }
}

function heldWeaponDagger(ctx, sx, sy, facing, color, bounce) {
  const blade = color ?? '#aaaaaa';
  if (facing === 'right') {
    px(ctx, sx, sy, 11, 7, 2, 6, blade, bounce);
    px(ctx, sx, sy, 12, 6, 1, 2, '#ffffff', bounce);
    px(ctx, sx, sy, 10, 12, 3, 2, '#664422', bounce);
    px(ctx, sx, sy, 11, 13, 1, 1, '#553311', bounce);
  } else if (facing === 'left') {
    px(ctx, sx, sy, 3, 7, 2, 6, blade, bounce);
    px(ctx, sx, sy, 3, 6, 1, 2, '#ffffff', bounce);
    px(ctx, sx, sy, 3, 12, 3, 2, '#664422', bounce);
  } else if (facing === 'down') {
    px(ctx, sx, sy, 11, 8, 2, 5, blade, bounce);
    px(ctx, sx, sy, 12, 7, 1, 2, '#ffffff', bounce);
    px(ctx, sx, sy, 10, 13, 4, 1, '#664422', bounce);
  } else {
    px(ctx, sx, sy, 2, 4, 2, 5, blade, bounce);
    px(ctx, sx, sy, 2, 3, 1, 2, '#ffffff', bounce);
    px(ctx, sx, sy, 3, 9, 2, 2, '#664422', bounce);
  }
}

function heldWeaponAxe(ctx, sx, sy, facing, color, bounce) {
  const head = color ?? '#888888';
  if (facing === 'right') {
    px(ctx, sx, sy, 11, 4, 2, 9, '#664422', bounce);
    px(ctx, sx, sy, 13, 2, 3, 6, head, bounce);
    px(ctx, sx, sy, 14, 3, 1, 4, '#cccccc', bounce);
    px(ctx, sx, sy, 12, 1, 2, 2, '#aaaaaa', bounce);
  } else if (facing === 'left') {
    px(ctx, sx, sy, 3, 4, 2, 9, '#664422', bounce);
    px(ctx, sx, sy, 0, 2, 3, 6, head, bounce);
    px(ctx, sx, sy, 1, 3, 1, 4, '#cccccc', bounce);
  } else if (facing === 'down') {
    px(ctx, sx, sy, 10, 5, 2, 8, '#664422', bounce);
    px(ctx, sx, sy, 12, 7, 4, 4, head, bounce);
    px(ctx, sx, sy, 13, 8, 2, 2, '#aaaaaa', bounce);
  } else {
    px(ctx, sx, sy, 1, 2, 4, 4, head, bounce);
    px(ctx, sx, sy, 3, 4, 2, 8, '#664422', bounce);
  }
}

function heldWeaponMace(ctx, sx, sy, facing, color, bounce) {
  const head = color ?? '#666666';
  if (facing === 'right') {
    px(ctx, sx, sy, 11, 5, 2, 8, '#553322', bounce);
    px(ctx, sx, sy, 12, 2, 4, 5, head, bounce);
    px(ctx, sx, sy, 13, 3, 2, 3, '#999999', bounce);
    px(ctx, sx, sy, 11, 1, 2, 2, '#aaaaaa', bounce);
    px(ctx, sx, sy, 13, 1, 2, 2, '#aaaaaa', bounce);
  } else if (facing === 'left') {
    px(ctx, sx, sy, 3, 5, 2, 8, '#553322', bounce);
    px(ctx, sx, sy, 0, 2, 4, 5, head, bounce);
    px(ctx, sx, sy, 1, 3, 2, 3, '#999999', bounce);
  } else if (facing === 'down') {
    px(ctx, sx, sy, 10, 6, 2, 7, '#553322', bounce);
    px(ctx, sx, sy, 11, 3, 4, 5, head, bounce);
    px(ctx, sx, sy, 12, 4, 2, 3, '#999999', bounce);
  } else {
    px(ctx, sx, sy, 2, 2, 4, 5, head, bounce);
    px(ctx, sx, sy, 4, 5, 2, 7, '#553322', bounce);
  }
}

function heldWeaponBow(ctx, sx, sy, facing, color, bounce) {
  const wood = color ?? '#885522';
  if (facing === 'left') {
    px(ctx, sx, sy, 1, 5, 2, 8, wood, bounce);
    px(ctx, sx, sy, 0, 4, 1, 10, '#cccccc', bounce);
    px(ctx, sx, sy, 0, 4, 1, 1, '#ffffaa', bounce);
    px(ctx, sx, sy, 2, 8, 1, 1, '#886633', bounce);
  } else if (facing === 'right') {
    px(ctx, sx, sy, 13, 5, 2, 8, wood, bounce);
    px(ctx, sx, sy, 15, 4, 1, 10, '#cccccc', bounce);
    px(ctx, sx, sy, 15, 4, 1, 1, '#ffffaa', bounce);
  } else if (facing === 'up') {
    px(ctx, sx, sy, 1, 3, 2, 6, wood, bounce);
    px(ctx, sx, sy, 13, 3, 2, 6, wood, bounce);
    px(ctx, sx, sy, 2, 4, 12, 1, '#cccccc', bounce);
    px(ctx, sx, sy, 7, 4, 2, 1, '#ffffaa', bounce);
  } else {
    px(ctx, sx, sy, 1, 7, 2, 6, wood, bounce);
    px(ctx, sx, sy, 13, 7, 2, 6, wood, bounce);
    px(ctx, sx, sy, 2, 8, 12, 1, '#cccccc', bounce);
  }
}

function heldWeaponStaff(ctx, sx, sy, facing, color, bounce, glow = '#44ffff') {
  const shaft = '#664422';
  const orb = color ?? '#8844ff';
  if (facing === 'left') {
    px(ctx, sx, sy, 1, 2, 2, 11, shaft, bounce);
    px(ctx, sx, sy, 0, 1, 3, 4, orb, bounce);
    px(ctx, sx, sy, 1, 1, 1, 2, glow, bounce);
    px(ctx, sx, sy, 0, 4, 1, 1, '#ddccff', bounce);
  } else if (facing === 'right') {
    px(ctx, sx, sy, 13, 2, 2, 11, shaft, bounce);
    px(ctx, sx, sy, 13, 1, 3, 4, orb, bounce);
    px(ctx, sx, sy, 14, 1, 1, 2, glow, bounce);
  } else if (facing === 'down') {
    px(ctx, sx, sy, 12, 3, 2, 10, shaft, bounce);
    px(ctx, sx, sy, 11, 1, 4, 4, orb, bounce);
    px(ctx, sx, sy, 12, 2, 2, 2, glow, bounce);
    px(ctx, sx, sy, 10, 12, 4, 1, '#553311', bounce);
  } else {
    px(ctx, sx, sy, 2, 2, 2, 10, shaft, bounce);
    px(ctx, sx, sy, 1, 0, 4, 4, orb, bounce);
    px(ctx, sx, sy, 2, 1, 2, 2, glow, bounce);
  }
}

const HELD_WEAPONS = {
  sword: heldWeaponSword,
  dagger: heldWeaponDagger,
  axe: heldWeaponAxe,
  mace: heldWeaponMace,
  bow: heldWeaponBow,
  staff: heldWeaponStaff,
};

function drawEquippedWeapon(ctx, sx, sy, weaponId, color, profession, facing, bounce) {
  const draw = HELD_WEAPONS[weaponId] ?? heldWeaponSword;
  const glow = profession === 'necromancer' ? '#88ff44' : '#44ffff';
  if (weaponId === 'staff') {
    heldWeaponStaff(ctx, sx, sy, facing, color, bounce, glow);
    return;
  }
  draw(ctx, sx, sy, facing, color, bounce);
}

const DRAWERS = {
  warrior: drawWarrior,
  archer: drawArcher,
  mage: drawMage,
  thief: drawThief,
  necromancer: drawNecromancer,
};

function normalizeHero(heroOrProfession, facing = 'down') {
  if (typeof heroOrProfession === 'string') {
    return {
      profession: heroOrProfession,
      facing,
      weapon: null,
      armor: null,
    };
  }
  return {
    ...heroOrProfession,
    facing: heroOrProfession.facing ?? facing,
  };
}

export function drawHeroSprite(ctx, sx, sy, heroOrProfession, facing = 'down', bounce = 0) {
  const hero = normalizeHero(heroOrProfession, facing);
  const dir = hero.facing;
  const drawBase = DRAWERS[hero.profession] ?? DRAWERS.warrior;

  drawBase(ctx, sx, sy, dir, bounce);

  const armorId = getHeroArmorId(hero);
  if (armorId) {
    drawEquippedArmor(ctx, sx, sy, armorId, hero.armor?.color, bounce);
  }

  const weaponId = getHeroWeaponId(hero);
  drawEquippedWeapon(ctx, sx, sy, weaponId, hero.weapon?.color, hero.profession, dir, bounce);

  if (armorId) {
    drawEyes(ctx, sx, sy, dir, bounce);
  }
}

export function drawHeroDeath(ctx, sx, sy) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx, sy, 16, 16);
  ctx.fillStyle = '#ff0044';
  ctx.fillRect(sx + 4, sy + 8, 8, 2);
  ctx.fillRect(sx + 7, sy + 5, 2, 8);
}

export function drawClassPreview(canvas, profession) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
  const scale = canvas.width / 16;
  ctx.save();
  ctx.scale(scale, scale);
  drawHeroSprite(ctx, 0, 0, profession, 'down', 0);
  ctx.restore();
}

function lootPx(ctx, sx, sy, x, y, w, h, color, bob = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(sx + x, sy + y + bob, w, h);
}

function drawLootShadow(ctx, sx, sy, bob) {
  lootPx(ctx, sx, sy, 3, 13, 10, 2, '#0a0a14', bob);
  lootPx(ctx, sx, sy, 4, 14, 8, 1, '#151525', bob);
}

function drawRareGlow(ctx, sx, sy, bob) {
  drawRarityGlow(ctx, sx, sy, bob, 'rare');
}

function drawRarityGlow(ctx, sx, sy, bob, rarity = 'common') {
  const colors = {
    uncommon: ['#33aa55', '#55dd77'],
    rare: ['#ffcc44', '#ffee88', '#ffaa22', '#ffdd66'],
    epic: ['#9933ff', '#cc66ff', '#7722cc', '#bb55ff'],
    legendary: ['#ff8800', '#ffcc44', '#ffaa00', '#ffee88', '#ff6600'],
  };

  const palette = colors[rarity] ?? colors.rare;
  const points = [
    [1, 2, 2, 2],
    [13, 3, 2, 2],
    [12, 12, 2, 2],
    [2, 11, 1, 1],
    [7, 1, 2, 1],
    [0, 7, 1, 1],
    [14, 8, 1, 1],
  ];

  points.forEach(([x, y, w, h], i) => {
    lootPx(ctx, sx, sy, x, y, w, h, palette[i % palette.length], bob);
  });
}

function drawWeaponDagger(ctx, sx, sy, color, bob) {
  const blade = color ?? '#aaaaaa';
  lootPx(ctx, sx, sy, 7, 11, 2, 3, '#553322', bob);
  lootPx(ctx, sx, sy, 6, 10, 4, 2, '#775533', bob);
  lootPx(ctx, sx, sy, 6, 9, 1, 1, '#886644', bob);
  lootPx(ctx, sx, sy, 9, 9, 1, 1, '#886644', bob);
  lootPx(ctx, sx, sy, 7, 2, 2, 7, blade, bob);
  lootPx(ctx, sx, sy, 6, 1, 4, 2, '#dddddd', bob);
  lootPx(ctx, sx, sy, 7, 0, 2, 2, '#ffffff', bob);
  lootPx(ctx, sx, sy, 8, 3, 1, 4, '#cccccc', bob);
}

function drawWeaponSword(ctx, sx, sy, color, bob) {
  const blade = color ?? '#cccccc';
  lootPx(ctx, sx, sy, 7, 12, 2, 3, '#553322', bob);
  lootPx(ctx, sx, sy, 5, 9, 6, 2, '#777777', bob);
  lootPx(ctx, sx, sy, 6, 10, 4, 1, '#999999', bob);
  lootPx(ctx, sx, sy, 5, 9, 1, 1, '#886644', bob);
  lootPx(ctx, sx, sy, 10, 9, 1, 1, '#886644', bob);
  lootPx(ctx, sx, sy, 7, 1, 2, 9, blade, bob);
  lootPx(ctx, sx, sy, 6, 0, 4, 2, '#eeeeee', bob);
  lootPx(ctx, sx, sy, 7, 0, 2, 1, '#ffffff', bob);
  lootPx(ctx, sx, sy, 8, 2, 1, 6, '#dddddd', bob);
  lootPx(ctx, sx, sy, 6, 1, 1, 1, '#ffffff', bob);
}

function drawWeaponAxe(ctx, sx, sy, color, bob) {
  const head = color ?? '#888888';
  lootPx(ctx, sx, sy, 7, 6, 2, 8, '#664422', bob);
  lootPx(ctx, sx, sy, 6, 13, 4, 2, '#443311', bob);
  lootPx(ctx, sx, sy, 7, 5, 2, 1, '#886633', bob);
  lootPx(ctx, sx, sy, 9, 1, 5, 7, head, bob);
  lootPx(ctx, sx, sy, 10, 2, 2, 5, '#bbbbbb', bob);
  lootPx(ctx, sx, sy, 8, 0, 3, 2, '#cccccc', bob);
  lootPx(ctx, sx, sy, 11, 4, 2, 2, '#666666', bob);
  lootPx(ctx, sx, sy, 4, 3, 2, 3, head, bob);
}

function drawWeaponMace(ctx, sx, sy, color, bob) {
  const head = color ?? '#666666';
  lootPx(ctx, sx, sy, 7, 9, 2, 5, '#553322', bob);
  lootPx(ctx, sx, sy, 6, 13, 4, 2, '#332211', bob);
  lootPx(ctx, sx, sy, 7, 8, 2, 1, '#775533', bob);
  lootPx(ctx, sx, sy, 4, 1, 8, 7, head, bob);
  lootPx(ctx, sx, sy, 5, 2, 6, 5, '#888888', bob);
  lootPx(ctx, sx, sy, 4, 0, 2, 2, '#aaaaaa', bob);
  lootPx(ctx, sx, sy, 10, 0, 2, 2, '#aaaaaa', bob);
  lootPx(ctx, sx, sy, 6, 1, 4, 1, '#999999', bob);
  lootPx(ctx, sx, sy, 7, 4, 2, 2, '#777777', bob);
  lootPx(ctx, sx, sy, 5, 3, 1, 1, '#cccccc', bob);
  lootPx(ctx, sx, sy, 10, 3, 1, 1, '#cccccc', bob);
}

function drawWeaponBow(ctx, sx, sy, color, bob) {
  const wood = color ?? '#885522';
  lootPx(ctx, sx, sy, 3, 3, 2, 10, wood, bob);
  lootPx(ctx, sx, sy, 11, 3, 2, 10, wood, bob);
  lootPx(ctx, sx, sy, 4, 2, 1, 1, '#aa7744', bob);
  lootPx(ctx, sx, sy, 11, 2, 1, 1, '#aa7744', bob);
  lootPx(ctx, sx, sy, 4, 12, 1, 1, '#664422', bob);
  lootPx(ctx, sx, sy, 11, 12, 1, 1, '#664422', bob);
  lootPx(ctx, sx, sy, 5, 3, 6, 10, '#cccccc', bob);
  lootPx(ctx, sx, sy, 7, 6, 2, 1, '#ffffaa', bob);
  lootPx(ctx, sx, sy, 6, 4, 1, 8, '#dddddd', bob);
  lootPx(ctx, sx, sy, 9, 4, 1, 8, '#dddddd', bob);
}

function drawWeaponStaff(ctx, sx, sy, color, bob) {
  const orb = color ?? '#8844ff';
  lootPx(ctx, sx, sy, 7, 6, 2, 9, '#664422', bob);
  lootPx(ctx, sx, sy, 6, 14, 4, 1, '#443311', bob);
  lootPx(ctx, sx, sy, 7, 5, 2, 1, '#886633', bob);
  lootPx(ctx, sx, sy, 4, 0, 8, 5, orb, bob);
  lootPx(ctx, sx, sy, 5, 1, 6, 3, '#aa88ff', bob);
  lootPx(ctx, sx, sy, 6, 0, 4, 2, '#ccbbff', bob);
  lootPx(ctx, sx, sy, 7, 1, 2, 2, '#ffffff', bob);
  lootPx(ctx, sx, sy, 4, 4, 1, 1, '#ddccff', bob);
  lootPx(ctx, sx, sy, 11, 4, 1, 1, '#ddccff', bob);
  lootPx(ctx, sx, sy, 3, 2, 1, 1, '#88ffff', bob);
  lootPx(ctx, sx, sy, 12, 2, 1, 1, '#88ffff', bob);
}

const WEAPON_DRAWERS = {
  dagger: drawWeaponDagger,
  sword: drawWeaponSword,
  axe: drawWeaponAxe,
  mace: drawWeaponMace,
  bow: drawWeaponBow,
  staff: drawWeaponStaff,
};

function drawArmorLeather(ctx, sx, sy, color, bob) {
  const body = color ?? '#886633';
  lootPx(ctx, sx, sy, 3, 4, 10, 9, '#553322', bob);
  lootPx(ctx, sx, sy, 4, 5, 8, 7, body, bob);
  lootPx(ctx, sx, sy, 5, 4, 6, 2, '#996644', bob);
  lootPx(ctx, sx, sy, 3, 6, 2, 5, '#664422', bob);
  lootPx(ctx, sx, sy, 11, 6, 2, 5, '#664422', bob);
  lootPx(ctx, sx, sy, 5, 6, 1, 4, '#553322', bob);
  lootPx(ctx, sx, sy, 8, 6, 1, 4, '#553322', bob);
  lootPx(ctx, sx, sy, 6, 7, 4, 1, '#aa8866', bob);
  lootPx(ctx, sx, sy, 4, 9, 2, 1, '#775533', bob);
  lootPx(ctx, sx, sy, 10, 9, 2, 1, '#775533', bob);
  lootPx(ctx, sx, sy, 5, 10, 6, 2, '#775533', bob);
}

function drawArmorChain(ctx, sx, sy, color, bob) {
  const base = color ?? '#888899';
  lootPx(ctx, sx, sy, 3, 4, 10, 9, '#444455', bob);
  lootPx(ctx, sx, sy, 4, 5, 8, 7, base, bob);
  lootPx(ctx, sx, sy, 3, 5, 2, 6, '#555566', bob);
  lootPx(ctx, sx, sy, 11, 5, 2, 6, '#555566', bob);
  lootPx(ctx, sx, sy, 5, 3, 6, 2, '#bbbccc', bob);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      lootPx(ctx, sx, sy, 4 + col * 2 + (row % 2), 5 + row * 2, 1, 1, row % 2 ? '#ddeeff' : '#99aabb', bob);
    }
  }
  lootPx(ctx, sx, sy, 6, 4, 4, 1, '#ccccdd', bob);
  lootPx(ctx, sx, sy, 5, 10, 6, 2, '#666677', bob);
}

function drawArmorPlate(ctx, sx, sy, color, bob) {
  const plate = color ?? '#aaaacc';
  lootPx(ctx, sx, sy, 3, 4, 10, 9, '#555566', bob);
  lootPx(ctx, sx, sy, 4, 6, 8, 6, plate, bob);
  lootPx(ctx, sx, sy, 3, 5, 2, 3, '#777788', bob);
  lootPx(ctx, sx, sy, 11, 5, 2, 3, '#777788', bob);
  lootPx(ctx, sx, sy, 5, 3, 6, 3, '#ddddee', bob);
  lootPx(ctx, sx, sy, 6, 4, 4, 4, '#eeeeff', bob);
  lootPx(ctx, sx, sy, 7, 5, 2, 3, '#ffffff', bob);
  lootPx(ctx, sx, sy, 6, 9, 4, 1, '#666677', bob);
  lootPx(ctx, sx, sy, 4, 10, 2, 2, '#888899', bob);
  lootPx(ctx, sx, sy, 10, 10, 2, 2, '#888899', bob);
  lootPx(ctx, sx, sy, 5, 11, 6, 1, '#555566', bob);
}

function drawArmorRobe(ctx, sx, sy, color, bob) {
  const robe = color ?? '#6644aa';
  lootPx(ctx, sx, sy, 3, 5, 10, 8, '#331155', bob);
  lootPx(ctx, sx, sy, 4, 6, 8, 7, robe, bob);
  lootPx(ctx, sx, sy, 5, 2, 6, 4, '#553388', bob);
  lootPx(ctx, sx, sy, 6, 1, 4, 2, '#7755bb', bob);
  lootPx(ctx, sx, sy, 3, 7, 2, 6, '#442266', bob);
  lootPx(ctx, sx, sy, 11, 7, 2, 6, '#442266', bob);
  lootPx(ctx, sx, sy, 5, 7, 6, 1, '#8866cc', bob);
  lootPx(ctx, sx, sy, 7, 3, 2, 2, '#ccaaFF', bob);
  lootPx(ctx, sx, sy, 5, 11, 2, 2, '#553388', bob);
  lootPx(ctx, sx, sy, 9, 11, 2, 2, '#553388', bob);
  lootPx(ctx, sx, sy, 6, 12, 4, 1, '#442266', bob);
}

function drawArmorHide(ctx, sx, sy, color, bob) {
  const fur = color ?? '#775533';
  lootPx(ctx, sx, sy, 3, 5, 10, 8, '#553311', bob);
  lootPx(ctx, sx, sy, 4, 6, 8, 6, fur, bob);
  lootPx(ctx, sx, sy, 5, 4, 6, 2, '#996644', bob);
  lootPx(ctx, sx, sy, 3, 6, 2, 4, '#664422', bob);
  lootPx(ctx, sx, sy, 11, 6, 2, 4, '#664422', bob);
  lootPx(ctx, sx, sy, 4, 7, 2, 1, '#ccaa88', bob);
  lootPx(ctx, sx, sy, 8, 8, 2, 1, '#ccaa88', bob);
  lootPx(ctx, sx, sy, 6, 9, 4, 1, '#aa8866', bob);
  lootPx(ctx, sx, sy, 5, 10, 1, 1, '#553311', bob);
  lootPx(ctx, sx, sy, 10, 10, 1, 1, '#553311', bob);
  lootPx(ctx, sx, sy, 7, 7, 2, 2, '#886655', bob);
}

const ARMOR_DRAWERS = {
  leather: drawArmorLeather,
  chain: drawArmorChain,
  plate: drawArmorPlate,
  robe: drawArmorRobe,
  hide: drawArmorHide,
};

export function drawLootWeapon(ctx, sx, sy, item, bob = 0) {
  const id = item.spriteId ?? resolveWeaponSpriteId(item.name);
  const color = item.color ?? '#cccccc';
  const draw = WEAPON_DRAWERS[id] ?? drawWeaponSword;
  drawLootShadow(ctx, sx, sy, bob);
  draw(ctx, sx, sy, color, bob);
  const rarity = getItemRarity(item);
  if (hasRarityGlow(rarity)) {
    drawRarityGlow(ctx, sx, sy, bob, rarity);
  }
}

export function drawLootArmor(ctx, sx, sy, item, bob = 0) {
  const id = item.spriteId ?? resolveArmorSpriteId(item.name);
  const color = item.color ?? '#888899';
  const draw = ARMOR_DRAWERS[id] ?? drawArmorLeather;
  drawLootShadow(ctx, sx, sy, bob);
  draw(ctx, sx, sy, color, bob);
  const rarity = getItemRarity(item);
  if (hasRarityGlow(rarity)) {
    drawRarityGlow(ctx, sx, sy, bob, rarity);
  }
}

function drawChestShadow(ctx, sx, sy, bob) {
  lootPx(ctx, sx, sy, 2, 13, 12, 2, '#0a0a14', bob);
  lootPx(ctx, sx, sy, 3, 14, 10, 1, '#151525', bob);
}

function drawOpenedChest(ctx, sx, sy, bob) {
  drawChestShadow(ctx, sx, sy, bob);

  lootPx(ctx, sx, sy, 2, 9, 12, 5, '#2a1810', bob);
  lootPx(ctx, sx, sy, 3, 10, 10, 3, '#120a06', bob);
  lootPx(ctx, sx, sy, 4, 11, 8, 1, '#1a1008', bob);
  lootPx(ctx, sx, sy, 2, 9, 1, 5, '#5c4033', bob);
  lootPx(ctx, sx, sy, 13, 9, 1, 5, '#5c4033', bob);
  lootPx(ctx, sx, sy, 2, 13, 12, 1, '#3d2817', bob);
  lootPx(ctx, sx, sy, 2, 11, 12, 1, '#666677', bob);
  lootPx(ctx, sx, sy, 3, 11, 10, 1, '#888899', bob);

  lootPx(ctx, sx, sy, 1, 2, 14, 2, '#3d2817', bob);
  lootPx(ctx, sx, sy, 2, 1, 12, 2, '#5c4033', bob);
  lootPx(ctx, sx, sy, 3, 0, 10, 1, '#7a5533', bob);
  lootPx(ctx, sx, sy, 4, 0, 8, 1, '#8b6844', bob);
  lootPx(ctx, sx, sy, 1, 3, 14, 1, '#666677', bob);
  lootPx(ctx, sx, sy, 2, 4, 12, 1, '#888899', bob);
  lootPx(ctx, sx, sy, 4, 12, 8, 1, '#4a3020', bob);
  lootPx(ctx, sx, sy, 5, 12, 1, 1, '#665544', bob);
  lootPx(ctx, sx, sy, 10, 12, 1, 1, '#665544', bob);
}

function drawClosedChest(ctx, sx, sy, bob, pulse, { isMimic = false, rare = false } = {}) {
  const woodDark = isMimic ? '#3a2518' : '#3d2817';
  const woodMid = isMimic ? '#5a4030' : '#5c4033';
  const woodLight = isMimic ? '#7a5544' : '#7a5533';
  const woodHighlight = isMimic ? '#8a6655' : '#8b6844';

  drawChestShadow(ctx, sx, sy, bob);

  lootPx(ctx, sx, sy, 2, 9, 12, 5, woodDark, bob);
  lootPx(ctx, sx, sy, 3, 9, 10, 4, woodMid, bob);
  lootPx(ctx, sx, sy, 4, 10, 8, 1, woodDark, bob);
  lootPx(ctx, sx, sy, 5, 12, 6, 1, woodLight, bob);
  lootPx(ctx, sx, sy, 2, 9, 1, 5, '#444455', bob);
  lootPx(ctx, sx, sy, 13, 9, 1, 5, '#444455', bob);
  lootPx(ctx, sx, sy, 2, 11, 12, 1, '#666677', bob);
  lootPx(ctx, sx, sy, 3, 11, 10, 1, '#888899', bob);
  lootPx(ctx, sx, sy, 2, 13, 12, 1, woodDark, bob);

  lootPx(ctx, sx, sy, 2, 4, 12, 5, woodDark, bob);
  lootPx(ctx, sx, sy, 3, 4, 10, 4, woodMid, bob);
  lootPx(ctx, sx, sy, 4, 3, 8, 2, woodLight, bob);
  lootPx(ctx, sx, sy, 5, 2, 6, 1, woodHighlight, bob);
  lootPx(ctx, sx, sy, 6, 2, 4, 1, '#a07850', bob);
  lootPx(ctx, sx, sy, 2, 8, 12, 1, '#666677', bob);
  lootPx(ctx, sx, sy, 3, 8, 10, 1, '#888899', bob);
  lootPx(ctx, sx, sy, 2, 4, 1, 5, '#444455', bob);
  lootPx(ctx, sx, sy, 13, 4, 1, 5, '#444455', bob);

  const lockY = 6 + Math.round(pulse);
  lootPx(ctx, sx, sy, 6, lockY, 4, 3, '#cc9922', bob);
  lootPx(ctx, sx, sy, 6, lockY, 1, 1, '#ffee88', bob);
  lootPx(ctx, sx, sy, 7, lockY + 1, 2, 2, '#554433', bob);
  lootPx(ctx, sx, sy, 7, lockY + 1, 1, 2, '#111111', bob);
  lootPx(ctx, sx, sy, 8, lockY, 1, 1, '#ffcc44', bob);
  lootPx(ctx, sx, sy, 5, lockY + 2, 1, 1, '#886622', bob);
  lootPx(ctx, sx, sy, 10, lockY + 2, 1, 1, '#886622', bob);

  if (rare) {
    drawRareGlow(ctx, sx, sy, bob);
    if (pulse > 0) {
      lootPx(ctx, sx, sy, 1, 5 + Math.round(pulse), 1, 1, '#ffffaa', bob);
      lootPx(ctx, sx, sy, 14, 6, 1, 1, '#ffee88', bob);
      lootPx(ctx, sx, sy, 7, 1, 2, 1, '#ffdd66', bob);
    }
  }

  if (isMimic) {
    lootPx(ctx, sx, sy, 5, lockY, 1, 1, '#ffffff', bob);
    lootPx(ctx, sx, sy, 10, lockY, 1, 1, '#ffffff', bob);
    lootPx(ctx, sx, sy, 5, lockY + 1, 1, 1, '#220000', bob);
    lootPx(ctx, sx, sy, 10, lockY + 1, 1, 1, '#220000', bob);
    lootPx(ctx, sx, sy, 7, 4, 2, 1, '#440000', bob);
    lootPx(ctx, sx, sy, 6, 9, 4, 1, '#cc5533', bob);
    lootPx(ctx, sx, sy, 7, 9, 2, 1, '#ff8866', bob);
  }
}

export function drawChestSprite(ctx, sx, sy, chest, frame = 0) {
  const bob = Math.sin(frame / 12 + (chest.x ?? 0) * 0.7) * 0.4;
  const pulse = Math.sin(frame / 8 + (chest.x ?? 0)) * 0.5;

  if (chest.opened) {
    drawOpenedChest(ctx, sx, sy, bob);
    return;
  }

  drawClosedChest(ctx, sx, sy, bob, pulse, {
    isMimic: chest.isMimic,
    rare: chest.rare !== false,
  });
}
