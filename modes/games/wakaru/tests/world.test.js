import { assert, assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import {
  DIRECTIONS,
  GRID,
  HEIGHT,
  OPPOSITE,
  SCENT,
  WIDTH,
  apart,
  caught,
  chart,
  enter,
  fixtures,
  key,
  landing,
  lying,
  neighbour,
  restoration,
  roam,
  same,
  stand,
  terrain,
} from "../engine/world.js";
import { duel } from "../engine/beats/duel.js";
import { PLACES } from "../engine/atlas.js";
import { SIZE, TILE, TINT, burst, hue, paint } from "../buffer/paint.js";
import { fresh, raise, tally } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const SEED = 2933376779;
const SEEDS = [SEED, 1, 2, 7, 42, 99991, 123456789, 4294967295];

// learning, known, part of speech, by place: a word's rank is its row. Market Row and Hearth Lane
// share the table; the Clock Hill has no words; the Stacks is a wing
const LEXICON = {
  market: [
    ["pan", "bread", "noun"],
    ["queso", "cheese", "noun"],
    ["manzana", "apple", "noun"],
    ["leche", "milk", "noun"],
    ["dinero", "money", "noun"],
    ["camisa", "shirt", "noun"],
    ["barato", "cheap", "adjective"],
    ["caro", "dear", "adjective"],
    ["comprar", "to buy", "verb"],
    ["vender", "to sell", "verb"],
    ["mesa", "table", "noun"],
  ],
  hearth: [
    ["mesa", "table", "noun"],
    ["casa", "house", "noun"],
    ["madre", "mother", "noun"],
    ["padre", "father", "noun"],
    ["hermano", "brother", "noun"],
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
  clockhill: [],
  wildwood: [
    ["árbol", "tree", "noun"],
    ["perro", "dog", "noun"],
    ["gato", "cat", "noun"],
  ],
  stacks: [
    ["gracias", "thank you", "interjection"],
    ["hola", "hello", "interjection"],
  ],
};

const VOICED = ["pan", "manzana", "casa", "gracias"];

const ENTRIES = [...new Map(Object.values(LEXICON).flat().map((entry) => [entry[0], entry])).values()];

const WORDS = ENTRIES.map(([learning, known, part], rank) => ({
  id: `w.${learning}`,
  slug: `${learning}.${part}`,
  ontology: "word",
  known,
  learning,
  rank,
  example: null,
  audio: VOICED.includes(learning) ? `words/${learning}.${part}.mp3` : null,
  tokens: null,
  paradigm: null,
  infinitive: null,
  tense: null,
}));

const SENTENCE = {
  id: "s.compro",
  slug: "compro-pan.sentence",
  ontology: "sentence",
  known: "I buy bread",
  learning: "Compro pan",
  rank: 900,
  example: null,
  audio: null,
  tokens: [
    { form: "Compro", gloss: "I buy", literal: null, index: 0 },
    { form: "pan", gloss: "bread", literal: "w.pan", index: 1 },
  ],
  paradigm: null,
  infinitive: null,
  tense: null,
};

const ATLAS = {
  places: Object.fromEntries(
    Object.entries(LEXICON).map(([place, entries]) => [
      place,
      {
        words: entries.map(([learning]) => `w.${learning}`),
        sentences: place === "market" ? [SENTENCE.id] : [],
      },
    ]),
  ),
  words: Object.fromEntries([...WORDS, SENTENCE].map((word) => [word.id, word])),
};

// the same atlas in another order: every key and every list reversed
const reversed = (atlas) => ({
  places: Object.fromEntries(
    Object.entries(atlas.places)
      .reverse()
      .map(([id, place]) => [
        id,
        { words: place.words.toReversed(), sentences: place.sentences.toReversed() },
      ]),
  ),
  words: Object.fromEntries(Object.entries(atlas.words).reverse()),
});

const among = (cells, cell) => cells.some((other) => same(other, cell));

const opened = (room) => Object.keys(room.exits).filter((direction) => room.exits[direction]);

const arrivals = (room) => [room.entry, ...opened(room).map(landing)];

// every tile the learner reaches from the room's entry, walking floor and openings round the fixtures
const flood = (world, room, run) => {
  const blocked = fixtures(room, run);
  const open = (cell) =>
    ["floor", "exit"].includes(terrain(world, room.id, cell)) && !among(blocked, cell);
  const reached = new Set([key(room.entry)]);
  const queue = [room.entry];
  for (const cell of queue)
    for (const direction of Object.keys(DIRECTIONS)) {
      const next = neighbour(cell, direction);
      if (reached.has(key(next)) || !open(next)) continue;
      reached.add(key(next));
      queue.push(next);
    }
  return { reached, open: GRID.filter(open) };
};

const scene = (world, run, memory, due) =>
  enter(world, run, { world, memory, due, now: 0, random: mulberry(1) });

Deno.test("one seed over one atlas, in any order, charts the same world; another seed another", () => {
  const world = chart(SEED, ATLAS);
  const again = chart(SEED, reversed(ATLAS));
  assertEquals(again, world);
  assertEquals(JSON.stringify({ ...again, words: null }), JSON.stringify({ ...world, words: null }));
  assertEquals(chart(SEED, ATLAS), world);
  assertNotEquals(chart(SEED + 1, ATLAS).rooms, world.rooms);
});

Deno.test("the valley: the hub, then every place with words, in the order they open", () => {
  const world = chart(SEED, ATLAS);
  assertEquals(world.order, ["market", "hearth", "wildwood", "stacks"]);
  assertEquals(Object.keys(world.rooms)[0], "hub");
  assertEquals(
    Object.fromEntries(world.order.map((id) => [id, world.places[id].rooms.length])),
    { market: 2, hearth: 3, wildwood: 2, stacks: 2 },
  );
  for (const id of world.order) {
    const place = world.places[id];
    const authored = PLACES.find((entry) => entry.id === id);
    assertEquals([place.id, place.name, place.biome], [id, authored.name, authored.biome]);
    assertEquals(place.rooms, place.rooms.map((_, index) => `${id}.${index}`));
    assertEquals([place.entry, place.lair], [place.rooms[0], place.rooms.at(-1)]);
    assertEquals(
      place.words,
      place.words.toSorted((one, other) => world.words[one].rank - world.words[other].rank),
    );
    for (const room of place.rooms) assertEquals(world.rooms[room].place, id);
  }
  assertEquals(world.places.market.sentences, ["s.compro"]);
  assertEquals(world.words, ATLAS.words);
});

Deno.test("every word stands as one stone in its home room; a word two places hold, in the first", () => {
  const world = chart(SEED, ATLAS);
  const stones = Object.values(world.rooms).flatMap((room) =>
    room.stones.map((stone) => [stone.word, room.id]),
  );
  assertEquals(stones.length, WORDS.length);
  assertEquals(Object.fromEntries(stones), world.home);
  assert(world.home["w.mesa"].startsWith("market."));
  assert(world.places.hearth.words.includes("w.mesa"));
  for (const id of world.order) {
    for (const word of world.places[id].words) assert(world.home[word]);
    // the syllabus runs room by room: the most frequent words stand by the keeper
    const ranks = world.places[id].rooms.map((room) =>
      world.rooms[room].stones.map((stone) => world.words[stone.word].rank),
    );
    for (const [index, room] of ranks.entries())
      for (const later of ranks.slice(index + 1)) assert(Math.max(...room) < Math.min(...later));
  }
});

Deno.test("a district's rooms are a walk: each opens onto the next through its edge's middle", () => {
  for (const seed of SEEDS) {
    const world = chart(seed, ATLAS);
    for (const id of world.order) {
      const { rooms } = world.places[id];
      const spots = [{ x: 0, y: 0 }];
      rooms.forEach((roomId, index) => {
        const room = world.rooms[roomId];
        const neighbours = opened(room).map((direction) => room.exits[direction]);
        assertEquals(neighbours.toSorted(), [rooms[index - 1], rooms[index + 1]].filter(Boolean).toSorted());
        for (const direction of Object.keys(DIRECTIONS)) {
          const door = neighbour(landing(direction), direction);
          assertEquals(room.tiles[door.y][door.x] === "=", room.exits[direction] !== null);
          if (room.exits[direction] === null) continue;
          assertEquals(world.rooms[room.exits[direction]].exits[OPPOSITE[direction]], roomId);
        }
        const onward = opened(room).find((direction) => room.exits[direction] === rooms[index + 1]);
        if (onward) spots.push(neighbour(spots.at(-1), onward));
      });
      assertEquals(new Set(spots.map(key)).size, rooms.length);
    }
  }
});

Deno.test("no room is cut apart: from its entry every open tile and every opening is reached", () => {
  for (const seed of SEEDS) {
    const world = chart(seed, ATLAS);
    const run = fresh(seed);
    for (const room of Object.values(world.rooms)) {
      assertEquals(room.tiles.length, HEIGHT);
      for (const row of room.tiles) assert(new RegExp(`^[#.~To=]{${WIDTH}}$`).test(row), row);
      const edge = GRID.filter(({ x, y }) => x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1);
      for (const cell of edge) assert(["wall", "exit"].includes(terrain(world, room.id, cell)));
      const { reached, open } = flood(world, room, run);
      assertEquals(reached.size, open.length, room.id);
      for (const fixture of fixtures(room, run)) {
        const near = Object.keys(DIRECTIONS).map((direction) => neighbour(fixture, direction));
        assert(near.some((cell) => reached.has(key(cell))), `${room.id} ${fixture.kind}`);
      }
    }
  }
});

Deno.test("everything stands on reachable floor, one to a tile, clear of the arrival tiles", () => {
  for (const seed of SEEDS) {
    const world = chart(seed, ATLAS);
    const run = fresh(seed);
    for (const room of Object.values(world.rooms)) {
      const things = [...room.stones, ...room.items, ...room.spawns, ...fixtures(room, run)];
      assertEquals(new Set(things.map(key)).size, things.length, room.id);
      const { reached } = flood(world, room, run);
      for (const thing of things) assertEquals(terrain(world, room.id, thing), "floor");
      for (const thing of [...room.stones, ...room.items, ...room.spawns]) assert(reached.has(key(thing)));
      for (const thing of things) assert(!among(arrivals(room), thing), `${room.id} ${key(thing)}`);
      for (const arrival of arrivals(room)) assertEquals(terrain(world, room.id, arrival), "floor");
      assert(room.spawns.length <= room.stones.length);
    }
  }
});

Deno.test("the entry holds the keeper and the sign, the lair the warden; a district's items lie past the entry, a wing strews none", () => {
  for (const seed of SEEDS) {
    const world = chart(seed, ATLAS);
    for (const id of world.order) {
      const place = world.places[id];
      for (const roomId of place.rooms) {
        const room = world.rooms[roomId];
        assertEquals(room.keeper !== null, roomId === place.entry);
        assertEquals(room.sign !== null, roomId === place.entry);
        assertEquals(room.warden !== null, roomId === place.lair);
        assertEquals([room.vendor, room.shrine, room.summit], [null, null, null]);
      }
      const items = place.rooms.flatMap((room) => world.rooms[room].items);
      if (PLACES.find((entry) => entry.id === id).opens) {
        assertEquals(items, [], `${id} is a wing: its keeper sends no errand`);
        continue;
      }
      const nouns = place.words.filter(
        (word) => world.home[word].startsWith(`${id}.`) && world.words[word].slug.includes(".noun"),
      );
      assert(items.length >= Math.min(2, nouns.length) && items.length <= Math.min(3, nouns.length));
      assertEquals(new Set(items.map((item) => item.word)).size, items.length);
      for (const item of items) assert(nouns.includes(item.word));
      assertEquals(world.rooms[place.entry].items, []);
    }
  }
});

Deno.test("a wing strews no items even where it homes nothing but nouns", () => {
  const nouns = WORDS.filter((word) => word.slug.endsWith(".noun")).map((word) => word.id);
  const atlas = { places: { stacks: { words: nouns, sentences: [] } }, words: ATLAS.words };
  for (const seed of SEEDS) {
    const world = chart(seed, atlas);
    assert(world.places.stacks.rooms.length > 1);
    assertEquals(world.places.stacks.rooms.flatMap((room) => world.rooms[room].items), []);
  }
});

Deno.test("the hub is the same square every run, its folk on its floor, its entry where runs start", () => {
  const hub = chart(SEED, ATLAS).rooms.hub;
  assertEquals(chart(1, { places: {}, words: {} }).rooms.hub, hub);
  assertEquals(hub.entry, { x: fresh(SEED).pose.x, y: fresh(SEED).pose.y });
  assertEquals(fresh(SEED).pose.room, hub.id);
  assertEquals(hub.exits, {});
  assertEquals([hub.place, hub.keeper, hub.warden, hub.stones, hub.items, hub.spawns], [null, null, null, [], [], []]);
  assertEquals(
    fixtures(hub, fresh(SEED)).map((fixture) => fixture.kind),
    ["vendor", "shrine", "sign", "summit"],
  );
});

Deno.test("terrain reads a room's tiles, and off the room is wall", () => {
  const world = chart(SEED, ATLAS);
  assertEquals(terrain(world, "hub", { x: 6, y: 6 }), "floor");
  assertEquals(terrain(world, "hub", { x: 0, y: 0 }), "wall");
  assertEquals(terrain(world, "hub", { x: 1, y: 4 }), "water");
  assertEquals(terrain(world, "hub", { x: 1, y: 1 }), "tree");
  assertEquals(terrain(world, "hub", { x: -1, y: 4 }), "wall");
  assertEquals(terrain(world, "hub", { x: WIDTH, y: 4 }), "wall");
  assertEquals(terrain(world, "hub", { x: 6, y: HEIGHT }), "wall");
  const room = world.rooms[world.places.market.entry];
  const [way] = opened(room);
  assertEquals(terrain(world, room.id, neighbour(landing(way), way)), "exit");
  const kinds = new Set(
    Object.values(world.rooms).flatMap((each) => GRID.map((cell) => terrain(world, each.id, cell))),
  );
  assertEquals(kinds, new Set(["wall", "floor", "water", "tree", "rock", "exit"]));
});

Deno.test("a place with more words than its six rooms hold fails loudly", () => {
  const many = Array.from({ length: 480 }, (_, rank) => ({ ...WORDS[0], id: `w.${rank}`, rank }));
  const atlas = {
    places: { market: { words: many.map((word) => word.id), sentences: [] } },
    words: Object.fromEntries(many.map((word) => [word.id, word])),
  };
  assertThrows(() => chart(SEED, atlas), Error, "has floor for");
});

Deno.test("enter: a spirit for each word homed in the room that is due, or read and never reviewed", () => {
  const world = chart(SEED, ATLAS);
  const room = world.rooms["hearth.1"];
  const [due, read, held, untouched, unread] = room.stones.map((stone) => stone.word);
  const elsewhere = world.rooms["market.0"].stones[0].word;
  const run = {
    ...[`met:${read}`, `met:${held}`, `met:${untouched}`].reduce(raise, fresh(SEED)),
    pose: { room: room.id, ...room.entry },
  };
  const memory = { [held]: "LEARNING", [untouched]: "UNTOUCHED", [unread]: "UNKNOWN" };
  const raised = scene(world, run, memory, [due, elsewhere]);
  assertEquals(raised.room, room.id);
  assertEquals([raised.duel, raised.dialogue], [null, null]);
  assertEquals(raised.spirits.map((spirit) => spirit.word), [due, read, untouched]);
  assertEquals(
    raised.spirits.map(({ x, y }) => ({ x, y })),
    room.spawns.slice(0, 3),
  );
  assertEquals(scene(world, run, memory, []).spirits.length, 2);
});

Deno.test("enter: never more spirits than spawn points, and none on the learner", () => {
  const world = chart(SEED, ATLAS);
  for (const room of Object.values(world.rooms)) {
    const words = room.stones.map((stone) => stone.word);
    const everywhere = scene(world, { ...fresh(SEED), pose: { room: room.id, ...room.entry } }, {}, words);
    assertEquals(everywhere.spirits.length, Math.min(words.length, room.spawns.length));
    if (room.spawns.length === 0) continue;
    const pose = { room: room.id, ...room.spawns[0] };
    const crowded = scene(world, { ...fresh(SEED), pose }, {}, words);
    assert(!crowded.spirits.some((spirit) => same(spirit, pose)));
  }
});

Deno.test("a restored district's warden has left its lair; an item picked up is gone for good", () => {
  const world = chart(SEED, ATLAS);
  const run = fresh(SEED);
  const lair = world.rooms[world.places.market.lair];
  assertEquals(fixtures(lair, run).map((fixture) => fixture.kind), ["warden"]);
  assertEquals(fixtures(lair, raise(run, "restored:market")), []);
  assertEquals(fixtures(lair, raise(run, "restored:hearth")).length, 1);
  const room = Object.values(world.rooms).find((each) => each.items.length > 0);
  const [item, ...rest] = room.items;
  assertEquals(lying(room, run), room.items);
  assertEquals(lying(room, tally(run, `gained:word:${item.word}`, 1)), rest);
  assertEquals(lying(room, tally(run, `used:word:${item.word}`, 1)), room.items);
});

Deno.test("restoration is the share of the districts restored; a wing never counts", () => {
  const world = chart(SEED, ATLAS);
  const run = fresh(SEED);
  assertEquals(restoration(world, run), 0);
  assertEquals(restoration(world, raise(run, "restored:stacks")), 0);
  assertEquals(restoration(world, ["restored:market", "restored:hearth"].reduce(raise, run)), 2 / 3);
  assertEquals(
    restoration(world, ["restored:market", "restored:hearth", "restored:wildwood"].reduce(raise, run)),
    1,
  );
});

// a room with every word due and the learner standing at its entry
const haunted = (world, id) => {
  const room = world.rooms[id];
  const ctx = { world, memory: {}, due: room.stones.map((stone) => stone.word), now: 0, random: mulberry(5) };
  const run = { ...fresh(SEED), pose: { room: id, ...room.entry } };
  return { room, ctx, state: { run, scene: enter(world, run, ctx) } };
};

Deno.test("spirits roam open floor only: never a doorway, a fixture, a stone, an item or each other", () => {
  for (const seed of SEEDS) {
    const world = chart(seed, ATLAS);
    for (const id of ["market.0", "hearth.1", "wildwood.1"]) {
      const { room, ctx, state: start } = haunted(world, id);
      const kept = [...arrivals(room), ...fixtures(room, start.run), ...room.stones, ...room.items];
      let state = start;
      for (let turn = 0; turn < 120 && !caught(state); turn += 1) {
        state = roam(state, ctx);
        const spirits = state.scene.spirits;
        assertEquals(new Set(spirits.map(key)).size, spirits.length);
        for (const spirit of spirits) {
          if (same(spirit, state.run.pose)) continue;
          assertEquals(terrain(world, id, spirit), "floor");
          assert(!among(kept, spirit), `${id} ${key(spirit)}`);
        }
      }
    }
  }
});

Deno.test("a spirit that reaches the learner catches them, and the tick begins the duel", () => {
  const world = chart(SEED, ATLAS);
  const { room, ctx } = haunted(world, "hearth.1");
  const word = room.stones[0].word;
  const spawn = room.spawns[0];
  const kept = [...fixtures(room, fresh(SEED)), ...room.stones, ...room.items];
  const way = Object.keys(DIRECTIONS).find((direction) => {
    const cell = neighbour(spawn, direction);
    return terrain(world, room.id, cell) === "floor" && !among(kept, cell);
  });
  const run = { ...fresh(SEED), pose: { room: room.id, ...neighbour(spawn, way) } };
  const lone = { ...ctx, due: [word] };
  for (const spirit of enter(world, run, lone).spirits) assert(apart(spirit, run.pose) > SCENT);
  // a spirit that roamed up beside the learner
  const state = { run, scene: { ...enter(world, run, lone), spirits: [{ word, ...spawn }] } };
  assertEquals(caught(state), undefined);
  assertEquals(caught(roam(state, { ...lone, random: mulberry(5) })), { word, ...neighbour(spawn, way) });
  const ticked = duel.tick(state, { type: "tick" }, { ...lone, random: mulberry(5) });
  assertEquals(ticked.effects[0], { type: "duel", foe: { kind: "spirit", word } });
  assertEquals(ticked.state.scene.duel.foe, { kind: "spirit", word });
  assertEquals(ticked.state.run, run);
});

Deno.test("a run reloaded mid-room never opens on a duel: every spirit enters out of the learner's scent", () => {
  for (const seed of SEEDS) {
    const world = chart(seed, ATLAS);
    for (const id of ["market.0", "hearth.1", "wildwood.1"]) {
      const room = world.rooms[id];
      const ctx = { world, memory: {}, due: room.stones.map((stone) => stone.word), now: 0, random: mulberry(5) };
      // the worst a reload can stand on: a spawn point itself
      for (const spawn of room.spawns) {
        const run = { ...fresh(seed), pose: { room: id, x: spawn.x, y: spawn.y } };
        for (const spirit of enter(world, run, ctx).spirits) assert(apart(spirit, run.pose) > SCENT, `${id} ${key(spirit)}`);
      }
    }
  }
});

Deno.test("a save whose room the atlas no longer deals wakes at the hub's entry; a standing room keeps its pose", () => {
  const world = chart(SEED, ATLAS);
  const here = { ...fresh(SEED), pose: { room: "hearth.1", x: 3, y: 4 } };
  assertEquals(stand(world, here), here);
  const gone = { ...fresh(SEED), flags: ["restored:market"], pose: { room: "hearth.9", x: 3, y: 4 } };
  assertEquals(stand(world, gone), { ...gone, pose: { room: "hub", ...world.rooms.hub.entry } });
});

Deno.test("the world holds still while the learner talks", () => {
  const world = chart(SEED, ATLAS);
  const { ctx, state } = haunted(world, "hearth.1");
  const talking = {
    ...state,
    scene: { ...state.scene, dialogue: { who: { kind: "keeper", place: "hearth" }, page: {} } },
  };
  assertEquals(roam(talking, ctx), talking);
});

Deno.test("spirits replay: the same dice roam them the same way", () => {
  const world = chart(SEED, ATLAS);
  const play = () => {
    const { ctx, state } = haunted(world, "market.0");
    return Array.from({ length: 40 }).reduce((now) => roam(now, ctx), state);
  };
  assertEquals(play(), play());
});

// a canvas that takes every stroke and keeps only the colours it was handed: the painter runs headless
const headless = () => {
  const colours = [];
  const gradient = { addColorStop: (offset, colour) => colours.push(colour) };
  const pen = new Proxy(
    {},
    {
      get: (target, name) => {
        if (name === "createRadialGradient") return () => gradient;
        return name in target ? target[name] : () => {};
      },
      set: (target, name, value) => {
        if (["fillStyle", "strokeStyle"].includes(name) && typeof value === "string") colours.push(value);
        target[name] = value;
        return true;
      },
    },
  );
  return { pen, colours };
};

const COLOUR = /^(#[0-9a-f]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, -?[\d.e-]+\))$/;

Deno.test("the painter draws every room of every biome, every way it can stand, in real colours", () => {
  const atlas = {
    places: Object.fromEntries(
      PLACES.map(({ id }, index) => [id, { words: [WORDS[index].id, WORDS[index + 11].id], sentences: [] }]),
    ),
    words: ATLAS.words,
  };
  const valley = chart(SEED, atlas);
  assertEquals(valley.order.length, PLACES.length);
  const every = valley.order.flatMap((id) => valley.places[id].words);
  const crowned = ["crowned", ...valley.order.map((id) => `restored:${id}`)].reduce(raise, fresh(SEED));
  const held = Object.fromEntries(every.map((word) => [word, "GRADUATED"]));
  const { pen, colours } = headless();
  for (const room of Object.values(valley.rooms)) {
    for (const [run, memory] of [
      [fresh(SEED), {}],
      [every.map((word) => `met:${word}`).reduce(raise, fresh(SEED)), held],
      [crowned, held],
    ]) {
      const posed = { ...run, pose: { room: room.id, ...room.entry } };
      const due = room.stones.map((stone) => stone.word);
      const scene = enter(valley, posed, { world: valley, memory, due, now: 0, random: mulberry(2) });
      const foe = scene.spirits.length > 0 ? { kind: "spirit", word: scene.spirits[0].word } : { kind: "warden", place: room.place };
      const fx = { sparks: [], shake: 1100, flash: { until: 1100, tint: TINT.strike }, fade: 1100 };
      burst(fx, posed.pose, TINT.heal, 900);
      const frame = { world: valley, run: posed, scene: { ...scene, duel: { foe } }, memory, facing: "west" };
      paint(pen, { ...frame, time: 1000, fx, drawn: new Map(), goal: { x: 6, y: 4 } });
      paint(pen, { ...frame, facing: "north", time: 5000, fx, drawn: new Map(), goal: null });
      assertEquals(fx.sparks, []);
    }
  }
  const strange = colours.filter((colour) => !COLOUR.test(colour));
  assertEquals(strange, []);
  assert(new Set(colours).size > 120, `${new Set(colours).size} colours`);
  assertEquals(SIZE, { width: 13 * TILE, height: 9 * TILE });
  for (const tint of Object.values(TINT)) assert(COLOUR.test(tint));
});

Deno.test("a word's spirit has its own hue: no two spirits of one room share one", () => {
  const world = chart(SEED, ATLAS);
  for (const room of Object.values(world.rooms)) {
    const hues = room.stones.slice(0, 8).map((stone) => hue(world, stone.word));
    assertEquals(new Set(hues).size, hues.length);
  }
  assert(COLOUR.test(hue(world, "a word with no stone")));
});
