export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function inBounds(x, y, w, h) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export function key(x, y) {
  return `${x},${y}`;
}
