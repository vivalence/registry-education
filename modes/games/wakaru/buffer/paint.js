import { GRID, HEIGHT, WIDTH, fixtures, lying, restoration, terrain } from "../engine/world.js";
import { WAKING, rank, remembered, share } from "../engine/atlas.js";
import { has } from "../engine/run.js";

export const TILE = 48;
export const SIZE = { width: WIDTH * TILE, height: HEIGHT * TILE };

// the one palette: every colour on the canvas — each biome's ground, then the folk who stand on it
const INK = {
  night: "#0d1512",
  shade: "#000000",
  shine: "#ffffff",
  grey: "#808080",
  bark: "#4a3524",
  eye: "#0d1512",
  biomes: {
    hub: {
      floor: ["#2b3b33", "#2e3f36", "#28372f"],
      wall: "#141d19",
      crest: "#3a4c43",
      pool: "#2e6a86",
      leaf: "#3f7a50",
      rock: "#66736d",
      glint: "#e8d9a8",
    },
    market: {
      floor: ["#4b3727", "#503b2a", "#463324"],
      wall: "#24180f",
      crest: "#6e4e32",
      pool: "#3a7ca5",
      leaf: "#5d8f3f",
      rock: "#9a6f45",
      glint: "#f2b85b",
    },
    hearth: {
      floor: ["#45302d", "#493430", "#412c2a"],
      wall: "#201514",
      crest: "#6b4440",
      pool: "#4a7f9a",
      leaf: "#6a9a4a",
      rock: "#8d6a5c",
      glint: "#e5866a",
    },
    stone: {
      floor: ["#3a3f46", "#3e434b", "#363b42"],
      wall: "#181b20",
      crest: "#555c66",
      pool: "#3d6f8f",
      leaf: "#4f7a55",
      rock: "#7c838c",
      glint: "#c9d2dc",
    },
    brass: {
      floor: ["#4a4128", "#4f452b", "#453c25"],
      wall: "#211c10",
      crest: "#7a6a3a",
      pool: "#3f7a8a",
      leaf: "#6f8a3a",
      rock: "#b08d4a",
      glint: "#f0c75e",
    },
    forest: {
      floor: ["#22382a", "#253c2d", "#1f3326"],
      wall: "#0f1a13",
      crest: "#2f4a36",
      pool: "#2c6a6a",
      leaf: "#3f8a4a",
      rock: "#5f6f5f",
      glint: "#a8e07a",
    },
    water: {
      floor: ["#28434a", "#2b474f", "#253e45"],
      wall: "#0f1d21",
      crest: "#3d6670",
      pool: "#3aa0c0",
      leaf: "#4f8f6a",
      rock: "#7a959a",
      glint: "#9be8f0",
    },
    chalk: {
      floor: ["#3b4548", "#3f494d", "#374044"],
      wall: "#1a2022",
      crest: "#5a666a",
      pool: "#4a7f9a",
      leaf: "#5f8f5a",
      rock: "#c9cfc9",
      glint: "#f4f1e6",
    },
    sand: {
      floor: ["#5a4a33", "#5f4e36", "#554530"],
      wall: "#2a2116",
      crest: "#86704c",
      pool: "#4a8aa0",
      leaf: "#7a8a3f",
      rock: "#a08a62",
      glint: "#f5d58a",
    },
    paper: {
      floor: ["#4a4338", "#4f483c", "#453e34"],
      wall: "#221e18",
      crest: "#6e6452",
      pool: "#5a7a8a",
      leaf: "#6f7f4f",
      rock: "#8a6a48",
      glint: "#efe3c4",
    },
    ink: {
      floor: ["#262a40", "#2a2e45", "#22263b"],
      wall: "#0e1020",
      crest: "#3a3f60",
      pool: "#141a3c",
      leaf: "#4a5f8a",
      rock: "#5a5f80",
      glint: "#b8c4ff",
    },
    ember: {
      floor: ["#33231f", "#382621", "#2e1f1b"],
      wall: "#160d0b",
      crest: "#553128",
      pool: "#e0662a",
      leaf: "#6a4a2a",
      rock: "#5c4a44",
      glint: "#ffb05c",
    },
  },
  stone: { dark: "#3d4845", lit: "#7fe3c4", gold: "#f4c95d" },
  rune: { dark: "#a9b8b2", lit: "#0d1512", gold: "#3a2a08" },
  item: "#e0b870",
  knot: "#7a5230",
  keeper: "#b98a4a",
  lantern: "#ffd27a",
  vendor: "#c0703f",
  counter: "#6e4f33",
  awning: ["#efe3c4", "#c0503f"],
  shrine: "#9aa7a1",
  flame: "#ffb347",
  post: "#6e4f33",
  board: "#c9a45c",
  summit: "#8f9c96",
  crown: "#f4c95d",
  warden: { asleep: "#5e4a57", awake: "#d9534f" },
  cloak: "#e8ecf0",
  cloakShade: "#aab4bd",
  ring: "#f5e6b8",
  spirits: ["#8fb8ff", "#c79bff", "#ff9bc1", "#ffb86b", "#9be8a8", "#7fe3e3", "#f7e07a", "#ff8f8f"],
  strike: "#ffe08a",
  hurt: "#ff5c5c",
  heal: "#7fe3c4",
  coin: "#f4c95d",
  rest: "#c7d8ff",
  restore: "#ffd27a",
};

// how grey a district stands while the learner holds none of its words
const RUIN = 0.85;

export const TINT = {
  strike: INK.strike,
  hurt: INK.hurt,
  heal: INK.heal,
  coin: INK.coin,
  rest: INK.rest,
  restore: INK.restore,
};

const alpha = (hex, amount) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${amount})`;
};

const noise = (x, y, salt) => {
  const mixed = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return mixed - Math.floor(mixed);
};

// each room's floor speckles its own way, and the same way every frame
const salt = (seed, room) => [...room].reduce((sum, char) => sum + char.charCodeAt(0), seed % 9973);

const ease = (from, to, rate) => from + (to - from) * rate;

// where a thing is drawn trails where it stands, so a step glides
const glide = (drawn, id, at, rate = 0.3) => {
  const last = drawn.get(id) ?? at;
  const next = { x: ease(last.x, at.x, rate), y: ease(last.y, at.y, rate) };
  drawn.set(id, next);
  return next;
};

// one hue per word, never shared by two spirits of one room: the word's place among its home room's
// stones picks it; a word with no stone — a pilgrim's, from anywhere — is hashed instead
export const hue = (world, word) => {
  const home = world.rooms[world.home[word]];
  const index = home
    ? home.stones.findIndex((stone) => stone.word === word)
    : [...word].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return INK.spirits[index % INK.spirits.length];
};

// the foe the learner duels, if any: it is drawn larger
const fighting = (scene) => (scene.duel ? scene.duel.foe : null);

const shadow = (pen, x, y, width) => {
  pen.fillStyle = alpha(INK.shade, 0.35);
  pen.beginPath();
  pen.ellipse(x, y, width, width * 0.38, 0, 0, Math.PI * 2);
  pen.fill();
};

const twinkle = (pen, x, y, size) => {
  pen.beginPath();
  pen.moveTo(x, y - size);
  pen.lineTo(x + size * 0.3, y - size * 0.3);
  pen.lineTo(x + size, y);
  pen.lineTo(x + size * 0.3, y + size * 0.3);
  pen.lineTo(x, y + size);
  pen.lineTo(x - size * 0.3, y + size * 0.3);
  pen.lineTo(x - size, y);
  pen.lineTo(x - size * 0.3, y - size * 0.3);
  pen.closePath();
  pen.fill();
};

const floor = (pen, cell, biome, seed) => {
  const left = cell.x * TILE;
  const top = cell.y * TILE;
  pen.fillStyle = biome.floor[Math.floor(noise(cell.x, cell.y, seed) * biome.floor.length)];
  pen.fillRect(left, top, TILE, TILE);
  pen.strokeStyle = alpha(INK.shade, 0.2);
  pen.lineWidth = 1;
  pen.strokeRect(left + 0.5, top + 0.5, TILE - 1, TILE - 1);
  if (noise(cell.y, cell.x, seed + 3) < 0.72) return;
  pen.fillStyle = alpha(biome.glint, 0.18);
  pen.beginPath();
  pen.arc(
    left + 10 + noise(cell.x, cell.y, 9) * 28,
    top + 10 + noise(cell.y, cell.x, 5) * 28,
    2 + noise(cell.x, cell.y, 2) * 3,
    0,
    Math.PI * 2,
  );
  pen.fill();
};

const wall = (pen, cell, biome) => {
  pen.fillStyle = biome.wall;
  pen.fillRect(cell.x * TILE, cell.y * TILE, TILE, TILE);
  pen.fillStyle = biome.crest;
  pen.fillRect(cell.x * TILE, cell.y * TILE + TILE - 10, TILE, 4);
};

const water = (pen, cell, biome, seed, time) => {
  const left = cell.x * TILE;
  const top = cell.y * TILE;
  pen.fillStyle = biome.pool;
  pen.fillRect(left, top, TILE, TILE);
  pen.strokeStyle = alpha(biome.glint, 0.25 + Math.sin(time / 600 + cell.x + cell.y) * 0.12);
  pen.lineWidth = 2;
  for (const row of [14, 32]) {
    const sway = Math.sin(time / 500 + cell.x * 1.7 + row) * 4;
    pen.beginPath();
    pen.moveTo(left + 8 + sway, top + row);
    pen.quadraticCurveTo(left + TILE / 2 + sway, top + row - 4, left + TILE - 8 + sway, top + row);
    pen.stroke();
  }
};

const tree = (pen, cell, biome, seed, time) => {
  floor(pen, cell, biome, seed);
  const x = cell.x * TILE + TILE / 2;
  const y = cell.y * TILE + TILE / 2;
  const sway = Math.sin(time / 900 + cell.x) * 1.5;
  shadow(pen, x + 2, y + 16, 15);
  pen.fillStyle = INK.bark;
  pen.fillRect(x - 3, y + 2, 6, 14);
  pen.fillStyle = biome.leaf;
  pen.beginPath();
  pen.arc(x - 7 + sway, y - 2, 11, 0, Math.PI * 2);
  pen.arc(x + 7 + sway, y - 2, 11, 0, Math.PI * 2);
  pen.arc(x + sway, y - 11, 12, 0, Math.PI * 2);
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.12);
  pen.beginPath();
  pen.arc(x - 3 + sway, y - 13, 6, 0, Math.PI * 2);
  pen.fill();
};

const rock = (pen, cell, biome, seed) => {
  floor(pen, cell, biome, seed);
  const x = cell.x * TILE + TILE / 2;
  const y = cell.y * TILE + TILE / 2;
  shadow(pen, x + 2, y + 13, 16);
  pen.fillStyle = biome.rock;
  pen.beginPath();
  pen.roundRect(x - 15, y - 10, 30, 22, [12, 10, 6, 8]);
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.18);
  pen.beginPath();
  pen.roundRect(x - 11, y - 8, 16, 6, 4);
  pen.fill();
};

// an opening: floor with a chevron pulsing toward the neighbour it leads to
const exit = (pen, cell, biome, seed, time) => {
  floor(pen, cell, biome, seed);
  const away = {
    x: cell.x === 0 ? -1 : cell.x === WIDTH - 1 ? 1 : 0,
    y: cell.y === 0 ? -1 : cell.y === HEIGHT - 1 ? 1 : 0,
  };
  const x = cell.x * TILE + TILE / 2;
  const y = cell.y * TILE + TILE / 2;
  pen.strokeStyle = alpha(biome.glint, 0.4 + Math.sin(time / 400) * 0.2);
  pen.lineWidth = 3;
  pen.beginPath();
  pen.moveTo(x - away.x * 2 - away.y * 8, y - away.y * 2 - away.x * 8);
  pen.lineTo(x + away.x * 8, y + away.y * 8);
  pen.lineTo(x - away.x * 2 + away.y * 8, y - away.y * 2 + away.x * 8);
  pen.stroke();
};

const TILES = { wall, floor, water, tree, rock, exit };

const ground = (pen, world, room, biome, seed, time) => {
  for (const cell of GRID) TILES[terrain(world, room.id, cell)](pen, cell, biome, seed, time);
};

// a district's ruin: grey laid over its ground, as much as the learner does not yet hold
const wither = (pen, amount) => {
  pen.globalCompositeOperation = "saturation";
  pen.globalAlpha = amount;
  pen.fillStyle = INK.grey;
  pen.fillRect(-TILE, 0, SIZE.width + TILE * 2, SIZE.height);
  pen.globalCompositeOperation = "source-over";
  pen.globalAlpha = 1;
};

// a stone shows what the learner holds of its word: dark untouched, lit once reviewed, gold held
const TIERS = [
  [(status) => remembered(status), "gold"],
  [(status) => rank(status) > 0, "lit"],
  [() => true, "dark"],
];

const initial = (word) => (word.learning || word.slug).trim().charAt(0).toUpperCase();

const stone = (pen, at, word, status, met, time) => {
  const [, tier] = TIERS.find(([holds]) => holds(status));
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2;
  if (tier !== "dark") {
    const glow = pen.createRadialGradient(x, y, 2, x, y, TILE * 0.7);
    glow.addColorStop(0, alpha(INK.stone[tier], 0.35));
    glow.addColorStop(1, alpha(INK.stone[tier], 0));
    pen.fillStyle = glow;
    pen.fillRect(x - TILE, y - TILE, TILE * 2, TILE * 2);
  }
  shadow(pen, x + 2, y + 15, 13);
  pen.fillStyle = INK.stone[tier];
  pen.beginPath();
  pen.roundRect(x - 11, y - 16, 22, 32, [10, 10, 3, 3]);
  pen.fill();
  pen.fillStyle = INK.rune[tier];
  pen.globalAlpha = met ? 0.9 : 0.45 + Math.sin(time / 500 + at.x) * 0.2;
  pen.font = `700 ${TILE * 0.36}px ui-serif, Georgia, serif`;
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.fillText(met ? initial(word) : "?", x, y);
  pen.globalAlpha = 1;
};

// an errand's item: a tied bundle with a glint, so it is found
const bundle = (pen, at, time) => {
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2;
  shadow(pen, x + 1, y + 13, 12);
  pen.fillStyle = INK.item;
  pen.beginPath();
  pen.roundRect(x - 11, y - 6, 22, 18, 7);
  pen.moveTo(x - 5, y - 6);
  pen.lineTo(x, y - 14);
  pen.lineTo(x + 5, y - 6);
  pen.fill();
  pen.strokeStyle = INK.knot;
  pen.lineWidth = 2;
  pen.beginPath();
  pen.moveTo(x - 6, y - 5);
  pen.lineTo(x + 6, y - 5);
  pen.stroke();
  pen.fillStyle = alpha(INK.shine, 0.5 + Math.sin(time / 250 + at.x * 3) * 0.5);
  twinkle(pen, x + 11, y - 12, 5);
};

// a spirit's body, hovering; its head is where the eyes and a crown go
const wisp = (pen, at, tint, scale, time) => {
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2 + Math.sin(time / 300 + at.x * 2) * 3 - 4;
  const radius = 14 * scale;
  shadow(pen, x, at.y * TILE + TILE - 7, radius * 0.8);
  pen.fillStyle = tint;
  pen.globalAlpha = 0.9;
  pen.beginPath();
  pen.arc(x, y, radius, Math.PI, 0);
  const hem = y + radius * 0.9;
  for (let fold = 0; fold <= 4; fold += 1) {
    const across = x + radius - (fold * radius) / 2;
    pen.lineTo(across, hem + (fold % 2 ? -4 : 3) + Math.sin(time / 180 + fold) * 1.5);
  }
  pen.closePath();
  pen.fill();
  pen.globalAlpha = 1;
  return { x, y, radius };
};

const eyes = (pen, head, open) => {
  const size = head.radius / 14;
  pen.fillStyle = INK.eye;
  pen.strokeStyle = INK.eye;
  pen.lineWidth = 2 * size;
  pen.beginPath();
  for (const side of [-1, 1]) {
    const x = head.x + side * head.radius * 0.35;
    if (open) {
      pen.moveTo(x + 2.4 * size, head.y - 1);
      pen.arc(x, head.y - 1, 2.4 * size, 0, Math.PI * 2);
    } else {
      pen.moveTo(x - 3 * size, head.y);
      pen.lineTo(x + 3 * size, head.y);
    }
  }
  if (open) pen.fill();
  else pen.stroke();
};

const CROWN = [
  [-0.45, -1.5],
  [-0.2, -1],
  [0, -1.6],
  [0.2, -1],
  [0.45, -1.5],
  [0.7, -0.8],
];

const crown = (pen, head) => {
  pen.fillStyle = INK.crown;
  pen.beginPath();
  pen.moveTo(head.x - head.radius * 0.7, head.y - head.radius * 0.8);
  for (const [x, y] of CROWN) pen.lineTo(head.x + head.radius * x, head.y + head.radius * y);
  pen.closePath();
  pen.fill();
};

const keeper = (pen, at, frame) => {
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2;
  const glow = pen.createRadialGradient(x + 13, y + 4, 1, x + 13, y + 4, TILE * 0.9);
  glow.addColorStop(0, alpha(INK.lantern, 0.32 + Math.sin(frame.time / 260) * 0.06));
  glow.addColorStop(1, alpha(INK.lantern, 0));
  pen.fillStyle = glow;
  pen.fillRect(x - TILE, y - TILE, TILE * 2, TILE * 2);
  shadow(pen, x, y + 17, 13);
  pen.fillStyle = INK.keeper;
  pen.beginPath();
  pen.moveTo(x, y - 18);
  pen.quadraticCurveTo(x + 15, y - 4, x + 12, y + 16);
  pen.lineTo(x - 12, y + 16);
  pen.quadraticCurveTo(x - 15, y - 4, x, y - 18);
  pen.fill();
  pen.fillStyle = INK.night;
  pen.beginPath();
  pen.ellipse(x, y - 5, 6, 5, 0, 0, Math.PI * 2);
  pen.fill();
  pen.fillStyle = INK.lantern;
  pen.beginPath();
  pen.arc(x + 13, y + 4, 3.5, 0, Math.PI * 2);
  pen.fill();
};

// the vendor behind a counter, under a striped awning
const vendor = (pen, at) => {
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2;
  shadow(pen, x, y + 19, 20);
  pen.fillStyle = INK.vendor;
  pen.beginPath();
  pen.arc(x, y - 4, 7, 0, Math.PI * 2);
  pen.roundRect(x - 9, y + 2, 18, 10, 5);
  pen.fill();
  pen.fillStyle = INK.counter;
  pen.fillRect(x - 20, y + 8, 40, 11);
  pen.fillRect(x - 19, y - 18, 3, 26);
  pen.fillRect(x + 16, y - 18, 3, 26);
  for (let stripe = 0; stripe < 5; stripe += 1) {
    pen.fillStyle = INK.awning[stripe % 2];
    pen.fillRect(x - 22 + stripe * 9, y - 24, 9, 8);
  }
};

// the shrine: a stone lantern whose flame never goes out
const shrine = (pen, at, frame) => {
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2;
  const flicker = Math.sin(frame.time / 90) * 0.08 + Math.sin(frame.time / 37) * 0.05;
  const glow = pen.createRadialGradient(x, y - 6, 1, x, y - 6, TILE * 0.8);
  glow.addColorStop(0, alpha(INK.flame, 0.3 + flicker));
  glow.addColorStop(1, alpha(INK.flame, 0));
  pen.fillStyle = glow;
  pen.fillRect(x - TILE, y - TILE, TILE * 2, TILE * 2);
  shadow(pen, x, y + 18, 15);
  pen.fillStyle = INK.shrine;
  pen.fillRect(x - 12, y + 12, 24, 6);
  pen.fillRect(x - 4, y + 2, 8, 10);
  pen.fillRect(x - 10, y - 12, 20, 14);
  pen.beginPath();
  pen.moveTo(x - 15, y - 12);
  pen.lineTo(x, y - 22);
  pen.lineTo(x + 15, y - 12);
  pen.fill();
  pen.fillStyle = INK.flame;
  pen.beginPath();
  pen.ellipse(x, y - 5, 4, 5 + flicker * 10, 0, 0, Math.PI * 2);
  pen.fill();
};

// the sign: a post and a board, the valley's map behind it
const sign = (pen, at) => {
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2;
  shadow(pen, x + 2, y + 18, 10);
  pen.fillStyle = INK.post;
  pen.fillRect(x - 2, y - 6, 4, 24);
  pen.fillStyle = INK.board;
  pen.beginPath();
  pen.roundRect(x - 15, y - 17, 30, 14, 3);
  pen.fill();
  pen.strokeStyle = INK.post;
  pen.lineWidth = 2;
  pen.beginPath();
  pen.moveTo(x - 9, y - 10);
  pen.lineTo(x + 8, y - 10);
  pen.moveTo(x + 4, y - 14);
  pen.lineTo(x + 8, y - 10);
  pen.lineTo(x + 4, y - 6);
  pen.stroke();
};

// the summit: a stepped spire that brightens with every district restored, wakes when all are,
// and wears the crown once its warden falls
const summit = (pen, at, frame) => {
  const risen = restoration(frame.world, frame.run);
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2;
  const pulse = risen === 1 ? Math.sin(frame.time / 300) * 0.08 : 0;
  const glow = pen.createRadialGradient(x, y - 10, 2, x, y - 10, TILE);
  glow.addColorStop(0, alpha(INK.crown, 0.08 + risen * 0.3 + pulse));
  glow.addColorStop(1, alpha(INK.crown, 0));
  pen.fillStyle = glow;
  pen.fillRect(x - TILE, y - TILE, TILE * 2, TILE * 2);
  shadow(pen, x, y + 19, 20);
  pen.fillStyle = INK.summit;
  pen.fillRect(x - 18, y + 11, 36, 8);
  pen.fillRect(x - 12, y + 4, 24, 8);
  pen.beginPath();
  pen.moveTo(x - 7, y + 4);
  pen.lineTo(x, y - 20);
  pen.lineTo(x + 7, y + 4);
  pen.fill();
  pen.fillStyle = risen === 1 ? INK.crown : alpha(INK.crown, 0.3 + risen * 0.5);
  pen.beginPath();
  pen.arc(x, y - 20, 3, 0, Math.PI * 2);
  pen.fill();
  if (has(frame.run, "crowned")) crown(pen, { x, y: y - 14, radius: 10 });
};

// the warden sleeps, dim, until most of its district's words are held; then it wakes, red
const warden = (pen, at, frame) => {
  const room = frame.world.rooms[frame.run.pose.room];
  const awake = share(frame.memory, frame.world.places[room.place].words) >= WAKING;
  const foe = fighting(frame.scene);
  const scale = foe !== null && foe.kind === "warden" ? 1.9 : 1.6;
  const head = wisp(pen, at, awake ? INK.warden.awake : INK.warden.asleep, scale, frame.time);
  eyes(pen, head, awake);
  crown(pen, head);
  if (awake) return;
  const drift = (frame.time % 1800) / 1800;
  pen.fillStyle = INK.cloakShade;
  pen.globalAlpha = 1 - drift;
  pen.font = `600 ${TILE * 0.3}px ui-serif, Georgia, serif`;
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.fillText("z", head.x + head.radius + drift * 6, head.y - head.radius - drift * 14);
  pen.globalAlpha = 1;
};

const FIGURES = { keeper, vendor, shrine, sign, summit, warden };

const traveller = (pen, at, facing, time, striding) => {
  const x = at.x * TILE + TILE / 2;
  const y = at.y * TILE + TILE / 2 + (striding ? Math.sin(time / 70) * 1.5 : 0);
  shadow(pen, x, at.y * TILE + TILE - 7, 12);
  pen.fillStyle = INK.cloakShade;
  pen.beginPath();
  pen.roundRect(x - 11, y - 4, 22, 20, [6, 6, 9, 9]);
  pen.fill();
  pen.fillStyle = INK.cloak;
  pen.beginPath();
  pen.arc(x, y - 8, 10, 0, Math.PI * 2);
  pen.fill();
  if (facing === "north") return;
  const look = { south: [0, 2], west: [-4, -1], east: [4, -1] }[facing];
  pen.fillStyle = INK.eye;
  pen.beginPath();
  pen.arc(x + look[0] - 3, y - 8 + look[1], 1.8, 0, Math.PI * 2);
  pen.arc(x + look[0] + 3, y - 8 + look[1], 1.8, 0, Math.PI * 2);
  pen.fill();
};

// where a tap sent the learner
const aimed = (pen, at, time) => {
  pen.strokeStyle = INK.ring;
  pen.globalAlpha = 0.55 + Math.sin(time / 120) * 0.25;
  pen.lineWidth = 2;
  pen.beginPath();
  pen.arc(
    at.x * TILE + TILE / 2,
    at.y * TILE + TILE / 2,
    TILE * 0.38 + Math.sin(time / 160) * 2,
    0,
    Math.PI * 2,
  );
  pen.stroke();
  pen.globalAlpha = 1;
};

const sparks = (pen, fx, time) => {
  for (const spark of fx.sparks) {
    const age = (time - spark.born) / spark.life;
    if (age >= 1) continue;
    pen.globalAlpha = 1 - age;
    pen.fillStyle = spark.tint;
    pen.beginPath();
    pen.arc(
      (spark.x + 0.5 + spark.dx * age) * TILE,
      (spark.y + 0.5 + spark.dy * age) * TILE - age * 10,
      3 * (1 - age) + 1,
      0,
      Math.PI * 2,
    );
    pen.fill();
  }
  pen.globalAlpha = 1;
  fx.sparks = fx.sparks.filter((spark) => time - spark.born < spark.life);
};

export const burst = (fx, at, tint, time, count = 14) => {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const speed = 0.4 + (index % 3) * 0.25;
    fx.sparks.push({
      ...at,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      tint,
      born: time,
      life: 520,
    });
  }
};

// frame: { world, run, scene, memory, facing, time, fx, drawn, goal } — the whole canvas, drawn
// from the state alone; fx and drawn are the painter's keepsakes between frames, never game state
export const paint = (pen, frame) => {
  const { world, run, scene, memory, time, fx, drawn } = frame;
  const room = world.rooms[run.pose.room];
  const sited = room.place === null ? null : world.places[room.place];
  // a district blooms from grey ruin to full colour by the share of its words the learner holds;
  // the hub by the share of the districts restored
  const bloom = sited ? share(memory, sited.words) : restoration(world, run);
  const shake = time < fx.shake ? Math.sin(time / 18) * 4 : 0;
  const foe = fighting(scene);

  pen.save();
  pen.fillStyle = INK.night;
  pen.fillRect(0, 0, SIZE.width, SIZE.height);
  pen.translate(shake, 0);
  ground(pen, world, room, INK.biomes[sited ? sited.biome : "hub"], salt(run.seed, room.id), time);
  wither(pen, (1 - bloom) * RUIN);

  for (const item of lying(room, run)) bundle(pen, item, time);
  for (const placed of room.stones) {
    const met = has(run, `met:${placed.word}`);
    stone(pen, placed, world.words[placed.word], memory[placed.word], met, time);
  }
  for (const fixture of fixtures(room, run)) FIGURES[fixture.kind](pen, fixture, frame);
  for (const spirit of scene.spirits) {
    const scale = foe !== null && foe.kind === "spirit" && foe.word === spirit.word ? 1.25 : 1;
    const at = glide(drawn, spirit.word, spirit, 0.18);
    eyes(pen, wisp(pen, at, hue(world, spirit.word), scale, time), true);
  }

  if (frame.goal) aimed(pen, frame.goal, time);
  const at = glide(drawn, "traveller", run.pose);
  const striding = Math.abs(at.x - run.pose.x) + Math.abs(at.y - run.pose.y) > 0.05;
  traveller(pen, at, frame.facing, time, striding);
  sparks(pen, fx, time);
  pen.restore();

  const middle = { x: SIZE.width / 2, y: SIZE.height / 2 };
  const dusk = pen.createRadialGradient(
    middle.x,
    middle.y,
    SIZE.height * 0.35,
    middle.x,
    middle.y,
    SIZE.width * 0.72,
  );
  dusk.addColorStop(0, alpha(INK.shade, 0));
  dusk.addColorStop(1, alpha(INK.shade, 0.55));
  pen.fillStyle = dusk;
  pen.fillRect(0, 0, SIZE.width, SIZE.height);

  if (time < fx.flash.until) {
    pen.fillStyle = fx.flash.tint;
    pen.globalAlpha = 0.28 * ((fx.flash.until - time) / 260);
    pen.fillRect(0, 0, SIZE.width, SIZE.height);
    pen.globalAlpha = 1;
  }
  if (time < fx.fade) {
    pen.fillStyle = INK.night;
    pen.globalAlpha = (fx.fade - time) / 320;
    pen.fillRect(0, 0, SIZE.width, SIZE.height);
    pen.globalAlpha = 1;
  }
};
