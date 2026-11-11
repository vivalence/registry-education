import { assertEquals } from "@std/assert";
import { level } from "../engine/level.js";

const FLOORS = [0, 10, 30, 70, 130, 220, 350, 520, 750];

// enough words to reach the top: the market holds the first three hundred, the stacks the last
// hundred of them again, and a sentence sits outside both
const ids = (from, to) => Array.from({ length: to - from }, (_, index) => `w.${from + index}`);

const WORLD = {
  places: {
    market: { words: ids(0, 300) },
    stacks: { words: ids(200, 300) },
  },
  words: Object.fromEntries([...ids(0, 300), "s.0"].map((id) => [id, { id }])),
};

// a memory holding the first words graduated, then one known word and one held word, to make up
// exactly these points; the rest of the valley untouched
const worth = (points) => {
  const graduated = Math.floor(points / 3);
  const rest = points % 3;
  const words = ids(0, graduated + 1);
  return Object.fromEntries([
    ...words.slice(0, graduated).map((id) => [id, "GRADUATED"]),
    ...(rest === 2 ? [[words[graduated], "KNOWN"]] : []),
    ...(rest === 1 ? [[words[graduated], "LEARNING"]] : []),
  ]);
};

Deno.test("a word is worth what is held of it: held 1, known 2, graduated 3, else nothing", () => {
  const memory = {
    "w.0": "UNTOUCHED",
    "w.1": "UNKNOWN",
    "w.2": "LEARNING",
    "w.3": "KNOWN",
    "w.4": "GRADUATED",
  };
  assertEquals(level(WORLD, memory).points, 0 + 0 + 1 + 2 + 3);
  assertEquals(level(WORLD, {}).points, 0);
});

Deno.test("a word two places hold counts once; a sentence is no stone and earns nothing", () => {
  assertEquals(level(WORLD, { "w.250": "GRADUATED" }).points, 3);
  assertEquals(level(WORLD, { "s.0": "GRADUATED", "w.0": "KNOWN" }).points, 2);
});

Deno.test("each floor starts a level; a point short of it stays a level below", () => {
  FLOORS.forEach((floor, index) => {
    assertEquals(level(WORLD, worth(floor)), {
      level: index + 1,
      points: floor,
      floor,
      next: index + 1 < FLOORS.length ? FLOORS[index + 1] : null,
    });
    if (floor > 0)
      assertEquals(level(WORLD, worth(floor - 1)), {
        level: index,
        points: floor - 1,
        floor: FLOORS[index - 1],
        next: floor,
      });
  });
});

Deno.test("the top is level nine: past its floor there is no next", () => {
  assertEquals(level(WORLD, worth(900)), { level: 9, points: 900, floor: 750, next: null });
  assertEquals(level(WORLD, {}), { level: 1, points: 0, floor: 0, next: 10 });
});

Deno.test("the level falls as memory slips, and climbs back as words return", () => {
  const known = Object.fromEntries(ids(0, 20).map((id) => [id, "KNOWN"]));
  const slipped = { ...known, ...Object.fromEntries(ids(0, 6).map((id) => [id, "UNKNOWN"])) };
  assertEquals([level(WORLD, known).level, level(WORLD, known).points], [3, 40]);
  assertEquals([level(WORLD, slipped).level, level(WORLD, slipped).points], [2, 28]);
  assertEquals(level(WORLD, { ...slipped, ...known }), level(WORLD, known));
});
