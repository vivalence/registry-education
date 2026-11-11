import { assert, assertEquals } from "@std/assert";
import { route } from "../engine/path.js";
import { walk } from "../engine/beats/walk.js";
import { converse } from "../engine/beats/talk.js";
import { GAMES } from "../engine/games/index.js";
import { MAPS } from "../engine/maps/index.js";
import { blocking, chart, entry, enter, lit } from "../engine/world.js";
import { DIRECTIONS, key, neighbour, same, tile } from "../engine/tiles.js";
import { fresh, tally } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const SEED = 2933376779;

// a hall drawn by hand: the learner stands at its west end, stone A in the straight way east, an
// item below it, stone B beyond; the keeper in the north-east; under a pool a corridor runs, open
// to the hall only at its east end; a gap in the east wall leads out to a yard
const hall = {
  id: "market",
  name: "The Hall",
  kind: "outdoor",
  place: "market",
  dark: false,
  rows: [
    "#############",
    "#...........#",
    "#...........:",
    "#...........#",
    "#~~~~~~~~~~.#",
    "#...........#",
    "#############",
  ],
  spawns: { entry: { x: 1, y: 2, facing: "east" }, yard: { x: 11, y: 2, facing: "west" } },
  portals: [{ x: 12, y: 2, to: "yard", spawn: "market" }],
  fixtures: [{ kind: "keeper", x: 10, y: 1, facing: "south" }],
  chests: [],
  pots: [],
};

const yard = {
  id: "yard",
  name: "The Yard",
  kind: "outdoor",
  place: null,
  dark: false,
  rows: ["hhhhh", "h...h", ":...h", "hhhhh"],
  spawns: { market: { x: 1, y: 2, facing: "east" } },
  portals: [{ x: 0, y: 2, to: "market", spawn: "yard" }],
  fixtures: [],
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
  spawns: { yard: { x: 3, y: 4, facing: "north" } },
  portals: [{ x: 3, y: 5, to: "yard", spawn: "market" }],
  fixtures: [{ kind: "vendor", x: 3, y: 1, facing: "south" }],
  chests: [],
  pots: [],
};

const cave = {
  id: "cave",
  name: "The Cave",
  kind: "cave",
  place: null,
  dark: true,
  rows: ["%%%%%%%", "%ccccc%", "%ccccc%", "%ccccc%", "%ccccc%", "%ccccc%", "%%%O%%%"],
  spawns: { yard: { x: 3, y: 5, facing: "north" } },
  portals: [{ x: 3, y: 6, to: "yard", spawn: "market" }],
  fixtures: [],
  chests: [],
  pots: [],
};

const word = (learning, rank) => ({
  id: `w.${learning}`,
  slug: `${learning}.noun`,
  ontology: "word",
  known: learning.toUpperCase(),
  learning,
  rank,
  example: null,
  audio: null,
  tokens: null,
  paradigm: null,
  infinitive: null,
  tense: null,
});

const WORDS = ["a", "b", "c", "d", "e"].map(word);

const ATLAS = {
  places: { market: { words: WORDS.map((each) => each.id), sentences: [] } },
  words: Object.fromEntries(WORDS.map((each) => [each.id, each])),
};

const STONES = { A: { x: 4, y: 2, word: "w.a" }, B: { x: 8, y: 2, word: "w.b" } };
const ITEM = { x: 4, y: 3, word: "w.d" };

// the hall charted, its stones and item then laid by hand where the drawing puts them
const valley = (things = {}) => {
  const charted = chart(SEED, ATLAS, { market: hall, yard, shop, cave });
  return {
    ...charted,
    maps: {
      ...charted.maps,
      market: { ...charted.maps.market, stones: Object.values(STONES), items: [ITEM], ...things },
    },
  };
};

const world = valley();

const context = (valley = world, parts = {}) => ({
  world: valley,
  memory: {},
  due: [],
  now: 1000,
  random: mulberry(3),
  ...parts,
});

const posed = (valley, map, cell, run = fresh(SEED)) => {
  const placed = { ...run, pose: { map, x: cell.x, y: cell.y, facing: "east" } };
  return { run: placed, scene: enter(valley, placed, context(valley)) };
};

// a route walked step by step: what the screen was told, every tile stood on, and the last step —
// the state it met its tile from, turned that way, and its answer
const walked = (state, steps, ctx) =>
  steps.reduce(
    (trail, direction) => {
      const result = walk.step(trail.state, { type: "step", direction }, ctx);
      const pose = { ...trail.state.run.pose, facing: direction };
      return {
        state: result.state,
        last: result,
        before: { ...trail.state, run: { ...trail.state.run, pose } },
        effects: [...trail.effects, ...result.effects],
        tiles: [...trail.tiles, result.state.run.pose],
      };
    },
    { state, last: null, before: null, effects: [], tiles: [] },
  );

const among = (cells, cell) => cells.some((other) => same(other, cell));

const cells = (map) => map.rows.flatMap((row, y) => [...row].map((_, x) => ({ x, y })));

Deno.test("a route steps round the stones, and round the items while there is a way round", () => {
  const state = posed(world, "market", { x: 1, y: 2 });
  const steps = route(world, state, STONES.B);
  assertEquals(steps.length, 9);
  const trail = walked(state, steps, context());
  assertEquals(
    trail.effects.slice(0, steps.length - 1),
    steps.slice(1).map(() => ({ type: "step" })),
  );
  assertEquals(trail.last, GAMES.trial.start(trail.before, { word: "w.b" }, context()));
  assertEquals(trail.state.scene.game.kind, "trial");
  assert(!among(trail.tiles, STONES.A) && !among(trail.tiles, ITEM));
});

Deno.test("a route goes the long way round an item that lies in the short way", () => {
  const strewn = valley({ stones: [] });
  const state = posed(strewn, "market", { x: 1, y: 3 });
  const steps = route(strewn, state, { x: 8, y: 3 });
  assertEquals(steps.length, 9, "seven straight through the item, nine round it");
  const trail = walked(state, steps, context(strewn));
  assert(!among(trail.tiles, ITEM));
  assertEquals(
    trail.effects,
    steps.map(() => ({ type: "step" })),
  );
});

Deno.test("a route crosses an item when nothing else leads past it, and never a stone", () => {
  const goal = { x: 8, y: 5 };
  const strewn = valley({ items: [{ x: 3, y: 5, word: "w.e" }] });
  const state = posed(strewn, "market", { x: 1, y: 5 });
  const steps = route(strewn, state, goal);
  assertEquals(steps, Array(7).fill("east"));
  const trail = walked(state, steps, context(strewn));
  assertEquals(trail.effects[1], { type: "item", word: "w.e" });
  assertEquals(trail.state.run.pose, { map: "market", ...goal, facing: "east" });
  const barred = valley({ stones: [{ x: 5, y: 5, word: "w.e" }] });
  assertEquals(route(barred, posed(barred, "market", { x: 1, y: 5 }), goal), []);
  const reached = route(barred, posed(barred, "market", { x: 1, y: 5 }), { x: 5, y: 5 });
  assertEquals(reached, Array(4).fill("east"), "the stone itself is a goal");
});

Deno.test(
  "a route to a spirit ends in its duel, to the keeper in talk; it passes through neither",
  () => {
    const state = posed(world, "market", { x: 1, y: 2 });
    const spirit = {
      word: "w.c",
      x: 10,
      y: 3,
      facing: "west",
      home: { x: 10, y: 3 },
      mode: "roam",
      next: 99999,
    };
    const haunted = { ...state, scene: { ...state.scene, spirits: [spirit] } };
    const hunted = walked(haunted, route(world, haunted, spirit), context());
    assertEquals(hunted.last.effects[0], { type: "duel", foe: { kind: "spirit", word: "w.c" } });
    assert(!among(hunted.tiles, spirit));
    const keeper = hall.fixtures[0];
    const visit = walked(haunted, route(world, haunted, keeper), context());
    assertEquals(
      visit.last,
      converse(visit.before, { kind: "keeper", place: "market" }, context()),
    );
    assert(!among(visit.tiles, keeper) && !among(visit.tiles, spirit));
  },
);

Deno.test(
  "a route to a wall or to water ends in a bump; to where the learner stands, or off the map, none",
  () => {
    const state = posed(world, "market", { x: 1, y: 2 });
    for (const goal of [
      { x: 0, y: 2 },
      { x: 6, y: 0 },
      { x: 3, y: 4 },
    ]) {
      const trail = walked(state, route(world, state, goal), context());
      assertEquals(trail.last.effects, [{ type: "bump" }], key(goal));
      assert(!among(trail.tiles, goal));
    }
    assertEquals(route(world, state, { x: 1, y: 2 }), []);
    assertEquals(route(world, state, { x: -1, y: 0 }), []);
    assertEquals(route(world, state, { x: 13, y: 2 }), []);
    assertEquals(route(world, state, { x: 4, y: 7 }), []);
  },
);

Deno.test("a route through a portal crosses to the far map", () => {
  const state = posed(world, "market", { x: 1, y: 2 });
  const trail = walked(state, route(world, state, { x: 12, y: 2 }), context());
  assertEquals(trail.last.effects[0], { type: "entered", map: "yard", from: "market" });
  assertEquals(trail.state.run.pose, { map: "yard", ...yard.spawns.market });
  for (const tile of trail.tiles.slice(0, -1)) assert(!among(Object.values(STONES), tile));
});

Deno.test("a route to the vendor ends across the counter", () => {
  const state = posed(world, "shop", { x: 1, y: 4 });
  const steps = route(world, state, shop.fixtures[0]);
  assertEquals(steps.length, 4);
  const trail = walked(state, steps, context());
  assertEquals(trail.last, converse(trail.before, { kind: "vendor", place: null }, context()));
  assertEquals(trail.state.run.pose, { map: "shop", x: 3, y: 3, facing: "north" });
  assertEquals(route(world, state, { x: 1, y: 1 }), [], "no one stands there: no way across");
});

Deno.test("a route keeps to the light in the dark; with the lantern it goes anywhere", () => {
  const door = entry(cave);
  const state = posed(world, "cave", door);
  const lightless = (cell) => !lit(world, state.run, cell);
  assertEquals(route(world, state, { x: 3, y: 1 }), [], "nothing lit reaches it");
  const edge = walked(state, route(world, state, { x: 3, y: 2 }), context());
  assertEquals(edge.last.effects, [{ type: "dark" }]);
  assert(edge.tiles.every((cell) => !lightless(cell)));
  const glow = cells(cave).filter(
    (each) => tile(cave, each).walk && !lightless(each) && !among([door, ...cave.portals], each),
  );
  assert(glow.length > 4);
  for (const cell of glow) {
    const { x, y } = walked(state, route(world, state, cell), context()).state.run.pose;
    assertEquals({ x, y }, cell);
  }
  const lantern = posed(world, "cave", door, tally(fresh(SEED), "gained:lantern", 1));
  const far = walked(lantern, route(world, lantern, { x: 1, y: 1 }), context());
  assertEquals([far.state.run.pose.x, far.state.run.pose.y], [1, 1]);
});

Deno.test(
  "on every authored map, every open tile a walk reaches is routed to, and walking the route lands on it",
  () => {
    const authored = chart(SEED, { places: {}, words: {} });
    assertEquals(Object.keys(authored.maps), Object.keys(MAPS));
    for (const map of Object.values(authored.maps)) {
      const run = tally(fresh(SEED), "gained:lantern", 1);
      const start = entry(map);
      const state = posed(authored, map.id, start, run);
      const blocked = blocking(authored, map.id, run);
      const open = (cell) => tile(map, cell).walk && !among(blocked, cell);
      const reachable = new Set([key(start)]);
      const queue = [start];
      for (const cell of queue)
        for (const way of Object.keys(DIRECTIONS)) {
          const next = neighbour(cell, way);
          if (reachable.has(key(next)) || !open(next)) continue;
          reachable.add(key(next));
          queue.push(next);
        }
      for (const goal of cells(map).filter((cell) => open(cell) && !same(cell, start))) {
        const steps = route(authored, state, goal);
        assertEquals(steps.length > 0, reachable.has(key(goal)), `${map.id} ${key(goal)}`);
        if (steps.length === 0) continue;
        const trail = walked(state, steps, context(authored));
        const { x, y } = trail.state.run.pose;
        assertEquals({ x, y }, goal, `${map.id} ${key(goal)}`);
        assertEquals(
          trail.effects,
          steps.map(() => ({ type: "step" })),
        );
      }
    }
  },
);
