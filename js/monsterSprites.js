const OUTLINE = '#1a1a2e';
const EYE = '#ff2244';

function mpx(ctx, sx, sy, x, y, w, h, color, bob = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(sx + x, sy + y + bob, w, h);
}

function drawMonsterHpBar(ctx, sx, sy, hpPct, color = '#ff0044') {
  ctx.fillStyle = '#330000';
  ctx.fillRect(sx + 2, sy + 1, 12, 2);
  ctx.fillStyle = color;
  ctx.fillRect(sx + 2, sy + 1, Math.max(0, 12 * hpPct), 2);
}

function drawLegendaryCrown(ctx, sx, sy, bob) {
  mpx(ctx, sx, sy, 4, 1, 8, 2, '#ffcc44', bob);
  mpx(ctx, sx, sy, 5, 0, 2, 2, '#ffee88', bob);
  mpx(ctx, sx, sy, 9, 0, 2, 2, '#ffee88', bob);
}

function drawGoblin(ctx, sx, sy, color, bob) {
  const body = color ?? '#44aa44';
  mpx(ctx, sx, sy, 3, 4, 10, 9, OUTLINE, bob);
  mpx(ctx, sx, sy, 4, 5, 8, 7, body, bob);
  mpx(ctx, sx, sy, 5, 3, 6, 3, body, bob);
  mpx(ctx, sx, sy, 3, 6, 2, 3, '#338833', bob);
  mpx(ctx, sx, sy, 11, 6, 2, 3, '#338833', bob);
  mpx(ctx, sx, sy, 6, 2, 4, 2, '#338833', bob);
  mpx(ctx, sx, sy, 4, 4, 2, 3, '#ff8866', bob);
  mpx(ctx, sx, sy, 10, 4, 2, 3, '#ff8866', bob);
  mpx(ctx, sx, sy, 5, 6, 2, 2, EYE, bob);
  mpx(ctx, sx, sy, 9, 6, 2, 2, EYE, bob);
  mpx(ctx, sx, sy, 6, 9, 4, 1, '#226622', bob);
  mpx(ctx, sx, sy, 4, 12, 3, 2, '#553322', bob);
  mpx(ctx, sx, sy, 9, 12, 3, 2, '#553322', bob);
}

function drawSkeleton(ctx, sx, sy, bob) {
  mpx(ctx, sx, sy, 4, 3, 8, 10, OUTLINE, bob);
  mpx(ctx, sx, sy, 5, 4, 6, 8, '#ddddcc', bob);
  mpx(ctx, sx, sy, 5, 2, 6, 3, '#eeeeee', bob);
  mpx(ctx, sx, sy, 4, 5, 2, 5, '#ccccbb', bob);
  mpx(ctx, sx, sy, 10, 5, 2, 5, '#ccccbb', bob);
  mpx(ctx, sx, sy, 5, 5, 2, 2, '#111122', bob);
  mpx(ctx, sx, sy, 9, 5, 2, 2, '#111122', bob);
  mpx(ctx, sx, sy, 6, 6, 4, 1, '#111122', bob);
  mpx(ctx, sx, sy, 6, 8, 4, 2, '#bbbbaa', bob);
  mpx(ctx, sx, sy, 4, 11, 2, 3, '#ccccbb', bob);
  mpx(ctx, sx, sy, 10, 11, 2, 3, '#ccccbb', bob);
  mpx(ctx, sx, sy, 11, 6, 2, 6, '#aaaa99', bob);
  mpx(ctx, sx, sy, 12, 4, 1, 2, '#cccccc', bob);
}

function drawSlime(ctx, sx, sy, color, bob) {
  const body = color ?? '#66cc88';
  mpx(ctx, sx, sy, 3, 7, 10, 6, OUTLINE, bob);
  mpx(ctx, sx, sy, 4, 5, 8, 8, body, bob);
  mpx(ctx, sx, sy, 5, 4, 6, 2, '#88eeaa', bob);
  mpx(ctx, sx, sy, 6, 6, 4, 4, '#55bb77', bob);
  mpx(ctx, sx, sy, 5, 7, 2, 2, '#aaffcc', bob);
  mpx(ctx, sx, sy, 9, 8, 2, 2, '#aaffcc', bob);
  mpx(ctx, sx, sy, 6, 8, 1, 1, '#224433', bob);
  mpx(ctx, sx, sy, 9, 9, 1, 1, '#224433', bob);
  mpx(ctx, sx, sy, 2, 11, 3, 2, body, bob);
  mpx(ctx, sx, sy, 11, 11, 3, 2, body, bob);
}

function drawRatling(ctx, sx, sy, color, bob) {
  const fur = color ?? '#aa8866';
  mpx(ctx, sx, sy, 4, 6, 8, 7, OUTLINE, bob);
  mpx(ctx, sx, sy, 5, 7, 6, 5, fur, bob);
  mpx(ctx, sx, sy, 6, 4, 4, 4, fur, bob);
  mpx(ctx, sx, sy, 3, 3, 2, 3, '#886644', bob);
  mpx(ctx, sx, sy, 11, 3, 2, 3, '#886644', bob);
  mpx(ctx, sx, sy, 7, 3, 2, 2, '#ffaaaa', bob);
  mpx(ctx, sx, sy, 6, 7, 1, 1, '#221100', bob);
  mpx(ctx, sx, sy, 9, 7, 1, 1, '#221100', bob);
  mpx(ctx, sx, sy, 7, 9, 2, 1, '#ff6688', bob);
  mpx(ctx, sx, sy, 3, 12, 2, 2, '#665544', bob);
  mpx(ctx, sx, sy, 11, 12, 2, 2, '#665544', bob);
  mpx(ctx, sx, sy, 12, 8, 2, 1, fur, bob);
}

function drawGhost(ctx, sx, sy, color, bob) {
  const body = color ?? '#aaaaff';
  mpx(ctx, sx, sy, 4, 4, 8, 9, OUTLINE, bob);
  mpx(ctx, sx, sy, 5, 5, 6, 7, body, bob);
  mpx(ctx, sx, sy, 4, 5, 2, 6, '#8888dd', bob);
  mpx(ctx, sx, sy, 10, 5, 2, 6, '#8888dd', bob);
  mpx(ctx, sx, sy, 5, 3, 6, 3, '#ccccff', bob);
  mpx(ctx, sx, sy, 6, 6, 2, 2, '#223366', bob);
  mpx(ctx, sx, sy, 9, 6, 2, 2, '#223366', bob);
  mpx(ctx, sx, sy, 5, 11, 2, 2, body, bob);
  mpx(ctx, sx, sy, 7, 12, 2, 2, body, bob);
  mpx(ctx, sx, sy, 9, 11, 2, 2, body, bob);
  mpx(ctx, sx, sy, 6, 4, 4, 1, '#ddeeff', bob);
}

function drawOrc(ctx, sx, sy, color, bob) {
  const body = color ?? '#cc5544';
  mpx(ctx, sx, sy, 2, 3, 12, 11, OUTLINE, bob);
  mpx(ctx, sx, sy, 3, 4, 10, 9, body, bob);
  mpx(ctx, sx, sy, 4, 2, 8, 3, '#884433', bob);
  mpx(ctx, sx, sy, 2, 6, 2, 5, '#aa4433', bob);
  mpx(ctx, sx, sy, 12, 6, 2, 5, '#aa4433', bob);
  mpx(ctx, sx, sy, 5, 5, 2, 2, '#ffff44', bob);
  mpx(ctx, sx, sy, 9, 5, 2, 2, '#ffff44', bob);
  mpx(ctx, sx, sy, 5, 8, 6, 2, '#ffccaa', bob);
  mpx(ctx, sx, sy, 6, 9, 1, 2, '#ffeecc', bob);
  mpx(ctx, sx, sy, 9, 9, 1, 2, '#ffeecc', bob);
  mpx(ctx, sx, sy, 4, 12, 3, 2, '#553322', bob);
  mpx(ctx, sx, sy, 9, 12, 3, 2, '#553322', bob);
  mpx(ctx, sx, sy, 11, 5, 2, 7, '#888888', bob);
  mpx(ctx, sx, sy, 12, 4, 1, 3, '#aaaaaa', bob);
}

function drawArcher(ctx, sx, sy, color, bob) {
  const cloth = color ?? '#88aa44';
  mpx(ctx, sx, sy, 3, 4, 10, 10, OUTLINE, bob);
  mpx(ctx, sx, sy, 4, 5, 8, 8, cloth, bob);
  mpx(ctx, sx, sy, 5, 3, 6, 3, '#667733', bob);
  mpx(ctx, sx, sy, 5, 6, 2, 2, '#223344', bob);
  mpx(ctx, sx, sy, 9, 6, 2, 2, '#223344', bob);
  mpx(ctx, sx, sy, 4, 11, 3, 2, '#553311', bob);
  mpx(ctx, sx, sy, 9, 11, 3, 2, '#553311', bob);
  mpx(ctx, sx, sy, 12, 5, 2, 7, '#885522', bob);
  mpx(ctx, sx, sy, 13, 4, 1, 9, '#cccccc', bob);
  mpx(ctx, sx, sy, 13, 4, 1, 1, '#ffffaa', bob);
}

function drawShaman(ctx, sx, sy, color, bob) {
  const robe = color ?? '#66aa66';
  mpx(ctx, sx, sy, 3, 4, 10, 10, OUTLINE, bob);
  mpx(ctx, sx, sy, 4, 5, 8, 8, robe, bob);
  mpx(ctx, sx, sy, 4, 2, 8, 3, '#448844', bob);
  mpx(ctx, sx, sy, 3, 3, 2, 2, '#ffcc44', bob);
  mpx(ctx, sx, sy, 11, 3, 2, 2, '#ffcc44', bob);
  mpx(ctx, sx, sy, 5, 6, 2, 2, '#88ff44', bob);
  mpx(ctx, sx, sy, 9, 6, 2, 2, '#88ff44', bob);
  mpx(ctx, sx, sy, 6, 9, 4, 1, '#335533', bob);
  mpx(ctx, sx, sy, 1, 3, 2, 10, '#664422', bob);
  mpx(ctx, sx, sy, 0, 2, 2, 3, '#88ff88', bob);
  mpx(ctx, sx, sy, 0, 2, 1, 1, '#ccffcc', bob);
  mpx(ctx, sx, sy, 6, 12, 4, 2, '#448844', bob);
}

function drawMimicSprite(ctx, sx, sy, bob) {
  mpx(ctx, sx, sy, 2, 8, 12, 6, '#553311', bob);
  mpx(ctx, sx, sy, 3, 6, 10, 4, '#775533', bob);
  mpx(ctx, sx, sy, 4, 4, 8, 8, '#cc6644', bob);
  mpx(ctx, sx, sy, 3, 3, 10, 2, '#886644', bob);
  mpx(ctx, sx, sy, 5, 7, 6, 3, '#ff8866', bob);
  mpx(ctx, sx, sy, 5, 5, 2, 2, '#ffffff', bob);
  mpx(ctx, sx, sy, 9, 5, 2, 2, '#ffffff', bob);
  mpx(ctx, sx, sy, 5, 6, 2, 1, '#220000', bob);
  mpx(ctx, sx, sy, 9, 6, 2, 1, '#220000', bob);
  mpx(ctx, sx, sy, 6, 9, 4, 1, '#ffcc44', bob);
  mpx(ctx, sx, sy, 4, 10, 2, 2, '#aa5533', bob);
  mpx(ctx, sx, sy, 10, 10, 2, 2, '#aa5533', bob);
}

function drawBossGoblinKing(ctx, sx, sy, color, bob) {
  drawGoblin(ctx, sx, sy, color, bob);
  mpx(ctx, sx, sy, 4, 0, 8, 2, '#ffd700', bob);
  mpx(ctx, sx, sy, 5, 0, 2, 1, '#ffee88', bob);
  mpx(ctx, sx, sy, 9, 0, 2, 1, '#ffee88', bob);
  mpx(ctx, sx, sy, 1, 5, 2, 6, '#888888', bob);
  mpx(ctx, sx, sy, 13, 5, 2, 6, '#888888', bob);
}

function drawBossLich(ctx, sx, sy, color, bob) {
  mpx(ctx, sx, sy, 2, 2, 12, 12, OUTLINE, bob);
  mpx(ctx, sx, sy, 3, 3, 10, 10, color ?? '#aa44ff', bob);
  mpx(ctx, sx, sy, 4, 1, 8, 3, '#6622aa', bob);
  mpx(ctx, sx, sy, 4, 4, 2, 3, '#111122', bob);
  mpx(ctx, sx, sy, 10, 4, 2, 3, '#111122', bob);
  mpx(ctx, sx, sy, 5, 5, 2, 2, '#88ff44', bob);
  mpx(ctx, sx, sy, 9, 5, 2, 2, '#88ff44', bob);
  mpx(ctx, sx, sy, 5, 9, 6, 2, '#ddddcc', bob);
  mpx(ctx, sx, sy, 1, 4, 2, 10, '#553388', bob);
  mpx(ctx, sx, sy, 0, 3, 2, 3, '#cc88ff', bob);
  mpx(ctx, sx, sy, 13, 4, 2, 10, '#553388', bob);
  mpx(ctx, sx, sy, 14, 3, 2, 3, '#cc88ff', bob);
}

function drawBossDragon(ctx, sx, sy, color, bob) {
  const body = color ?? '#ff6600';
  mpx(ctx, sx, sy, 1, 3, 14, 11, OUTLINE, bob);
  mpx(ctx, sx, sy, 2, 4, 12, 9, body, bob);
  mpx(ctx, sx, sy, 3, 2, 10, 3, '#cc4400', bob);
  mpx(ctx, sx, sy, 1, 5, 3, 3, '#ff8844', bob);
  mpx(ctx, sx, sy, 12, 5, 3, 3, '#ff8844', bob);
  mpx(ctx, sx, sy, 4, 5, 3, 3, '#ffff44', bob);
  mpx(ctx, sx, sy, 9, 5, 3, 3, '#ffff44', bob);
  mpx(ctx, sx, sy, 5, 9, 6, 2, '#ffccaa', bob);
  mpx(ctx, sx, sy, 2, 10, 4, 3, body, bob);
  mpx(ctx, sx, sy, 10, 10, 4, 3, body, bob);
  mpx(ctx, sx, sy, 6, 0, 4, 2, '#cc4400', bob);
}

function drawBossOrcLord(ctx, sx, sy, color, bob) {
  drawOrc(ctx, sx, sy, color, bob);
  mpx(ctx, sx, sy, 3, 0, 10, 2, '#888899', bob);
  mpx(ctx, sx, sy, 4, 0, 2, 2, '#ccccee', bob);
  mpx(ctx, sx, sy, 10, 0, 2, 2, '#ccccee', bob);
  mpx(ctx, sx, sy, 0, 4, 2, 8, '#666677', bob);
  mpx(ctx, sx, sy, 14, 4, 2, 8, '#666677', bob);
}

function drawBossSpider(ctx, sx, sy, color, bob) {
  const body = color ?? '#cc44aa';
  mpx(ctx, sx, sy, 5, 5, 6, 6, OUTLINE, bob);
  mpx(ctx, sx, sy, 6, 6, 4, 4, body, bob);
  mpx(ctx, sx, sy, 6, 4, 4, 3, '#aa3388', bob);
  mpx(ctx, sx, sy, 6, 7, 1, 1, '#ff2244', bob);
  mpx(ctx, sx, sy, 9, 7, 1, 1, '#ff2244', bob);
  mpx(ctx, sx, sy, 7, 8, 2, 1, '#ff6688', bob);
  for (const [x, y, w] of [[2, 8, 4], [10, 8, 4], [1, 10, 5], [11, 10, 5], [3, 12, 3], [10, 12, 3]]) {
    mpx(ctx, sx, sy, x, y, w, 1, '#884466', bob);
  }
}

function drawBossGolem(ctx, sx, sy, color, bob) {
  const body = color ?? '#888899';
  mpx(ctx, sx, sy, 2, 2, 12, 12, OUTLINE, bob);
  mpx(ctx, sx, sy, 3, 3, 10, 10, body, bob);
  mpx(ctx, sx, sy, 4, 2, 8, 2, '#aaaacc', bob);
  mpx(ctx, sx, sy, 3, 5, 2, 6, '#666677', bob);
  mpx(ctx, sx, sy, 11, 5, 2, 6, '#666677', bob);
  mpx(ctx, sx, sy, 5, 5, 2, 2, '#44ffff', bob);
  mpx(ctx, sx, sy, 9, 5, 2, 2, '#44ffff', bob);
  mpx(ctx, sx, sy, 5, 9, 6, 2, '#555566', bob);
  mpx(ctx, sx, sy, 4, 12, 3, 2, '#444455', bob);
  mpx(ctx, sx, sy, 9, 12, 3, 2, '#444455', bob);
}

const MONSTER_DRAWERS = {
  goblin: drawGoblin,
  skeleton: drawSkeleton,
  slime: drawSlime,
  ratling: drawRatling,
  ghost: drawGhost,
  orc: drawOrc,
  archer: drawArcher,
  shaman: drawShaman,
  mimic: drawMimicSprite,
};

const BOSS_DRAWERS = {
  goblin_king: drawBossGoblinKing,
  lich: drawBossLich,
  dragon: drawBossDragon,
  orc_lord: drawBossOrcLord,
  spider: drawBossSpider,
  golem: drawBossGolem,
};

export function resolveMonsterSpriteId(monster) {
  const base = (monster.baseName ?? monster.name ?? '').toLowerCase();

  if (monster.isMimic || base.includes('мимик')) return 'mimic';
  if (base.includes('гоблин')) return 'goblin';
  if (base.includes('скелет')) return 'skeleton';
  if (base.includes('слиз')) return 'slime';
  if (base.includes('крыс')) return 'ratling';
  if (base.includes('призрак')) return 'ghost';
  if (base.includes('орк')) return 'orc';
  if (base.includes('лучник')) return 'archer';
  if (base.includes('шаман')) return 'shaman';

  return 'goblin';
}

function resolveBossSpriteId(monster) {
  const name = (monster.name ?? '').toLowerCase();
  if (name.includes('гоблин')) return 'goblin_king';
  if (name.includes('lich') || name.includes('архив')) return 'lich';
  if (name.includes('дракон')) return 'dragon';
  if (name.includes('орк')) return 'orc_lord';
  if (name.includes('паук')) return 'spider';
  if (name.includes('страж')) return 'golem';
  return 'golem';
}

export function drawMonsterSprite(ctx, sx, sy, monster, bob = 0) {
  const hpPct = monster.hp / monster.maxHp;

  if (monster.isBoss) {
    const bossId = resolveBossSpriteId(monster);
    const draw = BOSS_DRAWERS[bossId] ?? drawBossGolem;
    draw(ctx, sx, sy, monster.color, bob);
    drawMonsterHpBar(ctx, sx, sy, hpPct, monster.color ?? '#ff0044');
    return;
  }

  if (monster.isMimic) {
    drawMimicSprite(ctx, sx, sy, bob);
    drawMonsterHpBar(ctx, sx, sy, hpPct, '#ff6644');
    return;
  }

  const spriteId = resolveMonsterSpriteId(monster);
  const draw = MONSTER_DRAWERS[spriteId] ?? drawGoblin;
  draw(ctx, sx, sy, monster.color, bob);

  if (monster.isLegendary) {
    drawLegendaryCrown(ctx, sx, sy, bob);
  }
}
