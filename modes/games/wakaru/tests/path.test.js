import { assert, assertEquals } from "@std/assert";
import { route } from "../engine/path.js";
import { walk } from "../engine/beats/walk.js";
import {
  DIRECTIONS,
  GRID,
  WIDTH,
  chart,
  enter,
  fixtures,
  landing,
  neighbour,
  same,
  terrain,
} from "../engine/world.js";
import { fresh } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const SEED = 2933376779;

const word = ([learning, known, part], rank) => ({
  id: `w.${learning}`,
  slug: `${learning}.${part}`,
  ontology: "word",
  known,
  learning,
  rank,
  example: null,
  audio: null,
  tokens: null,
  paradigm: null,
  infinitive: null,
  tense: null,
});

// learning, known, part of speech, by place: a word's rank is its row
const LEXICON = {
  market: [
    ["pan", "bread", "noun"],
    ["queso", "cheese", "noun"],
    ["manzana", "apple", "noun"],
    ["leche", "milk", "noun"],
    ["dinero", "money", "noun"],
    ["barato", "cheap", "adjective"],
    ["comprar", "to buy", "verb"],
  ],
  hearth: [
    ["casa", "house", "noun"],
    ["madre", "mother", "noun"],
    ["padre", "father", "noun"],
    ["puerta", "door", "noun"],
    ["ventana", "window", "noun"],
    ["cama", "bed", "noun"],
    ["silla", "chair", "noun"],
    ["abuela", "grandmother", "noun"],
    ["cocina", "kitchen", "noun"],
    ["familia", "family", "noun"],
    ["hijo", "son", "noun"],
    ["vecino", "neighbour", "noun"],
    ["amigo", "friend", "noun"],
  ],
};

const WORDS = Object.values(LEXICON).flat().map(word);

const world = chart(SEED, {
  places: Object.fromEntries(
    Object.entries(LEXICON).map(([place, entries]) => [
      place,
      { words: entries.map(([learning]) => `w.${learning}`), sentences: [] },
    ]),
  ),
  words: Object.fromEntries(WORDS.map((each) => [each.id, each])),
});

const context = (valley, parts) => ({
  world: valley,
  memory: {},
  due: [],
  now: 1000,
  random: mulberry(3),
  ...parts,
});

const standing = (valley, room, cell, ctx = context(valley)) => {
  const run = { ...fresh(SEED), pose: { room, x: cell.x, y: cell.y } };
  return { run, scene: enter(valley, run, ctx) };
};

// a route walked step by step: what the screen was told, and every tile the learner stood on
const walked = (state, steps, ctx) =>
  steps.reduce(
    (trail, direction) => {
      const result = walk.step(trail.state, { type: "step", direction }, ctx);
      return {
        state: result.state,
        effects: [...trail.effects, ...result.effects],
        tiles: [...trail.tiles, result.state.run.pose],
      };
    },
    { state, effects: [], tiles: [] },
  );

const among = (cells, cell) => cells.some((other) => same(other, cell));

// a hall drawn by hand: the learner stands at its west end, stone A in the straight way east,
// an item below it, stone B beyond; under a pool runs a one-tile corridor with stone C in it
const HALL = [
  "#############",
  "#...........#",
  "#...........#",
  "#...........#",
  "#~~~~~~~~~~.#",
  "#...........#",
  "#############",
  "#############",
  "#############",
];

const handmade = (() => {
  const [a, b, c, d] = ["a", "b", "c", "d"].map((letter, rank) => word([letter, letter, "noun"], rank));
  const hall = {
    id: "market.0",
    place: "market",
    exits: { north: null, south: null, west: null, east: null },
    tiles: HALL,
    stones: [
      { word: a.id, x: 4, y: 2 },
      { word: b.id, x: 8, y: 2 },
      { word: c.id, x: 5, y: 5 },
    ],
    items: [{ word: d.id, x: 4, y: 3 }],
    keeper: null,
    warden: null,
    vendor: null,
    shrine: null,
    sign: null,
    summit: null,
    spawns: [],
    entry: { x: 1, y: 2 },
  };
  return {
    order: ["market"],
    places: {},
    rooms: { [hall.id]: hall },
    words: Object.fromEntries([a, b, c, d].map((each) => [each.id, each])),
    home: {},
  };
})();

Deno.test("a route steps round the other stones and items when there is a way round", () => {
  const hall = handmade.rooms["market.0"];
  const [stone, goal] = hall.stones;
  const state = standing(handmade, hall.id, { x: 1, y: 2 });
  const steps = route(handmade, state, goal);
  assertEquals(steps.length, 9);
  const trail = walked(state, steps, context(handmade));
  assertEquals(trail.effects.at(-1), { type: "card", word: goal.word, fresh: true });
  assertEquals(trail.effects.slice(0, -1), steps.slice(1).map(() => ({ type: "step" })));
  assert(!among(trail.tiles, stone));
  assert(!among(trail.tiles, hall.items[0]));
});

Deno.test("a route walks over a stone when nothing else leads past it", () => {
  const hall = handmade.rooms["market.0"];
  const state = standing(handmade, hall.id, { x: 1, y: 5 });
  assertEquals(route(handmade, state, { x: 8, y: 5 }), Array(7).fill("east"));
});

Deno.test("a route to a stone treads open floor and reads the stone on its last step", () => {
  const room = world.rooms[world.places.hearth.entry];
  const state = standing(world, room.id, room.entry);
  for (const stone of room.stones) {
    const trail = walked(state, route(world, state, stone), context(world));
    assertEquals(trail.effects.at(-1), { type: "card", word: stone.word, fresh: true });
    assertEquals(trail.state.run.pose, { room: room.id, x: stone.x, y: stone.y });
    for (const tile of trail.tiles) assertEquals(terrain(world, room.id, tile), "floor");
  }
});

Deno.test("a route to a spirit ends in its duel, to the keeper in talk; it passes through neither", () => {
  const room = world.rooms[world.places.hearth.entry];
  const ctx = context(world, { due: [room.stones.at(-1).word] });
  const state = standing(world, room.id, room.entry, ctx);
  const [spirit] = state.scene.spirits;
  const hunted = walked(state, route(world, state, spirit), ctx);
  assertEquals(hunted.effects.at(-1), { type: "duel", foe: { kind: "spirit", word: spirit.word } });
  assert(!among(hunted.tiles, spirit));

  const visit = walked(state, route(world, state, room.keeper), ctx);
  assertEquals(visit.state.scene.dialogue.who, { kind: "keeper", place: "hearth" });
  assert(!among(visit.tiles, room.keeper));
  assert(!among(visit.tiles, spirit));
});

Deno.test("a route to a rock or a wall ends in a bump; to where the learner stands, or off the room, none", () => {
  const room = Object.values(world.rooms).find((each) =>
    GRID.some((cell) => terrain(world, each.id, cell) === "rock"),
  );
  const state = standing(world, room.id, room.entry);
  const rock = GRID.find(
    (cell) => terrain(world, room.id, cell) === "rock" && route(world, state, cell).length > 0,
  );
  const trail = walked(state, route(world, state, rock), context(world));
  assertEquals(trail.effects.at(-1), { type: "bump" });
  assert(!among(trail.tiles, rock));

  const wall = { x: room.entry.x, y: 0 };
  assertEquals(walked(state, route(world, state, wall), context(world)).effects.at(-1), {
    type: "bump",
  });
  assertEquals(route(world, state, room.entry), []);
  assertEquals(route(world, state, { x: -1, y: 0 }), []);
  assertEquals(route(world, state, { x: WIDTH, y: 4 }), []);
});

Deno.test("routes walk a district end to end, through every opening, entry to lair", () => {
  const place = world.places.hearth;
  assertEquals(place.rooms.length, 3);
  const end = place.rooms.slice(0, -1).reduce(
    (state, id, index) => {
      const room = world.rooms[id];
      const way = Object.keys(room.exits).find((direction) => room.exits[direction] === place.rooms[index + 1]);
      const door = neighbour(landing(way), way);
      const trail = walked(state, route(world, state, door), context(world));
      assertEquals(trail.effects.at(-1), { type: "entered", room: place.rooms[index + 1], place: "hearth" });
      return trail.state;
    },
    standing(world, place.entry, world.rooms[place.entry].entry),
  );
  assertEquals(end.run.pose.room, place.lair);
});

Deno.test("every step of a route is one of the four directions, and each reaches its tile", () => {
  const room = world.rooms[world.places.market.entry];
  const state = standing(world, room.id, room.entry);
  const kept = [...fixtures(room, state.run), ...room.stones, ...room.items];
  const floor = GRID.filter((cell) => terrain(world, room.id, cell) === "floor" && !among(kept, cell));
  for (const cell of floor) {
    const steps = route(world, state, cell);
    for (const step of steps) assert(step in DIRECTIONS);
    if (same(cell, room.entry)) continue;
    assertEquals(walked(state, steps, context(world)).state.run.pose, { room: room.id, ...cell });
  }
});
