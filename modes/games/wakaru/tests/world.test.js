import { assert, assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import {
  LIGHT,
  SIGHT,
  blocking,
  chart,
  enter,
  entry,
  lit,
  lying,
  near,
  respawn,
  restoration,
  sealed,
  standing,
  strewn,
} from "../engine/world.js";
import { MAPS } from "../engine/maps/index.js";
import { PLACES } from "../engine/atlas.js";
import { DIRECTIONS, apart, key, neighbour, same, tile } from "../engine/tiles.js";
import { fresh, raise, tally } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const SEED = 2933376779;
const SEEDS = [SEED, 1, 2, 7, 42, 99991, 123456789, 4294967295];

// a small valley drawn by hand: the square at its heart; Market Row, a district, with its house;
// the Stacks, a wing; the shop; the clock hill, fallow in this atlas, and its dark summit cave
const square = {
  id: "square",
  name: "The Square",
  kind: "outdoor",
  place: null,
  dark: false,
  rows: [
    "hhhhh::hhhhh",
    "h..........h",
    "h.RRR..RRR.h",
    "h.HDH..HDH.h",
    "h..........h",
    "h..........:",
    "h..........:",
    "h..........h",
    "hhhhhhhhhhhh",
  ],
  spawns: {
    start: { x: 6, y: 6, facing: "north" },
    entry: { x: 5, y: 6, facing: "north" },
    clockhill: { x: 5, y: 1, facing: "south" },
    shop: { x: 3, y: 4, facing: "south" },
    stacks: { x: 8, y: 4, facing: "south" },
    market: { x: 10, y: 5, facing: "west" },
  },
  portals: [
    { x: 5, y: 0, to: "clockhill", spawn: "square" },
    { x: 6, y: 0, to: "clockhill", spawn: "square" },
    { x: 3, y: 3, to: "shop", spawn: "square" },
    { x: 8, y: 3, to: "stacks", spawn: "square" },
    { x: 11, y: 5, to: "market", spawn: "square" },
    { x: 11, y: 6, to: "market", spawn: "square" },
  ],
  fixtures: [
    { kind: "shrine", x: 2, y: 6, facing: "east" },
    { kind: "sign", x: 7, y: 6, facing: "south" },
  ],
  chests: [{ x: 1, y: 7, loot: { coins: 5 } }],
  pots: [
    { x: 1, y: 1 },
    { x: 10, y: 1 },
  ],
};

const market = {
  id: "market",
  name: "Market Row",
  kind: "outdoor",
  place: "market",
  dark: false,
  rows: [
    "hhhhhhhhhhhhhhhh",
    "h..............h",
    "h.RRR......vvv.h",
    "h.HDH......vvv.h",
    "h..........vvv.h",
    "h..............h",
    ":.....~~.......h",
    ":.....~~.......h",
    "h..............h",
    "h.vvvv.........h",
    "h.vvvv.........h",
    "hhhhhhhhhhhhhhhh",
  ],
  spawns: {
    entry: { x: 2, y: 7, facing: "east" },
    square: { x: 1, y: 6, facing: "east" },
    house: { x: 3, y: 4, facing: "south" },
  },
  portals: [
    { x: 0, y: 6, to: "square", spawn: "market" },
    { x: 0, y: 7, to: "square", spawn: "market" },
    { x: 3, y: 3, to: "market.house", spawn: "market" },
  ],
  fixtures: [
    { kind: "keeper", x: 4, y: 6, facing: "west" },
    { kind: "sign", x: 2, y: 5, facing: "south" },
    { kind: "warden", x: 13, y: 9, facing: "west" },
    { kind: "haunt", x: 12, y: 3 },
  ],
  chests: [{ x: 14, y: 1, loot: { item: "rod" } }],
  pots: [{ x: 1, y: 1 }],
};

const house = {
  id: "market.house",
  name: "A House on Market Row",
  kind: "indoor",
  place: "market",
  dark: false,
  rows: ["#######", "#Z____#", "#_____#", "#_____#", "###D###"],
  spawns: { market: { x: 3, y: 3, facing: "north" } },
  portals: [{ x: 3, y: 4, to: "market", spawn: "house" }],
  fixtures: [{ kind: "bed", x: 2, y: 1, facing: "south" }],
  chests: [{ x: 5, y: 1, loot: { coins: 10 } }],
  pots: [],
};

const stacks = {
  id: "stacks",
  name: "The Stacks",
  kind: "indoor",
  place: "stacks",
  dark: false,
  rows: [
    "###########",
    "#_________#",
    "#_________#",
    "#____u____#",
    "#_________#",
    "#_________#",
    "#####D#####",
  ],
  spawns: { square: { x: 5, y: 5, facing: "north" } },
  portals: [{ x: 5, y: 6, to: "square", spawn: "stacks" }],
  fixtures: [{ kind: "warden", x: 5, y: 1, facing: "south" }],
  chests: [],
  pots: [],
};

const shop = {
  id: "shop",
  name: "The Shop",
  kind: "indoor",
  place: null,
  dark: false,
  rows: ["#######", "#_____#", "#CCCCC#", "#_____#", "#_____#", "###D###"],
  spawns: { square: { x: 3, y: 4, facing: "north" } },
  portals: [{ x: 3, y: 5, to: "square", spawn: "shop" }],
  fixtures: [{ kind: "vendor", x: 3, y: 1, facing: "south" }],
  chests: [],
  pots: [],
};

const clockhill = {
  id: "clockhill",
  name: "Clock Hill",
  kind: "outdoor",
  place: "clockhill",
  dark: false,
  rows: ["MMMMOMMMMM", "h........h", "h........h", "h........h", "hhhh::hhhh"],
  spawns: {
    entry: { x: 5, y: 2, facing: "south" },
    summit: { x: 4, y: 1, facing: "south" },
    square: { x: 4, y: 3, facing: "north" },
  },
  portals: [
    { x: 4, y: 0, to: "summit", spawn: "clockhill" },
    { x: 4, y: 4, to: "square", spawn: "clockhill" },
    { x: 5, y: 4, to: "square", spawn: "clockhill" },
  ],
  fixtures: [],
  chests: [],
  pots: [],
};

const summit = {
  id: "summit",
  name: "The Summit",
  kind: "cave",
  place: null,
  dark: true,
  rows: [
    "%%%%%%%%%%%",
    "%ccccccccc%",
    "%ccccccccc%",
    "%ccccccccc%",
    "%ccccccccc%",
    "%ccccccccc%",
    "%ccccccccc%",
    "%%%%%O%%%%%",
  ],
  spawns: { clockhill: { x: 5, y: 6, facing: "north" } },
  portals: [{ x: 5, y: 7, to: "clockhill", spawn: "summit" }],
  fixtures: [{ kind: "summit", x: 5, y: 1, facing: "south" }],
  chests: [],
  pots: [],
};

const VALLEY = Object.fromEntries(
  [square, market, house, stacks, shop, clockhill, summit].map((map) => [map.id, map]),
);

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

// learning, known, part of speech, by place: a word's rank is its first row. the market and the
// stacks share the table; the clock hill deals nothing, so it lies fallow
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
  stacks: [
    ["gracias", "thank you", "interjection"],
    ["hola", "hello", "interjection"],
    ["mesa", "table", "noun"],
  ],
  clockhill: [],
};

const ENTRIES = [
  ...new Map(
    Object.values(LEXICON)
      .flat()
      .map((entry) => [entry[0], entry]),
  ).values(),
];

const WORDS = ENTRIES.map(word);

const SENTENCE = {
  ...word(["compro pan", "I buy bread", "sentence"], 900),
  id: "s.compro",
  ontology: "sentence",
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
  words: Object.fromEntries([...WORDS, SENTENCE].map((each) => [each.id, each])),
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

const among = (things, cell) => things.some((thing) => same(thing, cell));

const cells = (map) => map.rows.flatMap((row, y) => [...row].map((_, x) => ({ x, y })));

// walking distance from the given tiles to every tile reached over the tiles open lets through
const flood = (from, open) => {
  const reached = new Map(from.map((cell) => [key(cell), 0]));
  const queue = [...from];
  for (const cell of queue)
    for (const direction of Object.keys(DIRECTIONS)) {
      const next = neighbour(cell, direction);
      if (reached.has(key(next)) || !open(next)) continue;
      reached.set(key(next), reached.get(key(cell)) + 1);
      queue.push(next);
    }
  return reached;
};

// every tile a learner walks to from a map's arrivals, round what stands there and what is laid
const walkable = (map, laid) => {
  const standing = [...map.fixtures, ...map.chests, ...map.pots, ...laid];
  return flood(Object.values(map.spawns), (cell) => tile(map, cell).walk && !among(standing, cell));
};

const scene = (world, run, memory, due) =>
  enter(world, run, { world, memory, due, now: 1000, random: mulberry(1) });

const on = (map, cell, run = fresh(SEED)) => ({ ...run, pose: { map, ...cell } });

// the invariants every charted map keeps, whatever its words: each stone and item on a slot of its
// own — open ground, not tall grass, two or more from every arrival, portal and thing — and the
// map whole: laying them walls no tile off from where the learner arrives
const assertLaid = (world) => {
  for (const map of Object.values(world.maps)) {
    const laid = [...map.stones, ...map.items];
    assertEquals(new Set(laid.map(key)).size, laid.length, `${map.id}: one thing to a slot`);
    const kept = [
      ...map.fixtures,
      ...map.chests,
      ...map.pots,
      ...map.portals,
      ...Object.values(map.spawns),
    ];
    for (const slot of laid) {
      assert(tile(map, slot).walk && !tile(map, slot).wild, `${map.id} ${key(slot)}`);
      for (const thing of kept) assert(apart(thing, slot) >= 2, `${map.id} ${key(slot)} crowds`);
    }
    const bare = walkable(map, []);
    const after = walkable(map, laid);
    for (const slot of laid) assert(bare.has(key(slot)), `${map.id} ${key(slot)} unreachable`);
    assertEquals(after.size, bare.size - laid.length, `${map.id} stays whole`);
  }
};

Deno.test(
  "one seed over one atlas, in any order, charts the same world; another seed lays other stones",
  () => {
    const world = chart(SEED, ATLAS, VALLEY);
    assertEquals(chart(SEED, reversed(ATLAS), VALLEY), world);
    assertEquals(chart(SEED, ATLAS, VALLEY), world);
    assertNotEquals(chart(SEED + 1, ATLAS, VALLEY).maps.market.stones, world.maps.market.stones);
    assertEquals(world.seed, SEED);
  },
);

Deno.test(
  "the world: every map as authored, and the places with words in the order they open",
  () => {
    const world = chart(SEED, ATLAS, VALLEY);
    assertEquals(Object.keys(world.maps), Object.keys(VALLEY));
    for (const [id, authored] of Object.entries(VALLEY)) {
      const { stones, items, spawnPoints, chests, pots, ...rest } = world.maps[id];
      assertEquals({ ...rest, chests: authored.chests, pots: authored.pots }, authored);
      assertEquals(
        chests,
        authored.chests.map((chest, index) => ({ id: `${id}.chest.${index}`, ...chest })),
      );
      assertEquals(
        pots,
        authored.pots.map((pot, index) => ({ id: `${id}.pot.${index}`, ...pot })),
      );
      assert([stones, items, spawnPoints].every(Array.isArray));
    }
    assertEquals(world.order, ["market", "stacks"]);
    assertEquals(world.places.market, {
      id: "market",
      name: "Market Row",
      biome: "market",
      words: LEXICON.market.map(([learning]) => `w.${learning}`),
      sentences: ["s.compro"],
      maps: ["market", "market.house"],
      home: "market",
      signature: "w.pan",
    });
    assertEquals(world.places.stacks.words, ["w.mesa", "w.gracias", "w.hola"]);
    assertEquals(
      [world.places.stacks.home, world.places.stacks.maps, world.places.stacks.signature],
      ["stacks", ["stacks"], "w.mesa"],
    );
    assert(!Object.hasOwn(world.places, "clockhill"), "a place with no words is absent");
    assertEquals(world.words, ATLAS.words);
  },
);

Deno.test("chests and pots carry their ids: <map>.chest.<index>, <map>.pot.<index>", () => {
  const world = chart(SEED, ATLAS, VALLEY);
  assertEquals(world.maps.square.chests, [
    { id: "square.chest.0", x: 1, y: 7, loot: { coins: 5 } },
  ]);
  assertEquals(world.maps.square.pots, [
    { id: "square.pot.0", x: 1, y: 1 },
    { id: "square.pot.1", x: 10, y: 1 },
  ]);
  assertEquals(world.maps["market.house"].chests[0].id, "market.house.chest.0");
});

Deno.test(
  "every word of a place stands as one stone on its home map, a word two places hold on both",
  () => {
    for (const seed of SEEDS) {
      const world = chart(seed, ATLAS, VALLEY);
      for (const id of world.order) {
        const { home, words } = world.places[id];
        assertEquals(
          world.maps[home].stones.map((stone) => stone.word),
          words,
        );
      }
      for (const map of ["square", "market.house", "shop", "clockhill", "summit"])
        assertEquals([world.maps[map].stones, world.maps[map].items], [[], []], map);
      const homes = (each) =>
        Object.values(world.maps).filter((map) => map.stones.some((stone) => stone.word === each));
      assertEquals(
        homes("w.mesa").map((map) => map.id),
        ["market", "stacks"],
      );
    }
  },
);

Deno.test(
  "a stone or an item lies on open ground clear of every arrival, portal and thing, and the map stays whole",
  () => {
    for (const seed of SEEDS) assertLaid(chart(seed, ATLAS, VALLEY));
  },
);

Deno.test(
  "the most frequent words lie nearest the entry; the errand's items past every stone",
  () => {
    for (const seed of SEEDS) {
      const world = chart(seed, ATLAS, VALLEY);
      for (const id of world.order) {
        const map = world.maps[world.places[id].home];
        const bare = walkable(map, []);
        const far = flood([entry(map)], (cell) => bare.has(key(cell)));
        const steps = map.stones.map((stone) => far.get(key(stone)));
        assertEquals(
          steps,
          steps.toSorted((one, other) => one - other),
          `${seed} ${id}`,
        );
        for (const item of map.items) assert(far.get(key(item)) >= Math.max(...steps));
      }
    }
  },
);

Deno.test(
  "a district strews two or three of its nouns, the first the one its keeper wants; a wing none",
  () => {
    const nouns = LEXICON.market.filter(([, , part]) => part === "noun").map(([l]) => `w.${l}`);
    const counts = new Set();
    for (const seed of SEEDS) {
      const world = chart(seed, ATLAS, VALLEY);
      const items = world.maps.market.items.map((item) => item.word);
      counts.add(items.length);
      assert(items.length >= 2 && items.length <= 3, `${seed}: ${items.length}`);
      assertEquals(new Set(items).size, items.length);
      for (const item of items) assert(nouns.includes(item));
      assertEquals(strewn(world, "market"), items);
      assertEquals(strewn(world, "stacks"), []);
    }
    assertEquals(counts, new Set([2, 3]), "the dice choose two or three");
  },
);

Deno.test(
  "spirits rise from tall grass out of doors, from a wing's floor; never on a thing or a portal",
  () => {
    const world = chart(SEED, ATLAS, VALLEY);
    const reached = (map) => walkable(map, [...map.stones, ...map.items]);
    const outdoors = world.maps.market;
    const grass = cells(outdoors).filter(
      (cell) => tile(outdoors, cell).wild && reached(outdoors).has(key(cell)),
    );
    assertEquals(outdoors.spawnPoints, grass);
    assert(!among(outdoors.spawnPoints, { x: 12, y: 3 }), "the haunt stands in the grass");
    assertEquals(grass.length, 9 + 8 - 1);
    const wing = world.maps.stacks;
    const floor = cells(wing).filter(
      (cell) => reached(wing).has(key(cell)) && !among(wing.portals, cell),
    );
    assertEquals(wing.spawnPoints, floor);
    assertEquals(floor.length, 9 * 5 - 1 - wing.stones.length);
    for (const map of ["square", "shop", "clockhill", "summit"])
      assertEquals(world.maps[map].spawnPoints, [], map);
    assertEquals(world.maps["market.house"].spawnPoints.length, 2 + 5 + 5, "a house of a place");
  },
);

Deno.test(
  "who stands: a warden until its place is restored, the summit's peak until the crown",
  () => {
    const world = chart(SEED, ATLAS, VALLEY);
    const run = fresh(SEED);
    const kinds = (map, at) => standing(world, map, at).map((fixture) => fixture.kind);
    assertEquals(kinds("market", run), ["keeper", "sign", "warden", "haunt"]);
    assertEquals(kinds("market", raise(run, "restored:market")), ["keeper", "sign", "haunt"]);
    assertEquals(kinds("market", raise(run, "restored:stacks")), [
      "keeper",
      "sign",
      "warden",
      "haunt",
    ]);
    assertEquals(kinds("stacks", raise(run, "restored:stacks")), []);
    assertEquals(kinds("summit", ["restored:market", "restored:stacks"].reduce(raise, run)), [
      "summit",
    ]);
    assertEquals(kinds("summit", raise(run, "crowned")), []);
    assertEquals(standing(world, "square", run), square.fixtures);
  },
);

Deno.test("an item picked up is gone for good; spending it never strews it again", () => {
  const world = chart(SEED, ATLAS, VALLEY);
  const run = fresh(SEED);
  const [item, ...rest] = world.maps.market.items;
  assertEquals(lying(world, "market", run), world.maps.market.items);
  const picked = tally(run, `gained:word:${item.word}`, 1);
  assertEquals(lying(world, "market", picked), rest);
  assertEquals(lying(world, "market", tally(picked, `used:word:${item.word}`, 1)), rest);
});

Deno.test("what blocks a walk: portals, stones, who stands there, chests and pots", () => {
  const world = chart(SEED, ATLAS, VALLEY);
  const run = fresh(SEED);
  const map = world.maps.market;
  const blocked = blocking(world, "market", run);
  assertEquals(blocked, [
    ...map.portals,
    ...map.stones,
    ...map.fixtures,
    ...map.chests,
    ...map.pots,
  ]);
  const restored = blocking(world, "market", raise(run, "restored:market"));
  assert(!among(restored, { x: 13, y: 9 }), "a fallen warden's tile is open ground");
});

Deno.test("a map is sealed while its place is locked or fallow; a map of no place never is", () => {
  const world = chart(SEED, ATLAS, VALLEY);
  const run = fresh(SEED);
  assertEquals(Object.fromEntries(Object.keys(VALLEY).map((id) => [id, sealed(world, run, id)])), {
    square: null,
    market: null,
    "market.house": null,
    stacks: "locked",
    shop: null,
    clockhill: "fallow",
    summit: null,
  });
  assertEquals(sealed(world, raise(run, "restored:market"), "stacks"), null);
  assertEquals(sealed(world, raise(run, "restored:market"), "clockhill"), "fallow");
  // a portal lets the learner through where its map is sealed by nothing
  const through = (to, at) =>
    sealed(world, at, square.portals.find((portal) => portal.to === to).to) === null;
  assertEquals(
    ["market", "stacks", "clockhill", "shop"].map((to) => through(to, run)),
    [true, false, false, true],
  );
  assertEquals(through("stacks", raise(run, "restored:market")), true);
  const mouth = clockhill.portals.find((portal) => portal.to === "summit");
  assertEquals(sealed(world, run, mouth.to), null, "the summit cave is always open");
});

Deno.test(
  "the dark: lit only within LIGHT of where it is entered, all of it with the lantern",
  () => {
    const world = chart(SEED, ATLAS, VALLEY);
    const run = on("summit", summit.spawns.clockhill);
    const door = entry(world.maps.summit);
    assertEquals(door, summit.spawns.clockhill);
    for (const cell of cells(summit))
      assertEquals(lit(world, run, cell), near(cell, door, LIGHT), key(cell));
    assertEquals([lit(world, run, { x: 5, y: 4 }), lit(world, run, { x: 5, y: 3 })], [true, false]);
    const lantern = tally(run, "gained:lantern", 1);
    for (const cell of cells(summit)) assert(lit(world, lantern, cell));
    assert(!lit(world, tally(lantern, "used:lantern", 1), { x: 5, y: 1 }));
    for (const cell of cells(market)) assert(lit(world, on("market", market.spawns.entry), cell));
  },
);

Deno.test("restoration is the share of the districts restored; a wing never counts", () => {
  const world = chart(SEED, ATLAS, VALLEY);
  const run = fresh(SEED);
  assertEquals(restoration(world, run), 0);
  assertEquals(restoration(world, raise(run, "restored:stacks")), 0);
  assertEquals(restoration(world, raise(run, "restored:market")), 1);
  assertEquals(restoration(chart(SEED, { places: {}, words: {} }, VALLEY), run), 0);
});

Deno.test(
  "a fallen learner wakes at the district's entry, the square's start, or the foot of the summit",
  () => {
    const world = chart(SEED, ATLAS, VALLEY);
    const woken = (map) => respawn(world, on(map, { x: 2, y: 2, facing: "west" }));
    assertEquals(woken("market"), { map: "market", ...market.spawns.entry });
    assertEquals(woken("market.house"), { map: "market", ...market.spawns.entry });
    assertEquals(woken("clockhill"), { map: "clockhill", ...clockhill.spawns.entry });
    assertEquals(woken("summit"), { map: "clockhill", ...clockhill.spawns.entry });
    for (const map of ["square", "shop", "stacks"])
      assertEquals(woken(map), { map: "square", ...square.spawns.start }, map);
  },
);

Deno.test(
  "enter: a spirit for each word homed on the map that is due, or read and never reviewed",
  () => {
    const world = chart(SEED, ATLAS, VALLEY);
    const [due, read, held, untouched, unread, ...rest] = world.places.market.words;
    const run = on(
      "market",
      market.spawns.entry,
      [`met:${read}`, `met:${held}`, `met:${untouched}`].reduce(raise, fresh(SEED)),
    );
    const memory = { [held]: "LEARNING", [untouched]: "UNTOUCHED", [unread]: "UNKNOWN" };
    const raised = scene(world, run, memory, [due, "w.gracias", rest[0]]);
    assertEquals([raised.duel, raised.dialogue, raised.game], [null, null, null]);
    assertEquals(
      raised.spirits.map((spirit) => spirit.word),
      [due, read, untouched, rest[0]],
    );
    for (const [index, spirit] of raised.spirits.entries()) {
      assertEquals(Object.keys(spirit), ["word", "x", "y", "facing", "home", "mode", "next"]);
      assertEquals([spirit.mode, spirit.home], ["roam", { x: spirit.x, y: spirit.y }]);
      assert(spirit.facing in DIRECTIONS);
      assert(among(world.maps.market.spawnPoints, spirit));
      assert(spirit.next > 1000 && (index === 0 || spirit.next > raised.spirits[index - 1].next));
    }
    assertEquals(new Set(raised.spirits.map(key)).size, raised.spirits.length);
    assertEquals(scene(world, run, memory, []).spirits.length, 2);
    assertEquals(scene(world, on("square", square.spawns.start), {}, [due]).spirits, []);
  },
);

Deno.test("a map shows at most eight spirits, and never one within the learner's sight", () => {
  for (const seed of SEEDS) {
    const world = chart(seed, ATLAS, VALLEY);
    for (const map of ["market", "stacks"]) {
      const due = world.maps[map].stones.map((stone) => stone.word);
      const reachable = cells(world.maps[map]).filter((cell) =>
        walkable(world.maps[map], [...world.maps[map].stones]).has(key(cell)),
      );
      for (const cell of reachable) {
        const { spirits } = scene(world, on(map, cell), {}, due);
        assert(spirits.length <= 8);
        const room = world.maps[map].spawnPoints.filter((point) => !near(point, cell, SIGHT));
        assertEquals(spirits.length, Math.min(8, due.length, room.length), `${map} ${key(cell)}`);
        for (const spirit of spirits)
          assert(!near(spirit, cell, SIGHT), `${seed} ${map} ${key(cell)} sees ${key(spirit)}`);
      }
    }
  }
});

Deno.test("a place with words but no map, or a map too small for its words, fails loudly", () => {
  const hearth = {
    ...ATLAS,
    places: { ...ATLAS.places, hearth: { words: ["w.pan"], sentences: [] } },
  };
  assertThrows(() => chart(SEED, hearth, VALLEY), Error, "hearth has words but no map");
  const crowd = Array.from({ length: 40 }, (_, rank) =>
    word([`w${rank}`, `${rank}`, "noun"], rank),
  );
  const atlas = {
    places: { stacks: { words: crowd.map((each) => each.id), sentences: [] } },
    words: Object.fromEntries(crowd.map((each) => [each.id, each])),
  };
  assertThrows(() => chart(SEED, atlas, VALLEY), Error, "stacks has room for");
});

// the most a place deals (deal.js CAP): a set place 48 words, the stacks 30, the forge 24
const DEALT = { stacks: 30, forge: 24 };

Deno.test(
  "over the authored valley: every map charts, and every place with a map lays its words whole",
  () => {
    const homed = PLACES.filter(({ id }) => Object.hasOwn(MAPS, id));
    const dealt = Object.fromEntries(
      homed.map(({ id }) => [
        id,
        Array.from({ length: DEALT[id] ?? 48 }, (_, index) =>
          word([`${id}${index}`, `${id} ${index}`, index % 3 === 0 ? "noun" : "verb"], index),
        ),
      ]),
    );
    const atlas = {
      places: Object.fromEntries(
        homed.map(({ id }) => [id, { words: dealt[id].map((each) => each.id), sentences: [] }]),
      ),
      words: Object.fromEntries(
        Object.values(dealt)
          .flat()
          .map((each) => [each.id, each]),
      ),
    };
    for (const seed of SEEDS.slice(0, 3)) {
      const world = chart(seed, atlas);
      assertEquals(Object.keys(world.maps), Object.keys(MAPS));
      assertEquals(
        world.order,
        homed.map(({ id }) => id),
      );
      assertLaid(world);
      for (const { id } of homed)
        assertEquals(world.maps[id].stones.length, atlas.places[id].words.length, id);
    }
    const heart = chart(SEED, atlas).maps.square;
    assertEquals([heart.stones, heart.items], [[], []]);
    assertEquals(respawn(chart(SEED, atlas), fresh(SEED)), fresh(SEED).pose);
  },
);

Deno.test("an errand strews only its own nouns: one another place holds is never an item", () => {
  const nouns = Array.from({ length: 10 }, (_, rank) =>
    word([`n${rank}`, `${rank}`, "noun"], rank),
  );
  const ids = nouns.map((each) => each.id);
  const atlas = {
    places: {
      market: { words: ids.slice(0, 6), sentences: [] },
      hearth: { words: ids.slice(3), sentences: [] },
    },
    words: Object.fromEntries(nouns.map((each) => [each.id, each])),
  };
  const shared = new Set(ids.slice(3, 6));
  for (let seed = 1; seed <= 30; seed += 1) {
    const world = chart(seed, atlas);
    const items = [...strewn(world, "market"), ...strewn(world, "hearth")];
    assert(items.length >= 4, "both errands strewn");
    assert(!items.some((item) => shared.has(item)), `seed ${seed}: ${items}`);
  }
});
