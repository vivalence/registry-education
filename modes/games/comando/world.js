import { face } from "./mando/lexicon.js";

export const DELTA = {
  "arriba.adverb": [0, -1],
  "abajo.adverb": [0, 1],
  "izquierda.noun": [-1, 0],
  "derecha.noun": [1, 0],
};

export const DIRECTIONS = Object.keys(DELTA);
export const UNITS = ["soldado.noun", "camión.noun", "explorador.noun"];
export const COLORS = ["rojo.adjective", "azul.adjective", "verde.adjective"];
export const NUMERALS = ["uno.numeral", "dos.numeral", "tres.numeral"];
export const GLYPH = { "soldado.noun": "S", "camión.noun": "C", "explorador.noun": "E" };
export const DOT = { "rojo.adjective": "neg", "azul.adjective": "", "verde.adjective": "pos" };

const rand = (n) => Math.floor(Math.random() * n);
const pick = (list) => list[rand(list.length)];
const clamp = (lo, hi, n) => Math.min(hi, Math.max(lo, n));

export const create = ({ w = 8, h = 8, units = 1 } = {}) => ({
  w,
  h,
  beat: 0,
  score: 0,
  lost: 0,
  units: Array.from({ length: units }, (_, id) => ({ id, unit: UNITS[id % 3], color: COLORS[id % 3], x: rand(w), y: rand(h) })),
  goals: [],
  hazards: Array.from({ length: 4 }, () => ({ x: rand(w), y: rand(h) })),
});

const addressee = (world, command) =>
  world.units.find((unit) => (command.unit === null || unit.unit === command.unit) && (command.color === null || unit.color === command.color)) ?? world.units[0];

const hazarded = (world, unit) => world.hazards.some((hazard) => hazard.x === unit.x && hazard.y === unit.y);

export const order = (world, command) => {
  if (command.kind === "stop") return world;
  const target = addressee(world, command);
  const [dx, dy] = DELTA[command.direction];
  const moved = { ...target, x: clamp(0, world.w - 1, target.x + dx * command.count), y: clamp(0, world.h - 1, target.y + dy * command.count) };
  const landed = hazarded(world, moved) ? { ...moved, x: rand(world.w), y: rand(world.h) } : moved;
  return { ...world, lost: hazarded(world, moved) ? world.lost + 1 : world.lost, units: world.units.map((unit) => (unit === target ? landed : unit)) };
};

const spawn = (world, tempo) =>
  world.goals.length >= Math.ceil(tempo) ? world : { ...world, goals: [...world.goals, { id: crypto.randomUUID(), x: rand(world.w), y: rand(world.h), due: world.beat + Math.max(3, Math.round(8 / tempo)) }] };

export const step = (world, tempo) => {
  const beat = world.beat + 1;
  const reached = (goal) => world.units.some((unit) => unit.x === goal.x && unit.y === goal.y);
  const overdue = (goal) => beat > goal.due;
  const score = world.score + world.goals.filter(reached).length;
  const lost = world.lost + world.goals.filter((goal) => !reached(goal) && overdue(goal)).length;
  return spawn({ ...world, beat, score, lost, goals: world.goals.filter((goal) => !reached(goal) && !overdue(goal)) }, tempo);
};

export const speak = (world, tier) => {
  const direction = pick(DIRECTIONS);
  const count = tier >= 1 ? 1 + rand(3) : 1;
  const unit = pick(world.units);
  const command = { kind: "move", direction, count, unit: tier >= 2 ? unit.unit : null, color: tier >= 2 ? unit.color : null };
  const slugs = [direction, ...(tier >= 1 ? [NUMERALS[count - 1]] : []), ...(tier >= 2 ? [unit.unit, unit.color] : [])];
  return { command, slugs, expect: { unit: unit.id, direction, count } };
};

export const utterance = (spoken) =>
  [spoken.command.unit, spoken.command.color, spoken.command.count > 1 ? NUMERALS[spoken.command.count - 1] : null, spoken.command.direction].filter((slug) => slug !== null).map(face).join(" ");

const at = (thing) => `(${thing.x}, ${thing.y})`;

export const describe = (world) => [
  `board ${world.w}×${world.h} · beat ${world.beat} · score ${world.score} · lost ${world.lost} · x grows to the right (derecha), y grows downward (abajo)`,
  ...world.units.map((unit) => `${face(unit.unit)} ${face(unit.color)} at ${at(unit)}`),
  world.goals.length === 0 ? "no goal on the board" : `goals: ${world.goals.map((goal) => `${at(goal)} due beat ${goal.due}`).join(" · ")}`,
  `hazards: ${world.hazards.map(at).join(" · ")}`,
];

const KINDS = [
  [(cell) => cell.unit !== undefined, (cell) => ({ kind: "unit", glyph: GLYPH[cell.unit.unit], title: `${face(cell.unit.unit)} ${face(cell.unit.color)} ${at(cell)}` })],
  [(cell) => cell.goal !== undefined, (cell) => ({ kind: "goal", glyph: "◆", title: `goal ${at(cell)} · due ${cell.goal.due}` })],
  [(cell) => cell.hazard, (cell) => ({ kind: "hazard", glyph: "▒", title: `hazard ${at(cell)}` })],
  [() => true, (cell) => ({ kind: "empty", glyph: "·", title: at(cell) })],
];

const sensed = (world, x, y) => ({
  x,
  y,
  unit: world.units.find((unit) => unit.x === x && unit.y === y),
  goal: world.goals.find((goal) => goal.x === x && goal.y === y),
  hazard: world.hazards.some((hazard) => hazard.x === x && hazard.y === y),
});

export const grid = (world) =>
  Array.from({ length: world.h }, (_, y) =>
    Array.from({ length: world.w }, (_, x) => {
      const cell = sensed(world, x, y);
      return { x, y, ...KINDS.find(([test]) => test(cell))[1](cell) };
    }),
  );
