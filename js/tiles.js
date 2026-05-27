import { TILES } from './config.js';

export const DUNGEON_THEMES = [
  {
    id: 'catacombs',
    name: 'Катакомбы',
    wall: { base: '#2a2840', face: '#353552', top: '#454568', accent: '#5a5878', shadow: '#1a1828' },
    floor: { dark: '#1a1828', light: '#242438', spot: '#2e2e48' },
    stairs: '#44ff88',
    fog: '#0a0a14',
    fogEdge: '#181828',
    minimapWall: '#3a3858',
    minimapFloor: '#4a4868',
  },
  {
    id: 'mossy',
    name: 'Заросшие пещеры',
    wall: { base: '#243028', face: '#2f4034', top: '#3d5240', accent: '#4a6848', shadow: '#152018' },
    floor: { dark: '#141f18', light: '#1c2a22', spot: '#253528' },
    stairs: '#66ff99',
    fog: '#081410',
    fogEdge: '#142018',
    minimapWall: '#2a4030',
    minimapFloor: '#3a5038',
  },
  {
    id: 'lava',
    name: 'Расплавленные глубины',
    wall: { base: '#3a1810', face: '#4a2218', top: '#5a3020', accent: '#884422', shadow: '#220a08' },
    floor: { dark: '#1a0a08', light: '#281210', spot: '#381818' },
    stairs: '#ff8844',
    fog: '#140808',
    fogEdge: '#281008',
    minimapWall: '#5a2818',
    minimapFloor: '#682818',
  },
  {
    id: 'ice',
    name: 'Ледяной склеп',
    wall: { base: '#283848', face: '#344858', top: '#446070', accent: '#6690a8', shadow: '#182028' },
    floor: { dark: '#141e28', light: '#1e2a38', spot: '#283848' },
    stairs: '#88ddff',
    fog: '#081018',
    fogEdge: '#142030',
    minimapWall: '#385868',
    minimapFloor: '#486878',
  },
  {
    id: 'abyss',
    name: 'Бездна',
    wall: { base: '#281830', face: '#342040', top: '#442858', accent: '#663888', shadow: '#140818' },
    floor: { dark: '#120818', light: '#1a1028', spot: '#241838' },
    stairs: '#cc66ff',
    fog: '#080010',
    fogEdge: '#180828',
    minimapWall: '#442858',
    minimapFloor: '#543068',
  },
];

export function getDungeonTheme(floor = 1) {
  const index = Math.floor((Math.max(1, floor) - 1) / 2) % DUNGEON_THEMES.length;
  return DUNGEON_THEMES[index];
}

function tileAt(map, x, y) {
  return map[y]?.[x] ?? TILES.VOID;
}

function isOpen(map, x, y) {
  const t = tileAt(map, x, y);
  return t === TILES.FLOOR || t === TILES.STAIRS || t === TILES.DOOR;
}

function wallVariant(x, y) {
  return (((x * 73856093) ^ (y * 19349663)) >>> 0) & 3;
}

function wallDetail(x, y) {
  return (((x * 83492791) ^ (y * 2654435761)) >>> 0) & 7;
}

function floorSpot(x, y) {
  return (((x * 92837111) ^ (y * 689287499)) >>> 0) & 7;
}

export function drawFloorTile(ctx, sx, sy, theme, x, y) {
  const checker = (x + y) % 2 === 0;
  ctx.fillStyle = checker ? theme.floor.dark : theme.floor.light;
  ctx.fillRect(sx, sy, 16, 16);

  const spot = floorSpot(x, y);
  if (spot === 0) {
    ctx.fillStyle = theme.floor.spot;
    ctx.fillRect(sx + 3, sy + 3, 2, 2);
    ctx.fillRect(sx + 11, sy + 11, 2, 2);
  } else if (spot === 1) {
    ctx.fillStyle = theme.floor.spot;
    ctx.fillRect(sx + 7, sy + 7, 2, 2);
  } else if (spot === 2 && theme.id === 'mossy') {
    ctx.fillStyle = '#3a6840';
    ctx.fillRect(sx + 5, sy + 10, 3, 2);
    ctx.fillRect(sx + 10, sy + 4, 2, 2);
  } else if (spot === 2 && theme.id === 'lava') {
    ctx.fillStyle = '#662208';
    ctx.fillRect(sx + 6, sy + 6, 2, 1);
    ctx.fillStyle = '#ff440044';
    ctx.fillRect(sx + 8, sy + 12, 2, 2);
  } else if (spot === 2 && theme.id === 'ice') {
    ctx.fillStyle = '#aaccff44';
    ctx.fillRect(sx + 4, sy + 5, 4, 1);
    ctx.fillRect(sx + 9, sy + 10, 3, 1);
  } else if (spot === 2 && theme.id === 'abyss') {
    ctx.fillStyle = '#5533aa44';
    ctx.fillRect(sx + 5, sy + 8, 2, 2);
    ctx.fillRect(sx + 11, sy + 5, 1, 3);
  }
}

export function drawStairsTile(ctx, sx, sy, theme) {
  ctx.fillStyle = theme.floor.light;
  ctx.fillRect(sx, sy, 16, 16);
  ctx.fillStyle = theme.stairs;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(sx + 2 + i * 3, sy + 10 - i * 2, 2, 2);
  }
  ctx.fillStyle = theme.wall.accent;
  ctx.fillRect(sx + 2, sy + 12, 12, 1);
}

export function drawFogTile(ctx, sx, sy, theme, isWallTile) {
  ctx.fillStyle = theme.fog;
  ctx.fillRect(sx, sy, 16, 16);
  if (isWallTile) {
    ctx.fillStyle = theme.fogEdge;
    ctx.fillRect(sx, sy, 16, 3);
  }
}

function drawStoneBlocks(ctx, sx, sy, theme, variant, detail) {
  const rowOffset = variant % 2 === 0 ? 0 : 3;

  ctx.fillStyle = theme.wall.shadow;
  ctx.fillRect(sx + 1, sy + 5, 14, 1);
  ctx.fillRect(sx + 1, sy + 10, 14, 1);
  ctx.fillRect(sx + 5 + rowOffset, sy + 1, 1, 4);
  ctx.fillRect(sx + 11 - rowOffset, sy + 6, 1, 4);
  ctx.fillRect(sx + 4 + rowOffset, sy + 11, 1, 4);

  ctx.fillStyle = theme.wall.top;
  ctx.fillRect(sx + 2, sy + 1, 5, 1);
  ctx.fillRect(sx + 9, sy + 6, 5, 1);
  ctx.fillRect(sx + 3, sy + 11, 4, 1);

  ctx.fillStyle = theme.wall.accent;
  if (detail & 1) ctx.fillRect(sx + 3, sy + 7, 2, 1);
  if (detail & 2) ctx.fillRect(sx + 10, sy + 12, 3, 1);
  if (detail & 4) ctx.fillRect(sx + 12, sy + 3, 1, 2);
}

function drawWallBevel(ctx, sx, sy, theme) {
  ctx.fillStyle = theme.wall.top;
  ctx.fillRect(sx, sy, 16, 2);
  ctx.fillRect(sx + 1, sy + 2, 14, 1);
  ctx.fillStyle = theme.wall.shadow;
  ctx.fillRect(sx, sy + 14, 16, 2);
  ctx.fillRect(sx, sy, 1, 16);
  ctx.fillRect(sx + 15, sy + 3, 1, 13);
}

function drawWallFace(ctx, sx, sy, theme, variant, detail) {
  ctx.fillStyle = theme.wall.face;
  ctx.fillRect(sx, sy, 16, 16);
  drawStoneBlocks(ctx, sx, sy, theme, variant, detail);
  drawWallBevel(ctx, sx, sy, theme);
  applyThemeWallDeco(ctx, sx, sy, theme, variant);
}

function applyThemeWallDeco(ctx, sx, sy, theme, variant) {
  if (theme.id === 'mossy' && variant !== 2) {
    ctx.fillStyle = '#4a7848';
    ctx.fillRect(sx + 10, sy + 8, 3, 2);
    ctx.fillRect(sx + 4, sy + 12, 2, 2);
  } else if (theme.id === 'lava') {
    ctx.fillStyle = '#ff6622';
    ctx.fillRect(sx + 7 + (variant % 2), sy + 8 + variant, 2, 2);
    ctx.fillStyle = '#ffaa0044';
    ctx.fillRect(sx + 6, sy + 7, 4, 1);
  } else if (theme.id === 'ice') {
    ctx.fillStyle = '#aaccee';
    ctx.fillRect(sx + 9, sy + 6, 2, 4);
    ctx.fillRect(sx + 5, sy + 11, 3, 1);
  } else if (theme.id === 'abyss') {
    ctx.fillStyle = '#8844cc';
    ctx.fillRect(sx + 6, sy + 6, 1, 5);
    ctx.fillRect(sx + 10, sy + 9, 2, 2);
  }
}

function drawWallMass(ctx, sx, sy, theme, variant, detail) {
  ctx.fillStyle = theme.wall.base;
  ctx.fillRect(sx, sy, 16, 16);

  ctx.fillStyle = theme.wall.shadow;
  ctx.fillRect(sx, sy + 15, 16, 1);
  ctx.fillRect(sx, sy, 1, 16);
  ctx.fillRect(sx + 4, sy + 4, 8, 1);
  ctx.fillRect(sx + 2, sy + 10, 12, 1);

  ctx.fillStyle = theme.wall.face;
  if (variant === 0 || variant === 3) {
    ctx.fillRect(sx + 2, sy + 2, 5, 3);
    ctx.fillRect(sx + 9, sy + 3, 5, 3);
    ctx.fillRect(sx + 3, sy + 8, 4, 3);
    ctx.fillRect(sx + 10, sy + 11, 4, 3);
  } else {
    ctx.fillRect(sx + 3, sy + 2, 10, 3);
    ctx.fillRect(sx + 2, sy + 7, 5, 3);
    ctx.fillRect(sx + 9, sy + 8, 5, 3);
    ctx.fillRect(sx + 4, sy + 12, 8, 2);
  }

  ctx.fillStyle = theme.wall.top;
  ctx.fillRect(sx, sy, 16, 2);
  if (detail & 1) ctx.fillRect(sx + 4, sy + 6, 3, 1);
  if (detail & 2) ctx.fillRect(sx + 11, sy + 1, 2, 1);
  if (detail & 4) ctx.fillRect(sx + 7, sy + 13, 3, 1);

  applyThemeWallDeco(ctx, sx, sy, theme, variant);
}

function drawWallCorner(ctx, sx, sy, theme, corner, variant, detail) {
  ctx.fillStyle = theme.wall.base;
  ctx.fillRect(sx, sy, 16, 16);
  ctx.fillStyle = theme.wall.face;
  if (corner === 'ne') {
    ctx.fillRect(sx, sy, 12, 16);
    ctx.fillRect(sx, sy, 16, 12);
  } else if (corner === 'nw') {
    ctx.fillRect(sx + 4, sy, 12, 16);
    ctx.fillRect(sx, sy, 16, 12);
  } else if (corner === 'se') {
    ctx.fillRect(sx, sy, 12, 16);
    ctx.fillRect(sx, sy + 4, 16, 12);
  } else {
    ctx.fillRect(sx + 4, sy, 12, 16);
    ctx.fillRect(sx, sy + 4, 16, 12);
  }
  drawStoneBlocks(ctx, sx, sy, theme, variant, detail);
  drawWallBevel(ctx, sx, sy, theme);

  ctx.fillStyle = theme.wall.shadow;
  if (corner === 'ne') {
    ctx.fillRect(sx + 12, sy + 12, 4, 4);
  } else if (corner === 'nw') {
    ctx.fillRect(sx, sy + 12, 4, 4);
  } else if (corner === 'se') {
    ctx.fillRect(sx + 12, sy, 4, 4);
  } else {
    ctx.fillRect(sx, sy, 4, 4);
  }

  applyThemeWallDeco(ctx, sx, sy, theme, variant);
}

export function drawWallTile(ctx, sx, sy, map, x, y, theme) {
  const openN = isOpen(map, x, y - 1);
  const openS = isOpen(map, x, y + 1);
  const openE = isOpen(map, x + 1, y);
  const openW = isOpen(map, x - 1, y);
  const openCount = [openN, openS, openE, openW].filter(Boolean).length;
  const variant = wallVariant(x, y);
  const detail = wallDetail(x, y);

  if (openCount === 0) {
    drawWallMass(ctx, sx, sy, theme, variant, detail);
    return;
  }

  if (openS && openE && !openN && !openW) {
    drawWallCorner(ctx, sx, sy, theme, 'ne', variant, detail);
    return;
  }
  if (openS && openW && !openN && !openE) {
    drawWallCorner(ctx, sx, sy, theme, 'nw', variant, detail);
    return;
  }
  if (openN && openE && !openS && !openW) {
    drawWallCorner(ctx, sx, sy, theme, 'se', variant, detail);
    return;
  }
  if (openN && openW && !openS && !openE) {
    drawWallCorner(ctx, sx, sy, theme, 'sw', variant, detail);
    return;
  }

  drawWallFace(ctx, sx, sy, theme, variant, detail);

  if (openN) {
    ctx.fillStyle = theme.wall.shadow;
    ctx.fillRect(sx, sy + 12, 16, 4);
  }
  if (openW) {
    ctx.fillStyle = theme.wall.shadow;
    ctx.fillRect(sx + 12, sy, 4, 16);
  }
}
