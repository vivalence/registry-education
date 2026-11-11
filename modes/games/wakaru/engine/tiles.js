// the ground every map is drawn in: one character per tile in an authored row, and what it lets the
// learner do. walk = the learner may stand on it; wild = spirits rise and roam there; fish = a rod
// casts into it. a door, a cave mouth and a stair are walkable floor: they lead somewhere only where
// the map's portals list says so.
export const TILES = {
  ".": { kind: "grass", walk: true },
  ",": { kind: "flowers", walk: true },
  v: { kind: "tallgrass", walk: true, wild: true },
  ":": { kind: "path", walk: true },
  ";": { kind: "dirt", walk: true },
  "+": { kind: "plaza", walk: true },
  s: { kind: "sand", walk: true },
  "=": { kind: "bridge", walk: true },
  _: { kind: "floor", walk: true },
  u: { kind: "rug", walk: true },
  c: { kind: "cave", walk: true },
  D: { kind: "door", walk: true },
  O: { kind: "mouth", walk: true },
  "<": { kind: "upstairs", walk: true },
  ">": { kind: "downstairs", walk: true },
  "~": { kind: "water", walk: false, fish: true },
  T: { kind: "tree", walk: false },
  P: { kind: "pine", walk: false },
  h: { kind: "hedge", walk: false },
  M: { kind: "cliff", walk: false },
  o: { kind: "rock", walk: false },
  f: { kind: "fence", walk: false },
  R: { kind: "roof", walk: false },
  H: { kind: "wall", walk: false },
  W: { kind: "window", walk: false },
  S: { kind: "stall", walk: false },
  w: { kind: "well", walk: false },
  F: { kind: "fountain", walk: false },
  l: { kind: "lamp", walk: false },
  n: { kind: "bench", walk: false },
  x: { kind: "crate", walk: false },
  "#": { kind: "inner", walk: false },
  B: { kind: "shelf", walk: false },
  C: { kind: "counter", walk: false },
  t: { kind: "table", walk: false },
  A: { kind: "anvil", walk: false },
  I: { kind: "column", walk: false },
  k: { kind: "hearth", walk: false },
  Z: { kind: "bed", walk: false },
  "%": { kind: "rockwall", walk: false },
  "*": { kind: "crystal", walk: false },
};

export const DIRECTIONS = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

export const neighbour = (cell, direction) => ({
  x: cell.x + DIRECTIONS[direction].x,
  y: cell.y + DIRECTIONS[direction].y,
});

export const same = (one, other) => one.x === other.x && one.y === other.y;

// one of the things stands on the cell
export const among = (things, cell) => things.some((thing) => same(thing, cell));

// tiles between two cells, walking along the grid
export const apart = (one, other) => Math.abs(one.x - other.x) + Math.abs(one.y - other.y);

export const key = ({ x, y }) => `${x}:${y}`;

export const within = (map, { x, y }) =>
  y >= 0 && y < map.rows.length && x >= 0 && x < map.rows[0].length;

// the tile a map's row holds at a cell; off the map is cliff, so nothing walks off an edge
export const tile = (map, cell) => TILES[within(map, cell) ? map.rows[cell.y][cell.x] : "M"];
