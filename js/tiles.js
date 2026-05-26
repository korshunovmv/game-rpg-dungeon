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

function drawWallFace(ctx, sx, sy, theme, variant) {
  ctx.fillStyle = theme.wall.face;
  ctx.fillRect(sx, sy, 16, 16);
  ctx.fillStyle = theme.wall.top;
  ctx.fillRect(sx, sy, 16, 4);
  ctx.fillStyle = theme.wall.shadow;
  ctx.fillRect(sx, sy + 14, 16, 2);
  ctx.fillRect(sx, sy, 2, 16);

  switch (variant) {
    case 0:
      ctx.fillStyle = theme.wall.accent;
      for (let row = 0; row < 3; row++) {
        const offset = row % 2 === 0 ? 0 : 3;
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(sx + 2 + offset + col * 5, sy + 5 + row * 4, 4, 3);
        }
      }
      break;
    case 1:
      ctx.fillStyle = theme.wall.accent;
      ctx.fillRect(sx + 4, sy + 6, 8, 1);
      ctx.fillRect(sx + 3, sy + 10, 10, 1);
      ctx.fillRect(sx + 6, sy + 4, 1, 8);
      break;
    case 2:
      ctx.fillStyle = theme.wall.accent;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(sx + 2 + (i % 3) * 4, sy + 4 + i * 2, 2, 2);
      }
      break;
    default:
      ctx.fillStyle = theme.wall.top;
      ctx.fillRect(sx + 3, sy + 5, 10, 2);
      ctx.fillRect(sx + 3, sy + 9, 10, 2);
      ctx.fillStyle = theme.wall.shadow;
      ctx.fillRect(sx + 3, sy + 7, 10, 1);
      ctx.fillRect(sx + 3, sy + 11, 10, 1);
  }

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

function drawWallMass(ctx, sx, sy, theme, variant) {
  ctx.fillStyle = theme.wall.base;
  ctx.fillRect(sx, sy, 16, 16);

  switch (variant) {
    case 0:
      ctx.fillStyle = theme.wall.shadow;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if ((row + col) % 2 === 0) ctx.fillRect(sx + col * 4, sy + row * 4, 4, 4);
        }
      }
      ctx.fillStyle = theme.wall.top;
      ctx.fillRect(sx, sy, 16, 2);
      break;
    case 1:
      ctx.fillStyle = theme.wall.top;
      ctx.fillRect(sx, sy, 16, 3);
      ctx.fillStyle = theme.wall.accent;
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(sx + 1, sy + 4 + i * 3, 14, 1);
      }
      break;
    case 2:
      ctx.fillStyle = theme.wall.face;
      ctx.fillRect(sx + 2, sy + 2, 12, 12);
      ctx.fillStyle = theme.wall.shadow;
      ctx.fillRect(sx + 4, sy + 5, 8, 1);
      ctx.fillRect(sx + 5, sy + 9, 6, 1);
      break;
    default:
      ctx.fillStyle = theme.wall.accent;
      ctx.fillRect(sx + 3, sy + 3, 4, 4);
      ctx.fillRect(sx + 9, sy + 3, 4, 4);
      ctx.fillRect(sx + 3, sy + 9, 4, 4);
      ctx.fillRect(sx + 9, sy + 9, 4, 4);
      ctx.fillStyle = theme.wall.top;
      ctx.fillRect(sx, sy, 16, 2);
  }

  applyThemeWallDeco(ctx, sx, sy, theme, variant);
}

function drawWallCorner(ctx, sx, sy, theme, corner) {
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
  ctx.fillStyle = theme.wall.top;
  ctx.fillRect(sx, sy, 16, 3);
  ctx.fillStyle = theme.wall.shadow;
  ctx.fillRect(sx, sy + 13, 16, 3);
}

export function drawWallTile(ctx, sx, sy, map, x, y, theme) {
  const openN = isOpen(map, x, y - 1);
  const openS = isOpen(map, x, y + 1);
  const openE = isOpen(map, x + 1, y);
  const openW = isOpen(map, x - 1, y);
  const openCount = [openN, openS, openE, openW].filter(Boolean).length;
  const variant = wallVariant(x, y);

  if (openCount === 0) {
    drawWallMass(ctx, sx, sy, theme, variant);
    return;
  }

  if (openS && openE && !openN && !openW) {
    drawWallCorner(ctx, sx, sy, theme, 'ne');
    return;
  }
  if (openS && openW && !openN && !openE) {
    drawWallCorner(ctx, sx, sy, theme, 'nw');
    return;
  }
  if (openN && openE && !openS && !openW) {
    drawWallCorner(ctx, sx, sy, theme, 'se');
    return;
  }
  if (openN && openW && !openS && !openE) {
    drawWallCorner(ctx, sx, sy, theme, 'sw');
    return;
  }

  drawWallFace(ctx, sx, sy, theme, variant);

  if (openN) {
    ctx.fillStyle = theme.wall.shadow;
    ctx.fillRect(sx, sy + 12, 16, 4);
  }
  if (openW) {
    ctx.fillStyle = theme.wall.shadow;
    ctx.fillRect(sx + 12, sy, 4, 16);
  }
}
