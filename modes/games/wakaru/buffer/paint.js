import { TILES, within } from "../engine/tiles.js";
import { WAKING, place, rank, remembered, share } from "../engine/atlas.js";
import { has, held } from "../engine/run.js";
import { LIGHT, entry, lying, restoration, standing } from "../engine/world.js";

// the valley's art: every tile, the folk who stand on it and the moments that flash over it, on
// one canvas. nothing here is game state — the painter reads a frame (the world, the state, the
// learner's memory, where the camera looks) and keeps only its own caches between frames.

// the one palette: every colour on the canvas. the ground and what is built on it, the folk, then
// each biome's own grass, leaves, roofs, walls and floors — a biome repaints what differs from the
// hub. none of these leaves the canvas: the screen names a tone, never a colour
const INK = {
  night: "#0c1016",
  dark: "#04050a",
  shade: "#000000",
  shine: "#ffffff",
  grey: "#808080",
  path: { base: "#dcc495", rim: "#b2945f", pebble: "#c3a774", light: "#ead7ae" },
  dirt: { base: "#ad8257", rim: "#86603b", pebble: "#946b44", light: "#c49a6c" },
  sand: { base: "#ead8a2", rim: "#cdb47a", pebble: "#d8c08a", light: "#f6e8c0" },
  plaza: {
    stones: ["#d6cebe", "#cdc4b2", "#ddd6c8", "#c7bea9"],
    joint: "#a0978a",
    kerb: "#8f8678",
  },
  cave: { base: "#4d4744", dark: "#3c3734", light: "#5f5853", crack: "#2c2826" },
  water: {
    deep: "#2c75a6",
    base: "#3a8dc2",
    shallow: "#62acd6",
    foam: "#eaf8ff",
    bank: "#cdb27c",
    glint: "#ffffff",
    lily: "#f08fb0",
  },
  wood: { light: "#cf9a60", base: "#a8743f", dark: "#6e4520", grain: "#8d5e2f" },
  stone: { light: "#dad4c8", base: "#b1aa9c", dark: "#7f796d", mortar: "#958e80" },
  rock: { light: "#c2beb4", base: "#9a968e", dark: "#6b6862" },
  cliff: { face: "#9c876b", light: "#bba585", dark: "#6c5b48", strata: "#836f58", lip: "#5e8f45" },
  bark: { base: "#6e4b2c", dark: "#4a311d" },
  hedge: { light: "#6cab4f", base: "#4f8c3a", dark: "#346a27", deep: "#24501b" },
  pine: { light: "#4c9a5e", base: "#33774a", dark: "#215535" },
  iron: { light: "#8a909a", base: "#555a63", dark: "#2d3036" },
  glass: { base: "#9fcfe6", light: "#e8f7fd", dark: "#4f84a0" },
  fire: { core: "#fff4c0", flame: "#ffb347", ember: "#f05a28", glow: "#ffc96b" },
  crystal: { base: "#77d6fa", light: "#e6fbff", dark: "#3584b6", glow: "#8fe6ff" },
  rockwall: { top: "#2b2730", face: "#4b4452", light: "#625a6b", dark: "#1c1a21" },
  linen: "#f3ede0",
  pollen: "#ffe27a",
  brick: { base: "#a5533f", dark: "#7a3a2c", light: "#c0705a" },
  gold: { base: "#e8b94a", light: "#fbe39a", dark: "#a57a1f" },
  goods: ["#e85d4a", "#f2b13c", "#8cc152", "#c06bd0", "#f7e08a"],
  books: ["#a8433a", "#3f6fa6", "#5a8a4a", "#c9922f", "#7a4a8a", "#2f7a7a"],
  stoneTier: { dark: "#5b6662", lit: "#7fe3c4", gold: "#f4c95d" },
  rune: { dark: "#c3cdc9", lit: "#0f3a2e", gold: "#4a3408" },
  chest: { wood: "#a0652f", dark: "#6a3d18", band: "#e0ad46", inside: "#2a1709" },
  pot: { clay: "#c4733f", dark: "#8e4b25", light: "#e09a66", band: "#f3d9b0" },
  bundle: { cloth: "#e3bd76", knot: "#7a5230" },
  keeper: {
    robe: "#5b72ad",
    hood: "#45598e",
    trim: "#e8d49a",
    skin: "#f0c9a0",
    lantern: "#ffd27a",
  },
  vendor: { shirt: "#c46f3b", apron: "#f1e9d6", skin: "#e8b98e", cap: "#7c4b28" },
  learner: {
    cloak: "#d65a3c",
    fold: "#a8402a",
    scarf: "#f4c24e",
    skin: "#f4d3b1",
    cheek: "#f0a08a",
    hair: "#3d2b20",
    boot: "#5a3b26",
    pack: "#8e6b45",
  },
  shrine: { stone: "#adb5b0", dark: "#7f8883", flame: "#ffb347", glow: "#ffcf7a" },
  sign: { post: "#7a5230", board: "#dbb677", ink: "#6a4a28", land: "#8fc46a", sea: "#5fa8d6" },
  summit: { stone: "#9fa9a3", dark: "#737d78", crown: "#f4c95d" },
  warden: { asleep: "#7b6a86", awake: "#e0574f" },
  haunt: { stone: "#9a9e96", moss: "#6f8f5a", glow: "#c9b2ff" },
  spirit: { saturation: 80, lightness: 74 },
  eye: "#1a1420",
  bubble: {
    fill: "#fffaf0",
    edge: "#3a2f28",
    quest: "#d99a16",
    awake: "#d9453f",
    alert: "#e0402a",
  },
  fx: {
    strike: "#ffe08a",
    hurt: "#ff5c5c",
    heal: "#7fe3c4",
    coin: "#f4c95d",
    rest: "#c7d8ff",
    restore: "#ffd27a",
  },
  biomes: {
    hub: {
      grass: ["#8bc265", "#79b056", "#9cd176"],
      wild: ["#6fa651", "#5a9242", "#80b85d"],
      blade: "#5c9842",
      leaf: ["#5aa64c", "#3f823f", "#84c868"],
      flowers: ["#fffaf0", "#ffd84d", "#ff8a6b", "#c48cff", "#7fc8ff"],
      roofs: ["#cf5f43", "#4a78b5", "#d9933f", "#8a62b8"],
      wall: "#f3e7cb",
      timber: "#87573a",
      floor: "#c39260",
      paper: "#ecdcbd",
      accent: "#c4483c",
    },
    market: {
      grass: ["#98c463", "#85b153", "#a9d473"],
      roofs: ["#d0663f", "#e08a3c", "#b84a3a", "#d9a441"],
      wall: "#f6e3c2",
      accent: "#e07a2c",
    },
    hearth: {
      flowers: ["#ffd6e6", "#ff9fbf", "#ffd84d", "#fffaf0", "#e86a8a"],
      roofs: ["#a8475a", "#c0624f", "#8a4a6a"],
      wall: "#f4dfcb",
      accent: "#c45a6a",
    },
    stone: {
      grass: ["#86b866", "#74a557", "#98c879"],
      roofs: ["#5f6f86", "#4f5d70", "#7a8698"],
      wall: "#e4dfd4",
      accent: "#4f7ab0",
    },
    brass: {
      grass: ["#a2bf5d", "#8ead4f", "#b7d172"],
      wild: ["#87a64a", "#76943e", "#9bb85a"],
      roofs: ["#3f8a8a", "#b8862f", "#5a7f9a"],
      accent: "#d9a33a",
    },
    forest: {
      grass: ["#6ea951", "#5c9544", "#80bb61"],
      wild: ["#558f40", "#467d34", "#66a24c"],
      blade: "#467f33",
      leaf: ["#4b9a45", "#347a36", "#6db85a"],
      roofs: ["#6a7f3a", "#7a5a3a"],
      accent: "#3f8f5f",
    },
    water: {
      grass: ["#80bf78", "#6ba868", "#94d08b"],
      roofs: ["#3f8fa8", "#4fa0a0", "#2f6f8f"],
      accent: "#3fa0b8",
    },
    chalk: {
      grass: ["#95c57a", "#82b169", "#a8d58c"],
      roofs: ["#b8503f", "#a8443a", "#c76a4a"],
      wall: "#f6f1e7",
      accent: "#c0392b",
    },
    sand: {
      grass: ["#b6bd69", "#a2a858", "#c9cf7e"],
      wild: ["#9ea152", "#8b8f46", "#b0b462"],
      roofs: ["#c9a05a", "#b07a3f", "#d0b070"],
      wall: "#f0e1c2",
      accent: "#c98a3a",
    },
    paper: { floor: "#8c5c36", paper: "#efe3c4", accent: "#8a2f3a" },
    ink: { floor: "#5e4532", paper: "#3d4270", timber: "#26294a", accent: "#d9b44a" },
    ember: {
      floor: "#77695f",
      paved: true,
      paper: "#6a4436",
      timber: "#2e1d17",
      accent: "#e0662a",
    },
  },
};

// a chunk of ground cached as one image: small enough that a phone holds those in sight
const CHUNK = 8;

// how grey a place stands while the learner holds none of its words; cached in steps, so a review
// redraws the ground once, never every frame
const RUIN = 0.85;
const RUIN_STEPS = 20;

// a lantern lights this far round the learner (in tiles); without it, the world's own LIGHT round
// the entry. a light is full inside this share of its radius and fades out to the radius
const LANTERN = 5;
const FULL = 0.5;

// a map arrived on fades in from the night
const FADE = 320;

// how far a roof's ridge rises over its top row, in tiles: whoever stands north of a building
// stands behind it
const RISE = 0.5;

const TAU = Math.PI * 2;

// ---- colour and noise ------------------------------------------------------------------------

const channels = new Map();

const rgb = (hex) => {
  if (!channels.has(hex)) {
    const value = Number.parseInt(hex.slice(1), 16);
    channels.set(hex, [value >> 16, (value >> 8) & 255, value & 255]);
  }
  return channels.get(hex);
};

const alpha = (hex, amount) => {
  const [red, green, blue] = rgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${amount})`;
};

// a colour moved toward another by an amount 0..1
const blend = (hex, other, amount) => {
  const from = rgb(hex);
  const to = rgb(other);
  const [red, green, blue] = from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  );
  return `rgb(${red}, ${green}, ${blue})`;
};

const noise = (x, y, salt) => {
  const mixed = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return mixed - Math.floor(mixed);
};

// noise that drifts smoothly across tiles, so a meadow has patches, not a checkerboard
const smooth = (x, y, salt) => {
  const column = Math.floor(x);
  const row = Math.floor(y);
  const across = (x - column) ** 2 * (3 - 2 * (x - column));
  const down = (y - row) ** 2 * (3 - 2 * (y - row));
  const top = noise(column, row, salt) * (1 - across) + noise(column + 1, row, salt) * across;
  const bottom =
    noise(column, row + 1, salt) * (1 - across) + noise(column + 1, row + 1, salt) * across;
  return top * (1 - down) + bottom * down;
};

const pick = (list, amount) => list[Math.floor(amount * list.length) % list.length];

const sheet = (width, height) => {
  const image = document.createElement("canvas");
  image.width = Math.max(1, Math.ceil(width));
  image.height = Math.max(1, Math.ceil(height));
  return image;
};

const shadow = (pen, x, y, width, strength = 0.24) => {
  pen.fillStyle = alpha(INK.shade, strength);
  pen.beginPath();
  pen.ellipse(x, y, width, width * 0.36, 0, 0, TAU);
  pen.fill();
};

// a soft light as an image, made once per colour and size and then only stamped: a gradient built
// every frame for every lamp and stone costs far more than an image laid down
const halos = new Map();

const halo = (hex, radius) => {
  const id = `${hex}:${radius}`;
  if (!halos.has(id)) {
    if (halos.size > 256) halos.clear();
    const image = sheet(radius * 2, radius * 2);
    const pen = image.getContext("2d");
    const light = pen.createRadialGradient(radius, radius, 0, radius, radius, radius);
    light.addColorStop(0, alpha(hex, 1));
    light.addColorStop(1, alpha(hex, 0));
    pen.fillStyle = light;
    pen.fillRect(0, 0, radius * 2, radius * 2);
    halos.set(id, image);
  }
  return halos.get(id);
};

const glow = (pen, x, y, radius, hex, strength) => {
  const size = Math.max(1, Math.round(radius));
  pen.globalAlpha = Math.min(1, Math.max(0, strength));
  pen.drawImage(halo(hex, size), x - size, y - size);
  pen.globalAlpha = 1;
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

// ---- reading a map -----------------------------------------------------------------------------

const salted = (id) => [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7);

// what vegetation grows from, and what a placed thing stands on when its neighbours do not say
const BASE = { outdoor: "grass", indoor: "floor", cave: "cave" };

const FLOORS = [
  "grass",
  "flowers",
  "tallgrass",
  "path",
  "dirt",
  "plaza",
  "sand",
  "floor",
  "rug",
  "cave",
];

const GROWN = ["tree", "pine", "hedge"];

const AROUND = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

// a fountain or a hearth is drawn whole across its block of cells: each cell's block, found once
const groups = (map, char) => {
  const found = new Map();
  map.rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (tile !== char || found.has(`${x}:${y}`)) return;
      const cells = [{ x, y }];
      const seen = new Set([`${x}:${y}`]);
      for (let index = 0; index < cells.length; index += 1) {
        for (const [dx, dy] of AROUND.slice(0, 4)) {
          const next = { x: cells[index].x + dx, y: cells[index].y + dy };
          const id = `${next.x}:${next.y}`;
          if (seen.has(id) || !within(map, next) || map.rows[next.y][next.x] !== char) continue;
          seen.add(id);
          cells.push(next);
        }
      }
      const bounds = {
        left: Math.min(...cells.map((cell) => cell.x)),
        right: Math.max(...cells.map((cell) => cell.x)),
        top: Math.min(...cells.map((cell) => cell.y)),
        bottom: Math.max(...cells.map((cell) => cell.y)),
      };
      for (const id of seen) found.set(id, bounds);
    }),
  );
  return found;
};

// a building is a block of roof rows over one front row, seen from the south: walls with windows
// and a door, or a market's counters under an awning. a block taller than it is wide is a tower
const buildings = (map, salt) => {
  const rows = map.rows;
  const taken = new Set();
  const found = [];
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (tile !== "R" || taken.has(`${x}:${y}`)) return;
      let right = x;
      while (rows[y][right + 1] === "R") right += 1;
      let base = y;
      while (
        base + 1 < rows.length &&
        rows[base + 1].slice(x, right + 1) === "R".repeat(right - x + 1)
      ) {
        base += 1;
      }
      const front = rows[base + 1] === undefined ? "" : rows[base + 1].slice(x, right + 1);
      for (let row = y; row <= base + (front ? 1 : 0); row += 1) {
        for (let column = x; column <= right; column += 1) taken.add(`${column}:${row}`);
      }
      const width = right - x + 1;
      const height = base - y + 1;
      found.push({
        left: x,
        right,
        top: y,
        base: base + (front ? 1 : 0),
        front,
        stall: front.includes("S"),
        tower: height >= width * 1.5,
        shade: noise(x, y, salt + 91),
        chimney: !front.includes("S") && width >= 5 && noise(x, y, salt + 92) < 0.6,
      });
    }),
  );
  return { found, taken };
};

// the art's view of one map at one tile size: what stands where, how it is coloured
const survey = (map, unit, ruin) => {
  const salt = salted(map.id);
  const ink = {
    ...INK.biomes.hub,
    ...INK.biomes[map.place === null ? "hub" : place(map.place).biome],
  };
  const height = map.rows.length;
  const width = map.rows[0].length;
  // past the edge the world goes on as it was at the edge, so borders never show a seam
  const char = (x, y) =>
    map.rows[Math.min(Math.max(y, 0), height - 1)][Math.min(Math.max(x, 0), width - 1)];
  const kind = (x, y) => TILES[char(x, y)].kind;
  const built = buildings(map, salt);
  const portals = new Map(map.portals.map((portal) => [`${portal.x}:${portal.y}`, portal]));
  return {
    map,
    unit,
    ruin,
    salt,
    ink,
    width,
    height,
    char,
    kind,
    walks: (x, y) => TILES[char(x, y)].walk,
    fountains: groups(map, "F"),
    hearths: groups(map, "k"),
    buildings: built.found,
    built: built.taken,
    portals,
  };
};

// what a placed thing stands on: vegetation on the map's own ground, anything else on the floor
// most of its neighbours stand on
const underlay = (art, x, y) => {
  const kind = art.kind(x, y);
  if (GROWN.includes(kind)) return BASE[art.map.kind];
  const tally = new Map();
  for (const [dx, dy] of AROUND) {
    const around = art.kind(x + dx, y + dy);
    if (FLOORS.includes(around)) tally.set(around, (tally.get(around) ?? 0) + 1);
  }
  if (tally.size === 0) return BASE[art.map.kind];
  return [...tally].sort((one, other) => other[1] - one[1])[0][0];
};

// ---- the ground: every cell paints only its own square, so chunks meet without a seam --------

const lawn = (pen, art, x, y, tones) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const swell = smooth(x / 3.5, y / 3.5, art.salt);
  pen.fillStyle = blend(tones[0], swell < 0.5 ? tones[1] : tones[2], Math.abs(swell - 0.5) * 0.5);
  pen.fillRect(left, top, unit, unit);
  // soft patches on a lattice that ignores tile edges, so the field reads as one field
  for (let row = y - 1; row <= y + 1; row += 1) {
    for (let column = x - 1; column <= x + 1; column += 1) {
      const centre = {
        x: (column + noise(column, row, art.salt + 1)) * unit,
        y: (row + noise(column, row, art.salt + 2)) * unit,
      };
      const radius = (0.5 + noise(column, row, art.salt + 3) * 0.5) * unit;
      const tone = noise(column, row, art.salt + 4) < 0.5 ? tones[1] : tones[2];
      const patch = pen.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, radius);
      patch.addColorStop(0, alpha(tone, 0.45));
      patch.addColorStop(1, alpha(tone, 0));
      pen.fillStyle = patch;
      pen.fillRect(centre.x - radius, centre.y - radius, radius * 2, radius * 2);
    }
  }
  pen.lineCap = "round";
  pen.lineWidth = Math.max(1, unit * 0.02);
  for (let index = 0; index < 3; index += 1) {
    const chance = noise(x, y, art.salt + 9 + index);
    if (chance < 0.25) continue;
    const at = {
      x: left + (0.12 + noise(x, y, art.salt + 10 + index) * 0.76) * unit,
      y: top + (0.2 + noise(y, x, art.salt + 20 + index) * 0.7) * unit,
    };
    const size = unit * (0.05 + noise(x + index, y, art.salt + 5) * 0.04);
    pen.strokeStyle = alpha(chance < 0.8 ? art.ink.blade : tones[2], 0.6);
    pen.beginPath();
    pen.moveTo(at.x - size * 0.5, at.y - size);
    pen.quadraticCurveTo(at.x - size * 0.1, at.y - size * 0.3, at.x, at.y);
    pen.quadraticCurveTo(
      at.x + size * 0.15,
      at.y - size * 0.5,
      at.x + size * 0.45,
      at.y - size * 1.15,
    );
    pen.stroke();
  }
};

const blossoms = (pen, art, x, y) => {
  const unit = art.unit;
  for (let index = 0; index < 3; index += 1) {
    const centre = {
      x: (x + 0.18 + noise(x, y, art.salt + 30 + index) * 0.64) * unit,
      y: (y + 0.18 + noise(y, x, art.salt + 40 + index) * 0.64) * unit,
    };
    const petal = unit * 0.042;
    pen.fillStyle = alpha(art.ink.blade, 0.9);
    pen.beginPath();
    pen.ellipse(
      centre.x + petal * 1.4,
      centre.y + petal * 1.6,
      petal * 1.1,
      petal * 0.5,
      0.6,
      0,
      TAU,
    );
    pen.fill();
    pen.fillStyle = pick(art.ink.flowers, noise(x + index, y, art.salt + 50));
    pen.beginPath();
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const angle = (leaf / 5) * TAU + index;
      pen.moveTo(centre.x + Math.cos(angle) * petal * 1.9, centre.y + Math.sin(angle) * petal);
      pen.arc(
        centre.x + Math.cos(angle) * petal,
        centre.y + Math.sin(angle) * petal,
        petal * 0.9,
        0,
        TAU,
      );
    }
    pen.fill();
    pen.fillStyle = INK.pollen;
    pen.beginPath();
    pen.arc(centre.x, centre.y, petal * 0.55, 0, TAU);
    pen.fill();
  }
};

// a clump of long blades fanning up from one root: dark behind, lit in front
const clump = (pen, root, height, tones, lean) => {
  for (const [offset, tone] of [
    [-0.6, tones[1]],
    [0.55, tones[1]],
    [-0.25, tones[0]],
    [0.3, tones[0]],
    [0.02, tones[2]],
  ]) {
    const tip = {
      x: root.x + (offset + lean) * height * 0.5,
      y: root.y - height * (0.75 + (1 - Math.abs(offset)) * 0.3),
    };
    const foot = height * 0.08;
    pen.fillStyle = tone;
    pen.beginPath();
    pen.moveTo(root.x + offset * height * 0.2 - foot, root.y);
    pen.quadraticCurveTo(root.x + offset * height * 0.15, root.y - height * 0.5, tip.x, tip.y);
    pen.quadraticCurveTo(
      root.x + offset * height * 0.3,
      root.y - height * 0.45,
      root.x + offset * height * 0.2 + foot,
      root.y,
    );
    pen.closePath();
    pen.fill();
  }
};

const thicket = (pen, art, x, y, rows = [0, 1, 2, 3]) => {
  const unit = art.unit;
  for (const row of rows) {
    for (let index = 0; index < 4; index += 1) {
      const jitter = noise(x * 4 + index, y * 4 + row, art.salt + 60) - 0.5;
      clump(
        pen,
        {
          x: (x + 0.06 + index * 0.27 + (row % 2) * 0.13 + jitter * 0.08) * unit,
          y: (y + 0.32 + row * 0.22) * unit,
        },
        unit * 0.34,
        art.ink.wild,
        jitter * 0.7,
      );
    }
  }
};

// tall grass: a deep meadow whose blades stand over the lawn wherever the meadow ends
const meadow = (pen, art, x, y) => {
  const unit = art.unit;
  lawn(pen, art, x, y, art.ink.wild);
  const edge = edges(art, x, y, ["tallgrass"]);
  pen.fillStyle = art.ink.grass[0];
  const band = unit * 0.16;
  if (edge.north) pen.fillRect(x * unit, y * unit, unit, band);
  if (edge.west) pen.fillRect(x * unit, y * unit, band, unit);
  if (edge.east) pen.fillRect((x + 1) * unit - band, y * unit, band, unit);
  if (edge.south) pen.fillRect(x * unit, (y + 1) * unit - band * 0.6, unit, band * 0.6);
  thicket(pen, art, x, y);
};

// soft ground that meets another ground with a worn rim: where a neighbour does not join it, it
// stops a little short, rounds its outer corners and lets the grass lean over its rim
const SOFT = {
  path: {
    tones: INK.path,
    joins: ["path", "plaza", "dirt", "bridge", "door", "mouth", "upstairs", "downstairs"],
  },
  dirt: {
    tones: INK.dirt,
    joins: ["dirt", "path", "plaza", "bridge", "door", "mouth", "upstairs", "downstairs"],
  },
  sand: {
    tones: INK.sand,
    joins: ["sand", "water", "path", "dirt", "plaza", "bridge", "door", "upstairs", "downstairs"],
  },
};

const SIDES = [
  ["north", 0, -1],
  ["south", 0, 1],
  ["west", -1, 0],
  ["east", 1, 0],
];

// the ground a cell shows: its own kind if it is ground, else the ground its thing stands on
const GROUNDS = [...FLOORS, "water", "bridge", "door", "mouth", "upstairs", "downstairs"];

const groundOf = (art, x, y) => {
  const kind = art.kind(x, y);
  return GROUNDS.includes(kind) ? kind : underlay(art, x, y);
};

// which sides of a cell meet a ground that does not join it
const edges = (art, x, y, joins) =>
  Object.fromEntries(
    SIDES.map(([side, dx, dy]) => [side, !joins.includes(groundOf(art, x + dx, y + dy))]),
  );

const inset = (left, top, unit, edge, by) => ({
  left: left + (edge.west ? by : 0),
  top: top + (edge.north ? by : 0),
  right: left + unit - (edge.east ? by : 0),
  bottom: top + unit - (edge.south ? by : 0),
});

const corners = (edge, radius) => [
  edge.north && edge.west ? radius : 0,
  edge.north && edge.east ? radius : 0,
  edge.south && edge.east ? radius : 0,
  edge.south && edge.west ? radius : 0,
];

// a line along each open side of an area
const rim = (pen, area, edge) => {
  pen.beginPath();
  if (edge.north) {
    pen.moveTo(area.left, area.top);
    pen.lineTo(area.right, area.top);
  }
  if (edge.south) {
    pen.moveTo(area.left, area.bottom);
    pen.lineTo(area.right, area.bottom);
  }
  if (edge.west) {
    pen.moveTo(area.left, area.top);
    pen.lineTo(area.left, area.bottom);
  }
  if (edge.east) {
    pen.moveTo(area.right, area.top);
    pen.lineTo(area.right, area.bottom);
  }
  pen.stroke();
};

const box = (pen, area, radii) => {
  pen.beginPath();
  pen.roundRect(area.left, area.top, area.right - area.left, area.bottom - area.top, radii);
  pen.fill();
};

const worn = (pen, art, x, y, kind) => {
  const unit = art.unit;
  const { tones, joins } = SOFT[kind];
  const edge = edges(art, x, y, joins);
  const left = x * unit;
  const top = y * unit;
  lawn(pen, art, x, y, art.ink.grass);
  pen.fillStyle = tones.rim;
  box(pen, inset(left, top, unit, edge, unit * 0.05), corners(edge, unit * 0.32));
  pen.fillStyle = blend(tones.base, tones.light, smooth(x / 4, y / 4, art.salt + 70) * 0.25);
  box(pen, inset(left, top, unit, edge, unit * 0.09), corners(edge, unit * 0.28));
  // where two sides join and the corner between them does not, the grass takes a bite
  for (const [dx, dy, horizontal, vertical] of [
    [-1, -1, "west", "north"],
    [1, -1, "east", "north"],
    [-1, 1, "west", "south"],
    [1, 1, "east", "south"],
  ]) {
    if (edge[horizontal] || edge[vertical] || joins.includes(groundOf(art, x + dx, y + dy)))
      continue;
    pen.fillStyle = tones.rim;
    pen.beginPath();
    pen.arc(left + (dx > 0 ? unit : 0), top + (dy > 0 ? unit : 0), unit * 0.16, 0, TAU);
    pen.fill();
    pen.fillStyle = art.ink.grass[0];
    pen.beginPath();
    pen.arc(left + (dx > 0 ? unit : 0), top + (dy > 0 ? unit : 0), unit * 0.11, 0, TAU);
    pen.fill();
  }
  for (let index = 0; index < 4; index += 1) {
    pen.fillStyle = alpha(index % 2 ? tones.pebble : tones.light, 0.85);
    pen.beginPath();
    pen.ellipse(
      left + (0.15 + noise(x, y, art.salt + 80 + index) * 0.7) * unit,
      top + (0.15 + noise(y, x, art.salt + 90 + index) * 0.7) * unit,
      unit * (0.025 + noise(x, y, index) * 0.03),
      unit * (0.018 + noise(y, x, index) * 0.02),
      0,
      0,
      TAU,
    );
    pen.fill();
  }
  // tufts lean over the rim from the grass beside it
  pen.fillStyle = art.ink.grass[1];
  for (const [side, dx, dy] of SIDES) {
    if (!edge[side] || !["grass", "flowers", "tallgrass"].includes(art.kind(x + dx, y + dy)))
      continue;
    for (let index = 0; index < 3; index += 1) {
      const along = (0.2 + index * 0.3 + noise(x + index, y, art.salt + 95) * 0.1) * unit;
      const base = {
        x: dx === 0 ? left + along : dx < 0 ? left + unit * 0.04 : left + unit * 0.96,
        y: dy === 0 ? top + along : dy < 0 ? top + unit * 0.04 : top + unit * 0.96,
      };
      const reach = unit * 0.09;
      pen.beginPath();
      pen.moveTo(base.x - (dy === 0 ? 0 : reach * 0.4), base.y - (dx === 0 ? 0 : reach * 0.4));
      pen.lineTo(base.x - dx * reach, base.y - dy * reach);
      pen.lineTo(base.x + (dy === 0 ? 0 : reach * 0.4), base.y + (dx === 0 ? 0 : reach * 0.4));
      pen.closePath();
      pen.fill();
    }
  }
};

// cobbles in courses, every other course shifted half a stone, a kerb where the plaza ends
const plaza = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  pen.fillStyle = INK.plaza.joint;
  pen.fillRect(left, top, unit, unit);
  const gap = Math.max(1, unit * 0.03);
  const size = unit / 3;
  for (let course = 0; course < 3; course += 1) {
    const row = y * 3 + course;
    const shift = row % 2 ? 0.5 : 0;
    for (let stone = -1; stone < 3; stone += 1) {
      const at = { x: left + (stone + shift) * size + gap / 2, y: top + course * size + gap / 2 };
      pen.fillStyle = pick(INK.plaza.stones, noise(x * 3 + stone, row, art.salt + 100));
      pen.beginPath();
      pen.roundRect(at.x, at.y, size - gap, size - gap, size * 0.28);
      pen.fill();
      pen.fillStyle = alpha(INK.shine, 0.22);
      pen.fillRect(at.x + size * 0.15, at.y + gap * 0.5, size * 0.6, gap);
      pen.fillStyle = alpha(INK.shade, 0.1);
      pen.fillRect(at.x + size * 0.1, at.y + size - gap * 2.2, size * 0.7, gap);
    }
  }
  const edge = edges(art, x, y, [
    "plaza",
    "path",
    "dirt",
    "bridge",
    "door",
    "upstairs",
    "downstairs",
  ]);
  pen.fillStyle = INK.plaza.kerb;
  const kerb = unit * 0.07;
  if (edge.north) pen.fillRect(left, top, unit, kerb);
  if (edge.south) pen.fillRect(left, top + unit - kerb, unit, kerb);
  if (edge.west) pen.fillRect(left, top, kerb, unit);
  if (edge.east) pen.fillRect(left + unit - kerb, top, kerb, unit);
};

// big stone slabs, for floors that are no place for wood
const slabs = (pen, art, x, y, tone) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  pen.fillStyle = blend(tone, INK.shade, 0.3);
  pen.fillRect(left, top, unit, unit);
  const gap = Math.max(1, unit * 0.03);
  for (let course = 0; course < 2; course += 1) {
    const row = y * 2 + course;
    const shift = row % 2 ? 0.25 : 0;
    for (let slab = -1; slab < 2; slab += 1) {
      pen.fillStyle = blend(
        tone,
        noise(x * 2 + slab, row, art.salt + 105) < 0.5 ? INK.shade : INK.shine,
        noise(row, x * 2 + slab, art.salt + 106) * 0.12,
      );
      pen.fillRect(
        left + (slab * 0.5 + shift) * unit + gap / 2,
        top + course * 0.5 * unit + gap / 2,
        unit * 0.5 - gap,
        unit * 0.5 - gap,
      );
    }
  }
};

const boards = (pen, art, x, y, tone) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  for (let board = 0; board < 4; board += 1) {
    const row = y * 4 + board;
    const length = Math.floor((x + (row % 2)) / 2);
    pen.fillStyle = blend(
      tone,
      noise(length, row, art.salt + 110) < 0.5 ? INK.wood.dark : INK.wood.light,
      0.08 + noise(length, row, art.salt + 111) * 0.12,
    );
    pen.fillRect(left, top + board * unit * 0.25, unit, unit * 0.25);
    pen.fillStyle = alpha(INK.wood.dark, 0.45);
    pen.fillRect(
      left,
      top + (board + 1) * unit * 0.25 - Math.max(1, unit * 0.018),
      unit,
      Math.max(1, unit * 0.018),
    );
    if ((x + row) % 2 === 0)
      pen.fillRect(left, top + board * unit * 0.25, Math.max(1, unit * 0.018), unit * 0.25);
    pen.fillStyle = alpha(INK.wood.grain, 0.25);
    pen.fillRect(
      left + noise(x, row, art.salt + 112) * unit * 0.7,
      top + (board + 0.45) * unit * 0.25,
      unit * 0.22,
      Math.max(1, unit * 0.012),
    );
  }
};

const rug = (pen, art, x, y) => {
  const unit = art.unit;
  boards(pen, art, x, y, art.ink.floor);
  const edge = edges(art, x, y, ["rug"]);
  const left = x * unit;
  const top = y * unit;
  pen.fillStyle = blend(art.ink.accent, INK.shade, 0.25);
  box(pen, inset(left, top, unit, edge, unit * 0.08), corners(edge, unit * 0.06));
  pen.fillStyle = art.ink.accent;
  box(pen, inset(left, top, unit, edge, unit * 0.13), corners(edge, unit * 0.04));
  pen.strokeStyle = INK.gold.base;
  pen.lineWidth = Math.max(1, unit * 0.025);
  const trim = inset(left, top, unit, edge, unit * 0.2);
  rim(pen, trim, edge);
  pen.fillStyle = alpha(INK.gold.light, 0.55);
  pen.beginPath();
  pen.moveTo(left + unit / 2, top + unit * 0.32);
  pen.lineTo(left + unit * 0.68, top + unit / 2);
  pen.lineTo(left + unit / 2, top + unit * 0.68);
  pen.lineTo(left + unit * 0.32, top + unit / 2);
  pen.closePath();
  pen.fill();
};

const cavern = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  pen.fillStyle = blend(INK.cave.base, INK.cave.dark, smooth(x / 3, y / 3, art.salt) * 0.6);
  pen.fillRect(left, top, unit, unit);
  for (let row = y - 1; row <= y + 1; row += 1) {
    for (let column = x - 1; column <= x + 1; column += 1) {
      pen.fillStyle = alpha(
        noise(column, row, art.salt + 120) < 0.5 ? INK.cave.light : INK.cave.dark,
        0.5,
      );
      pen.beginPath();
      pen.arc(
        (column + noise(column, row, art.salt + 121)) * unit,
        (row + noise(column, row, art.salt + 122)) * unit,
        (0.18 + noise(column, row, art.salt + 123) * 0.25) * unit,
        0,
        TAU,
      );
      pen.fill();
    }
  }
  pen.strokeStyle = INK.cave.crack;
  pen.lineWidth = Math.max(1, unit * 0.02);
  if (noise(x, y, art.salt + 124) < 0.4) {
    pen.beginPath();
    pen.moveTo(left + unit * 0.2, top + unit * (0.3 + noise(x, y, 1) * 0.4));
    pen.lineTo(left + unit * 0.45, top + unit * (0.4 + noise(x, y, 2) * 0.3));
    pen.lineTo(left + unit * 0.75, top + unit * (0.3 + noise(x, y, 3) * 0.5));
    pen.stroke();
  }
  pen.fillStyle = INK.cave.light;
  pen.beginPath();
  pen.ellipse(
    left + unit * (0.2 + noise(y, x, 4) * 0.6),
    top + unit * (0.2 + noise(x, y, 5) * 0.6),
    unit * 0.04,
    unit * 0.028,
    0,
    0,
    TAU,
  );
  pen.fill();
};

// the ground of a placed thing's cell, drawn by that ground's own painter
const beneath = (pen, art, x, y, kind = underlay(art, x, y)) => GROUND[kind](pen, art, x, y);

// still water: one deep body with shallows fading in from every shore, its banks rounded where the
// land turns, lily pads by the shore. the light on it moves per frame
const water = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const wet = ["water", "bridge"];
  const edge = edges(art, x, y, wet);
  pen.fillStyle = INK.water.bank;
  pen.fillRect(left, top, unit, unit);
  const pool = inset(left, top, unit, edge, unit * 0.1);
  pen.fillStyle = blend(INK.water.deep, INK.water.base, smooth(x / 3, y / 3, art.salt + 125) * 0.5);
  box(pen, pool, corners(edge, unit * 0.48));
  pen.save();
  pen.beginPath();
  pen.roundRect(
    pool.left,
    pool.top,
    pool.right - pool.left,
    pool.bottom - pool.top,
    corners(edge, unit * 0.48),
  );
  pen.clip();
  for (const [side, dx, dy] of SIDES) {
    if (!edge[side]) continue;
    const from = { x: dx > 0 ? pool.right : pool.left, y: dy > 0 ? pool.bottom : pool.top };
    const shallow = pen.createLinearGradient(
      dx === 0 ? 0 : from.x,
      dy === 0 ? 0 : from.y,
      dx === 0 ? 0 : from.x - dx * unit * 0.5,
      dy === 0 ? 0 : from.y - dy * unit * 0.5,
    );
    shallow.addColorStop(0, alpha(INK.water.shallow, 0.9));
    shallow.addColorStop(1, alpha(INK.water.shallow, 0));
    pen.fillStyle = shallow;
    pen.fillRect(left, top, unit, unit);
  }
  pen.restore();
  // the shore's foam runs along the open sides only: the outline is pushed past the cell wherever
  // water goes on, and the cell's clip cuts it there
  pen.strokeStyle = alpha(INK.water.foam, 0.6);
  pen.lineWidth = Math.max(1, unit * 0.035);
  pen.beginPath();
  pen.roundRect(
    edge.west ? pool.left : left - unit,
    edge.north ? pool.top : top - unit,
    (edge.east ? pool.right : left + unit * 2) - (edge.west ? pool.left : left - unit),
    (edge.south ? pool.bottom : top + unit * 2) - (edge.north ? pool.top : top - unit),
    corners(edge, unit * 0.48),
  );
  pen.stroke();
  // where the land's corner pokes in, the bank turns by the width of its strip, meeting the strips
  // of the two cells beside it
  for (const [dx, dy, horizontal, vertical] of [
    [-1, -1, "west", "north"],
    [1, -1, "east", "north"],
    [-1, 1, "west", "south"],
    [1, 1, "east", "south"],
  ]) {
    if (edge[horizontal] || edge[vertical] || wet.includes(groundOf(art, x + dx, y + dy))) continue;
    const corner = { x: left + (dx > 0 ? unit : 0), y: top + (dy > 0 ? unit : 0) };
    pen.fillStyle = INK.water.bank;
    pen.beginPath();
    pen.arc(corner.x, corner.y, unit * 0.1, 0, TAU);
    pen.fill();
    pen.beginPath();
    pen.arc(corner.x, corner.y, unit * 0.11, 0, TAU);
    pen.stroke();
  }
  const shore = SIDES.some(([side]) => edge[side]);
  if (shore && art.map.kind === "outdoor" && noise(x, y, art.salt + 132) < 0.18) {
    const pad = {
      x: left + unit * (0.3 + noise(y, x, art.salt + 133) * 0.4),
      y: top + unit * (0.3 + noise(x, y, art.salt + 134) * 0.4),
    };
    pen.fillStyle = art.ink.leaf[1];
    pen.beginPath();
    pen.moveTo(pad.x, pad.y);
    pen.arc(pad.x, pad.y, unit * 0.13, 0.4, TAU - 0.2);
    pen.closePath();
    pen.fill();
    pen.fillStyle = art.ink.leaf[2];
    pen.beginPath();
    pen.moveTo(pad.x, pad.y);
    pen.arc(pad.x, pad.y, unit * 0.1, 0.5, TAU - 0.4);
    pen.closePath();
    pen.fill();
    if (noise(x, y, art.salt + 135) < 0.4) {
      pen.fillStyle = INK.water.lily;
      pen.beginPath();
      pen.arc(pad.x - unit * 0.03, pad.y - unit * 0.04, unit * 0.04, 0, TAU);
      pen.fill();
    }
  }
};

const bridge = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const wet = (dx, dy) => art.kind(x + dx, y + dy) === "water";
  const along = (dx, dy) => art.walks(x + dx, y + dy);
  const lengthwise = along(0, -1) || along(0, 1);
  const crosswise = along(-1, 0) || along(1, 0);
  const northward = lengthwise && (!crosswise || wet(-1, 0) || wet(1, 0));
  pen.fillStyle = INK.water.deep;
  pen.fillRect(left, top, unit, unit);
  for (let plank = 0; plank < 4; plank += 1) {
    pen.fillStyle = blend(
      INK.wood.base,
      INK.wood.light,
      noise(x * 4 + plank, y, art.salt + 140) * 0.5,
    );
    if (northward) pen.fillRect(left, top + plank * unit * 0.25 + unit * 0.02, unit, unit * 0.21);
    else pen.fillRect(left + plank * unit * 0.25 + unit * 0.02, top, unit * 0.21, unit);
  }
  pen.fillStyle = INK.wood.dark;
  const rail = unit * 0.09;
  for (const [side, dx, dy] of SIDES) {
    if (!wet(dx, dy)) continue;
    if (side === "west") pen.fillRect(left, top, rail, unit);
    if (side === "east") pen.fillRect(left + unit - rail, top, rail, unit);
    if (side === "north") pen.fillRect(left, top, unit, rail);
    if (side === "south") pen.fillRect(left, top + unit - rail, unit, rail);
  }
  pen.fillStyle = INK.wood.light;
  for (const [side, dx, dy] of SIDES) {
    if (!wet(dx, dy)) continue;
    const post = {
      x: side === "east" ? left + unit - rail : left,
      y: side === "south" ? top + unit - rail : top,
    };
    pen.fillRect(post.x, post.y, rail, rail);
  }
};

const steps = (pen, art, x, y, rising) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const tones = art.map.kind === "indoor" ? INK.wood : INK.stone;
  for (let step = 0; step < 4; step += 1) {
    const height = rising ? step : 3 - step;
    pen.fillStyle = blend(tones.dark, tones.light, (height + 1) / 5);
    pen.fillRect(left, top + step * unit * 0.25, unit, unit * 0.25);
    pen.fillStyle = alpha(INK.shade, 0.3);
    pen.fillRect(
      left,
      top + (step + 1) * unit * 0.25 - Math.max(1, unit * 0.03),
      unit,
      Math.max(1, unit * 0.03),
    );
  }
  for (const [side, dx] of [
    ["west", -1],
    ["east", 1],
  ]) {
    if (["upstairs", "downstairs"].includes(art.kind(x + dx, y))) continue;
    pen.fillStyle = art.map.kind === "outdoor" ? INK.cliff.dark : tones.dark;
    pen.fillRect(side === "west" ? left : left + unit - unit * 0.1, top, unit * 0.1, unit);
  }
};

// a doorway out of a room: the floor runs to the threshold, a mat lies on it, daylight spills in
const threshold = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const floor = art.map.kind === "cave" ? "cave" : "floor";
  beneath(pen, art, x, y, floor);
  const outward = art.walks(x, y + 1) ? -1 : 1;
  const light = pen.createLinearGradient(
    0,
    outward > 0 ? top + unit : top,
    0,
    outward > 0 ? top : top + unit,
  );
  light.addColorStop(0, alpha(INK.linen, 0.75));
  light.addColorStop(1, alpha(INK.linen, 0));
  pen.fillStyle = light;
  pen.fillRect(left, top, unit, unit);
  pen.fillStyle = blend(art.ink.accent, INK.shade, 0.15);
  pen.beginPath();
  pen.roundRect(left + unit * 0.16, top + unit * 0.3, unit * 0.68, unit * 0.4, unit * 0.06);
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.18);
  pen.fillRect(left + unit * 0.22, top + unit * 0.36, unit * 0.56, unit * 0.06);
  pen.fillStyle = art.ink.timber;
  if (!art.walks(x - 1, y)) pen.fillRect(left, top, unit * 0.1, unit);
  if (!art.walks(x + 1, y)) pen.fillRect(left + unit * 0.9, top, unit * 0.1, unit);
};

// a cave's mouth: outdoors a dark arch in the rock; inside the cave, the bright way out
const mouth = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const inside = art.map.kind === "cave";
  pen.fillStyle = inside ? INK.rockwall.face : INK.cliff.face;
  pen.fillRect(left, top, unit, unit);
  const pairedLeft = art.kind(x - 1, y) === "mouth";
  const pairedRight = art.kind(x + 1, y) === "mouth";
  const from = left + (pairedLeft ? 0 : unit * 0.14);
  const to = left + unit - (pairedRight ? 0 : unit * 0.14);
  const hollow = pen.createLinearGradient(0, top, 0, top + unit);
  hollow.addColorStop(0, inside ? alpha(INK.linen, 0.95) : INK.dark);
  hollow.addColorStop(1, inside ? alpha(INK.linen, 0.55) : blend(INK.dark, INK.cave.base, 0.5));
  const arch = () => {
    pen.moveTo(from, top + unit);
    if (pairedLeft) pen.moveTo(left, top + unit * 0.12);
    else {
      pen.lineTo(from, top + unit * 0.42);
      pen.quadraticCurveTo(from, top + unit * 0.14, (from + to) / 2, top + unit * 0.12);
    }
    pen.lineTo(pairedRight ? left + unit : (from + to) / 2, top + unit * 0.12);
    if (!pairedRight) {
      pen.quadraticCurveTo(to, top + unit * 0.14, to, top + unit * 0.42);
      pen.lineTo(to, top + unit);
    }
  };
  pen.fillStyle = hollow;
  pen.beginPath();
  pen.rect(from, top + unit * 0.42, to - from, unit * 0.58);
  arch();
  pen.lineTo(pairedRight ? left + unit : to, top + unit);
  pen.lineTo(pairedLeft ? left : from, top + unit);
  pen.closePath();
  pen.fill();
  pen.strokeStyle = inside ? INK.rockwall.light : INK.cliff.light;
  pen.lineWidth = Math.max(1, unit * 0.05);
  pen.beginPath();
  arch();
  pen.stroke();
};

const hedge = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const face = art.kind(x, y + 1) !== "hedge";
  pen.fillStyle = INK.hedge.base;
  pen.fillRect(left, top, unit, unit);
  // leaves on a half-tile lattice that ignores tile edges: a hollow under each, light on its crown
  for (let row = y * 2 - 1; row <= y * 2 + 2; row += 1) {
    for (let column = x * 2 - 1; column <= x * 2 + 2; column += 1) {
      const at = {
        x: (column + noise(column, row, art.salt + 150)) * unit * 0.5,
        y: (row + noise(row, column, art.salt + 160)) * unit * 0.5,
      };
      const radius = unit * (0.13 + noise(column, row, art.salt + 170) * 0.07);
      pen.fillStyle = alpha(INK.hedge.dark, 0.55);
      pen.beginPath();
      pen.arc(at.x + radius * 0.2, at.y + radius * 0.35, radius, 0, TAU);
      pen.fill();
      pen.fillStyle = noise(column, row, art.salt + 171) < 0.5 ? INK.hedge.base : INK.hedge.light;
      pen.beginPath();
      pen.arc(at.x, at.y, radius * 0.92, 0, TAU);
      pen.fill();
      pen.fillStyle = alpha(INK.shine, 0.16);
      pen.beginPath();
      pen.arc(at.x - radius * 0.3, at.y - radius * 0.35, radius * 0.35, 0, TAU);
      pen.fill();
    }
  }
  if (art.kind(x, y - 1) !== "hedge") {
    pen.fillStyle = INK.hedge.light;
    for (let bump = 0; bump < 3; bump += 1) {
      pen.beginPath();
      pen.arc(left + ((bump + 0.5) * unit) / 3, top + unit * 0.12, unit * 0.17, Math.PI, 0);
      pen.fill();
    }
  }
  if (!face) return;
  const lip = top + unit * 0.6;
  const shade = pen.createLinearGradient(0, lip, 0, top + unit);
  shade.addColorStop(0, INK.hedge.dark);
  shade.addColorStop(1, INK.hedge.deep);
  pen.fillStyle = shade;
  pen.fillRect(left, lip, unit, top + unit - lip);
  pen.fillStyle = INK.hedge.base;
  for (let bump = 0; bump < 4; bump += 1) {
    pen.beginPath();
    pen.arc(left + ((bump + 0.5) * unit) / 4, lip, unit * 0.13, 0, Math.PI);
    pen.fill();
  }
  pen.fillStyle = alpha(INK.hedge.light, 0.3);
  for (let leaf = 0; leaf < 3; leaf += 1) {
    pen.beginPath();
    pen.arc(
      left + (0.2 + noise(x, y, leaf + 175) * 0.6) * unit,
      top + unit * (0.74 + noise(y, x, leaf) * 0.1),
      unit * 0.045,
      0,
      TAU,
    );
    pen.fill();
  }
  pen.fillStyle = alpha(INK.shade, 0.22);
  pen.fillRect(left, top + unit * 0.95, unit, unit * 0.05);
};

// a cliff shows its grassy top, and its rock face wherever the cliff ends to the south
const cliff = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const below = art.kind(x, y + 1);
  const face = !["cliff", "mouth"].includes(below);
  if (!face) {
    lawn(pen, art, x, y, art.ink.wild);
    pen.fillStyle = alpha(INK.cliff.dark, 0.35);
    for (const [side, dx, dy] of SIDES) {
      if (["cliff", "mouth"].includes(art.kind(x + dx, y + dy)) || side === "south") continue;
      if (side === "north") pen.fillRect(left, top, unit, unit * 0.08);
      if (side === "west") pen.fillRect(left, top, unit * 0.08, unit);
      if (side === "east") pen.fillRect(left + unit * 0.92, top, unit * 0.08, unit);
    }
    return;
  }
  const rock = pen.createLinearGradient(0, top, 0, top + unit);
  rock.addColorStop(0, INK.cliff.light);
  rock.addColorStop(1, INK.cliff.dark);
  pen.fillStyle = rock;
  pen.fillRect(left, top, unit, unit);
  pen.strokeStyle = alpha(INK.cliff.strata, 0.9);
  pen.lineWidth = Math.max(1, unit * 0.03);
  pen.beginPath();
  for (let band = 1; band < 4; band += 1) {
    const level = top + unit * (0.18 + band * 0.22);
    pen.moveTo(left, level + Math.sin(x * 2.1 + band) * unit * 0.03);
    pen.quadraticCurveTo(
      left + unit / 2,
      level + Math.sin(x + band * 1.7) * unit * 0.05,
      left + unit,
      level + Math.sin((x + 1) * 2.1 + band) * unit * 0.03,
    );
  }
  pen.stroke();
  pen.strokeStyle = alpha(INK.cliff.dark, 0.7);
  pen.beginPath();
  const crack = left + unit * (0.2 + noise(x, y, art.salt + 180) * 0.6);
  pen.moveTo(crack, top + unit * 0.3);
  pen.lineTo(crack + unit * 0.05, top + unit * 0.55);
  pen.lineTo(crack - unit * 0.02, top + unit * 0.8);
  pen.stroke();
  if (art.kind(x, y - 1) !== "cliff") {
    pen.fillStyle = INK.cliff.lip;
    pen.fillRect(left, top, unit, unit * 0.14);
    for (let tuft = 0; tuft < 4; tuft += 1) {
      pen.beginPath();
      pen.arc(left + ((tuft + 0.5) * unit) / 4, top + unit * 0.13, unit * 0.06, 0, Math.PI);
      pen.fill();
    }
  }
  pen.fillStyle = alpha(INK.shade, 0.25);
  pen.fillRect(left, top + unit * 0.92, unit, unit * 0.08);
};

const boulder = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y);
  const centre = { x: (x + 0.5) * unit, y: (y + 0.58) * unit };
  shadow(pen, centre.x + unit * 0.04, centre.y + unit * 0.24, unit * 0.36);
  pen.fillStyle = INK.rock.base;
  pen.beginPath();
  pen.moveTo(centre.x - unit * 0.36, centre.y + unit * 0.22);
  pen.quadraticCurveTo(
    centre.x - unit * 0.42,
    centre.y - unit * 0.2,
    centre.x - unit * 0.1,
    centre.y - unit * 0.32,
  );
  pen.quadraticCurveTo(
    centre.x + unit * 0.3,
    centre.y - unit * 0.36,
    centre.x + unit * 0.38,
    centre.y,
  );
  pen.quadraticCurveTo(
    centre.x + unit * 0.4,
    centre.y + unit * 0.24,
    centre.x,
    centre.y + unit * 0.26,
  );
  pen.closePath();
  pen.fill();
  pen.fillStyle = INK.rock.dark;
  pen.beginPath();
  pen.moveTo(centre.x - unit * 0.34, centre.y + unit * 0.1);
  pen.quadraticCurveTo(
    centre.x,
    centre.y + unit * 0.2,
    centre.x + unit * 0.38,
    centre.y + unit * 0.02,
  );
  pen.quadraticCurveTo(
    centre.x + unit * 0.38,
    centre.y + unit * 0.24,
    centre.x,
    centre.y + unit * 0.26,
  );
  pen.quadraticCurveTo(
    centre.x - unit * 0.3,
    centre.y + unit * 0.26,
    centre.x - unit * 0.34,
    centre.y + unit * 0.1,
  );
  pen.fill();
  pen.fillStyle = alpha(INK.rock.light, 0.9);
  pen.beginPath();
  pen.ellipse(
    centre.x - unit * 0.1,
    centre.y - unit * 0.18,
    unit * 0.14,
    unit * 0.06,
    -0.3,
    0,
    TAU,
  );
  pen.fill();
  if (art.map.kind === "outdoor") {
    pen.fillStyle = alpha(art.ink.wild[0], 0.8);
    pen.beginPath();
    pen.ellipse(
      centre.x + unit * 0.12,
      centre.y - unit * 0.26,
      unit * 0.1,
      unit * 0.04,
      0.2,
      0,
      TAU,
    );
    pen.fill();
  }
};

const fence = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y);
  const left = x * unit;
  const top = y * unit;
  const joined = (dx, dy) => art.kind(x + dx, y + dy) === "fence";
  const middle = left + unit / 2;
  pen.fillStyle = INK.wood.base;
  for (const level of [0.42, 0.66]) {
    const from = joined(-1, 0) ? left : middle;
    const to = joined(1, 0) ? left + unit : middle;
    if (to > from) pen.fillRect(from, top + unit * level, to - from, unit * 0.08);
  }
  const north = joined(0, -1) ? top : top + unit * 0.3;
  const south = joined(0, 1) ? top + unit : top + unit * 0.72;
  pen.fillStyle = INK.wood.dark;
  if (joined(0, -1) || joined(0, 1))
    pen.fillRect(middle - unit * 0.05, north, unit * 0.1, south - north);
  shadow(pen, middle + unit * 0.03, top + unit * 0.8, unit * 0.09, 0.2);
  pen.fillStyle = INK.wood.base;
  pen.fillRect(middle - unit * 0.07, top + unit * 0.3, unit * 0.14, unit * 0.5);
  pen.fillStyle = INK.wood.light;
  pen.fillRect(middle - unit * 0.07, top + unit * 0.3, unit * 0.14, unit * 0.06);
};

const bench = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y);
  const left = x * unit;
  const top = y * unit;
  shadow(pen, left + unit / 2, top + unit * 0.8, unit * 0.38, 0.2);
  pen.fillStyle = INK.iron.base;
  pen.fillRect(left + unit * 0.16, top + unit * 0.55, unit * 0.06, unit * 0.25);
  pen.fillRect(left + unit * 0.78, top + unit * 0.55, unit * 0.06, unit * 0.25);
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(left + unit * 0.1, top + unit * 0.24, unit * 0.8, unit * 0.12);
  pen.fillStyle = INK.wood.base;
  pen.fillRect(left + unit * 0.1, top + unit * 0.48, unit * 0.8, unit * 0.1);
  pen.fillRect(left + unit * 0.1, top + unit * 0.38, unit * 0.8, unit * 0.08);
  pen.fillStyle = INK.wood.light;
  pen.fillRect(left + unit * 0.1, top + unit * 0.24, unit * 0.8, unit * 0.03);
};

const crate = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y);
  const left = x * unit + unit * 0.12;
  const top = y * unit + unit * 0.14;
  const size = unit * 0.76;
  shadow(pen, left + size / 2 + unit * 0.04, top + size, size * 0.52, 0.22);
  pen.fillStyle = INK.wood.base;
  pen.fillRect(left, top, size, size);
  pen.fillStyle = INK.wood.light;
  pen.fillRect(left, top, size, size * 0.22);
  pen.strokeStyle = INK.wood.dark;
  pen.lineWidth = Math.max(1, unit * 0.04);
  pen.strokeRect(
    left + pen.lineWidth / 2,
    top + size * 0.22,
    size - pen.lineWidth,
    size * 0.78 - pen.lineWidth / 2,
  );
  pen.beginPath();
  pen.moveTo(left, top + size * 0.22);
  pen.lineTo(left + size, top + size);
  pen.moveTo(left + size, top + size * 0.22);
  pen.lineTo(left, top + size);
  pen.stroke();
};

const well = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y);
  const centre = { x: (x + 0.5) * unit, y: (y + 0.62) * unit };
  shadow(pen, centre.x, centre.y + unit * 0.2, unit * 0.42, 0.25);
  pen.fillStyle = INK.stone.dark;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y + unit * 0.06, unit * 0.38, unit * 0.26, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.stone.base;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y, unit * 0.38, unit * 0.24, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.water.deep;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y, unit * 0.25, unit * 0.14, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = alpha(INK.water.foam, 0.4);
  pen.beginPath();
  pen.ellipse(centre.x - unit * 0.06, centre.y - unit * 0.03, unit * 0.08, unit * 0.03, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(centre.x - unit * 0.36, centre.y - unit * 0.5, unit * 0.06, unit * 0.5);
  pen.fillRect(centre.x + unit * 0.3, centre.y - unit * 0.5, unit * 0.06, unit * 0.5);
  pen.fillStyle = art.ink.roofs[0];
  pen.beginPath();
  pen.moveTo(centre.x - unit * 0.46, centre.y - unit * 0.42);
  pen.lineTo(centre.x, centre.y - unit * 0.6);
  pen.lineTo(centre.x + unit * 0.46, centre.y - unit * 0.42);
  pen.closePath();
  pen.fill();
};

// a fountain drawn whole over its block of cells, each cell keeping its own share of the basin
const fountain = (pen, art, x, y) => {
  const unit = art.unit;
  const bounds = art.fountains.get(`${x}:${y}`);
  beneath(pen, art, x, y);
  const centre = {
    x: ((bounds.left + bounds.right + 1) / 2) * unit,
    y: ((bounds.top + bounds.bottom + 1) / 2) * unit,
  };
  const radius = {
    x: ((bounds.right - bounds.left + 1) / 2) * unit * 0.94,
    y: ((bounds.bottom - bounds.top + 1) / 2) * unit * 0.86,
  };
  shadow(pen, centre.x, centre.y + radius.y * 0.5, radius.x * 1.02, 0.22);
  pen.fillStyle = INK.stone.dark;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y + unit * 0.08, radius.x, radius.y, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.stone.light;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y, radius.x, radius.y, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.water.base;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y, radius.x * 0.84, radius.y * 0.8, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = alpha(INK.water.shallow, 0.6);
  pen.beginPath();
  pen.ellipse(centre.x, centre.y - radius.y * 0.1, radius.x * 0.6, radius.y * 0.5, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.stone.base;
  pen.fillRect(centre.x - unit * 0.12, centre.y - unit * 0.55, unit * 0.24, unit * 0.6);
  pen.fillStyle = INK.stone.light;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y - unit * 0.55, unit * 0.36, unit * 0.13, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.water.shallow;
  pen.beginPath();
  pen.ellipse(centre.x, centre.y - unit * 0.57, unit * 0.27, unit * 0.08, 0, 0, TAU);
  pen.fill();
};

const stall = (pen, art, x, y) => {
  beneath(pen, art, x, y);
  counterFront(pen, art, x, y, 0.35);
};

// a market counter seen from the south: its top with the day's goods, its planked front
const counterFront = (pen, art, x, y, from) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  pen.fillStyle = INK.wood.light;
  pen.fillRect(left, top + unit * from, unit, unit * 0.2);
  pen.fillStyle = INK.wood.base;
  pen.fillRect(left, top + unit * (from + 0.2), unit, unit * (0.75 - from));
  pen.fillStyle = alpha(INK.wood.dark, 0.6);
  for (let plank = 1; plank < 3; plank += 1)
    pen.fillRect(
      left + (plank * unit) / 3,
      top + unit * (from + 0.2),
      Math.max(1, unit * 0.02),
      unit * (0.75 - from),
    );
  for (let good = 0; good < 3; good += 1) {
    pen.fillStyle = pick(INK.goods, noise(x + good, y, art.salt + 190));
    pen.beginPath();
    pen.arc(left + (0.2 + good * 0.3) * unit, top + unit * (from + 0.04), unit * 0.09, 0, TAU);
    pen.fill();
    pen.fillStyle = alpha(INK.shine, 0.45);
    pen.beginPath();
    pen.arc(left + (0.18 + good * 0.3) * unit, top + unit * (from + 0.01), unit * 0.03, 0, TAU);
    pen.fill();
  }
  pen.fillStyle = alpha(INK.shade, 0.2);
  pen.fillRect(left, top + unit * 0.95, unit, unit * 0.05);
};

// a room's wall: its face where the floor lies south of it, else its top seen from above
const inner = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const face = art.kind(x, y + 1) !== "inner";
  if (!face) {
    pen.fillStyle = art.ink.timber;
    pen.fillRect(left, top, unit, unit);
    pen.fillStyle = alpha(INK.shine, 0.12);
    for (const [side, dx, dy] of SIDES) {
      if (art.kind(x + dx, y + dy) === "inner") continue;
      if (side === "north") pen.fillRect(left, top, unit, unit * 0.08);
      if (side === "west") pen.fillRect(left, top, unit * 0.08, unit);
      if (side === "east") pen.fillRect(left + unit * 0.92, top, unit * 0.08, unit);
    }
    return;
  }
  pen.fillStyle = art.ink.timber;
  pen.fillRect(left, top, unit, unit * 0.16);
  pen.fillStyle = art.ink.paper;
  pen.fillRect(left, top + unit * 0.16, unit, unit * 0.84);
  pen.fillStyle = alpha(INK.shade, 0.05);
  for (let stripe = 0; stripe < 4; stripe += 1)
    pen.fillRect(left + ((stripe + 0.35) * unit) / 4, top + unit * 0.16, unit * 0.06, unit * 0.5);
  pen.fillStyle = blend(art.ink.floor, INK.shade, 0.15);
  pen.fillRect(left, top + unit * 0.66, unit, unit * 0.34);
  pen.fillStyle = alpha(INK.shine, 0.18);
  pen.fillRect(left, top + unit * 0.66, unit, unit * 0.03);
  pen.fillStyle = alpha(INK.shade, 0.3);
  pen.fillRect(left, top + unit * 0.94, unit, unit * 0.06);
  const decor = noise(x, y, art.salt + 200);
  if (decor < 0.22) {
    pen.fillStyle = art.ink.timber;
    pen.fillRect(left + unit * 0.24, top + unit * 0.24, unit * 0.52, unit * 0.36);
    pen.fillStyle = INK.glass.base;
    pen.fillRect(left + unit * 0.29, top + unit * 0.28, unit * 0.42, unit * 0.28);
    pen.fillStyle = alpha(INK.glass.light, 0.8);
    pen.fillRect(left + unit * 0.32, top + unit * 0.3, unit * 0.12, unit * 0.06);
    pen.fillStyle = art.ink.timber;
    pen.fillRect(left + unit * 0.48, top + unit * 0.28, unit * 0.04, unit * 0.28);
  } else if (decor < 0.36) {
    pen.fillStyle = INK.gold.dark;
    pen.fillRect(left + unit * 0.3, top + unit * 0.26, unit * 0.4, unit * 0.3);
    pen.fillStyle = pick(INK.books, noise(y, x, art.salt));
    pen.fillRect(left + unit * 0.34, top + unit * 0.3, unit * 0.32, unit * 0.22);
    pen.fillStyle = alpha(INK.shine, 0.35);
    pen.beginPath();
    pen.arc(left + unit * 0.44, top + unit * 0.38, unit * 0.05, 0, TAU);
    pen.fill();
  }
};

const counter = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y, "floor");
  const left = x * unit;
  const top = y * unit;
  const joined = (dx) => art.kind(x + dx, y) === "counter";
  const from = joined(-1) ? left : left + unit * 0.06;
  const to = joined(1) ? left + unit : left + unit * 0.94;
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(from, top + unit * 0.42, to - from, unit * 0.52);
  pen.fillStyle = INK.wood.base;
  pen.fillRect(from, top + unit * 0.12, to - from, unit * 0.34);
  pen.fillStyle = INK.wood.light;
  pen.fillRect(from, top + unit * 0.12, to - from, unit * 0.05);
  pen.fillStyle = alpha(INK.wood.grain, 0.5);
  pen.fillRect(from, top + unit * 0.62, to - from, Math.max(1, unit * 0.02));
};

const table = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y);
  const left = x * unit;
  const top = y * unit;
  const edge = Object.fromEntries(
    SIDES.map(([side, dx, dy]) => [side, art.kind(x + dx, y + dy) !== "table"]),
  );
  const area = inset(left, top, unit, edge, unit * 0.1);
  shadow(pen, left + unit / 2, top + unit * 0.86, unit * 0.4, 0.18);
  pen.fillStyle = INK.wood.dark;
  if (edge.south && edge.west)
    pen.fillRect(area.left + unit * 0.04, area.bottom - unit * 0.2, unit * 0.07, unit * 0.22);
  if (edge.south && edge.east)
    pen.fillRect(area.right - unit * 0.11, area.bottom - unit * 0.2, unit * 0.07, unit * 0.22);
  pen.fillStyle = INK.wood.base;
  box(pen, { ...area, bottom: area.bottom - unit * 0.14 }, corners(edge, unit * 0.06));
  pen.fillStyle = INK.wood.light;
  box(pen, { ...area, bottom: area.bottom - unit * 0.24 }, corners(edge, unit * 0.06));
  if (noise(x, y, art.salt + 210) < 0.5) {
    pen.fillStyle = INK.linen;
    pen.beginPath();
    pen.ellipse(
      left + unit * (0.35 + noise(y, x, 3) * 0.3),
      top + unit * 0.4,
      unit * 0.09,
      unit * 0.06,
      0,
      0,
      TAU,
    );
    pen.fill();
    pen.fillStyle = alpha(art.ink.accent, 0.8);
    pen.beginPath();
    pen.ellipse(
      left + unit * (0.35 + noise(y, x, 3) * 0.3),
      top + unit * 0.39,
      unit * 0.05,
      unit * 0.03,
      0,
      0,
      TAU,
    );
    pen.fill();
  }
};

const anvil = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y);
  const middle = (x + 0.5) * unit;
  const top = y * unit;
  shadow(pen, middle, top + unit * 0.86, unit * 0.4, 0.3);
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(middle - unit * 0.24, top + unit * 0.56, unit * 0.48, unit * 0.32);
  pen.fillStyle = INK.wood.base;
  pen.fillRect(middle - unit * 0.24, top + unit * 0.56, unit * 0.48, unit * 0.06);
  pen.fillStyle = INK.iron.dark;
  pen.fillRect(middle - unit * 0.14, top + unit * 0.4, unit * 0.28, unit * 0.18);
  pen.fillStyle = INK.iron.base;
  pen.beginPath();
  pen.moveTo(middle - unit * 0.46, top + unit * 0.22);
  pen.quadraticCurveTo(
    middle - unit * 0.3,
    top + unit * 0.24,
    middle - unit * 0.22,
    top + unit * 0.2,
  );
  pen.lineTo(middle + unit * 0.36, top + unit * 0.2);
  pen.lineTo(middle + unit * 0.36, top + unit * 0.42);
  pen.lineTo(middle - unit * 0.22, top + unit * 0.42);
  pen.quadraticCurveTo(
    middle - unit * 0.3,
    top + unit * 0.3,
    middle - unit * 0.46,
    top + unit * 0.22,
  );
  pen.fill();
  pen.fillStyle = INK.iron.light;
  pen.fillRect(middle - unit * 0.22, top + unit * 0.2, unit * 0.58, unit * 0.05);
};

// a hearth drawn whole over its block of cells: one stone surround, one mouth, one fire
const hearth = (pen, art, x, y) => {
  const unit = art.unit;
  const bounds = art.hearths.get(`${x}:${y}`);
  beneath(pen, art, x, y, BASE[art.map.kind]);
  const left = bounds.left * unit;
  const right = (bounds.right + 1) * unit;
  const top = bounds.top * unit;
  const bottom = (bounds.bottom + 1) * unit;
  pen.fillStyle = INK.stone.dark;
  pen.fillRect(
    left + unit * 0.04,
    top + unit * 0.06,
    right - left - unit * 0.08,
    bottom - top - unit * 0.06,
  );
  pen.fillStyle = INK.stone.base;
  pen.fillRect(
    left + unit * 0.04,
    top + unit * 0.06,
    right - left - unit * 0.08,
    bottom - top - unit * 0.14,
  );
  pen.strokeStyle = INK.stone.mortar;
  pen.lineWidth = Math.max(1, unit * 0.025);
  pen.beginPath();
  for (let course = top + unit * 0.26; course < bottom - unit * 0.1; course += unit * 0.2) {
    pen.moveTo(left + unit * 0.04, course);
    pen.lineTo(right - unit * 0.04, course);
  }
  pen.stroke();
  pen.fillStyle = INK.stone.light;
  pen.fillRect(left, top, right - left, unit * 0.1);
  const mouth = {
    left: left + unit * 0.22,
    right: right - unit * 0.22,
    top: top + unit * 0.42,
    bottom: bottom - unit * 0.06,
  };
  const depth = pen.createLinearGradient(0, mouth.top, 0, mouth.bottom);
  depth.addColorStop(0, INK.dark);
  depth.addColorStop(1, blend(INK.fire.ember, INK.dark, 0.55));
  pen.fillStyle = depth;
  pen.beginPath();
  pen.moveTo(mouth.left, mouth.bottom);
  pen.lineTo(mouth.left, mouth.top + unit * 0.2);
  pen.quadraticCurveTo(mouth.left, mouth.top, mouth.left + unit * 0.25, mouth.top);
  pen.lineTo(mouth.right - unit * 0.25, mouth.top);
  pen.quadraticCurveTo(mouth.right, mouth.top, mouth.right, mouth.top + unit * 0.2);
  pen.lineTo(mouth.right, mouth.bottom);
  pen.closePath();
  pen.fill();
  pen.fillStyle = INK.fire.ember;
  pen.fillRect(
    mouth.left + unit * 0.06,
    mouth.bottom - unit * 0.1,
    mouth.right - mouth.left - unit * 0.12,
    unit * 0.08,
  );
};

const bed = (pen, art, x, y) => {
  const unit = art.unit;
  beneath(pen, art, x, y, "floor");
  const left = x * unit;
  const top = y * unit;
  const head = art.kind(x, y - 1) !== "bed";
  const foot = art.kind(x, y + 1) !== "bed";
  const from = top + (head ? unit * 0.06 : 0);
  const to = top + unit - (foot ? unit * 0.08 : 0);
  shadow(pen, left + unit / 2, to, unit * 0.42, 0.2);
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(left + unit * 0.08, from, unit * 0.84, to - from);
  pen.fillStyle = INK.linen;
  pen.fillRect(left + unit * 0.13, from + unit * 0.04, unit * 0.74, to - from - unit * 0.06);
  if (head) {
    pen.fillStyle = INK.wood.base;
    pen.fillRect(left + unit * 0.08, from, unit * 0.84, unit * 0.12);
    pen.fillStyle = INK.shine;
    pen.beginPath();
    pen.roundRect(left + unit * 0.2, from + unit * 0.16, unit * 0.6, unit * 0.22, unit * 0.08);
    pen.fill();
  }
  pen.fillStyle = art.ink.accent;
  const sheetTop = head ? from + unit * 0.44 : from;
  pen.fillRect(left + unit * 0.13, sheetTop, unit * 0.74, to - sheetTop - unit * 0.02);
  pen.fillStyle = alpha(INK.shine, 0.25);
  if (head) pen.fillRect(left + unit * 0.13, sheetTop, unit * 0.74, unit * 0.06);
};

const rockwall = (pen, art, x, y) => {
  const unit = art.unit;
  const left = x * unit;
  const top = y * unit;
  const face = !["rockwall", "crystal"].includes(art.kind(x, y + 1));
  if (!face) {
    pen.fillStyle = INK.rockwall.top;
    pen.fillRect(left, top, unit, unit);
    pen.fillStyle = alpha(INK.rockwall.light, 0.35);
    for (let lump = 0; lump < 3; lump += 1) {
      pen.beginPath();
      pen.arc(
        left + (0.2 + noise(x, y, art.salt + 220 + lump) * 0.6) * unit,
        top + (0.2 + noise(y, x, art.salt + 230 + lump) * 0.6) * unit,
        unit * 0.12,
        0,
        TAU,
      );
      pen.fill();
    }
    return;
  }
  const rock = pen.createLinearGradient(0, top, 0, top + unit);
  rock.addColorStop(0, INK.rockwall.light);
  rock.addColorStop(1, INK.rockwall.face);
  pen.fillStyle = rock;
  pen.fillRect(left, top, unit, unit);
  pen.strokeStyle = alpha(INK.rockwall.dark, 0.8);
  pen.lineWidth = Math.max(1, unit * 0.03);
  pen.beginPath();
  for (let band = 1; band < 4; band += 1) {
    const level = top + unit * band * 0.25 + Math.sin(x * 1.7 + band) * unit * 0.04;
    pen.moveTo(left, level);
    pen.lineTo(left + unit * 0.4, level + unit * 0.04);
    pen.lineTo(left + unit, level - unit * 0.02);
  }
  pen.stroke();
  pen.fillStyle = alpha(INK.shade, 0.35);
  pen.fillRect(left, top + unit * 0.9, unit, unit * 0.1);
};

const GROUND = {
  grass: (pen, art, x, y) => lawn(pen, art, x, y, art.ink.grass),
  flowers: (pen, art, x, y) => {
    lawn(pen, art, x, y, art.ink.grass);
    blossoms(pen, art, x, y);
  },
  tallgrass: meadow,
  path: (pen, art, x, y) => worn(pen, art, x, y, "path"),
  dirt: (pen, art, x, y) => worn(pen, art, x, y, "dirt"),
  sand: (pen, art, x, y) => worn(pen, art, x, y, "sand"),
  plaza,
  bridge,
  floor: (pen, art, x, y) => (art.ink.paved ? slabs : boards)(pen, art, x, y, art.ink.floor),
  rug,
  cave: cavern,
  door: (pen, art, x, y) =>
    art.built.has(`${x}:${y}`)
      ? beneath(pen, art, x, y + 1, underlay(art, x, y + 1))
      : threshold(pen, art, x, y),
  mouth,
  upstairs: (pen, art, x, y) => steps(pen, art, x, y, true),
  downstairs: (pen, art, x, y) => steps(pen, art, x, y, false),
  water,
  tree: (pen, art, x, y) => {
    beneath(pen, art, x, y);
    shadow(pen, (x + 0.56) * art.unit, (y + 0.86) * art.unit, art.unit * 0.42, 0.28);
  },
  pine: (pen, art, x, y) => {
    beneath(pen, art, x, y);
    shadow(pen, (x + 0.56) * art.unit, (y + 0.88) * art.unit, art.unit * 0.36, 0.3);
  },
  hedge,
  cliff,
  rock: boulder,
  fence,
  roof: (pen, art, x, y) => beneath(pen, art, x, y, BASE[art.map.kind]),
  wall: (pen, art, x, y) => beneath(pen, art, x, y, BASE[art.map.kind]),
  window: (pen, art, x, y) => beneath(pen, art, x, y, BASE[art.map.kind]),
  stall: (pen, art, x, y) =>
    art.built.has(`${x}:${y}`)
      ? beneath(pen, art, x, y, underlay(art, x, y))
      : stall(pen, art, x, y),
  well,
  fountain,
  lamp: (pen, art, x, y) => {
    beneath(pen, art, x, y);
    shadow(pen, (x + 0.5) * art.unit, (y + 0.86) * art.unit, art.unit * 0.16, 0.3);
  },
  bench,
  crate,
  inner,
  shelf: (pen, art, x, y) => beneath(pen, art, x, y),
  counter,
  table,
  anvil,
  column: (pen, art, x, y) => {
    beneath(pen, art, x, y);
    shadow(pen, (x + 0.52) * art.unit, (y + 0.88) * art.unit, art.unit * 0.34, 0.26);
  },
  hearth,
  bed,
  rockwall,
  crystal: (pen, art, x, y) => beneath(pen, art, x, y, "cave"),
};

// ---- what stands tall: drawn once per tile size, then placed among the folk by row ----------

const crown = (pen, art, variant) => {
  const unit = art.unit;
  const centre = {
    x: unit / 2 + (noise(variant, 1, art.salt) - 0.5) * unit * 0.08,
    y: unit * 0.02,
  };
  const size = 1 + (noise(variant, 2, art.salt) - 0.5) * 0.16;
  const leaf = art.ink.leaf.map((tone) => blend(tone, variant % 2 ? INK.pine.base : tone, 0.15));
  pen.fillStyle = INK.bark.dark;
  pen.beginPath();
  pen.moveTo(centre.x - unit * 0.09, unit * 0.9);
  pen.lineTo(centre.x - unit * 0.05, unit * 0.36);
  pen.lineTo(centre.x + unit * 0.05, unit * 0.36);
  pen.lineTo(centre.x + unit * 0.09, unit * 0.9);
  pen.closePath();
  pen.fill();
  pen.fillStyle = INK.bark.base;
  pen.fillRect(centre.x - unit * 0.04, unit * 0.4, unit * 0.05, unit * 0.48);
  const lobes = [
    [-0.27, 0.1, 0.33],
    [0.27, 0.1, 0.33],
    [0, -0.18, 0.38],
    [-0.14, 0.2, 0.3],
    [0.16, 0.22, 0.3],
  ];
  pen.fillStyle = leaf[1];
  pen.beginPath();
  for (const [dx, dy, radius] of lobes) {
    pen.moveTo(
      centre.x + dx * unit * size + radius * unit * size,
      centre.y + (dy + 0.08) * unit * size,
    );
    pen.arc(
      centre.x + dx * unit * size,
      centre.y + (dy + 0.08) * unit * size,
      radius * unit * size,
      0,
      TAU,
    );
  }
  pen.fill();
  pen.fillStyle = leaf[0];
  pen.beginPath();
  for (const [dx, dy, radius] of lobes) {
    pen.moveTo(
      centre.x + dx * unit * size + radius * unit * size * 0.92,
      centre.y + dy * unit * size,
    );
    pen.arc(
      centre.x + dx * unit * size,
      centre.y + dy * unit * size,
      radius * unit * size * 0.92,
      0,
      TAU,
    );
  }
  pen.fill();
  pen.fillStyle = leaf[2];
  pen.beginPath();
  for (const [dx, dy, radius] of lobes.slice(0, 3)) {
    const at = { x: centre.x + (dx - 0.07) * unit * size, y: centre.y + (dy - 0.1) * unit * size };
    pen.moveTo(at.x + radius * unit * size * 0.45, at.y);
    pen.arc(at.x, at.y, radius * unit * size * 0.45, 0, TAU);
  }
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.18);
  for (let speck = 0; speck < 6; speck += 1) {
    pen.beginPath();
    pen.arc(
      centre.x + (noise(variant, speck, art.salt + 240) - 0.5) * unit * 0.7,
      centre.y + (noise(speck, variant, art.salt + 241) - 0.6) * unit * 0.6,
      unit * 0.035,
      0,
      TAU,
    );
    pen.fill();
  }
};

const conifer = (pen, art, variant) => {
  const unit = art.unit;
  const middle = unit / 2;
  const tall = 1 + (noise(variant, 3, art.salt) - 0.5) * 0.14;
  pen.fillStyle = INK.bark.dark;
  pen.fillRect(middle - unit * 0.06, unit * 0.62, unit * 0.12, unit * 0.28);
  const tiers = [
    [0.78, 0.46, 0.08],
    [0.42, 0.36, -0.24],
    [0.1, 0.25, -0.54],
  ];
  for (const [base, half, peak] of tiers) {
    pen.fillStyle = INK.pine.dark;
    pen.beginPath();
    pen.moveTo(middle - half * unit, base * unit * tall);
    pen.lineTo(middle, peak * unit * tall);
    pen.lineTo(middle + half * unit, base * unit * tall);
    pen.quadraticCurveTo(
      middle,
      (base + 0.08) * unit * tall,
      middle - half * unit,
      base * unit * tall,
    );
    pen.fill();
    pen.fillStyle = INK.pine.base;
    pen.beginPath();
    pen.moveTo(middle - half * unit * 0.92, base * unit * tall - unit * 0.02);
    pen.lineTo(middle, peak * unit * tall);
    pen.lineTo(middle + half * unit * 0.2, base * unit * tall);
    pen.closePath();
    pen.fill();
    pen.fillStyle = alpha(INK.pine.light, 0.7);
    pen.beginPath();
    pen.moveTo(middle - half * unit * 0.6, base * unit * tall - unit * 0.06);
    pen.lineTo(middle - unit * 0.02, peak * unit * tall + unit * 0.06);
    pen.lineTo(middle - half * unit * 0.2, base * unit * tall - unit * 0.05);
    pen.closePath();
    pen.fill();
  }
};

const post = (pen, art) => {
  const unit = art.unit;
  const middle = unit / 2;
  pen.fillStyle = INK.iron.dark;
  pen.fillRect(middle - unit * 0.1, unit * 0.78, unit * 0.2, unit * 0.1);
  pen.fillStyle = INK.iron.base;
  pen.fillRect(middle - unit * 0.035, -unit * 0.3, unit * 0.07, unit * 1.1);
  pen.fillStyle = INK.iron.dark;
  pen.beginPath();
  pen.moveTo(middle - unit * 0.16, -unit * 0.42);
  pen.lineTo(middle, -unit * 0.55);
  pen.lineTo(middle + unit * 0.16, -unit * 0.42);
  pen.closePath();
  pen.fill();
  pen.fillStyle = INK.fire.glow;
  pen.fillRect(middle - unit * 0.11, -unit * 0.42, unit * 0.22, unit * 0.2);
  pen.fillStyle = INK.fire.core;
  pen.fillRect(middle - unit * 0.05, -unit * 0.38, unit * 0.1, unit * 0.12);
  pen.fillStyle = INK.iron.dark;
  pen.fillRect(middle - unit * 0.13, -unit * 0.24, unit * 0.26, unit * 0.05);
};

const pillar = (pen, art) => {
  const unit = art.unit;
  const middle = unit / 2;
  pen.fillStyle = INK.stone.dark;
  pen.fillRect(middle - unit * 0.36, unit * 0.72, unit * 0.72, unit * 0.18);
  pen.fillStyle = INK.stone.base;
  pen.fillRect(middle - unit * 0.32, unit * 0.66, unit * 0.64, unit * 0.1);
  const shaft = pen.createLinearGradient(middle - unit * 0.24, 0, middle + unit * 0.24, 0);
  shaft.addColorStop(0, INK.stone.light);
  shaft.addColorStop(1, INK.stone.dark);
  pen.fillStyle = shaft;
  pen.fillRect(middle - unit * 0.24, -unit * 0.5, unit * 0.48, unit * 1.18);
  pen.fillStyle = alpha(INK.shade, 0.15);
  for (let flute = 1; flute < 4; flute += 1)
    pen.fillRect(
      middle - unit * 0.24 + flute * unit * 0.12,
      -unit * 0.46,
      Math.max(1, unit * 0.025),
      unit * 1.1,
    );
  pen.fillStyle = INK.stone.light;
  pen.fillRect(middle - unit * 0.34, -unit * 0.62, unit * 0.68, unit * 0.14);
  pen.fillStyle = INK.stone.base;
  pen.fillRect(middle - unit * 0.3, -unit * 0.5, unit * 0.6, unit * 0.06);
};

const bookcase = (pen, art, variant) => {
  const unit = art.unit;
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(unit * 0.04, -unit * 0.45, unit * 0.92, unit * 1.35);
  pen.fillStyle = blend(INK.wood.dark, INK.shade, 0.35);
  pen.fillRect(unit * 0.1, -unit * 0.38, unit * 0.8, unit * 1.18);
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const floor = -unit * 0.38 + (shelf + 1) * unit * 0.39;
    let along = unit * 0.12;
    let book = 0;
    while (along < unit * 0.86) {
      const width = unit * (0.06 + noise(variant * 7 + shelf, book, art.salt + 250) * 0.06);
      const height = unit * (0.24 + noise(book, variant * 3 + shelf, art.salt + 251) * 0.1);
      if (noise(book, shelf, variant + art.salt) > 0.12) {
        pen.fillStyle = pick(INK.books, noise(shelf * 11 + book, variant, art.salt + 252));
        pen.fillRect(along, floor - height, Math.min(width, unit * 0.88 - along), height);
        pen.fillStyle = alpha(INK.shine, 0.2);
        pen.fillRect(
          along,
          floor - height + unit * 0.04,
          Math.min(width, unit * 0.88 - along),
          unit * 0.02,
        );
      }
      along += width + unit * 0.01;
      book += 1;
    }
    pen.fillStyle = INK.wood.base;
    pen.fillRect(unit * 0.06, floor, unit * 0.88, unit * 0.05);
  }
};

// the shop's shelves: jars, bottles and loaves where a house keeps books
const wares = (pen, art, variant) => {
  const unit = art.unit;
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(unit * 0.04, -unit * 0.45, unit * 0.92, unit * 1.35);
  pen.fillStyle = blend(INK.wood.dark, INK.shade, 0.35);
  pen.fillRect(unit * 0.1, -unit * 0.38, unit * 0.8, unit * 1.18);
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const floor = -unit * 0.38 + (shelf + 1) * unit * 0.39;
    for (let ware = 0; ware < 3; ware += 1) {
      const centre = unit * (0.24 + ware * 0.26);
      const shape = noise(variant * 5 + shelf, ware, art.salt + 255);
      pen.fillStyle = pick(INK.goods, noise(ware, variant * 3 + shelf, art.salt + 256));
      pen.beginPath();
      if (shape < 0.4)
        pen.roundRect(
          centre - unit * 0.08,
          floor - unit * 0.22,
          unit * 0.16,
          unit * 0.22,
          unit * 0.04,
        );
      else if (shape < 0.75) {
        pen.roundRect(
          centre - unit * 0.06,
          floor - unit * 0.2,
          unit * 0.12,
          unit * 0.2,
          unit * 0.05,
        );
        pen.rect(centre - unit * 0.025, floor - unit * 0.27, unit * 0.05, unit * 0.08);
      } else pen.ellipse(centre, floor - unit * 0.08, unit * 0.11, unit * 0.08, 0, 0, TAU);
      pen.fill();
      pen.fillStyle = alpha(INK.shine, 0.35);
      pen.fillRect(centre - unit * 0.04, floor - unit * 0.17, unit * 0.025, unit * 0.08);
    }
    pen.fillStyle = INK.wood.base;
    pen.fillRect(unit * 0.06, floor, unit * 0.88, unit * 0.05);
  }
};

const cluster = (pen, art, variant) => {
  const unit = art.unit;
  const prisms = [
    [0.5, 0.95, 0.13, 0],
    [0.3, 0.6, 0.1, -0.35],
    [0.7, 0.68, 0.1, 0.3],
  ];
  for (const [x, height, half, lean] of prisms) {
    const base = { x: unit * (x + (noise(variant, x * 10, art.salt) - 0.5) * 0.1), y: unit * 0.82 };
    const tip = { x: base.x + lean * unit * 0.3, y: base.y - height * unit };
    pen.fillStyle = INK.crystal.dark;
    pen.beginPath();
    pen.moveTo(base.x - half * unit, base.y);
    pen.lineTo(base.x - half * unit + lean * unit * 0.22, base.y - height * unit * 0.75);
    pen.lineTo(tip.x, tip.y);
    pen.lineTo(base.x + half * unit + lean * unit * 0.22, base.y - height * unit * 0.75);
    pen.lineTo(base.x + half * unit, base.y);
    pen.closePath();
    pen.fill();
    pen.fillStyle = INK.crystal.base;
    pen.beginPath();
    pen.moveTo(base.x - half * unit * 0.2, base.y);
    pen.lineTo(base.x - half * unit * 0.2 + lean * unit * 0.22, base.y - height * unit * 0.75);
    pen.lineTo(tip.x, tip.y);
    pen.lineTo(base.x + half * unit + lean * unit * 0.22, base.y - height * unit * 0.75);
    pen.lineTo(base.x + half * unit, base.y);
    pen.closePath();
    pen.fill();
    pen.fillStyle = alpha(INK.crystal.light, 0.8);
    pen.beginPath();
    pen.moveTo(base.x - half * unit * 0.6, base.y - unit * 0.06);
    pen.lineTo(tip.x - half * unit * 0.3, tip.y + height * unit * 0.3);
    pen.lineTo(tip.x - half * unit * 0.1, tip.y + height * unit * 0.32);
    pen.closePath();
    pen.fill();
  }
};

// each tall kind: how far its art reaches past its cell (in tiles), how many looks it has
const TALL = {
  tree: { reach: { left: 0.3, top: 0.75, right: 0.3, bottom: 0 }, variants: 6, draw: crown },
  pine: { reach: { left: 0.1, top: 0.65, right: 0.1, bottom: 0 }, variants: 4, draw: conifer },
  lamp: { reach: { left: 0, top: 0.6, right: 0, bottom: 0 }, variants: 1, draw: post },
  column: { reach: { left: 0, top: 0.65, right: 0, bottom: 0 }, variants: 1, draw: pillar },
  shelf: {
    reach: { left: 0, top: 0.5, right: 0, bottom: 0 },
    variants: 4,
    draw: (pen, art, variant) => (art.map.id === "shop" ? wares : bookcase)(pen, art, variant),
  },
  crystal: { reach: { left: 0, top: 0.3, right: 0, bottom: 0 }, variants: 3, draw: cluster },
};

// what a door leads into, hung over it as a sign: the shop's purse, the stacks' book, the hall's
// scroll, the forge's anvil
const EMBLEMS = {
  shop: (pen, x, y, size) => {
    pen.fillStyle = INK.gold.dark;
    pen.beginPath();
    pen.ellipse(x, y + size * 0.14, size * 0.4, size * 0.34, 0, 0, TAU);
    pen.moveTo(x - size * 0.16, y - size * 0.18);
    pen.lineTo(x - size * 0.26, y - size * 0.42);
    pen.lineTo(x + size * 0.26, y - size * 0.42);
    pen.lineTo(x + size * 0.16, y - size * 0.18);
    pen.fill();
    pen.fillStyle = INK.gold.base;
    pen.beginPath();
    pen.ellipse(x - size * 0.04, y + size * 0.1, size * 0.3, size * 0.26, 0, 0, TAU);
    pen.fill();
    pen.fillStyle = INK.wood.dark;
    pen.fillRect(x - size * 0.2, y - size * 0.22, size * 0.4, size * 0.07);
    pen.fillStyle = INK.gold.light;
    pen.beginPath();
    pen.arc(x - size * 0.12, y + size * 0.02, size * 0.08, 0, TAU);
    pen.fill();
  },
  stacks: (pen, x, y, size) => {
    pen.fillStyle = INK.books[1];
    pen.fillRect(x - size * 0.45, y - size * 0.3, size * 0.42, size * 0.6);
    pen.fillStyle = INK.books[0];
    pen.fillRect(x + size * 0.03, y - size * 0.3, size * 0.42, size * 0.6);
    pen.fillStyle = INK.linen;
    pen.fillRect(x - size * 0.03, y - size * 0.3, size * 0.06, size * 0.6);
  },
  forms: (pen, x, y, size) => {
    pen.fillStyle = INK.linen;
    pen.fillRect(x - size * 0.35, y - size * 0.35, size * 0.7, size * 0.7);
    pen.fillStyle = INK.biomes.ink.paper;
    for (let line = 0; line < 3; line += 1)
      pen.fillRect(x - size * 0.25, y - size * 0.2 + line * size * 0.18, size * 0.5, size * 0.07);
  },
  forge: (pen, x, y, size) => {
    pen.fillStyle = INK.iron.base;
    pen.fillRect(x - size * 0.45, y - size * 0.15, size * 0.9, size * 0.22);
    pen.fillRect(x - size * 0.15, y + size * 0.05, size * 0.3, size * 0.3);
    pen.fillStyle = INK.fire.flame;
    pen.beginPath();
    pen.arc(x + size * 0.3, y - size * 0.35, size * 0.12, 0, TAU);
    pen.fill();
  },
};

const facade = (pen, art, building, unit) => {
  const width = building.right - building.left + 1;
  const front = (building.base - building.top) * unit;
  pen.fillStyle = art.ink.wall;
  pen.fillRect(0, front, width * unit, unit);
  pen.fillStyle = alpha(INK.shade, 0.06);
  for (let speck = 0; speck < width * 3; speck += 1) {
    pen.fillRect(
      noise(speck, building.top, art.salt + 260) * width * unit,
      front + noise(building.left, speck, art.salt) * unit * 0.8,
      unit * 0.04,
      unit * 0.03,
    );
  }
  pen.fillStyle = INK.stone.base;
  pen.fillRect(0, front + unit * 0.86, width * unit, unit * 0.14);
  pen.fillStyle = INK.stone.dark;
  pen.fillRect(0, front + unit * 0.96, width * unit, unit * 0.04);
  pen.fillStyle = art.ink.timber;
  pen.fillRect(0, front, unit * 0.08, unit * 0.86);
  pen.fillRect(width * unit - unit * 0.08, front, unit * 0.08, unit * 0.86);
  [...building.front].forEach((char, index) => {
    const left = index * unit;
    if (char === "W") {
      pen.fillStyle = blend(art.ink.accent, INK.shade, 0.1);
      pen.fillRect(left + unit * 0.12, front + unit * 0.2, unit * 0.12, unit * 0.48);
      pen.fillRect(left + unit * 0.76, front + unit * 0.2, unit * 0.12, unit * 0.48);
      pen.fillStyle = art.ink.timber;
      pen.fillRect(left + unit * 0.22, front + unit * 0.18, unit * 0.56, unit * 0.52);
      pen.fillStyle = INK.glass.base;
      pen.fillRect(left + unit * 0.27, front + unit * 0.23, unit * 0.46, unit * 0.42);
      pen.fillStyle = alpha(INK.glass.light, 0.85);
      pen.beginPath();
      pen.moveTo(left + unit * 0.3, front + unit * 0.5);
      pen.lineTo(left + unit * 0.48, front + unit * 0.26);
      pen.lineTo(left + unit * 0.56, front + unit * 0.26);
      pen.lineTo(left + unit * 0.36, front + unit * 0.54);
      pen.closePath();
      pen.fill();
      pen.fillStyle = art.ink.timber;
      pen.fillRect(left + unit * 0.48, front + unit * 0.23, unit * 0.04, unit * 0.42);
      pen.fillRect(left + unit * 0.27, front + unit * 0.42, unit * 0.46, unit * 0.04);
      pen.fillStyle = INK.wood.base;
      pen.fillRect(left + unit * 0.2, front + unit * 0.7, unit * 0.6, unit * 0.08);
      for (let bloom = 0; bloom < 3; bloom += 1) {
        pen.fillStyle = pick(art.ink.flowers, noise(index, bloom, art.salt + 270));
        pen.beginPath();
        pen.arc(left + unit * (0.3 + bloom * 0.2), front + unit * 0.68, unit * 0.05, 0, TAU);
        pen.fill();
      }
    }
    if (char === "D") {
      pen.fillStyle = art.ink.timber;
      pen.beginPath();
      pen.moveTo(left + unit * 0.18, front + unit);
      pen.lineTo(left + unit * 0.18, front + unit * 0.38);
      pen.quadraticCurveTo(
        left + unit * 0.5,
        front + unit * 0.02,
        left + unit * 0.82,
        front + unit * 0.38,
      );
      pen.lineTo(left + unit * 0.82, front + unit);
      pen.closePath();
      pen.fill();
      pen.fillStyle = INK.wood.base;
      pen.beginPath();
      pen.moveTo(left + unit * 0.25, front + unit);
      pen.lineTo(left + unit * 0.25, front + unit * 0.4);
      pen.quadraticCurveTo(
        left + unit * 0.5,
        front + unit * 0.12,
        left + unit * 0.75,
        front + unit * 0.4,
      );
      pen.lineTo(left + unit * 0.75, front + unit);
      pen.closePath();
      pen.fill();
      pen.fillStyle = alpha(INK.wood.dark, 0.6);
      pen.fillRect(left + unit * 0.42, front + unit * 0.24, Math.max(1, unit * 0.02), unit * 0.76);
      pen.fillRect(left + unit * 0.58, front + unit * 0.24, Math.max(1, unit * 0.02), unit * 0.76);
      pen.fillStyle = INK.gold.base;
      pen.beginPath();
      pen.arc(left + unit * 0.66, front + unit * 0.66, unit * 0.04, 0, TAU);
      pen.fill();
      const emblem = EMBLEMS[art.portals.get(`${building.left + index}:${building.base}`).to];
      if (emblem) {
        pen.fillStyle = INK.iron.dark;
        pen.fillRect(left + unit * 0.8, front + unit * 0.08, unit * 0.42, unit * 0.04);
        pen.fillRect(left + unit * 0.88, front + unit * 0.12, unit * 0.02, unit * 0.06);
        pen.fillRect(left + unit * 1.14, front + unit * 0.12, unit * 0.02, unit * 0.06);
        pen.fillStyle = INK.wood.dark;
        pen.beginPath();
        pen.roundRect(left + unit * 0.8, front + unit * 0.17, unit * 0.44, unit * 0.4, unit * 0.06);
        pen.fill();
        pen.fillStyle = INK.sign.board;
        pen.beginPath();
        pen.roundRect(
          left + unit * 0.83,
          front + unit * 0.2,
          unit * 0.38,
          unit * 0.34,
          unit * 0.05,
        );
        pen.fill();
        emblem(pen, left + unit * 1.02, front + unit * 0.37, unit * 0.3);
      }
    }
  });
};

// a pitched roof seen from the south: rows of round-ended shingles down to the eave, the ridge
// raised over the top row so it hides whoever stands behind the house
const roof = (pen, art, building, unit, colour) => {
  const width = (building.right - building.left + 1) * unit;
  const eave = (building.base - building.top) * unit + unit * 0.14;
  const ridge = -RISE * unit;
  const slope = pen.createLinearGradient(0, ridge, 0, eave);
  slope.addColorStop(0, blend(colour, INK.shade, 0.28));
  slope.addColorStop(0.35, colour);
  slope.addColorStop(1, blend(colour, INK.shine, 0.08));
  pen.fillStyle = slope;
  pen.beginPath();
  pen.roundRect(-unit * 0.06, ridge, width + unit * 0.12, eave - ridge, [
    unit * 0.16,
    unit * 0.16,
    unit * 0.04,
    unit * 0.04,
  ]);
  pen.fill();
  const course = unit * 0.24;
  const tab = unit * 0.24;
  pen.lineWidth = Math.max(1, unit * 0.025);
  for (
    let level = ridge + unit * 0.26, row = 0;
    level < eave - unit * 0.04;
    level += course, row += 1
  ) {
    const shift = row % 2 ? tab / 2 : 0;
    for (let from = -unit * 0.06 - shift; from < width + unit * 0.06; from += tab) {
      const shingle = noise(from / tab, row, art.salt + 290);
      pen.fillStyle = alpha(shingle < 0.5 ? INK.shade : INK.shine, Math.abs(shingle - 0.5) * 0.16);
      pen.fillRect(from, level - course, tab, course);
    }
    pen.strokeStyle = alpha(INK.shade, 0.3);
    pen.beginPath();
    for (let from = -unit * 0.06 - shift; from < width + unit * 0.06; from += tab) {
      pen.moveTo(from, level - course * 0.55);
      pen.lineTo(from, level);
      pen.quadraticCurveTo(from + tab / 2, level + course * 0.32, from + tab, level);
    }
    pen.stroke();
    pen.strokeStyle = alpha(INK.shine, 0.16);
    pen.beginPath();
    for (let from = -unit * 0.06 - shift; from < width + unit * 0.06; from += tab) {
      pen.moveTo(from + tab * 0.2, level - course * 0.75);
      pen.lineTo(from + tab * 0.8, level - course * 0.75);
    }
    pen.stroke();
  }
  pen.fillStyle = blend(colour, INK.shade, 0.45);
  pen.beginPath();
  pen.roundRect(-unit * 0.09, ridge - unit * 0.05, width + unit * 0.18, unit * 0.17, unit * 0.08);
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.2);
  pen.fillRect(-unit * 0.04, ridge - unit * 0.02, width + unit * 0.08, unit * 0.035);
  pen.fillStyle = art.ink.timber;
  pen.fillRect(-unit * 0.08, ridge + unit * 0.08, unit * 0.08, eave - ridge - unit * 0.06);
  pen.fillRect(width, ridge + unit * 0.08, unit * 0.08, eave - ridge - unit * 0.06);
  pen.fillStyle = blend(colour, INK.shade, 0.35);
  pen.fillRect(-unit * 0.06, eave - unit * 0.06, width + unit * 0.12, unit * 0.07);
  pen.fillStyle = alpha(INK.shade, 0.3);
  pen.fillRect(0, eave + unit * 0.01, width, unit * 0.08);
};

const chimney = (pen, art, building, unit) => {
  const width = building.right - building.left + 1;
  const left = (width - 1.6) * unit;
  pen.fillStyle = INK.brick.base;
  pen.fillRect(left, -RISE * unit - unit * 0.42, unit * 0.36, unit * 0.62);
  pen.fillStyle = INK.brick.dark;
  pen.fillRect(left - unit * 0.04, -RISE * unit - unit * 0.48, unit * 0.44, unit * 0.1);
  pen.fillStyle = alpha(INK.brick.light, 0.6);
  pen.fillRect(left + unit * 0.04, -RISE * unit - unit * 0.3, unit * 0.12, unit * 0.06);
};

// a market stall: a striped awning on posts over its counters
const awning = (pen, art, building, unit) => {
  const width = building.right - building.left + 1;
  const front = (building.base - building.top) * unit;
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(unit * 0.04, -unit * 0.1, unit * 0.08, front + unit * 0.9);
  pen.fillRect(width * unit - unit * 0.12, -unit * 0.1, unit * 0.08, front + unit * 0.9);
  [...building.front].forEach((_, index) =>
    counterFront(
      pen,
      { ...art, salt: art.salt + building.left },
      index,
      building.base - building.top,
      0.3,
    ),
  );
  const stripes = width * 3;
  for (let stripe = 0; stripe < stripes; stripe += 1) {
    pen.fillStyle = stripe % 2 ? INK.linen : art.ink.accent;
    pen.fillRect(
      (stripe * width * unit) / stripes,
      -unit * 0.2,
      (width * unit) / stripes + 1,
      front + unit * 0.12,
    );
  }
  pen.fillStyle = alpha(INK.shade, 0.15);
  pen.fillRect(0, -unit * 0.2, width * unit, unit * 0.1);
  for (let stripe = 0; stripe < stripes; stripe += 1) {
    pen.fillStyle = stripe % 2 ? INK.linen : art.ink.accent;
    pen.beginPath();
    pen.arc(
      ((stripe + 0.5) * width * unit) / stripes,
      front - unit * 0.08,
      (width * unit) / stripes / 2,
      0,
      Math.PI,
    );
    pen.fill();
  }
  pen.fillStyle = alpha(INK.shade, 0.22);
  pen.fillRect(0, front + unit * 0.12, width * unit, unit * 0.06);
};

// a tower: stone rising from its door to a clock face, under a steep pointed roof
const tower = (pen, art, building, unit, colour) => {
  const width = building.right - building.left + 1;
  const height = building.base - building.top + 1;
  const body = pen.createLinearGradient(0, 0, width * unit, 0);
  body.addColorStop(0, INK.stone.light);
  body.addColorStop(1, INK.stone.base);
  pen.fillStyle = body;
  pen.fillRect(unit * 0.1, unit * 0.9, width * unit - unit * 0.2, (height - 0.9) * unit);
  pen.strokeStyle = alpha(INK.stone.mortar, 0.7);
  pen.lineWidth = Math.max(1, unit * 0.025);
  pen.beginPath();
  for (let course = 1.3; course < height; course += 0.4) {
    pen.moveTo(unit * 0.1, course * unit);
    pen.lineTo(width * unit - unit * 0.1, course * unit);
  }
  pen.stroke();
  const face = {
    x: (width * unit) / 2,
    y: unit * 1.75,
    radius: Math.min(width * unit * 0.32, unit * 0.62),
  };
  pen.fillStyle = INK.gold.dark;
  pen.beginPath();
  pen.arc(face.x, face.y, face.radius * 1.12, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.linen;
  pen.beginPath();
  pen.arc(face.x, face.y, face.radius, 0, TAU);
  pen.fill();
  pen.strokeStyle = INK.eye;
  pen.lineWidth = Math.max(1, unit * 0.05);
  pen.lineCap = "round";
  pen.beginPath();
  pen.moveTo(face.x, face.y);
  pen.lineTo(face.x, face.y - face.radius * 0.7);
  pen.moveTo(face.x, face.y);
  pen.lineTo(face.x + face.radius * 0.45, face.y + face.radius * 0.2);
  pen.stroke();
  for (let hour = 0; hour < 12; hour += 1) {
    pen.fillStyle = INK.eye;
    pen.beginPath();
    pen.arc(
      face.x + Math.cos((hour / 12) * TAU) * face.radius * 0.82,
      face.y + Math.sin((hour / 12) * TAU) * face.radius * 0.82,
      unit * 0.025,
      0,
      TAU,
    );
    pen.fill();
  }
  for (let slit = 2.8; slit < height - 1.4; slit += 1.3) {
    pen.fillStyle = INK.dark;
    pen.beginPath();
    pen.roundRect(face.x - unit * 0.08, slit * unit, unit * 0.16, unit * 0.42, [
      unit * 0.08,
      unit * 0.08,
      0,
      0,
    ]);
    pen.fill();
  }
  pen.fillStyle = blend(colour, INK.shade, 0.15);
  pen.beginPath();
  pen.moveTo(-unit * 0.05, unit * 1.0);
  pen.lineTo((width * unit) / 2, -RISE * unit - unit * 0.9);
  pen.lineTo(width * unit + unit * 0.05, unit * 1.0);
  pen.closePath();
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.12);
  pen.beginPath();
  pen.moveTo(-unit * 0.05, unit * 1.0);
  pen.lineTo((width * unit) / 2, -RISE * unit - unit * 0.9);
  pen.lineTo((width * unit) / 2, unit * 1.0);
  pen.closePath();
  pen.fill();
  pen.fillStyle = INK.gold.base;
  pen.beginPath();
  pen.arc((width * unit) / 2, -RISE * unit - unit * 0.95, unit * 0.09, 0, TAU);
  pen.fill();
  pen.fillStyle = alpha(INK.shade, 0.25);
  pen.fillRect(unit * 0.1, unit * 1.0, width * unit - unit * 0.2, unit * 0.08);
};

const BUILT = {
  house: (pen, art, building, unit, colour) => {
    facade(pen, art, building, unit);
    roof(pen, art, building, unit, colour);
    if (building.chimney) chimney(pen, art, building, unit);
  },
  stall: (pen, art, building, unit) => awning(pen, art, building, unit),
  tower: (pen, art, building, unit, colour) => {
    facade(pen, art, building, unit);
    tower(pen, art, building, unit, colour);
  },
};

// a district in ruin: its colour drained toward grey by the share of its words not yet held. the
// drain is drawn into the cached art, so the folk who walk over it keep their colour
const drain = (image, amount) => {
  if (amount === 0) return image;
  const shape = sheet(image.width, image.height);
  shape.getContext("2d").drawImage(image, 0, 0);
  const pen = image.getContext("2d");
  pen.setTransform(1, 0, 0, 1, 0, 0);
  pen.globalCompositeOperation = "saturation";
  pen.globalAlpha = amount;
  pen.fillStyle = INK.grey;
  pen.fillRect(0, 0, image.width, image.height);
  pen.globalCompositeOperation = "destination-in";
  pen.globalAlpha = 1;
  pen.drawImage(shape, 0, 0);
  pen.globalCompositeOperation = "source-over";
  return image;
};

const tall = (art, kind, variant) => {
  const unit = art.unit;
  const { reach, draw } = TALL[kind];
  const image = sheet((1 + reach.left + reach.right) * unit, (1 + reach.top + reach.bottom) * unit);
  const pen = image.getContext("2d");
  pen.translate(reach.left * unit, reach.top * unit);
  draw(pen, art, variant);
  return drain(image, art.ruin);
};

const raise = (art, building) => {
  const unit = art.unit;
  const width = building.right - building.left + 1;
  const height = building.base - building.top + 1;
  const above = RISE + (building.chimney ? 0.5 : 0) + (building.tower ? 1 : 0);
  const image = sheet((width + 0.2) * unit, (height + above) * unit);
  const pen = image.getContext("2d");
  pen.translate(0.1 * unit, above * unit);
  const colour = pick(art.ink.roofs, building.shade);
  BUILT[building.stall ? "stall" : building.tower ? "tower" : "house"](
    pen,
    art,
    building,
    unit,
    colour,
  );
  return { image, left: (building.left - 0.1) * unit, top: (building.top - above) * unit };
};

// every tall thing on the map, as an image placed at its row: trees, posts, shelves, buildings
const statics = (art) => {
  const unit = art.unit;
  const looks = new Map();
  const look = (kind, variant) => {
    const id = `${kind}:${variant}`;
    if (!looks.has(id)) looks.set(id, tall(art, kind, variant));
    return looks.get(id);
  };
  const placed = [];
  art.map.rows.forEach((row, y) =>
    [...row].forEach((char, x) => {
      const kind = TILES[char].kind;
      if (!TALL[kind]) return;
      const { reach, variants } = TALL[kind];
      placed.push({
        x,
        y,
        order: 0,
        image: look(kind, Math.floor(noise(x, y, art.salt + 280) * variants)),
        left: (x - reach.left) * unit,
        top: (y - reach.top) * unit,
      });
    }),
  );
  for (const building of art.buildings) {
    placed.push({ x: building.left, y: building.base, order: 0, ...raise(art, building) });
  }
  return placed;
};

// a run of cached ground, CHUNK tiles on a side, each cell clipped to its own square
const pave = (art, column, row) => {
  const unit = art.unit;
  const from = { x: column * CHUNK, y: row * CHUNK };
  const to = { x: Math.min(from.x + CHUNK, art.width), y: Math.min(from.y + CHUNK, art.height) };
  const image = sheet((to.x - from.x) * unit, (to.y - from.y) * unit);
  const pen = image.getContext("2d");
  pen.translate(-from.x * unit, -from.y * unit);
  for (let y = from.y; y < to.y; y += 1) {
    for (let x = from.x; x < to.x; x += 1) {
      pen.save();
      pen.beginPath();
      pen.rect(x * unit, y * unit, unit, unit);
      pen.clip();
      GROUND[art.kind(x, y)](pen, art, x, y);
      pen.restore();
    }
  }
  return drain(image, art.ruin);
};

// the front blades of tall grass, laid over whoever walks through it
const blades = (art) => {
  const image = sheet(art.unit, art.unit);
  const pen = image.getContext("2d");
  thicket(pen, { ...art, salt: art.salt + 1 }, 0, 0, [3]);
  return drain(image, art.ruin);
};

// ---- the cache: one map at one tile size and one ruin level ----------------------------------

const stock = (map, unit, ruin) => {
  const art = survey(map, unit, ruin);
  return { art, chunks: new Map(), statics: statics(art), blades: blades(art) };
};

const chunk = (cache, column, row) => {
  const id = `${column}:${row}`;
  if (!cache.chunks.has(id)) cache.chunks.set(id, pave(cache.art, column, row));
  return cache.chunks.get(id);
};

// ---- the frame --------------------------------------------------------------------------------

// how grey a map stands: a place by the share of its words not held, a fallow place wholly grey,
// a map of no place never
const ruinOf = (world, map, memory) => {
  if (map.place === null) return 0;
  const sited = world.places[map.place];
  const bloom = sited ? share(memory, sited.words) : 0;
  return Math.round((1 - bloom) * RUIN * RUIN_STEPS) / RUIN_STEPS;
};

const sight = (view) => ({
  left: Math.floor(view.x / view.tile) - 1,
  top: Math.floor(view.y / view.tile) - 1,
  right: Math.ceil((view.x + view.width) / view.tile) + 1,
  bottom: Math.ceil((view.y + view.height) / view.tile) + 2,
});

const overlaps = (view, placed) =>
  placed.left < view.x + view.width &&
  placed.left + placed.image.width > view.x &&
  placed.top < view.y + view.height &&
  placed.top + placed.image.height > view.y;

const inside = (seen, cell) =>
  cell.x >= seen.left && cell.x <= seen.right && cell.y >= seen.top && cell.y <= seen.bottom;

const spread = (pen, cache, view) => {
  const span = CHUNK * view.tile;
  const columns = Math.ceil(cache.art.width / CHUNK);
  const rows = Math.ceil(cache.art.height / CHUNK);
  for (
    let row = Math.max(0, Math.floor(view.y / span));
    row <= Math.min(rows - 1, Math.floor((view.y + view.height) / span));
    row += 1
  ) {
    for (
      let column = Math.max(0, Math.floor(view.x / span));
      column <= Math.min(columns - 1, Math.floor((view.x + view.width) / span));
      column += 1
    ) {
      pen.drawImage(chunk(cache, column, row), column * span, row * span);
    }
  }
};

// what moves in the ground: light on open water, a fountain's spray, a hearth's flames, a lamp's
// halo, a crystal's glint
const LIVELY = {
  water: (pen, art, x, y, time) => {
    const unit = art.unit;
    const drift = (time / 1400 + noise(x, y, art.salt)) % 1;
    const shine = Math.sin(drift * Math.PI);
    pen.strokeStyle = alpha(INK.water.glint, 0.35 * shine);
    pen.lineWidth = Math.max(1, unit * 0.03);
    pen.beginPath();
    const at = {
      x: (x + 0.2 + noise(x, y, art.salt + 300) * 0.5) * unit + drift * unit * 0.1,
      y: (y + 0.25 + noise(y, x, art.salt + 301) * 0.5) * unit,
    };
    pen.moveTo(at.x, at.y);
    pen.lineTo(at.x + unit * 0.16, at.y);
    pen.stroke();
  },
  fountain: (pen, art, x, y, time) => {
    const bounds = art.fountains.get(`${x}:${y}`);
    if (bounds.left !== x || bounds.top !== y) return;
    const unit = art.unit;
    const centre = {
      x: ((bounds.left + bounds.right + 1) / 2) * unit,
      y: ((bounds.top + bounds.bottom + 1) / 2) * unit - unit * 0.6,
    };
    pen.fillStyle = alpha(INK.water.foam, 0.85);
    for (let drop = 0; drop < 10; drop += 1) {
      const age = (time / 900 + drop / 10) % 1;
      const angle = (drop / 10) * TAU;
      pen.beginPath();
      pen.arc(
        centre.x + Math.cos(angle) * age * unit * 0.4,
        centre.y - Math.sin(age * Math.PI) * unit * 0.45 + age * unit * 0.2,
        unit * 0.035 * (1 - age * 0.5),
        0,
        TAU,
      );
      pen.fill();
    }
    pen.strokeStyle = alpha(INK.water.foam, 0.4);
    pen.lineWidth = Math.max(1, unit * 0.025);
    const ring = (time / 1600) % 1;
    pen.beginPath();
    pen.ellipse(
      centre.x,
      centre.y + unit * 0.75,
      unit * (0.3 + ring * 0.5),
      unit * (0.12 + ring * 0.22),
      0,
      0,
      TAU,
    );
    pen.stroke();
  },
  // a hearth's fire burns along the bottom of its mouth, drawn once from its block's corner
  hearth: (pen, art, x, y, time) => {
    const bounds = art.hearths.get(`${x}:${y}`);
    if (bounds.left !== x || bounds.top !== y) return;
    const unit = art.unit;
    const floor = (bounds.bottom + 1) * unit - unit * 0.1;
    const from = bounds.left * unit + unit * 0.36;
    const to = (bounds.right + 1) * unit - unit * 0.36;
    glow(
      pen,
      (from + to) / 2,
      floor - unit * 0.2,
      (to - from) / 2 + unit * 1.2,
      INK.fire.glow,
      0.26 + Math.sin(time / 90) * 0.04,
    );
    const tongues = Math.max(2, Math.round((to - from) / (unit * 0.22)));
    for (let tongue = 0; tongue < tongues; tongue += 1) {
      const at = from + ((tongue + 0.5) / tongues) * (to - from);
      const lick = 1 + Math.sin(time / 70 + tongue * 1.9) * 0.18;
      for (const [scale, colour] of [
        [1, INK.fire.ember],
        [0.72, INK.fire.flame],
        [0.4, INK.fire.core],
      ]) {
        const height = unit * 0.36 * scale * lick;
        const half = unit * 0.1 * scale;
        pen.fillStyle = colour;
        pen.beginPath();
        pen.moveTo(at - half, floor);
        pen.quadraticCurveTo(
          at - half * 0.8,
          floor - height * 0.6,
          at + Math.sin(time / 110 + tongue) * unit * 0.03,
          floor - height,
        );
        pen.quadraticCurveTo(at + half * 0.8, floor - height * 0.6, at + half, floor);
        pen.closePath();
        pen.fill();
      }
    }
  },
  lamp: (pen, art, x, y, time) => {
    const unit = art.unit;
    glow(
      pen,
      (x + 0.5) * unit,
      (y - 0.32) * unit,
      unit * 0.75,
      INK.fire.glow,
      0.22 + Math.sin(time / 300 + x) * 0.04,
    );
  },
};

// what shines by its own light, so the dark never hides it: a crystal's glow and glint
const GLEAMS = {
  crystal: (pen, art, x, y, time) => {
    const unit = art.unit;
    const shine = (Math.sin(time / 500 + x * 1.3 + y) + 1) / 2;
    glow(pen, (x + 0.5) * unit, (y + 0.3) * unit, unit * 0.9, INK.crystal.glow, 0.1 + shine * 0.12);
    pen.fillStyle = alpha(INK.crystal.light, shine);
    twinkle(pen, (x + 0.38) * unit, (y + 0.05) * unit, unit * 0.06);
  },
};

const lively = (pen, cache, seen, time, table) => {
  const { art } = cache;
  for (let y = Math.max(0, seen.top); y <= Math.min(art.height - 1, seen.bottom); y += 1) {
    for (let x = Math.max(0, seen.left); x <= Math.min(art.width - 1, seen.right); x += 1) {
      const move = table[art.kind(x, y)];
      if (move) move(pen, art, x, y, time);
    }
  }
};

// ---- the folk and their things, drawn fresh each frame ----------------------------------------

// one hue per word, the golden angle apart along its place's words, so the spirits of one place
// never share a colour
const hues = new WeakMap();

const hue = (world, word, strength = 1) => {
  if (!hues.has(world)) {
    hues.set(
      world,
      new Map(
        Object.values(world.places).flatMap((sited) =>
          sited.words.map((id, index) => [id, (index * 137.508) % 360]),
        ),
      ),
    );
  }
  const { saturation, lightness } = INK.spirit;
  return `hsl(${hues.get(world).get(word)} ${saturation}% ${lightness}% / ${strength})`;
};

// a stone shows what the learner holds of its word: dark untouched, lit once reviewed, gold held
const TIERS = [
  [(status) => remembered(status), "gold"],
  [(status) => rank(status) > 0, "lit"],
  [() => true, "dark"],
];

const initial = (word) => (word.learning || word.slug).trim().charAt(0).toUpperCase();

const stone = (pen, frame, placed) => {
  const unit = frame.view.tile;
  const time = frame.time;
  const word = frame.world.words[placed.word];
  const met = has(frame.state.run, `met:${placed.word}`);
  const [, tier] = TIERS.find(([holds]) => holds(frame.memory[placed.word]));
  const x = (placed.x + 0.5) * unit;
  const y = (placed.y + 0.5) * unit;
  if (tier !== "dark")
    glow(pen, x, y, unit * 0.75, INK.stoneTier[tier], 0.4 + Math.sin(time / 600 + placed.x) * 0.08);
  shadow(pen, x + unit * 0.03, y + unit * 0.36, unit * 0.26, 0.3);
  pen.fillStyle = blend(INK.stoneTier[tier], INK.shade, 0.3);
  pen.beginPath();
  pen.roundRect(x - unit * 0.22, y - unit * 0.32, unit * 0.44, unit * 0.68, [
    unit * 0.2,
    unit * 0.2,
    unit * 0.06,
    unit * 0.06,
  ]);
  pen.fill();
  pen.fillStyle = INK.stoneTier[tier];
  pen.beginPath();
  pen.roundRect(x - unit * 0.22, y - unit * 0.34, unit * 0.38, unit * 0.66, [
    unit * 0.2,
    unit * 0.16,
    unit * 0.04,
    unit * 0.06,
  ]);
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.3);
  pen.beginPath();
  pen.ellipse(x - unit * 0.08, y - unit * 0.22, unit * 0.06, unit * 0.03, -0.5, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.rune[tier];
  pen.globalAlpha = met ? 0.95 : 0.5 + Math.sin(time / 500 + placed.x) * 0.25;
  pen.font = `700 ${Math.round(unit * 0.34)}px ui-serif, Georgia, serif`;
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.fillText(met ? initial(word) : "?", x - unit * 0.03, y + unit * 0.02);
  pen.globalAlpha = 1;
};

const chest = (pen, frame, placed) => {
  const unit = frame.view.tile;
  const open = has(frame.state.run, `opened:${placed.id}`);
  const x = (placed.x + 0.5) * unit;
  const y = (placed.y + 0.62) * unit;
  shadow(pen, x + unit * 0.03, y + unit * 0.24, unit * 0.36, 0.3);
  pen.fillStyle = INK.chest.dark;
  pen.fillRect(x - unit * 0.33, y - unit * 0.12, unit * 0.66, unit * 0.36);
  pen.fillStyle = INK.chest.wood;
  pen.fillRect(x - unit * 0.3, y - unit * 0.1, unit * 0.6, unit * 0.31);
  pen.fillStyle = INK.chest.band;
  pen.fillRect(x - unit * 0.22, y - unit * 0.12, unit * 0.06, unit * 0.36);
  pen.fillRect(x + unit * 0.16, y - unit * 0.12, unit * 0.06, unit * 0.36);
  if (open) {
    pen.fillStyle = INK.chest.inside;
    pen.fillRect(x - unit * 0.3, y - unit * 0.16, unit * 0.6, unit * 0.08);
    pen.fillStyle = INK.chest.dark;
    pen.beginPath();
    pen.roundRect(x - unit * 0.33, y - unit * 0.5, unit * 0.66, unit * 0.34, [
      unit * 0.12,
      unit * 0.12,
      0,
      0,
    ]);
    pen.fill();
    pen.fillStyle = blend(INK.chest.wood, INK.shade, 0.3);
    pen.fillRect(x - unit * 0.28, y - unit * 0.44, unit * 0.56, unit * 0.26);
    return;
  }
  pen.fillStyle = INK.chest.wood;
  pen.beginPath();
  pen.roundRect(x - unit * 0.33, y - unit * 0.36, unit * 0.66, unit * 0.26, [
    unit * 0.14,
    unit * 0.14,
    0,
    0,
  ]);
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.18);
  pen.fillRect(x - unit * 0.28, y - unit * 0.32, unit * 0.56, unit * 0.05);
  pen.fillStyle = INK.chest.band;
  pen.fillRect(x - unit * 0.22, y - unit * 0.36, unit * 0.06, unit * 0.26);
  pen.fillRect(x + unit * 0.16, y - unit * 0.36, unit * 0.06, unit * 0.26);
  pen.fillRect(x - unit * 0.07, y - unit * 0.16, unit * 0.14, unit * 0.14);
  pen.fillStyle = INK.chest.inside;
  pen.fillRect(x - unit * 0.02, y - unit * 0.11, unit * 0.04, unit * 0.06);
  pen.fillStyle = alpha(INK.shine, 0.5 + Math.sin(frame.time / 300 + placed.x) * 0.4);
  twinkle(pen, x + unit * 0.28, y - unit * 0.34, unit * 0.06);
};

const pot = (pen, frame, placed) => {
  const unit = frame.view.tile;
  const broken = has(frame.state.run, `broke:${placed.id}`);
  const x = (placed.x + 0.5) * unit;
  const y = (placed.y + 0.6) * unit;
  shadow(pen, x + unit * 0.03, y + unit * 0.26, unit * 0.26, 0.28);
  if (broken) {
    pen.fillStyle = INK.pot.dark;
    pen.beginPath();
    pen.ellipse(x, y + unit * 0.18, unit * 0.2, unit * 0.08, 0, 0, TAU);
    pen.fill();
    for (const [dx, dy, turn] of [
      [-0.24, 0.12, 0.4],
      [0.2, 0.2, -0.8],
      [0.06, 0.02, 1.4],
      [-0.08, 0.26, 2.2],
    ]) {
      pen.fillStyle = turn > 1 ? INK.pot.light : INK.pot.clay;
      pen.beginPath();
      pen.moveTo(x + dx * unit, y + dy * unit);
      pen.lineTo(x + (dx + Math.cos(turn) * 0.12) * unit, y + (dy + Math.sin(turn) * 0.06) * unit);
      pen.lineTo(
        x + (dx + Math.cos(turn + 1.6) * 0.08) * unit,
        y + (dy + Math.sin(turn + 1.6) * 0.05) * unit,
      );
      pen.closePath();
      pen.fill();
    }
    return;
  }
  pen.fillStyle = INK.pot.clay;
  pen.beginPath();
  pen.ellipse(x, y, unit * 0.25, unit * 0.24, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.pot.dark;
  pen.beginPath();
  pen.ellipse(x + unit * 0.05, y + unit * 0.04, unit * 0.2, unit * 0.2, 0, -0.4, 1.8);
  pen.fill();
  pen.fillStyle = INK.pot.band;
  pen.fillRect(x - unit * 0.24, y - unit * 0.05, unit * 0.48, unit * 0.05);
  pen.fillStyle = INK.pot.clay;
  pen.fillRect(x - unit * 0.12, y - unit * 0.34, unit * 0.24, unit * 0.12);
  pen.fillStyle = INK.pot.light;
  pen.beginPath();
  pen.ellipse(x, y - unit * 0.34, unit * 0.15, unit * 0.05, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.pot.dark;
  pen.beginPath();
  pen.ellipse(x, y - unit * 0.34, unit * 0.09, unit * 0.03, 0, 0, TAU);
  pen.fill();
  pen.fillStyle = alpha(INK.shine, 0.3);
  pen.beginPath();
  pen.ellipse(x - unit * 0.12, y - unit * 0.08, unit * 0.04, unit * 0.08, 0.3, 0, TAU);
  pen.fill();
};

// an errand's item: a tied bundle with a glint, so it is found
const bundle = (pen, frame, placed) => {
  const unit = frame.view.tile;
  const x = (placed.x + 0.5) * unit;
  const y = (placed.y + 0.55) * unit;
  shadow(pen, x + unit * 0.02, y + unit * 0.28, unit * 0.24, 0.28);
  pen.fillStyle = INK.bundle.cloth;
  pen.beginPath();
  pen.roundRect(x - unit * 0.23, y - unit * 0.12, unit * 0.46, unit * 0.38, unit * 0.14);
  pen.moveTo(x - unit * 0.1, y - unit * 0.12);
  pen.lineTo(x, y - unit * 0.3);
  pen.lineTo(x + unit * 0.1, y - unit * 0.12);
  pen.fill();
  pen.strokeStyle = INK.bundle.knot;
  pen.lineWidth = Math.max(1, unit * 0.04);
  pen.beginPath();
  pen.moveTo(x - unit * 0.12, y - unit * 0.1);
  pen.lineTo(x + unit * 0.12, y - unit * 0.1);
  pen.stroke();
  pen.fillStyle = alpha(INK.shine, 0.5 + Math.sin(frame.time / 250 + placed.x * 3) * 0.5);
  twinkle(pen, x + unit * 0.24, y - unit * 0.26, unit * 0.1);
};

const wisp = (pen, centre, radius, tint, time, phase) => {
  pen.fillStyle = tint;
  pen.beginPath();
  pen.arc(centre.x, centre.y, radius, Math.PI, 0);
  const hem = centre.y + radius * 0.9;
  for (let fold = 0; fold <= 4; fold += 1) {
    const across = centre.x + radius - (fold * radius) / 2;
    pen.lineTo(
      across,
      hem +
        (fold % 2 ? -radius * 0.28 : radius * 0.2) +
        Math.sin(time / 180 + fold + phase) * radius * 0.1,
    );
  }
  pen.closePath();
  pen.fill();
};

const LOOK = { south: [0, 0.18], north: [0, -0.4], west: [-0.3, 0], east: [0.3, 0] };

const eyes = (pen, centre, radius, facing, open) => {
  if (facing === "north") return;
  const [dx, dy] = LOOK[facing];
  pen.fillStyle = INK.eye;
  pen.strokeStyle = INK.eye;
  pen.lineWidth = Math.max(1, radius * 0.14);
  pen.beginPath();
  for (const side of [-1, 1]) {
    const x = centre.x + side * radius * 0.34 + dx * radius;
    const y = centre.y + dy * radius - radius * 0.05;
    if (open) {
      pen.moveTo(x + radius * 0.16, y);
      pen.arc(x, y, radius * 0.16, 0, TAU);
    } else {
      pen.moveTo(x - radius * 0.2, y);
      pen.lineTo(x + radius * 0.2, y);
    }
  }
  if (open) pen.fill();
  else pen.stroke();
};

// a "!" or "?" over a head: a speech bubble with a tail
const bubble = (pen, x, y, size, glyph, ink) => {
  pen.fillStyle = INK.bubble.fill;
  pen.strokeStyle = INK.bubble.edge;
  pen.lineWidth = Math.max(1, size * 0.08);
  pen.beginPath();
  pen.roundRect(x - size * 0.5, y - size * 1.1, size, size, size * 0.3);
  pen.moveTo(x - size * 0.14, y - size * 0.12);
  pen.lineTo(x, y + size * 0.14);
  pen.lineTo(x + size * 0.14, y - size * 0.12);
  pen.fill();
  pen.beginPath();
  pen.roundRect(x - size * 0.5, y - size * 1.1, size, size, size * 0.3);
  pen.stroke();
  pen.fillStyle = INK.bubble.fill;
  pen.fillRect(x - size * 0.12, y - size * 0.16, size * 0.24, size * 0.1);
  pen.fillStyle = ink;
  pen.font = `900 ${Math.round(size * 0.78)}px ui-rounded, system-ui, sans-serif`;
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.fillText(glyph, x, y - size * 0.58);
};

const spirit = (pen, frame, walker, at, scale) => {
  const unit = frame.view.tile;
  const time = frame.time;
  const phase = at.x * 2 + at.y;
  const centre = {
    x: (at.x + 0.5) * unit,
    y: (at.y + 0.42) * unit + Math.sin(time / 300 + phase) * unit * 0.05,
  };
  const radius = unit * 0.3 * scale;
  const fading = walker.mode === "return" ? 0.6 : 1;
  glow(pen, centre.x, centre.y, radius * 2.2, INK.shine, 0.12 * fading);
  shadow(pen, centre.x, (at.y + 0.9) * unit, radius * 0.75, 0.22);
  wisp(pen, centre, radius, hue(frame.world, walker.word, 0.92 * fading), time, phase);
  pen.fillStyle = alpha(INK.shine, 0.35 * fading);
  pen.beginPath();
  pen.ellipse(
    centre.x - radius * 0.35,
    centre.y - radius * 0.45,
    radius * 0.22,
    radius * 0.12,
    -0.6,
    0,
    TAU,
  );
  pen.fill();
  eyes(pen, centre, radius, walker.facing, true);
};

// a spirit that saw the learner says so over its head, over everything that stands
const alarm = (pen, frame, walker, at) => {
  if (walker.mode !== "alert" && walker.mode !== "chase") return;
  const unit = frame.view.tile;
  const time = frame.time;
  const phase = at.x * 2 + at.y;
  const hop = walker.mode === "alert" ? Math.abs(Math.sin(time / 90)) * unit * 0.06 : 0;
  const head = (at.y + 0.42) * unit + Math.sin(time / 300 + phase) * unit * 0.05 - unit * 0.3;
  bubble(pen, (at.x + 0.5) * unit, head - unit * 0.12 - hop, unit * 0.42, "!", INK.bubble.alert);
};

const keeper = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const x = (fixture.x + 0.5) * unit;
  const y = (fixture.y + 0.5) * unit;
  const facing = fixture.facing;
  const side = facing === "west" ? -1 : 1;
  glow(
    pen,
    x + side * unit * 0.28,
    y + unit * 0.08,
    unit * 0.9,
    INK.keeper.lantern,
    0.3 + Math.sin(frame.time / 260) * 0.05,
  );
  shadow(pen, x, y + unit * 0.4, unit * 0.28);
  pen.fillStyle = INK.keeper.robe;
  pen.beginPath();
  pen.moveTo(x, y - unit * 0.42);
  pen.quadraticCurveTo(x + unit * 0.32, y - unit * 0.1, x + unit * 0.27, y + unit * 0.38);
  pen.lineTo(x - unit * 0.27, y + unit * 0.38);
  pen.quadraticCurveTo(x - unit * 0.32, y - unit * 0.1, x, y - unit * 0.42);
  pen.fill();
  pen.fillStyle = INK.keeper.trim;
  pen.fillRect(x - unit * 0.27, y + unit * 0.3, unit * 0.54, unit * 0.06);
  pen.fillStyle = INK.keeper.hood;
  pen.beginPath();
  pen.arc(x, y - unit * 0.2, unit * 0.2, Math.PI, 0);
  pen.lineTo(x + unit * 0.2, y - unit * 0.06);
  pen.lineTo(x - unit * 0.2, y - unit * 0.06);
  pen.fill();
  if (facing !== "north") {
    pen.fillStyle = INK.keeper.skin;
    pen.beginPath();
    pen.ellipse(
      x + LOOK[facing][0] * unit * 0.12,
      y - unit * 0.14,
      unit * 0.12,
      unit * 0.1,
      0,
      0,
      TAU,
    );
    pen.fill();
    pen.fillStyle = INK.eye;
    for (const eye of facing === "south" ? [-1, 1] : [side]) {
      pen.beginPath();
      pen.arc(
        x + eye * unit * 0.05 + LOOK[facing][0] * unit * 0.12,
        y - unit * 0.15,
        unit * 0.022,
        0,
        TAU,
      );
      pen.fill();
    }
  }
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(x + side * unit * 0.3 - unit * 0.02, y - unit * 0.12, unit * 0.04, unit * 0.2);
  pen.fillStyle = INK.keeper.lantern;
  pen.beginPath();
  pen.roundRect(
    x + side * unit * 0.3 - unit * 0.07,
    y + unit * 0.06,
    unit * 0.14,
    unit * 0.16,
    unit * 0.04,
  );
  pen.fill();
};

const vendor = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const x = (fixture.x + 0.5) * unit;
  const y = (fixture.y + 0.5) * unit;
  shadow(pen, x, y + unit * 0.4, unit * 0.26);
  pen.fillStyle = INK.vendor.shirt;
  pen.beginPath();
  pen.roundRect(x - unit * 0.24, y - unit * 0.08, unit * 0.48, unit * 0.46, unit * 0.14);
  pen.fill();
  pen.fillStyle = INK.vendor.apron;
  pen.beginPath();
  pen.roundRect(x - unit * 0.15, y, unit * 0.3, unit * 0.36, unit * 0.06);
  pen.fill();
  pen.fillStyle = INK.vendor.skin;
  pen.beginPath();
  pen.arc(x, y - unit * 0.22, unit * 0.17, 0, TAU);
  pen.fill();
  pen.fillStyle = INK.vendor.cap;
  pen.beginPath();
  pen.arc(x, y - unit * 0.27, unit * 0.17, Math.PI, 0);
  pen.fill();
  pen.fillRect(x - unit * 0.2, y - unit * 0.28, unit * 0.4, unit * 0.04);
  pen.fillStyle = INK.eye;
  for (const side of [-1, 1]) {
    pen.beginPath();
    pen.arc(x + side * unit * 0.06, y - unit * 0.18, unit * 0.022, 0, TAU);
    pen.fill();
  }
};

// the shrine: a stone lantern whose flame never goes out
const shrine = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const x = (fixture.x + 0.5) * unit;
  const y = (fixture.y + 0.5) * unit;
  const flicker = Math.sin(frame.time / 90) * 0.08 + Math.sin(frame.time / 37) * 0.05;
  glow(pen, x, y - unit * 0.18, unit * 0.95, INK.shrine.glow, 0.32 + flicker);
  shadow(pen, x, y + unit * 0.4, unit * 0.3);
  pen.fillStyle = INK.shrine.dark;
  pen.fillRect(x - unit * 0.26, y + unit * 0.26, unit * 0.52, unit * 0.14);
  pen.fillStyle = INK.shrine.stone;
  pen.fillRect(x - unit * 0.09, y + unit * 0.04, unit * 0.18, unit * 0.24);
  pen.fillRect(x - unit * 0.21, y - unit * 0.28, unit * 0.42, unit * 0.32);
  pen.fillStyle = INK.shrine.dark;
  pen.beginPath();
  pen.moveTo(x - unit * 0.32, y - unit * 0.26);
  pen.lineTo(x, y - unit * 0.48);
  pen.lineTo(x + unit * 0.32, y - unit * 0.26);
  pen.fill();
  pen.fillStyle = INK.dark;
  pen.fillRect(x - unit * 0.11, y - unit * 0.2, unit * 0.22, unit * 0.18);
  pen.fillStyle = INK.shrine.flame;
  pen.beginPath();
  pen.ellipse(x, y - unit * 0.11, unit * 0.06, unit * (0.08 + flicker * 0.2), 0, 0, TAU);
  pen.fill();
};

// the square's sign is the valley's map; a district's sign at its entry carries its name
const sign = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const x = (fixture.x + 0.5) * unit;
  const y = (fixture.y + 0.5) * unit;
  const atlas = frame.world.maps[frame.state.run.pose.map].place === null;
  shadow(pen, x + unit * 0.04, y + unit * 0.4, unit * 0.22);
  pen.fillStyle = INK.sign.post;
  pen.fillRect(x - unit * 0.04, y - unit * 0.1, unit * 0.08, unit * 0.5);
  if (atlas) {
    pen.fillStyle = INK.sign.post;
    pen.fillRect(x - unit * 0.38, y - unit * 0.46, unit * 0.76, unit * 0.46);
    pen.fillStyle = INK.sign.sea;
    pen.fillRect(x - unit * 0.33, y - unit * 0.41, unit * 0.66, unit * 0.36);
    pen.fillStyle = INK.sign.land;
    for (const [dx, dy] of [
      [-0.2, -0.3],
      [0.02, -0.28],
      [0.2, -0.3],
      [-0.2, -0.16],
      [0.02, -0.15],
      [0.2, -0.16],
    ]) {
      pen.fillRect(
        x + dx * unit - unit * 0.08,
        y + dy * unit - unit * 0.05,
        unit * 0.16,
        unit * 0.1,
      );
    }
    pen.fillStyle = INK.fx.restore;
    pen.beginPath();
    pen.arc(x + unit * 0.02, y - unit * 0.22, unit * 0.035, 0, TAU);
    pen.fill();
    return;
  }
  pen.fillStyle = INK.sign.board;
  pen.beginPath();
  pen.moveTo(x - unit * 0.32, y - unit * 0.4);
  pen.lineTo(x + unit * 0.24, y - unit * 0.4);
  pen.lineTo(x + unit * 0.36, y - unit * 0.28);
  pen.lineTo(x + unit * 0.24, y - unit * 0.16);
  pen.lineTo(x - unit * 0.32, y - unit * 0.16);
  pen.closePath();
  pen.fill();
  pen.fillStyle = INK.sign.ink;
  for (let mark = 0; mark < 3; mark += 1)
    pen.fillRect(x - unit * 0.24 + mark * unit * 0.15, y - unit * 0.3, unit * 0.1, unit * 0.04);
};

// the summit: a stepped spire that brightens with every district restored
const summit = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const risen = restoration(frame.world, frame.state.run);
  const x = (fixture.x + 0.5) * unit;
  const y = (fixture.y + 0.5) * unit;
  const pulse = risen === 1 ? Math.sin(frame.time / 300) * 0.08 : 0;
  glow(pen, x, y - unit * 0.2, unit * 1.2, INK.summit.crown, 0.1 + risen * 0.35 + pulse);
  shadow(pen, x, y + unit * 0.4, unit * 0.4);
  pen.fillStyle = INK.summit.dark;
  pen.fillRect(x - unit * 0.38, y + unit * 0.22, unit * 0.76, unit * 0.18);
  pen.fillStyle = INK.summit.stone;
  pen.fillRect(x - unit * 0.26, y + unit * 0.06, unit * 0.52, unit * 0.18);
  pen.beginPath();
  pen.moveTo(x - unit * 0.15, y + unit * 0.08);
  pen.lineTo(x, y - unit * 0.45);
  pen.lineTo(x + unit * 0.15, y + unit * 0.08);
  pen.fill();
  pen.fillStyle = risen === 1 ? INK.summit.crown : alpha(INK.summit.crown, 0.3 + risen * 0.5);
  pen.beginPath();
  pen.arc(x, y - unit * 0.45, unit * 0.07, 0, TAU);
  pen.fill();
};

const CROWN = [
  [-0.45, -1.5],
  [-0.2, -1],
  [0, -1.6],
  [0.2, -1],
  [0.45, -1.5],
  [0.7, -0.8],
];

const diadem = (pen, head) => {
  pen.fillStyle = INK.summit.crown;
  pen.beginPath();
  pen.moveTo(head.x - head.radius * 0.7, head.y - head.radius * 0.8);
  for (const [x, y] of CROWN) pen.lineTo(head.x + head.radius * x, head.y + head.radius * y);
  pen.closePath();
  pen.fill();
};

// the warden sleeps, dim, until most of its place's words are held; then it wakes, red
const warden = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const map = frame.world.maps[frame.state.run.pose.map];
  const awake = share(frame.memory, frame.world.places[map.place].words) >= WAKING;
  const duel = frame.state.scene.duel;
  const scale = duel !== null && duel.foe.kind === "warden" ? 1.7 : 1.45;
  const at = { x: fixture.x, y: fixture.y };
  const centre = {
    x: (at.x + 0.5) * unit,
    y: (at.y + 0.36) * unit + Math.sin(frame.time / 420) * unit * 0.04,
  };
  const radius = unit * 0.3 * scale;
  const tint = awake ? INK.warden.awake : INK.warden.asleep;
  glow(pen, centre.x, centre.y, radius * 2, tint, awake ? 0.3 : 0.12);
  shadow(pen, centre.x, (at.y + 0.92) * unit, radius * 0.8, 0.28);
  wisp(pen, centre, radius, tint, frame.time, at.x);
  eyes(pen, centre, radius, fixture.facing, awake);
  diadem(pen, { x: centre.x, y: centre.y, radius });
  if (awake) return;
  const drift = (frame.time % 1800) / 1800;
  pen.fillStyle = alpha(INK.linen, 1 - drift);
  pen.font = `700 ${Math.round(unit * 0.3)}px ui-serif, Georgia, serif`;
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.fillText(
    "z",
    centre.x + radius + drift * unit * 0.15,
    centre.y - radius - drift * unit * 0.3,
  );
};

// the haunt: a ring of old standing stones in the grass where spirits gather; it stirs, glowing,
// once two spirits roam the map and a swarm can begin
const haunt = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const x = (fixture.x + 0.5) * unit;
  const y = (fixture.y + 0.56) * unit;
  const stirring = frame.state.scene.spirits.length >= 2;
  if (stirring)
    glow(
      pen,
      x,
      y - unit * 0.1,
      unit * 1.1,
      INK.haunt.glow,
      0.3 + Math.sin(frame.time / 400) * 0.12,
    );
  const ring = [...Array(6).keys()]
    .map((index) => (index / 6) * TAU + 0.5)
    .map((angle) => ({
      x: x + Math.cos(angle) * unit * 0.36,
      y: y + Math.sin(angle) * unit * 0.24,
    }))
    .sort((one, other) => one.y - other.y);
  for (const at of ring) {
    shadow(pen, at.x + unit * 0.03, at.y + unit * 0.04, unit * 0.1, 0.3);
    pen.fillStyle = INK.haunt.stone;
    pen.beginPath();
    pen.roundRect(at.x - unit * 0.075, at.y - unit * 0.28, unit * 0.15, unit * 0.3, [
      unit * 0.07,
      unit * 0.07,
      unit * 0.02,
      unit * 0.02,
    ]);
    pen.fill();
    pen.fillStyle = alpha(INK.shade, 0.18);
    pen.fillRect(at.x + unit * 0.02, at.y - unit * 0.24, unit * 0.055, unit * 0.26);
    pen.fillStyle = INK.haunt.moss;
    pen.fillRect(at.x - unit * 0.075, at.y - unit * 0.06, unit * 0.15, unit * 0.05);
    if (stirring) {
      pen.fillStyle = alpha(INK.haunt.glow, 0.8);
      pen.fillRect(at.x - unit * 0.02, at.y - unit * 0.2, unit * 0.04, unit * 0.06);
    }
  }
};

// beside a bed: a nightstand and its candle
const nightstand = (pen, frame, fixture) => {
  const unit = frame.view.tile;
  const x = (fixture.x + 0.5) * unit;
  const y = (fixture.y + 0.5) * unit;
  glow(pen, x, y - unit * 0.2, unit * 0.7, INK.fire.glow, 0.22 + Math.sin(frame.time / 120) * 0.04);
  shadow(pen, x, y + unit * 0.32, unit * 0.22);
  pen.fillStyle = INK.wood.dark;
  pen.fillRect(x - unit * 0.2, y - unit * 0.02, unit * 0.4, unit * 0.34);
  pen.fillStyle = INK.wood.base;
  pen.fillRect(x - unit * 0.22, y - unit * 0.08, unit * 0.44, unit * 0.08);
  pen.fillStyle = INK.gold.base;
  pen.fillRect(x - unit * 0.03, y + unit * 0.1, unit * 0.06, unit * 0.04);
  pen.fillStyle = INK.linen;
  pen.fillRect(x - unit * 0.04, y - unit * 0.24, unit * 0.08, unit * 0.16);
  pen.fillStyle = INK.fire.flame;
  pen.beginPath();
  pen.ellipse(x, y - unit * 0.29, unit * 0.03, unit * 0.05, 0, 0, TAU);
  pen.fill();
};

const FIGURES = { keeper, vendor, shrine, sign, summit, warden, haunt, bed: nightstand };

const learner = (pen, frame, at) => {
  const unit = frame.view.tile;
  const facing = frame.state.run.pose.facing;
  const step = frame.learner.step;
  const ink = INK.learner;
  const x = (at.x + 0.5) * unit;
  const feet = (at.y + 0.92) * unit;
  const lift = step ? Math.sin(step.progress * Math.PI) * unit * 0.045 : 0;
  const swing = step ? (step.foot ? 1 : -1) * Math.sin(step.progress * Math.PI) : 0;
  const side = facing === "west" ? -1 : facing === "east" ? 1 : 0;
  shadow(pen, x, feet, unit * 0.22, 0.3);
  pen.fillStyle = ink.boot;
  for (const foot of [-1, 1]) {
    const reach = side === 0 ? foot * swing * unit * 0.05 : 0;
    const stride = side === 0 ? 0 : foot * swing * unit * 0.08;
    pen.beginPath();
    pen.ellipse(
      x + foot * unit * 0.08 + stride * side,
      feet - unit * 0.04 - Math.max(0, reach),
      unit * 0.07,
      unit * 0.05,
      0,
      0,
      TAU,
    );
    pen.fill();
  }
  const top = feet - unit * 0.52 - lift;
  pen.fillStyle = ink.cloak;
  pen.beginPath();
  pen.moveTo(x - unit * 0.14, top + unit * 0.04);
  pen.lineTo(x + unit * 0.14, top + unit * 0.04);
  pen.quadraticCurveTo(
    x + unit * 0.24,
    top + unit * 0.3,
    x + unit * 0.21,
    feet - unit * 0.06 - lift,
  );
  pen.lineTo(x - unit * 0.21, feet - unit * 0.06 - lift);
  pen.quadraticCurveTo(x - unit * 0.24, top + unit * 0.3, x - unit * 0.14, top + unit * 0.04);
  pen.fill();
  pen.fillStyle = ink.fold;
  pen.beginPath();
  pen.moveTo(x + unit * (side >= 0 ? 0.06 : -0.06), top + unit * 0.1);
  pen.quadraticCurveTo(
    x + unit * (side >= 0 ? 0.2 : -0.2),
    top + unit * 0.3,
    x + unit * (side >= 0 ? 0.2 : -0.2),
    feet - unit * 0.06 - lift,
  );
  pen.lineTo(x + unit * (side >= 0 ? 0.1 : -0.1), feet - unit * 0.06 - lift);
  pen.closePath();
  pen.fill();
  if (facing === "north") {
    pen.fillStyle = ink.pack;
    pen.beginPath();
    pen.roundRect(x - unit * 0.12, top + unit * 0.1, unit * 0.24, unit * 0.22, unit * 0.06);
    pen.fill();
    pen.fillStyle = alpha(INK.shade, 0.25);
    pen.fillRect(x - unit * 0.12, top + unit * 0.18, unit * 0.24, unit * 0.03);
  }
  pen.fillStyle = ink.skin;
  for (const arm of [-1, 1]) {
    const reach = side === 0 ? -arm * swing * unit * 0.03 : arm * swing * unit * 0.06;
    pen.beginPath();
    pen.arc(
      x + arm * unit * 0.2 + (side === 0 ? 0 : reach),
      top + unit * 0.3 + (side === 0 ? reach : 0),
      unit * 0.05,
      0,
      TAU,
    );
    pen.fill();
  }
  pen.fillStyle = ink.scarf;
  pen.beginPath();
  pen.roundRect(x - unit * 0.15, top, unit * 0.3, unit * 0.08, unit * 0.04);
  pen.fill();
  if (facing !== "south") {
    pen.beginPath();
    pen.moveTo(x - side * unit * 0.1, top + unit * 0.06);
    pen.quadraticCurveTo(
      x - side * unit * 0.22 - (side === 0 ? unit * 0.05 : 0),
      top + unit * 0.14 + Math.sin(frame.time / 160) * unit * 0.02,
      x - side * unit * 0.2 - (side === 0 ? unit * 0.08 : 0),
      top + unit * 0.22,
    );
    pen.lineTo(x - side * unit * 0.12 - (side === 0 ? unit * 0.02 : 0), top + unit * 0.16);
    pen.closePath();
    pen.fill();
  }
  const head = { x: x + side * unit * 0.02, y: top - unit * 0.15, radius: unit * 0.18 };
  pen.fillStyle = ink.skin;
  pen.beginPath();
  pen.arc(head.x, head.y, head.radius, 0, TAU);
  pen.fill();
  pen.fillStyle = ink.hair;
  pen.beginPath();
  if (facing === "north") pen.arc(head.x, head.y, head.radius * 1.04, 0, TAU);
  else if (facing === "south") {
    pen.arc(head.x, head.y - head.radius * 0.1, head.radius * 1.04, Math.PI * 1.02, Math.PI * 1.98);
    pen.quadraticCurveTo(
      head.x + head.radius * 0.5,
      head.y - head.radius * 0.2,
      head.x,
      head.y - head.radius * 0.35,
    );
    pen.quadraticCurveTo(
      head.x - head.radius * 0.5,
      head.y - head.radius * 0.2,
      head.x - head.radius * 1.02,
      head.y - head.radius * 0.05,
    );
  } else {
    pen.arc(
      head.x,
      head.y,
      head.radius * 1.04,
      side > 0 ? Math.PI * 0.55 : Math.PI * 1.45,
      side > 0 ? Math.PI * 1.9 : Math.PI * 0.1,
      side < 0,
    );
    pen.quadraticCurveTo(
      head.x + side * head.radius * 0.4,
      head.y - head.radius * 0.5,
      head.x + side * head.radius * 0.1,
      head.y - head.radius * 0.2,
    );
  }
  pen.fill();
  if (facing === "north") return;
  pen.fillStyle = INK.eye;
  const eyes = facing === "south" ? [-1, 1] : [side];
  for (const eye of eyes) {
    pen.beginPath();
    pen.ellipse(
      head.x + (facing === "south" ? eye * head.radius * 0.38 : side * head.radius * 0.5),
      head.y + head.radius * 0.12,
      head.radius * 0.1,
      head.radius * 0.14,
      0,
      0,
      TAU,
    );
    pen.fill();
  }
  pen.fillStyle = alpha(ink.cheek, 0.6);
  for (const eye of eyes) {
    pen.beginPath();
    pen.arc(
      head.x + (facing === "south" ? eye * head.radius * 0.55 : side * head.radius * 0.3),
      head.y + head.radius * 0.42,
      head.radius * 0.13,
      0,
      TAU,
    );
    pen.fill();
  }
};

// a lantern held up in the dark
const lantern = (pen, frame, at) => {
  const unit = frame.view.tile;
  const side = frame.state.run.pose.facing === "west" ? -1 : 1;
  const x = (at.x + 0.5) * unit + side * unit * 0.26;
  const y = (at.y + 0.55) * unit;
  pen.fillStyle = INK.iron.dark;
  pen.fillRect(x - unit * 0.05, y - unit * 0.1, unit * 0.1, unit * 0.03);
  pen.fillStyle = INK.fire.glow;
  pen.beginPath();
  pen.roundRect(x - unit * 0.05, y - unit * 0.07, unit * 0.1, unit * 0.13, unit * 0.03);
  pen.fill();
  pen.fillStyle = INK.fire.core;
  pen.fillRect(x - unit * 0.02, y - unit * 0.04, unit * 0.04, unit * 0.07);
};

// ---- light and dark ---------------------------------------------------------------------------

// a dark map shows only the light: the lantern's, around the learner; else a little near the entry
const light = (map, run, at) => {
  if (held(run, "lantern") > 0) return { x: at.x + 0.5, y: at.y + 0.5, radius: LANTERN };
  const door = entry(map);
  return { x: door.x + 0.5, y: door.y + 0.5, radius: LIGHT };
};

const darkness = (pen, frame, lit) => {
  const unit = frame.view.tile;
  const flicker = Math.sin(frame.time / 130) * 0.06 + Math.sin(frame.time / 47) * 0.03;
  const radius = (lit.radius + flicker) * unit;
  const centre = { x: lit.x * unit, y: lit.y * unit };
  const shade = pen.createRadialGradient(
    centre.x,
    centre.y,
    radius * FULL,
    centre.x,
    centre.y,
    radius,
  );
  shade.addColorStop(0, alpha(INK.dark, 0));
  shade.addColorStop(0.55, alpha(INK.dark, 0.72));
  shade.addColorStop(1, alpha(INK.dark, 0.97));
  pen.fillStyle = shade;
  pen.fillRect(
    frame.view.x - unit,
    frame.view.y - unit,
    frame.view.width + unit * 2,
    frame.view.height + unit * 2,
  );
  glow(pen, centre.x, centre.y, radius * 0.8, INK.fire.glow, 0.08);
};

// ---- moments ----------------------------------------------------------------------------------

// the screen's half of a moment: a burst of sparks at a cell, in a tone of INK.fx
export const burst = (fx, at, tone, time, count = 14) => {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU;
    const speed = 0.4 + (index % 3) * 0.25;
    fx.sparks.push({
      x: at.x,
      y: at.y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      tone,
      born: time,
      life: 520,
    });
  }
};

const sparks = (pen, frame) => {
  const unit = frame.view.tile;
  const { fx, time } = frame;
  fx.sparks = fx.sparks.filter((spark) => time - spark.born < spark.life);
  for (const spark of fx.sparks) {
    const age = Math.max(0, (time - spark.born) / spark.life);
    pen.fillStyle = alpha(INK.fx[spark.tone], 1 - age);
    pen.beginPath();
    pen.arc(
      (spark.x + 0.5 + spark.dx * age) * unit,
      (spark.y + 0.5 + spark.dy * age) * unit - age * unit * 0.2,
      (unit / 16) * (1 - age) + unit / 48,
      0,
      TAU,
    );
    pen.fill();
  }
};

// ---- the painter ------------------------------------------------------------------------------

// frame: {
//   world, state, memory, markers, fx, time,
//   view: { x, y, tile, width, height } the view over the map, in device pixels
//   learner: { x, y, step }             glided cell; step = { foot, progress } mid-stride, or null
//   spirits: Map(word → { x, y })       glided cells
//   arrived                             the time the learner last arrived on a map
// }
// fx (kept by the screen): { sparks: [], shake: until, flash: { until, tone } } — a tone is a key
// of INK.fx: strike · hurt · heal · coin · rest · restore
export const painter = () => {
  let cache = null;
  return (pen, frame) => {
    const { world, state, memory, view, time, fx } = frame;
    const map = world.maps[state.run.pose.map];
    const ruin = ruinOf(world, map, memory);
    const id = `${map.id}:${view.tile}:${ruin}`;
    if (cache === null || cache.id !== id) cache = { id, ...stock(map, view.tile, ruin) };
    const unit = view.tile;
    const seen = sight(view);
    const shake = time < fx.shake ? Math.round(Math.sin(time / 18) * unit * 0.08) : 0;

    pen.setTransform(1, 0, 0, 1, 0, 0);
    pen.fillStyle = INK.night;
    pen.fillRect(0, 0, view.width, view.height);
    pen.setTransform(1, 0, 0, 1, shake - view.x, -view.y);
    spread(pen, cache, view);
    lively(pen, cache, seen, time, LIVELY);

    const foe = state.scene.duel === null ? null : state.scene.duel.foe;
    const things = cache.statics.filter((placed) => overlaps(view, placed));
    for (const placed of map.stones) {
      if (inside(seen, placed))
        things.push({ x: placed.x, y: placed.y, order: 1, paint: () => stone(pen, frame, placed) });
    }
    for (const placed of map.chests) {
      things.push({ x: placed.x, y: placed.y, order: 1, paint: () => chest(pen, frame, placed) });
    }
    for (const placed of map.pots) {
      things.push({ x: placed.x, y: placed.y, order: 1, paint: () => pot(pen, frame, placed) });
    }
    for (const placed of lying(world, map.id, state.run)) {
      things.push({ x: placed.x, y: placed.y, order: 1, paint: () => bundle(pen, frame, placed) });
    }
    for (const fixture of standing(world, map.id, state.run)) {
      things.push({
        x: fixture.x,
        y: fixture.y,
        order: 2,
        paint: () => FIGURES[fixture.kind](pen, frame, fixture),
      });
    }
    for (const walker of state.scene.spirits) {
      const at = frame.spirits.get(walker.word);
      const scale = foe !== null && foe.kind === "spirit" && foe.word === walker.word ? 1.25 : 1;
      things.push({
        x: at.x,
        y: at.y,
        order: 3,
        paint: () => {
          spirit(pen, frame, walker, at, scale);
          wade(pen, cache, at);
        },
      });
    }
    const dark = map.dark;
    const lit = dark ? light(map, state.run, frame.learner) : null;
    things.push({
      x: frame.learner.x,
      y: frame.learner.y,
      order: 4,
      paint: () => {
        learner(pen, frame, frame.learner);
        if (dark && lit.radius === LANTERN) lantern(pen, frame, frame.learner);
        wade(pen, cache, frame.learner);
      },
    });
    things.sort((one, other) => one.y - other.y || one.order - other.order);
    for (const thing of things) {
      if (thing.image) pen.drawImage(thing.image, thing.left, thing.top);
      else thing.paint();
    }

    for (const walker of state.scene.spirits)
      alarm(pen, frame, walker, frame.spirits.get(walker.word));
    if (dark) darkness(pen, frame, lit);
    lively(pen, cache, seen, time, GLEAMS);
    for (const marker of frame.markers) {
      const bob = Math.sin(time / 260 + marker.x) * unit * 0.06;
      const awake = marker.kind === "awake";
      bubble(
        pen,
        (marker.x + 0.5) * unit,
        (marker.y - (awake ? 0.45 : 0.15)) * unit + bob,
        unit * 0.46,
        awake ? "?" : "!",
        awake ? INK.bubble.awake : INK.bubble.quest,
      );
    }
    sparks(pen, frame);

    pen.setTransform(1, 0, 0, 1, 0, 0);
    if (time < fx.flash.until) {
      pen.fillStyle = alpha(
        INK.fx[fx.flash.tone],
        0.28 * Math.min(1, (fx.flash.until - time) / 260),
      );
      pen.fillRect(0, 0, view.width, view.height);
    }
    const since = time - frame.arrived;
    if (since < FADE) {
      pen.fillStyle = alpha(INK.night, 1 - Math.max(0, since) / FADE);
      pen.fillRect(0, 0, view.width, view.height);
    }
  };
};

// whoever stands in tall grass is half hidden by its front blades, which part round them mid-step
const wade = (pen, cache, at) => {
  if (cache.art.kind(Math.round(at.x), Math.round(at.y)) !== "tallgrass") return;
  pen.drawImage(cache.blades, at.x * cache.art.unit, at.y * cache.art.unit);
};
