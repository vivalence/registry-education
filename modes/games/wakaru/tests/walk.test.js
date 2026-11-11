import { assert, assertEquals } from "@std/assert";
import { walk } from "../engine/beats/walk.js";
import { clock } from "../engine/beats/clock.js";
import { duel } from "../engine/beats/duel.js";
import { converse } from "../engine/beats/talk.js";
import { GAMES } from "../engine/games/index.js";
import { open, smash } from "../engine/loot.js";
import { WAKING } from "../engine/atlas.js";
import { chart, enter, lying } from "../engine/world.js";
import { fresh, raise, tally } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const SEED = 2933376779;

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

// learning, known, part of speech, by place: a word's rank is its row
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
  ],
  stacks: [
    ["gracias", "thank you", "interjection"],
    ["hola", "hello", "interjection"],
    ["adios", "goodbye", "interjection"],
  ],
};

const WORDS = Object.values(LEXICON).flat().map(word);

const ATLAS = {
  places: Object.fromEntries(
    Object.entries(LEXICON).map(([place, entries]) => [
      place,
      { words: entries.map(([learning]) => `w.${learning}`), sentences: [] },
    ]),
  ),
  words: Object.fromEntries(WORDS.map((each) => [each.id, each])),
};

// the valley charted, then Market Row's stones and items laid by hand, so each test names its tile
const laid = (world, map, things) => ({
  ...world,
  maps: { ...world.maps, [map]: { ...world.maps[map], ...things } },
});

const world = laid(chart(SEED, ATLAS, VALLEY), "market", {
  stones: [
    { x: 8, y: 3, word: "w.pan" },
    { x: 9, y: 5, word: "w.queso" },
    { x: 14, y: 5, word: "w.manzana" },
  ],
  items: [
    { x: 13, y: 7, word: "w.leche" },
    { x: 9, y: 9, word: "w.dinero" },
  ],
});

const context = (parts) => ({
  world,
  memory: {},
  due: [],
  now: 1000,
  random: mulberry(7),
  ...parts,
});

// the learner set down on a tile, facing a way, the map's scene raised round them
const posed = (map, cell, facing, ctx = context(), run = fresh(SEED)) => {
  const placed = { ...run, pose: { map, x: cell.x, y: cell.y, facing } };
  return { run: placed, scene: enter(ctx.world, placed, ctx) };
};

const toward = (direction) => ({ type: "step", direction });

const ACT = { type: "act" };

// what every step starts from: the learner turned the way they pressed
const turned = (state, facing) => ({
  ...state,
  run: { ...state.run, pose: { ...state.run.pose, facing } },
});

const still = (state, effects = []) => ({ state, effects, events: [] });

// a memory holding the first so many of these words
const holding = (words, count) =>
  Object.fromEntries(words.slice(0, count).map((each) => [each, "LEARNING"]));

Deno.test("a step turns the learner and moves them a tile, counting it", () => {
  const state = posed("square", square.spawns.start, "north");
  const stepped = walk.step(state, toward("west"), context());
  assertEquals(stepped.effects, [{ type: "step" }]);
  assertEquals(stepped.events, []);
  assertEquals(stepped.state.run.pose, { map: "square", x: 5, y: 6, facing: "west" });
  assertEquals(stepped.state.run.counters.steps, 1);
  assertEquals(stepped.state.scene, state.scene);
});

Deno.test("a hedge, a wall or the map's edge turns the learner and bumps them back", () => {
  for (const [map, cell, facing] of [
    ["square", { x: 2, y: 1 }, "north"],
    ["square", { x: 2, y: 4 }, "north"],
    ["market", { x: 1, y: 5 }, "west"],
    ["market", { x: 0, y: 6 }, "west"],
  ]) {
    const state = posed(map, cell, "south");
    assertEquals(
      walk.step(state, toward(facing), context()),
      still(turned(state, facing), [{ type: "bump" }]),
      `${map} ${facing}`,
    );
  }
});

Deno.test(
  "a portal lands the learner on the spawn it names, facing its way: the map is visited, its scene raised afresh",
  () => {
    const ctx = () => context({ due: world.places.market.words });
    const state = posed("square", square.spawns.market, "west", ctx());
    const crossed = walk.step(state, toward("east"), ctx());
    assertEquals(crossed.state.run.pose, { map: "market", ...market.spawns.square });
    assertEquals(crossed.effects, [{ type: "entered", map: "market", from: "square" }]);
    assertEquals(crossed.events, [{ type: "flag", flag: "visited:market" }]);
    assertEquals(crossed.state.run.counters.steps, 1);
    assertEquals(crossed.state.scene, enter(world, crossed.state.run, ctx()));
    assertEquals(crossed.state.scene.spirits.length, 3);

    const back = walk.step(crossed.state, toward("west"), ctx());
    assertEquals(back.state.run.pose, { map: "square", ...square.spawns.market });
    assertEquals(back.events, [], "a run wakes on the square, visited from its first step");
    const again = walk.step(back.state, toward("east"), ctx());
    assertEquals(again.events, []);
    assertEquals(again.state.run.flags, ["visited:square", "visited:market"]);

    const indoors = walk.step(
      posed("market", market.spawns.house, "south"),
      toward("north"),
      ctx(),
    );
    assertEquals(indoors.state.run.pose, { map: "market.house", ...house.spawns.market });
    assertEquals(indoors.effects, [{ type: "entered", map: "market.house", from: "market" }]);
    const out = walk.step(indoors.state, toward("south"), ctx());
    assertEquals(out.state.run.pose, { map: "market", ...market.spawns.house });
  },
);

Deno.test(
  "a portal to a locked or a fallow place refuses with its reason; the learner stays",
  () => {
    for (const [from, place, reason] of [
      [square.spawns.stacks, "stacks", "locked"],
      [square.spawns.clockhill, "clockhill", "fallow"],
    ]) {
      const state = posed("square", from, "south");
      assertEquals(
        walk.step(state, toward("north"), context()),
        still(turned(state, "north"), [{ type: "sealed", place, reason }]),
      );
    }
    const restored = raise(fresh(SEED), "restored:market");
    const opened = walk.step(
      posed("square", square.spawns.stacks, "south", context(), restored),
      toward("north"),
      context(),
    );
    assertEquals(opened.state.run.pose, { map: "stacks", ...stacks.spawns.square });
    const shopping = walk.step(
      posed("square", square.spawns.shop, "south"),
      toward("north"),
      context(),
    );
    assertEquals(shopping.state.run.pose, { map: "shop", ...shop.spawns.square });
    const cave = walk.step(
      posed("clockhill", clockhill.spawns.summit, "south"),
      toward("north"),
      context(),
    );
    assertEquals(cave.state.run.pose, { map: "summit", ...summit.spawns.clockhill }, "always open");
  },
);

// one tile of Market Row with everything heaped on it, less what is taken away; the learner stands
// west of it
const HEAP = { x: 10, y: 8 };
const heaped = (without) => {
  const map = world.maps.market;
  const kept = (layer, things) => (without.includes(layer) ? [] : things);
  const valley = laid(world, "market", {
    portals: [...map.portals, ...kept("portal", [{ ...HEAP, to: "square", spawn: "market" }])],
    fixtures: [...map.fixtures, ...kept("someone", [{ kind: "keeper", ...HEAP, facing: "west" }])],
    chests: [
      ...map.chests,
      ...kept("chest", [{ id: "market.chest.9", ...HEAP, loot: { coins: 3 } }]),
    ],
    pots: [...map.pots, ...kept("pot", [{ id: "market.pot.9", ...HEAP }])],
    stones: kept("stone", [{ ...HEAP, word: "w.queso" }]),
    items: kept("item", [{ ...HEAP, word: "w.leche" }]),
  });
  const spirits = kept("spirit", [
    { word: "w.pan", ...HEAP, facing: "west", home: HEAP, mode: "roam", next: 99999 },
  ]);
  const run = { ...fresh(SEED), pose: { map: "market", x: 9, y: 8, facing: "north" } };
  return {
    state: { run, scene: { spirits, duel: null, dialogue: null, game: null } },
    ctx: () => context({ world: valley }),
  };
};

Deno.test(
  "the tile ahead answers in order: a portal, a spirit, someone, a chest, a pot, a stone, an item, open ground",
  () => {
    const ORDER = ["portal", "spirit", "someone", "chest", "pot", "stone", "item"];
    const answer = (index) => {
      const { state, ctx } = heaped(ORDER.slice(0, index));
      return { met: walk.step(state, toward("east"), ctx()), facing: turned(state, "east"), ctx };
    };
    const portal = answer(0);
    assertEquals(portal.met.effects, [{ type: "entered", map: "square", from: "market" }]);
    const spirit = answer(1);
    assertEquals(spirit.met.effects[0], { type: "duel", foe: { kind: "spirit", word: "w.pan" } });
    assertEquals(spirit.met.state.run, spirit.facing.run, "the learner stays");
    const someone = answer(2);
    assertEquals(
      someone.met,
      converse(someone.facing, { kind: "keeper", place: "market" }, someone.ctx()),
    );
    const chest = answer(3);
    assertEquals(
      chest.met,
      open(chest.facing, { id: "market.chest.9", ...HEAP, loot: { coins: 3 } }),
    );
    assertEquals(chest.met.effects[0].type, "chest");
    const pot = answer(4);
    assertEquals(pot.met, smash(pot.facing, { id: "market.pot.9", ...HEAP }));
    assertEquals(pot.met.effects[0].type, "pot");
    const stone = answer(5);
    assertEquals(stone.met, GAMES.trial.start(stone.facing, { word: "w.queso" }, stone.ctx()));
    assertEquals(stone.met.state.scene.game.kind, "trial");
    assertEquals(
      stone.met.state.run.pose,
      stone.facing.run.pose,
      "a stone is read, never stood on",
    );
    const item = answer(6);
    assertEquals(item.met.effects, [{ type: "item", word: "w.leche" }]);
    assertEquals(answer(7).met.effects, [{ type: "step" }]);
  },
);

Deno.test(
  "then the ground answers: across a counter, water, what blocks, the dark, an item",
  () => {
    const vendor = posed("shop", { x: 3, y: 3 }, "south");
    assertEquals(
      walk.step(vendor, toward("north"), context()),
      converse(turned(vendor, "north"), { kind: "vendor", place: null }, context()),
    );
    const nobody = posed("shop", { x: 1, y: 3 }, "south");
    assertEquals(
      walk.step(nobody, toward("north"), context()),
      still(turned(nobody, "north"), [{ type: "bump" }]),
      "a counter with no one beyond it is only a bump",
    );
    const valley = laid(world, "summit", { items: [{ x: 5, y: 3, word: "w.leche" }] });
    const cave = context({ world: valley });
    const lost = posed("summit", { x: 5, y: 4 }, "south", cave);
    assertEquals(
      walk.step(lost, toward("north"), cave),
      still(turned(lost, "north"), [{ type: "dark" }]),
    );
    const wall = posed("summit", { x: 1, y: 1 }, "south", cave);
    assertEquals(
      walk.step(wall, toward("north"), cave),
      still(turned(wall, "north"), [{ type: "bump" }]),
    );
    const peak = posed("summit", { x: 5, y: 2 }, "south", cave);
    assertEquals(
      walk.step(peak, toward("north"), cave).effects[0].type,
      "sealed",
      "someone answers in the dark",
    );
  },
);

Deno.test(
  "the keeper, the shrine and a bed are talked to, by kind and the place they stand in",
  () => {
    for (const [map, cell, facing, who] of [
      ["market", { x: 5, y: 6 }, "west", { kind: "keeper", place: "market" }],
      ["square", { x: 3, y: 6 }, "west", { kind: "shrine", place: null }],
      ["market.house", { x: 2, y: 2 }, "north", { kind: "bed", place: "market" }],
    ]) {
      const state = posed(map, cell, "south");
      const talked = walk.step(state, toward(facing), context());
      assertEquals(talked, converse(turned(state, facing), who, context()));
      assertEquals(talked.state.scene.dialogue.who, who);
      assertEquals(talked.state.run, turned(state, facing).run);
    }
  },
);

Deno.test(
  "a warden sleeps until most of its place is held, then duels; restored, it is gone",
  () => {
    const { words } = world.places.market;
    const state = posed("market", { x: 12, y: 9 }, "north");
    const waking = Math.ceil(words.length * WAKING);
    const drowsy = context({ memory: holding(words, waking - 1) });
    assertEquals(
      walk.step(state, toward("east"), drowsy),
      still(turned(state, "east"), [
        { type: "sealed", place: "market", share: (waking - 1) / words.length, reason: "asleep" },
      ]),
    );
    const awake = walk.step(state, toward("east"), context({ memory: holding(words, waking) }));
    assertEquals(awake.effects[0], { type: "duel", foe: { kind: "warden", place: "market" } });
    assertEquals(awake.state.run, turned(state, "east").run);
    const restored = { ...state, run: raise(state.run, "restored:market") };
    const walked = walk.step(restored, toward("east"), context());
    assertEquals(walked.effects, [{ type: "step" }]);
    assertEquals(walked.state.run.pose, { map: "market", x: 13, y: 9, facing: "east" });

    const wing = posed("stacks", { x: 5, y: 2 }, "south");
    const held = context({ memory: holding(world.places.stacks.words, 2) });
    assertEquals(walk.step(wing, toward("north"), held).effects[0], {
      type: "duel",
      foe: { kind: "warden", place: "stacks" },
    });
  },
);

Deno.test(
  "the summit's peak sleeps until every district stands restored, then duels; crowned, it is gone",
  () => {
    const state = posed("summit", { x: 5, y: 2 }, "south");
    assertEquals(
      walk.step(state, toward("north"), context()),
      still(turned(state, "north"), [
        { type: "sealed", place: null, share: 0, reason: "unrestored" },
      ]),
    );
    const restored = { ...state, run: raise(state.run, "restored:market") };
    const woken = walk.step(restored, toward("north"), context());
    assertEquals(woken.effects[0], { type: "duel", foe: { kind: "summit" } });
    const crowned = {
      ...restored,
      run: tally(raise(restored.run, "crowned"), "gained:lantern", 1),
    };
    assertEquals(walk.step(crowned, toward("north"), context()).effects, [{ type: "step" }]);
  },
);

Deno.test("a sign: the square's opens the atlas, a district's names its place", () => {
  const plaza = posed("square", square.spawns.start, "north");
  assertEquals(
    walk.step(plaza, toward("east"), context()),
    still(turned(plaza, "east"), [{ type: "atlas" }]),
  );
  const row = posed("market", { x: 2, y: 6 }, "south");
  assertEquals(
    walk.step(row, toward("north"), context()),
    still(turned(row, "north"), [{ type: "sign", place: "market" }]),
  );
});

Deno.test(
  "a haunt sleeps with fewer than two spirits on its map; with two or more the swarm begins",
  () => {
    const haunt = market.fixtures.find((fixture) => fixture.kind === "haunt");
    const spirit = (each, x) => ({
      word: each,
      x,
      y: 8,
      facing: "north",
      home: { x, y: 8 },
      mode: "roam",
      next: 99999,
    });
    const lone = {
      ...posed("market", { x: 12, y: 4 }, "south"),
      scene: { spirits: [spirit("w.pan", 3)], duel: null, dialogue: null, game: null },
    };
    assertEquals(
      walk.step(lone, toward("north"), context()),
      still(turned(lone, "north"), [{ type: "quiet" }]),
    );
    const crowd = {
      ...lone,
      scene: { ...lone.scene, spirits: [spirit("w.pan", 3), spirit("w.queso", 5)] },
    };
    const swarmed = walk.step(crowd, toward("north"), context());
    assertEquals(swarmed, GAMES.swarm.start(turned(crowd, "north"), { haunt }, context()));
    assertEquals(swarmed.state.scene.game.kind, "swarm");
  },
);

Deno.test("water bumps, unless the learner holds a rod: then a line is cast there", () => {
  const state = posed("market", { x: 5, y: 7 }, "south");
  assertEquals(
    walk.step(state, toward("east"), context()),
    still(turned(state, "east"), [{ type: "bump" }]),
  );
  const rod = { ...state, run: tally(state.run, "gained:rod", 1) };
  const cast = walk.step(rod, toward("east"), context());
  assertEquals(cast, GAMES.fishing.start(turned(rod, "east"), { spot: { x: 6, y: 7 } }, context()));
  assertEquals(cast.state.scene.game.kind, "fishing");
  const sold = { ...rod, run: tally(rod.run, "used:rod", 1) };
  assertEquals(walk.step(sold, toward("east"), context()).effects, [{ type: "bump" }]);
});

Deno.test("the dark refuses a step past the light round the entry; the lantern walks on", () => {
  const state = posed("summit", summit.spawns.clockhill, "north");
  const north = (from) => walk.step(from, toward("north"), context()).state;
  const edge = north(north(state));
  assertEquals(edge.run.pose, { map: "summit", x: 5, y: 4, facing: "north" });
  assertEquals(walk.step(edge, toward("north"), context()), still(edge, [{ type: "dark" }]));
  const lantern = { ...edge, run: tally(edge.run, "gained:lantern", 1) };
  assertEquals(walk.step(lantern, toward("north"), context()).effects, [{ type: "step" }]);
});

Deno.test("an item is picked up by walking onto it, and is gone from its map for good", () => {
  const state = posed("market", { x: 12, y: 7 }, "west");
  const picked = walk.step(state, toward("east"), context());
  assertEquals(picked.effects, [{ type: "item", word: "w.leche" }]);
  assertEquals(picked.state.run.counters["gained:word:w.leche"], 1);
  assertEquals(picked.state.run.counters.steps, 1);
  assertEquals(picked.state.run.pose, { map: "market", x: 13, y: 7, facing: "east" });
  assertEquals(
    lying(world, "market", picked.state.run).map((each) => each.word),
    ["w.dinero"],
  );
  const off = walk.step(picked.state, toward("west"), context());
  const again = walk.step(off.state, toward("east"), context());
  assertEquals(again.effects, [{ type: "step" }]);
  assertEquals(again.state.run.counters["gained:word:w.leche"], 1);
});

Deno.test(
  "an act meets the tile ahead without moving: a bump, a word, a line — never a step",
  () => {
    const facing = (map, cell, way, run = fresh(SEED)) => posed(map, cell, way, context(), run);
    const acts = (state) => walk.act(state, ACT, context());
    const keeper = facing("market", { x: 5, y: 6 }, "west");
    assertEquals(acts(keeper), walk.step(keeper, toward("west"), context()));
    const stone = facing("market", { x: 8, y: 4 }, "north");
    assertEquals(acts(stone), GAMES.trial.start(stone, { word: "w.pan" }, context()));
    const rod = facing("market", { x: 5, y: 7 }, "east", tally(fresh(SEED), "gained:rod", 1));
    assertEquals(acts(rod).state.scene.game.kind, "fishing");
    assertEquals(acts(facing("market", { x: 5, y: 7 }, "east")).effects, [{ type: "bump" }]);
    assertEquals(acts(facing("market", { x: 1, y: 5 }, "west")).effects, [{ type: "bump" }]);
    for (const nothing of [
      facing("market", { x: 6, y: 8 }, "east"),
      facing("market", { x: 12, y: 7 }, "east"),
      facing("market", market.spawns.square, "west"),
      facing("summit", { x: 5, y: 4 }, "north"),
    ])
      assertEquals(acts(nothing), still(nothing), "open ground, an item, a portal, the dark");
  },
);

Deno.test(
  "nothing walks, acts or travels while a duel, a dialogue or a game holds the learner",
  () => {
    const state = posed("square", square.spawns.start, "north");
    const run = tally(["visited:market"].reduce(raise, state.run), "gained:compass", 1);
    for (const scene of [
      { ...state.scene, duel: { foe: { kind: "summit" } } },
      { ...state.scene, dialogue: { who: { kind: "shrine", place: null }, page: {} } },
      { ...state.scene, game: { kind: "trial", word: "w.pan" } },
    ]) {
      const held = { run, scene };
      assertEquals(walk.step(held, toward("west"), context()), still(held));
      assertEquals(
        walk.act(
          { ...held, run: { ...run, pose: { ...run.pose, facing: "east" } } },
          ACT,
          context(),
        ).effects,
        [],
      );
      assertEquals(walk.travel(held, { type: "travel", map: "market" }, context()), still(held));
    }
  },
);

Deno.test(
  "travel takes the compass to a visited outdoor map that is open, landing on its entry",
  () => {
    const state = posed("square", square.spawns.start, "north");
    const travel = (run, map) =>
      walk.travel(
        { ...state, run },
        { type: "travel", map },
        context({ due: world.places.market.words }),
      );
    const visited = [
      "visited:market",
      "visited:stacks",
      "visited:clockhill",
      "visited:square",
    ].reduce(raise, state.run);
    const compass = tally(visited, "gained:compass", 1);
    assertEquals(travel(visited, "market").state.run, visited, "no compass, no travel");
    assertEquals(
      travel(tally(state.run, "gained:compass", 1), "market").effects,
      [],
      "never walked there",
    );
    for (const map of ["stacks", "clockhill"])
      assertEquals(travel(compass, map).effects, [], `${map}: an interior, a fallow hill`);
    const gone = travel(compass, "market");
    assertEquals(gone.state.run.pose, { map: "market", ...market.spawns.entry });
    assertEquals(gone.effects, [
      { type: "entered", map: "market", from: "square" },
      { type: "travelled", map: "market" },
    ]);
    assertEquals(gone.events, []);
    assertEquals(gone.state.run.counters.steps, 0);
    assertEquals(
      gone.state.scene,
      enter(world, gone.state.run, context({ due: world.places.market.words })),
    );
    const home = walk.travel(gone.state, { type: "travel", map: "square" }, context());
    assertEquals(home.state.run.pose, { map: "square", ...square.spawns.entry });
  },
);

Deno.test(
  "a spirit that steps onto the learner is caught on the clock's tick, and the duel begins",
  () => {
    const state = posed("market", { x: 8, y: 8 }, "north");
    const hunter = {
      word: "w.pan",
      x: 7,
      y: 8,
      facing: "east",
      home: { x: 7, y: 9 },
      mode: "chase",
      closest: 1,
      since: 900,
      next: 1000,
    };
    const ticked = clock.tick(
      { ...state, scene: { ...state.scene, spirits: [hunter] } },
      { type: "tick" },
      context(),
    );
    assertEquals(ticked.effects[0], { type: "duel", foe: { kind: "spirit", word: "w.pan" } });
    assertEquals(ticked.state.scene.duel.foe, { kind: "spirit", word: "w.pan" });
    assertEquals(ticked.state.run.pose, state.run.pose);
  },
);

Deno.test(
  "a run replays: the same actions under the same clock and dice land the same state",
  () => {
    const BEATS = { ...walk, ...clock, ...duel };
    const due = world.places.market.words;
    const moves = [
      "south",
      "east",
      "east",
      "east",
      "east",
      "east",
      "east",
      "north",
      "north",
      "north",
      "east",
      "east",
    ];
    const play = () => {
      const random = mulberry(11);
      let now = 1000;
      let state = posed("market", market.spawns.entry, "east", context({ due }));
      const act = (action, elapsed) => {
        now += elapsed;
        state = BEATS[action.type](state, action, { world, memory: {}, due, now, random }).state;
      };
      for (const direction of moves) {
        act(toward(direction), 200);
        for (let tick = 0; tick < 6; tick += 1) act({ type: "tick" }, 100);
        const fight = state.scene.duel;
        if (fight !== null && fight.verdict === null)
          act({ type: "answer", value: fight.question.options?.[0] ?? "pan" }, 900);
        act({ type: "tick" }, 1200);
      }
      return state;
    };
    const first = play();
    assertEquals(play(), first);
    assert(first.run.counters.steps > 0);
  },
);
