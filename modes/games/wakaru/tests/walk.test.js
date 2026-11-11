import { assert, assertEquals } from "@std/assert";
import { walk } from "../engine/beats/walk.js";
import { beat } from "../engine/beat.js";
import {
  DIRECTIONS,
  GRID,
  OPPOSITE,
  chart,
  enter,
  fixtures,
  landing,
  lying,
  neighbour,
  same,
  terrain,
} from "../engine/world.js";
import { WAKING } from "../engine/atlas.js";
import { fresh, raise } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const SEED = 2933376779;

// learning, known, part of speech, by place: a word's rank is its row, and pan is voiced
const LEXICON = {
  market: [
    ["pan", "bread", "noun"],
    ["queso", "cheese", "noun"],
    ["manzana", "apple", "noun"],
    ["leche", "milk", "noun"],
    ["dinero", "money", "noun"],
    ["barato", "cheap", "adjective"],
    ["comprar", "to buy", "verb"],
    ["vender", "to sell", "verb"],
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
  ],
  stacks: [
    ["gracias", "thank you", "interjection"],
    ["hola", "hello", "interjection"],
  ],
};

const WORDS = Object.values(LEXICON)
  .flat()
  .map(([learning, known, part], rank) => ({
    id: `w.${learning}`,
    slug: `${learning}.${part}`,
    ontology: "word",
    known,
    learning,
    rank,
    example: null,
    audio: learning === "pan" ? "words/pan.noun.mp3" : null,
    tokens: null,
    paradigm: null,
    infinitive: null,
    tense: null,
  }));

const ATLAS = {
  places: Object.fromEntries(
    Object.entries(LEXICON).map(([place, entries]) => [
      place,
      { words: entries.map(([learning]) => `w.${learning}`), sentences: [] },
    ]),
  ),
  words: Object.fromEntries(WORDS.map((word) => [word.id, word])),
};

const world = chart(SEED, ATLAS);

const context = (parts) => ({
  world,
  memory: {},
  due: [],
  now: 1000,
  random: mulberry(7),
  ...parts,
});

// the learner set down on a tile, the room's scene raised round them
const standing = (room, cell, ctx = context()) => {
  const run = { ...fresh(SEED), pose: { room, x: cell.x, y: cell.y } };
  return { run, scene: enter(world, run, ctx) };
};

const among = (cells, cell) => cells.some((other) => same(other, cell));

// a clear floor tile beside a target, and the step from it onto the target
const beside = (room, target) => {
  const kept = [...fixtures(room, fresh(SEED)), ...room.stones, ...room.items];
  const clear = (cell) => terrain(world, room.id, cell) === "floor" && !among(kept, cell);
  const direction = Object.keys(DIRECTIONS).find((way) => clear(neighbour(target, OPPOSITE[way])));
  return direction && { from: neighbour(target, OPPOSITE[direction]), direction };
};

const toward = (direction) => ({ type: "step", direction });

const still = (state, effects = []) => ({ state, effects, events: [] });

const opened = (room) => Object.keys(room.exits).filter((direction) => room.exits[direction]);

// a memory holding the first so many of these words
const holding = (words, count) =>
  Object.fromEntries(words.slice(0, count).map((word) => [word, "LEARNING"]));

Deno.test("a step moves the learner one tile and counts it", () => {
  const state = standing("hub", world.rooms.hub.entry);
  const stepped = walk.step(state, toward("north"), context());
  assertEquals(stepped.effects, [{ type: "step" }]);
  assertEquals(stepped.events, []);
  assertEquals(stepped.state.run.pose, { room: "hub", x: 6, y: 5 });
  assertEquals(stepped.state.run.counters.steps, 1);
  assertEquals(stepped.state.scene, state.scene);
});

Deno.test("a wall, water, a tree or a rock turns the learner back with a bump", () => {
  for (const kind of ["wall", "water", "tree", "rock"]) {
    const [room, cell] = Object.values(world.rooms)
      .flatMap((each) => GRID.map((tile) => [each, tile]))
      .find(([each, tile]) => terrain(world, each.id, tile) === kind && beside(each, tile));
    const { from, direction } = beside(room, cell);
    const state = standing(room.id, from);
    assertEquals(walk.step(state, toward(direction), context()), still(state, [{ type: "bump" }]));
  }
});

Deno.test("an opening crosses into the neighbour, landing just inside its facing edge", () => {
  const entry = world.rooms[world.places.market.entry];
  const [way] = opened(entry);
  const next = world.rooms[entry.exits[way]];
  const crossed = walk.step(standing(entry.id, landing(way)), toward(way), context());
  assertEquals(crossed.state.run.pose, { room: next.id, ...landing(OPPOSITE[way]) });
  assertEquals(crossed.effects, [{ type: "entered", room: next.id, place: "market" }]);
  assertEquals(crossed.events, [{ type: "flag", flag: `reached:${next.id}` }]);
  assertEquals(crossed.state.run.counters.steps, 1);
  assertEquals(crossed.state.scene, { room: next.id, spirits: [], duel: null, dialogue: null });

  const back = walk.step(crossed.state, toward(OPPOSITE[way]), context());
  assertEquals(back.state.run.pose, { room: entry.id, ...landing(way) });
  const again = walk.step(back.state, toward(way), context());
  assertEquals(again.state.run.pose.room, next.id);
  assertEquals(again.events, []);
  assertEquals(again.state.run.flags, [`reached:${next.id}`, `reached:${entry.id}`]);
});

Deno.test("crossing raises the new room's spirits from what is due there", () => {
  const entry = world.rooms[world.places.market.entry];
  const [way] = opened(entry);
  const next = world.rooms[entry.exits[way]];
  const due = next.stones.map((stone) => stone.word);
  const crossed = walk.step(standing(entry.id, landing(way)), toward(way), context({ due }));
  assertEquals(
    crossed.state.scene.spirits.map((spirit) => spirit.word),
    due.slice(0, next.spawns.length),
  );
});

Deno.test("a stone is met once: its card every time, its flag the first time, its voice if any", () => {
  for (const [word, voiced] of [
    ["w.pan", true],
    ["w.queso", false],
  ]) {
    const room = world.rooms[world.home[word]];
    const stone = room.stones.find((each) => each.word === word);
    const { from, direction } = beside(room, stone);
    const first = walk.step(standing(room.id, from), toward(direction), context());
    const heard = voiced ? [{ type: "audio", word }] : [];
    assertEquals(first.effects, [{ type: "card", word, fresh: true }, ...heard]);
    assertEquals(first.events, [{ type: "flag", flag: `met:${word}` }]);
    assertEquals(first.state.run.pose, { room: room.id, x: stone.x, y: stone.y });
    assertEquals(first.state.run.counters.steps, 1);

    const off = walk.step(first.state, toward(OPPOSITE[direction]), context());
    const again = walk.step(off.state, toward(direction), context());
    assertEquals(again.effects, [{ type: "card", word, fresh: false }, ...heard]);
    assertEquals(again.events, []);
    assertEquals(again.state.run.flags, [`met:${word}`]);
  }
});

Deno.test("an item is picked up by walking onto it, and is gone from its room for good", () => {
  const room = Object.values(world.rooms).find((each) => each.items.length > 0);
  const [item] = room.items;
  const { from, direction } = beside(room, item);
  const picked = walk.step(standing(room.id, from), toward(direction), context());
  assertEquals(picked.effects, [{ type: "item", word: item.word }]);
  assertEquals(picked.state.run.counters[`gained:word:${item.word}`], 1);
  assertEquals(picked.state.run.pose, { room: room.id, x: item.x, y: item.y });
  assert(!lying(room, picked.state.run).some((each) => each.word === item.word));

  const off = walk.step(picked.state, toward(OPPOSITE[direction]), context());
  const again = walk.step(off.state, toward(direction), context());
  assertEquals(again.effects, [{ type: "step" }]);
  assertEquals(again.state.run.counters[`gained:word:${item.word}`], 1);
});

Deno.test("the keeper, the vendor and the shrine are talked to; the learner stays where they stood", () => {
  for (const [room, who] of [
    [world.rooms[world.places.market.entry], { kind: "keeper", place: "market" }],
    [world.rooms.hub, { kind: "vendor" }],
    [world.rooms.hub, { kind: "shrine" }],
  ]) {
    const { from, direction } = beside(room, room[who.kind]);
    const state = standing(room.id, from);
    const talked = walk.step(state, toward(direction), context());
    assertEquals(talked.state.run, state.run);
    assertEquals(talked.state.scene.dialogue.who, who);
  }
});

Deno.test("a sign opens the valley map", () => {
  for (const room of [world.rooms.hub, world.rooms[world.places.market.entry]]) {
    const { from, direction } = beside(room, room.sign);
    const state = standing(room.id, from);
    assertEquals(walk.step(state, toward(direction), context()), still(state, [{ type: "map" }]));
  }
});

Deno.test("a warden sleeps until most of its district is held, then duels; restored, it is gone", () => {
  const place = world.places.market;
  const lair = world.rooms[place.lair];
  const { from, direction } = beside(lair, lair.warden);
  const state = standing(lair.id, from);
  const waking = Math.ceil(place.words.length * WAKING);
  const drowsy = context({ memory: holding(place.words, waking - 1) });
  assertEquals(
    walk.step(state, toward(direction), drowsy),
    still(state, [{ type: "sealed", share: (waking - 1) / place.words.length }]),
  );

  const held = context({ memory: holding(place.words, waking) });
  const awake = walk.step(state, toward(direction), held);
  assertEquals(awake.effects[0], { type: "duel", foe: { kind: "warden", place: "market" } });
  assertEquals(awake.state.scene.duel.foe, { kind: "warden", place: "market" });
  assertEquals(awake.state.run, state.run);

  const restored = { ...state, run: raise(state.run, "restored:market") };
  const walked = walk.step(restored, toward(direction), held);
  assertEquals(walked.effects, [{ type: "step" }]);
  assertEquals(walked.state.run.pose, { room: lair.id, ...lair.warden });
});

Deno.test("the summit sleeps until every district stands restored, then duels", () => {
  const hub = world.rooms.hub;
  const { from, direction } = beside(hub, hub.summit);
  const state = standing("hub", from);
  assertEquals(
    walk.step(state, toward(direction), context()),
    still(state, [{ type: "sealed", share: 0 }]),
  );
  const half = { ...state, run: ["restored:market", "restored:stacks"].reduce(raise, state.run) };
  assertEquals(walk.step(half, toward(direction), context()).effects, [{ type: "sealed", share: 0.5 }]);
  const whole = { ...state, run: ["restored:market", "restored:hearth"].reduce(raise, state.run) };
  const woken = walk.step(whole, toward(direction), context());
  assertEquals(woken.effects[0], { type: "duel", foe: { kind: "summit" } });
  assertEquals(woken.state.run.pose, state.run.pose);
});

Deno.test("walking into a spirit duels it, and the learner stays where they stood", () => {
  const room = world.rooms[world.places.market.entry];
  const word = room.stones[0].word;
  const ctx = context({ due: [word] });
  const raised = standing(room.id, room.entry, ctx);
  const [spirit] = raised.scene.spirits;
  const { from, direction } = beside(room, spirit);
  const state = { ...raised, run: { ...raised.run, pose: { room: room.id, ...from } } };
  const met = walk.step(state, toward(direction), ctx);
  assertEquals(met.effects[0], { type: "duel", foe: { kind: "spirit", word } });
  assertEquals(met.state.scene.duel.foe, { kind: "spirit", word });
  assertEquals(met.state.run.pose, state.run.pose);
});

Deno.test("nothing walks while a duel or a dialogue holds the learner", () => {
  const state = standing("hub", world.rooms.hub.entry);
  for (const scene of [
    { ...state.scene, duel: { foe: { kind: "summit" } } },
    { ...state.scene, dialogue: { who: { kind: "vendor" }, page: {} } },
  ]) {
    const held = { ...state, scene };
    assertEquals(walk.step(held, toward("north"), context()), still(held));
    assertEquals(walk.travel(held, { type: "travel", place: "market" }, context()), still(held));
  }
});

Deno.test("travel goes only to the hub or an open place, and lands on its entry", () => {
  const state = standing("hub", world.rooms.hub.entry);
  const entry = world.rooms[world.places.market.entry];
  const market = walk.travel(state, { type: "travel", place: "market" }, context());
  assertEquals(market.state.run.pose, { room: entry.id, ...entry.entry });
  assertEquals(market.effects, [{ type: "entered", room: entry.id, place: "market" }]);
  assertEquals(market.events, [{ type: "flag", flag: `reached:${entry.id}` }]);
  assertEquals(market.state.scene.room, entry.id);
  assertEquals(market.state.run.counters.steps, 0);

  for (const place of ["hearth", "stacks", "forge"])
    assertEquals(walk.travel(state, { type: "travel", place }, context()), still(state));
  const restored = { ...state, run: raise(state.run, "restored:market") };
  for (const place of ["hearth", "stacks"]) {
    const gone = walk.travel(restored, { type: "travel", place }, context());
    assertEquals(gone.state.run.pose, { room: world.places[place].entry, ...world.rooms[world.places[place].entry].entry });
  }

  const back = walk.travel(market.state, { type: "travel", place: "hub" }, context());
  assertEquals(back.state.run.pose, { room: "hub", ...world.rooms.hub.entry });
  assertEquals(back.effects, [{ type: "entered", room: "hub", place: null }]);
});

Deno.test("a run replays: the same actions under the same clock and dice land the same state", () => {
  const room = world.rooms[world.places.market.entry];
  const due = world.places.market.words;
  const moves = ["west", "north", "north", "east", "south", "west", "west", "north", "east", "south"];
  const play = () => {
    const random = mulberry(11);
    let now = 1000;
    let state = standing(room.id, room.entry, context({ due }));
    const act = (action, elapsed) => {
      now += elapsed;
      state = beat(state, action, { world, memory: {}, due, now, random }).state;
    };
    for (const direction of moves) {
      act({ type: "step", direction }, 200);
      act({ type: "tick" }, 300);
      const duel = state.scene.duel;
      if (duel !== null && duel.verdict === null)
        act({ type: "answer", value: duel.question.options[0] }, 900);
      act({ type: "tick" }, 1200);
    }
    return state;
  };
  const first = play();
  assertEquals(play(), first);
  assert(first.run.counters.steps + first.run.counters.right + first.run.counters.wrong > 0);
});
