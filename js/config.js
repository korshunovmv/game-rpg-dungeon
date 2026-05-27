export const TILE = 16;
export const MAP_W = 40;
export const MAP_H = 30;
export const CANVAS_W = 640;
export const CANVAS_H = 480;

export const TILES = {
  VOID: 0,
  WALL: 1,
  FLOOR: 2,
  DOOR: 3,
  STAIRS: 4,
};

export const COLORS = {
  void: '#000000',
  wall: '#2a2a4a',
  wallTop: '#3d3d6b',
  floor: '#1a1a2e',
  floorLit: '#2a2a4a',
  door: '#8b6914',
  stairs: '#44ff88',
  hero: '#4488ff',
  heroOutline: '#ffffff',
  monster: '#ff4466',
  gold: '#ffd700',
  potion: '#44ff88',
  fog: '#0a0a14',
  fogEdge: '#151525',
  particle: '#ffaa00',
};

export const GAME_SPEED = {
  normal: 450,
  fast: 200,
};

export const MONSTER_VISION = 5;
export const MONSTER_WANDER_CHANCE = 0.4;
