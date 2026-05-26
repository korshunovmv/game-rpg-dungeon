const SKIN = '#ffccaa';
const OUTLINE = '#ffffff';
const EYE = '#223366';

function px(ctx, sx, sy, x, y, w, h, color, bounce = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(sx + x, sy + y + bounce, w, h);
}

function drawEyes(ctx, sx, sy, facing, bounce) {
  if (facing === 'up') {
    px(ctx, sx, sy, 5, 4, 2, 2, EYE, bounce);
    px(ctx, sx, sy, 9, 4, 2, 2, EYE, bounce);
  } else if (facing === 'down') {
    px(ctx, sx, sy, 5, 6, 2, 2, EYE, bounce);
    px(ctx, sx, sy, 9, 6, 2, 2, EYE, bounce);
  } else if (facing === 'left') {
    px(ctx, sx, sy, 4, 6, 2, 2, EYE, bounce);
  } else {
    px(ctx, sx, sy, 10, 6, 2, 2, EYE, bounce);
  }
}

function drawWarrior(ctx, sx, sy, facing, bounce) {
  px(ctx, sx, sy, 2, 2, 12, 13, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 3, 10, 11, '#992222', bounce);
  px(ctx, sx, sy, 4, 3, 8, 3, '#cc4444', bounce);
  px(ctx, sx, sy, 5, 5, 6, 5, SKIN, bounce);
  px(ctx, sx, sy, 4, 2, 8, 2, '#888888', bounce);
  px(ctx, sx, sy, 2, 7, 2, 6, '#666666', bounce);
  px(ctx, sx, sy, 3, 8, 1, 4, '#aaaaaa', bounce);

  if (facing === 'right') {
    px(ctx, sx, sy, 11, 5, 2, 8, '#cccccc', bounce);
    px(ctx, sx, sy, 12, 4, 1, 2, '#ffffaa', bounce);
  } else if (facing === 'left') {
    px(ctx, sx, sy, 3, 5, 2, 8, '#cccccc', bounce);
  } else {
    px(ctx, sx, sy, 10, 6, 2, 7, '#cccccc', bounce);
  }

  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawArcher(ctx, sx, sy, facing, bounce) {
  px(ctx, sx, sy, 2, 2, 12, 13, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 4, 10, 10, '#226622', bounce);
  px(ctx, sx, sy, 4, 3, 8, 3, '#44aa44', bounce);
  px(ctx, sx, sy, 5, 5, 6, 5, SKIN, bounce);
  px(ctx, sx, sy, 5, 3, 6, 2, '#335533', bounce);

  if (facing === 'left') {
    px(ctx, sx, sy, 1, 6, 2, 6, '#885522', bounce);
    px(ctx, sx, sy, 0, 5, 1, 8, '#cccccc', bounce);
    px(ctx, sx, sy, 0, 5, 1, 1, '#ffffaa', bounce);
  } else if (facing === 'right') {
    px(ctx, sx, sy, 13, 6, 2, 6, '#885522', bounce);
    px(ctx, sx, sy, 15, 5, 1, 8, '#cccccc', bounce);
    px(ctx, sx, sy, 15, 5, 1, 1, '#ffffaa', bounce);
  } else if (facing === 'up') {
    px(ctx, sx, sy, 1, 4, 2, 5, '#885522', bounce);
    px(ctx, sx, sy, 13, 4, 2, 5, '#885522', bounce);
  } else {
    px(ctx, sx, sy, 1, 8, 2, 5, '#885522', bounce);
    px(ctx, sx, sy, 13, 8, 2, 5, '#885522', bounce);
  }

  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawMage(ctx, sx, sy, facing, bounce) {
  px(ctx, sx, sy, 2, 2, 12, 13, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 5, 10, 9, '#5522aa', bounce);
  px(ctx, sx, sy, 4, 2, 8, 4, '#8844ff', bounce);
  px(ctx, sx, sy, 3, 1, 10, 2, '#8844ff', bounce);
  px(ctx, sx, sy, 6, 0, 4, 2, '#aa66ff', bounce);
  px(ctx, sx, sy, 5, 6, 6, 5, SKIN, bounce);
  px(ctx, sx, sy, 4, 4, 8, 2, '#6633bb', bounce);

  if (facing === 'left') {
    px(ctx, sx, sy, 1, 3, 2, 10, '#664422', bounce);
    px(ctx, sx, sy, 0, 2, 2, 3, '#44ffff', bounce);
  } else {
    px(ctx, sx, sy, 13, 3, 2, 10, '#664422', bounce);
    px(ctx, sx, sy, 14, 2, 2, 3, '#44ffff', bounce);
  }

  px(ctx, sx, sy, 6, 12, 4, 2, '#aa66ff', bounce);
  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawThief(ctx, sx, sy, facing, bounce) {
  px(ctx, sx, sy, 2, 2, 12, 13, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 4, 10, 10, '#444422', bounce);
  px(ctx, sx, sy, 4, 3, 8, 3, '#222211', bounce);
  px(ctx, sx, sy, 5, 5, 6, 4, SKIN, bounce);
  px(ctx, sx, sy, 4, 4, 8, 2, '#111108', bounce);
  px(ctx, sx, sy, 6, 5, 4, 1, '#111108', bounce);

  if (facing === 'left') {
    px(ctx, sx, sy, 2, 9, 3, 1, '#cccccc', bounce);
    px(ctx, sx, sy, 1, 8, 2, 2, '#ffffaa', bounce);
  } else if (facing === 'right') {
    px(ctx, sx, sy, 11, 9, 3, 1, '#cccccc', bounce);
    px(ctx, sx, sy, 13, 8, 2, 2, '#ffffaa', bounce);
  } else {
    px(ctx, sx, sy, 10, 9, 3, 1, '#cccccc', bounce);
  }

  px(ctx, sx, sy, 11, 4, 2, 2, '#ffd700', bounce);
  drawEyes(ctx, sx, sy, facing, bounce);
}

function drawNecromancer(ctx, sx, sy, facing, bounce) {
  px(ctx, sx, sy, 2, 2, 12, 13, OUTLINE, bounce);
  px(ctx, sx, sy, 3, 4, 10, 10, '#1a331a', bounce);
  px(ctx, sx, sy, 4, 2, 8, 3, '#223322', bounce);
  px(ctx, sx, sy, 5, 5, 6, 4, '#aaccaa', bounce);
  px(ctx, sx, sy, 4, 4, 8, 2, '#111811', bounce);
  px(ctx, sx, sy, 5, 4, 2, 2, '#88ff44', bounce);
  px(ctx, sx, sy, 9, 4, 2, 2, '#88ff44', bounce);

  if (facing === 'left') {
    px(ctx, sx, sy, 1, 4, 2, 10, '#333322', bounce);
    px(ctx, sx, sy, 0, 3, 2, 3, '#88ff44', bounce);
  } else {
    px(ctx, sx, sy, 13, 4, 2, 10, '#333322', bounce);
    px(ctx, sx, sy, 14, 3, 2, 3, '#88ff44', bounce);
  }

  px(ctx, sx, sy, 4, 11, 2, 3, '#ccccaa', bounce);
  px(ctx, sx, sy, 10, 11, 2, 3, '#ccccaa', bounce);
  px(ctx, sx, sy, 6, 12, 4, 2, '#44aa44', bounce);
}

const DRAWERS = {
  warrior: drawWarrior,
  archer: drawArcher,
  mage: drawMage,
  thief: drawThief,
  necromancer: drawNecromancer,
};

export function drawHeroSprite(ctx, sx, sy, profession, facing = 'down', bounce = 0) {
  const draw = DRAWERS[profession] ?? DRAWERS.warrior;
  draw(ctx, sx, sy, facing, bounce);
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
