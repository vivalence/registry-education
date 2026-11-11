import { assert, assertEquals } from "@std/assert";
import { LEASH, WANDER, breathe, caught, roam, sees } from "../engine/spirits.js";
import { CALM, SIGHT, distances } from "../engine/world.js";
import { DIRECTIONS, apart, key, neighbour, same, tile } from "../engine/tiles.js";

const OPPOSITE = { north: "south", south: "north", west: "east", east: "west" };
import { fresh } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const SEED = 2933376779;

// an open field drawn by hand: a wall stands in it from y 4 to 6, a pond lies in its south-west
const FIELD = {
  id: "market",
  name: "A Field",
  kind: "outdoor",
  place: "market",
  dark: false,
  rows: [
    "hhhhhhhhhhhhhhhhhhhh",
    "h..................h",
    "h..................h",
    "h..................h",
    "h.........H........h",
    "h.........H........h",
    "h.........H........h",
    "h..................h",
    "h....~~~...........h",
    "h....~~~...........h",
    "h..................h",
    "hhhhhhhhhhhhhhhhhhhh",
  ],
  spawns: { entry: { x: 1, y: 10, facing: "north" } },
  portals: [{ x: 1, y: 1, to: "square", spawn: "market" }],
  fixtures: [{ kind: "keeper", x: 6, y: 1, facing: "south" }],
  chests: [{ id: "market.chest.0", x: 1, y: 4, loot: { coins: 5 } }],
  pots: [{ id: "market.pot.0", x: 6, y: 4 }],
};

// a wide meadow with nothing tall in it, for the gaze alone
const MEADOW = {
  ...FIELD,
  rows: ["h".repeat(31), ...Array(29).fill(`h${".".repeat(29)}h`), "h".repeat(31)],
};

// the field as a charted world, with whatever is laid over it
const valley = (laid = {}) => ({
  seed: SEED,
  maps: { market: { ...FIELD, stones: [], items: [], spawnPoints: [], ...laid } },
  places: {},
  words: {},
  order: [],
});

const spirit = (word, at, facing, next = 0) => ({
  word,
  x: at.x,
  y: at.y,
  facing,
  home: { x: at.x, y: at.y },
  mode: "roam",
  next,
});

// the learner among spirits, the calm of their arrival long past unless one is given
const posed = (learner, spirits, calm = 0) => ({
  run: { ...fresh(SEED), pose: { map: "market", x: learner.x, y: learner.y, facing: "north" } },
  scene: { spirits, duel: null, dialogue: null, game: null, calm },
});

const context = (world, now, random = mulberry(5)) => ({ world, memory: {}, due: [], now, random });

// the clock's ticks every 100 ms from one moment to another — the learner placed by where, if
// given — and every state and effect they made
const ticks = (state, world, from, to, random = mulberry(5), where = (each) => each) => {
  const trail = [];
  let current = state;
  for (let now = from; now <= to; now += 100) {
    const result = roam(where(current, now), context(world, now, random));
    current = result.state;
    trail.push({ now, state: current, effects: result.effects });
  }
  return trail;
};

const cells = (map) => map.rows.flatMap((row, y) => [...row].map((_, x) => ({ x, y })));

Deno.test("a spirit sees the learner beside it, whatever way it faces", () => {
  const at = { x: 14, y: 8 };
  for (const facing of Object.keys(DIRECTIONS))
    for (const side of Object.keys(DIRECTIONS))
      assert(sees(FIELD, { ...at, facing }, neighbour(at, side)), `${facing} ${side}`);
});

Deno.test(
  "the gaze is a cone of 120° reaching SIGHT tiles, measured against the angle itself",
  () => {
    for (const facing of Object.keys(DIRECTIONS)) {
      const centre = { x: 15, y: 15, facing };
      const way = DIRECTIONS[facing];
      for (const cell of cells(MEADOW)) {
        const dx = cell.x - centre.x;
        const dy = cell.y - centre.y;
        const turn = Math.atan2(way.x * dy - way.y * dx, way.x * dx + way.y * dy);
        const off = (Math.abs(turn) * 180) / Math.PI;
        const seen = Math.abs(dx) + Math.abs(dy) <= 1 || (Math.hypot(dx, dy) <= SIGHT && off <= 60);
        assertEquals(sees(MEADOW, centre, cell), seen, `${facing} ${key(cell)}`);
      }
      const along = (tiles, toward) => ({
        x: centre.x + DIRECTIONS[toward].x * tiles,
        y: centre.y + DIRECTIONS[toward].y * tiles,
      });
      assert(sees(MEADOW, centre, along(SIGHT, facing)));
      assert(!sees(MEADOW, centre, along(SIGHT + 1, facing)));
      assert(!sees(MEADOW, centre, along(2, OPPOSITE[facing])), "never behind");
    }
  },
);

Deno.test("a wall breaks the line of sight; water does not", () => {
  assert(!sees(FIELD, { x: 8, y: 5, facing: "east" }, { x: 12, y: 5 }), "through the wall");
  assert(sees(FIELD, { x: 8, y: 7, facing: "east" }, { x: 12, y: 7 }), "past the wall's end");
  assert(!sees(FIELD, { x: 12, y: 4, facing: "west" }, { x: 8, y: 6 }), "the wall between");
  assert(sees(FIELD, { x: 4, y: 9, facing: "east" }, { x: 8, y: 9 }), "over the pond");
  assert(!tile(FIELD, { x: 5, y: 9 }).walk);
});

Deno.test(
  "a roaming spirit steps a tile at a time, every 700–1100 ms, within WANDER of home, onto open ground only",
  () => {
    const world = valley({
      stones: [
        { x: 4, y: 3, word: "w.a" },
        { x: 7, y: 3, word: "w.b" },
      ],
      items: [{ x: 3, y: 5, word: "w.c" }],
    });
    const map = world.maps.market;
    const taken = [
      ...map.stones,
      ...map.items,
      ...map.fixtures,
      ...map.chests,
      ...map.pots,
      ...map.portals,
    ];
    // the learner stands too far off to be seen
    const start = posed({ x: 18, y: 10 }, [
      spirit("w.x", { x: 4, y: 4 }, "east"),
      spirit("w.y", { x: 5, y: 4 }, "west"),
    ]);
    const trail = ticks(start, world, 1000, 61000);
    const acts = { "w.x": [], "w.y": [] };
    let last = start.scene.spirits;
    for (const { now, state, effects } of trail) {
      assertEquals(effects, []);
      const spirits = state.scene.spirits;
      assertEquals(new Set(spirits.map(key)).size, 2, "never on each other");
      for (const [index, each] of spirits.entries()) {
        assertEquals(each.mode, "roam");
        assert(apart(each, each.home) <= WANDER, `${each.word} strayed to ${key(each)}`);
        assert(apart(each, last[index]) <= 1);
        assert(tile(map, each).walk && !taken.some((thing) => same(thing, each)), key(each));
        if (each.next !== last[index].next) acts[each.word].push(now);
      }
      last = spirits;
    }
    for (const times of Object.values(acts)) {
      assert(times.length > 40);
      // an act falls on the first tick at or past its time: 700–1100 ms, and up to a tick more
      for (const [index, now] of times.slice(1).entries())
        assert(now - times[index] >= 700 && now - times[index] < 1200, `${now - times[index]}`);
    }
    const visited = new Set(trail.flatMap(({ state }) => state.scene.spirits.map(key)));
    assert(visited.size > 6, "they wander");
  },
);

Deno.test("a tick before any spirit's time changes nothing", () => {
  const state = posed({ x: 18, y: 10 }, [spirit("w.x", { x: 4, y: 4 }, "east", 5000)]);
  const result = roam(state, context(valley(), 4900));
  assertEquals(result, { state, effects: [], events: [] });
  assert(result.state === state);
});

Deno.test(
  "a spirit that sees the learner says so, turns to them and freezes 600 ms; then it hunts",
  () => {
    const world = valley();
    const blind = posed({ x: 6, y: 3 }, [spirit("w.x", { x: 3, y: 3 }, "north", 99999)]);
    assertEquals(ticks(blind, world, 1000, 1000)[0].effects, [], "facing away, it sees nothing");
    const start = posed({ x: 6, y: 3 }, [spirit("w.x", { x: 3, y: 3 }, "east", 99999)]);
    const [spotted, ...frozen] = ticks(start, world, 1000, 1500);
    assertEquals(spotted.effects, [{ type: "spotted", word: "w.x" }]);
    assertEquals(spotted.state.scene.spirits[0], {
      ...start.scene.spirits[0],
      mode: "alert",
      facing: "east",
      next: 1600,
    });
    for (const tick of frozen) {
      assertEquals(tick.effects, []);
      assert(tick.state === spotted.state, "frozen");
    }
    const [hunt] = ticks(spotted.state, world, 1600, 1600);
    const hunter = hunt.state.scene.spirits[0];
    assertEquals([hunter.mode, hunter.x, hunter.y, hunter.next], ["chase", 4, 3, 1920]);
    assertEquals(hunt.effects, [], "a spirit says it once");
    const turned = posed({ x: 3, y: 6 }, [spirit("w.x", { x: 3, y: 3 }, "east", 99999)]);
    assertEquals(ticks(turned, world, 1000, 1000)[0].state.scene.spirits[0].facing, "east");
    const behind = posed({ x: 3, y: 4 }, [spirit("w.x", { x: 3, y: 3 }, "north", 99999)]);
    assertEquals(ticks(behind, world, 1000, 1000)[0].state.scene.spirits[0].facing, "south");
  },
);

Deno.test("a hunting spirit closes on the learner a tile at each stride and catches them", () => {
  const world = valley();
  const learner = { x: 12, y: 8 };
  const start = posed(learner, [spirit("w.x", { x: 9, y: 8 }, "east", 99999)]);
  const trail = ticks(start, world, 1000, 4000);
  const field = distances([learner], (cell) => tile(FIELD, cell).walk);
  const steps = trail
    .map(({ now, state }) => ({ now, at: state.scene.spirits[0] }))
    .filter(({ at }, index, all) => index === 0 || !same(at, all[index - 1].at));
  assertEquals(
    steps.map(({ at }) => field.get(key(at))),
    [3, 2, 1, 0],
  );
  // 600 ms frozen, then a stride of 320 ms, falling on the first tick past it
  assertEquals(
    steps.map(({ now }) => now),
    [1000, 1600, 2000, 2400],
  );
  const end = trail.find(({ state }) => caught(state));
  assertEquals([end.now, caught(end.state).word], [2400, "w.x"]);
  assertEquals(caught(start), undefined);
});

Deno.test(
  "a hunt goes round what blocks it and never steps on a stone, an item or another spirit",
  () => {
    const world = valley({
      stones: [{ x: 10, y: 8, word: "w.a" }],
      items: [{ x: 10, y: 9, word: "w.b" }],
    });
    const learner = { x: 12, y: 8 };
    const start = posed(learner, [
      spirit("w.x", { x: 9, y: 8 }, "east", 99999),
      spirit("w.y", { x: 10, y: 7 }, "east", 99999),
    ]);
    const trail = ticks(start, world, 1000, 8000);
    for (const { state } of trail) {
      const spirits = state.scene.spirits;
      assertEquals(new Set(spirits.map(key)).size, spirits.length);
      for (const each of spirits)
        assert(!same(each, { x: 10, y: 8 }) && !same(each, { x: 10, y: 9 }), key(each));
    }
    assert(
      trail.some(({ state }) => caught(state)),
      "the learner is caught all the same",
    );
  },
);

Deno.test(
  "a hunting spirit never strays past its LEASH; beyond it, it walks home, then roams",
  () => {
    const world = valley();
    const home = { x: 3, y: 5 };
    const start = posed({ x: 6, y: 5 }, [spirit("w.x", home, "east", 99999)]);
    // spotted, the learner stands far off, out of the leash's reach
    const away = (state, now) =>
      now < 1500
        ? state
        : { ...state, run: { ...state.run, pose: { ...state.run.pose, x: 18, y: 2 } } };
    const trail = ticks(start, world, 1000, 20000, mulberry(5), away);
    const hunter = trail.map(({ state }) => state.scene.spirits[0]);
    const modes = hunter.map((each) => each.mode);
    for (const each of hunter) assert(apart(each, home) <= LEASH, key(each));
    assertEquals(Math.max(...hunter.map((each) => apart(each, home))), LEASH, "to the leash's end");
    const hunted = modes.indexOf("chase");
    const gaveUp = modes.indexOf("return");
    const back = modes.indexOf("roam", gaveUp);
    assert(hunted > 0 && gaveUp > hunted && back > gaveUp, modes.join(" "));
    assertEquals(apart(hunter[gaveUp], home), LEASH);
    const tethered = hunter.findIndex((each) => apart(each, home) === LEASH);
    assert(trail[gaveUp].now - trail[tethered].now <= 400, "it turns home at its next stride");
    assert(same(hunter[back], home), "home again, it roams");
    for (const each of hunter.slice(gaveUp, back)) assertEquals(Object.keys(each).length, 7);
  },
);

Deno.test("a hunt that gains no ground for 3 s is given up", () => {
  // the learner stands walled in by stones: in sight, out of reach
  const learner = { x: 15, y: 2 };
  const stones = Object.keys(DIRECTIONS).map((way, index) => ({
    ...neighbour(learner, way),
    word: `w.${index}`,
  }));
  const start = posed(learner, [spirit("w.x", { x: 11, y: 2 }, "east", 99999)]);
  const trail = ticks(start, valley({ stones }), 1000, 6000);
  const modes = trail.map(({ state }) => state.scene.spirits[0].mode);
  const hunted = trail[modes.indexOf("chase")].now;
  const gaveUp = trail[modes.indexOf("return")].now;
  assertEquals(hunted, 1600);
  // strides fall every 400 ms on the 100 ms clock: the first past 3 s gives up
  assertEquals(gaveUp - hunted, 3200);
  for (const { state } of trail.slice(0, modes.indexOf("return")))
    assert(same(state.scene.spirits[0], { x: 11, y: 2 }), "it had no way to the learner");
});

Deno.test(
  "a hunt gaining ground keeps on: the patience counts from the closest it has come",
  () => {
    // the learner backs away a tile every 600 ms: slower than the hunt, so it gains, and never
    // gives up
    const world = valley();
    const start = posed({ x: 6, y: 2 }, [spirit("w.x", { x: 3, y: 2 }, "east", 99999)]);
    const backing = (state, now) => ({
      ...state,
      run: {
        ...state.run,
        pose: { ...state.run.pose, x: Math.min(6 + Math.floor((now - 1000) / 600), 18) },
      },
    });
    const trail = ticks(start, world, 1000, 9000, mulberry(5), backing);
    const end = trail.findIndex(({ state }) => caught(state));
    assert(end > 0, "caught");
    assert(trail.slice(0, end).every(({ state }) => state.scene.spirits[0].mode !== "return"));
  },
);

Deno.test("spirits replay: the same clock and dice move them the same way", () => {
  const start = posed({ x: 10, y: 8 }, [
    spirit("w.x", { x: 4, y: 4 }, "east", 1200),
    spirit("w.y", { x: 14, y: 2 }, "west", 1300),
    spirit("w.z", { x: 16, y: 9 }, "north", 1400),
  ]);
  const play = () => ticks(start, valley(), 1000, 12000, mulberry(11));
  assertEquals(play(), play());
});

Deno.test("in the calm no spirit spots the learner; the calm past, the first look does", () => {
  const world = valley();
  const start = posed({ x: 6, y: 3 }, [spirit("w.x", { x: 3, y: 3 }, "east", 99999)], 2000);
  const trail = ticks(start, world, 1000, 2000);
  assert(
    trail.slice(0, -1).every(({ effects }) => effects.length === 0),
    "in the calm, unseen",
  );
  assertEquals(trail.at(-1).effects, [{ type: "spotted", word: "w.x" }]);
});

Deno.test("a learner who comes free breathes: every hunter walks home, and the calm begins", () => {
  const hunting = {
    ...spirit("w.x", { x: 5, y: 3 }, "east", 1300),
    mode: "chase",
    closest: 2,
    since: 900,
  };
  const frozen = { ...spirit("w.y", { x: 9, y: 9 }, "west", 1400), mode: "alert" };
  const roaming = spirit("w.z", { x: 14, y: 2 }, "north", 1500);
  const { scene } = posed({ x: 6, y: 3 }, [hunting, frozen, roaming]);
  const breathed = breathe(scene, 1000);
  assertEquals(breathed.calm, 1000 + CALM);
  assertEquals(
    breathed.spirits.map((each) => [each.word, each.mode, each.x, each.y]),
    [
      ["w.x", "return", 5, 3],
      ["w.y", "return", 9, 9],
      ["w.z", "roam", 14, 2],
    ],
  );
  assert(!("closest" in breathed.spirits[0]), "a spirit walking home carries no hunt");
  assert(breathed.spirits[2] === roaming, "a roaming spirit is left as it was");
});
