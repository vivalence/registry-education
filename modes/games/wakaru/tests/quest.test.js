import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { chart } from "../engine/world.js";
import { complete, markers, progress, quests, settle, tracker, wanted } from "../engine/quest.js";
import { HEARTS, fresh, held, raise, tally } from "../engine/run.js";
import { apart } from "../engine/tiles.js";

const word = (id, slug, known, learning, rank) => ({
  id,
  slug,
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

// Market Row: six words, five of them nouns for the errand. Hearth Lane: one interjection, so
// nothing to fetch. The Crossroads: two nouns. The Stacks: a wing of two words
const ATLAS = {
  places: {
    market: {
      words: ["w.pan", "w.queso", "w.gracias", "w.manzana", "w.dinero", "w.camisa"],
      sentences: [],
    },
    hearth: { words: ["w.hola"], sentences: [] },
    crossroads: { words: ["w.calle", "w.tren"], sentences: [] },
    stacks: { words: ["w.libro", "w.leer"], sentences: [] },
  },
  words: Object.fromEntries(
    [
      word("w.pan", "pan.noun", "bread", "pan", 1),
      word("w.queso", "queso.noun", "cheese", "queso", 2),
      word("w.gracias", "gracias.interjection", "thank you", "gracias", 3),
      word("w.manzana", "manzana.noun", "apple", "manzana", 4),
      word("w.dinero", "dinero.noun", "money", "dinero", 5),
      word("w.camisa", "camisa.noun", "shirt", "camisa", 6),
      word("w.hola", "hola.interjection", "hello", "hola", 7),
      word("w.calle", "calle.noun", "street", "calle", 8),
      word("w.tren", "tren.noun", "train", "tren", 9),
      word("w.libro", "libro.noun", "book", "libro", 10),
      word("w.leer", "leer.verb", "to read", "leer", 11),
    ].map((entry) => [entry.id, entry]),
  ),
};

// every district here is the same hedged field: tall grass in its south-east, a road to the square
const FIELD = [
  "hhhhhhhhhhhhhh",
  "h............h",
  "h............h",
  "h............h",
  "h............h",
  "h........vvv.h",
  "h........vvv.h",
  "h............h",
  "hhhhhh::hhhhhh",
];

// every interior here is the same hall, its door to the south
const HALL = ["##########", "#________#", "#________#", "#________#", "#________#", "####D#####"];

const KEEPER = { kind: "keeper", x: 3, y: 2, facing: "south" };
const WARDEN = { kind: "warden", x: 11, y: 2, facing: "south" };
const HAUNT = { kind: "haunt", x: 10, y: 5 };

const district = (id, name) => ({
  id,
  name,
  kind: "outdoor",
  place: id,
  dark: false,
  rows: FIELD,
  spawns: { entry: { x: 6, y: 7, facing: "north" } },
  portals: [
    { x: 6, y: 8, to: "square", spawn: id },
    { x: 7, y: 8, to: "square", spawn: id },
  ],
  fixtures: [KEEPER, WARDEN, HAUNT],
  chests: [],
  pots: [],
});

const hall = (id, name, place, fixtures) => ({
  id,
  name,
  kind: "indoor",
  place,
  dark: false,
  rows: HALL,
  spawns: { square: { x: 4, y: 4, facing: "north" } },
  portals: [{ x: 4, y: 5, to: "square", spawn: id }],
  fixtures,
  chests: [],
  pots: [],
});

// the maps these tests chart: four places, a house, a fallow Clock Hill and the summit
const MAPS = {
  square: {
    ...district("square", "The Square"),
    place: null,
    spawns: { start: { x: 6, y: 6, facing: "north" }, entry: { x: 6, y: 7, facing: "north" } },
    fixtures: [
      { kind: "shrine", x: 3, y: 2 },
      { kind: "sign", x: 5, y: 2 },
    ],
  },
  market: district("market", "Market Row"),
  hearth: district("hearth", "Hearth Lane"),
  crossroads: district("crossroads", "The Crossroads"),
  clockhill: district("clockhill", "Clock Hill"),
  "hearth.house": hall("hearth.house", "A House", "hearth", [{ kind: "bed", x: 1, y: 1 }]),
  stacks: hall("stacks", "The Stacks", "stacks", [{ kind: "warden", x: 8, y: 1, facing: "south" }]),
  summit: {
    ...hall("summit", "The Summit", null, [{ kind: "summit", x: 4, y: 1 }]),
    kind: "cave",
    dark: true,
  },
};

const WORLD = chart(7, ATLAS, MAPS);

// the market's stones as chart() laid them, nearest its entry first, and its errand's items
const STONES = WORLD.maps.market.stones;

const ITEMS = WORLD.maps.market.items.map((item) => item.word);

const ctx = (memory = {}, due = []) => ({ world: WORLD, memory, due, now: 0, random: () => 0.5 });

// the learner standing on a map's tile
const on = (map, run, cell) => ({ ...run, pose: { map, x: cell.x, y: cell.y, facing: "north" } });

const state = (run) => ({ run, scene: { spirits: [], duel: null, dialogue: null, game: null } });

const raised = (run, flags) => flags.reduce(raise, run);

const met = (words) => words.map((id) => `met:${id}`);

const restored = (places) => places.map((place) => `restored:${place}`);

const quest = (id) => quests(WORLD, id.split(".")[0]).find((told) => told.id === id);

// a quest as the journal reads it: where its place's progress has it
const standing = (id, run, memory) =>
  progress(WORLD, run, ctx(memory))[id.split(".")[0]].find((entry) => entry.quest.id === id);

const statuses = (words, status) => Object.fromEntries(words.map((id) => [id, status]));

// four of the market's six words held: its warden wakes
const WOKEN = statuses(["w.pan", "w.queso", "w.manzana", "w.camisa"], "LEARNING");

const at = (fixture) => ({ map: "market", x: fixture.x, y: fixture.y });

Deno.test("the charted world holds what these tests read", () => {
  assertEquals(WORLD.order, ["market", "hearth", "crossroads", "stacks"]);
  assertEquals(
    STONES.map((stone) => stone.word),
    ["w.pan", "w.queso", "w.gracias", "w.manzana", "w.dinero", "w.camisa"],
  );
  assert(ITEMS.length >= 2);
  assertEquals(WORLD.maps.hearth.items, []);
  assertEquals(WORLD.maps.stacks.stones.length, 2);
  assert(!Object.hasOwn(WORLD.places, "clockhill"));
});

Deno.test(
  "a district tells five quests, a wing two; an errand is told only where an item is strewn",
  () => {
    const market = quests(WORLD, "market");
    assertEquals(
      market.map((told) => told.id),
      ["market.stones", "market.spirits", "market.errand", "market.question", "market.warden"],
    );
    assertEquals(
      market.map((told) => told.reward),
      [{ coins: 20 }, { coins: 20 }, { coins: 30, refill: true }, { coins: 30 }, {}],
    );
    assert(market.every((told) => told.place === "market" && told.steps.length > 0));
    assertEquals(
      quests(WORLD, "hearth").map((told) => told.id),
      ["hearth.stones", "hearth.spirits", "hearth.question", "hearth.warden"],
    );
    assertEquals(
      quests(WORLD, "stacks").map((told) => told.id),
      ["stacks.spirits", "stacks.warden"],
    );
  },
);

Deno.test(
  "the keeper's errand asks for the place's first item; a place without items has none",
  () => {
    assertEquals(wanted(WORLD, "market"), ITEMS[0]);
    assertEquals(wanted(WORLD, "hearth"), undefined);
  },
);

Deno.test("the stones are read on the home map: every one of them, counted as they light", () => {
  const stones = quest("market.stones");
  const [step] = stones.steps;
  const words = STONES.map((stone) => stone.word);
  assertEquals(step.hint, "Read every stone of Market Row");
  assertEquals(step.measure(fresh(1), ctx()), { done: 0, of: 6 });
  const most = raised(fresh(1), met(words.slice(1)));
  assertEquals(step.measure(most, ctx()), { done: 5, of: 6 });
  assert(!complete(stones, most, ctx()));
  // a word read elsewhere is no stone of this map
  assert(!complete(stones, raise(most, "met:w.hola"), ctx()));
  assert(complete(stones, raise(most, `met:${words[0]}`), ctx()));
});

Deno.test(
  "the stone pointed at: the unread one nearest on its map, from elsewhere the first unread",
  () => {
    const [step] = quest("market.stones").steps;
    const spot = (stone) => ({ map: "market", x: stone.x, y: stone.y });
    assertEquals(step.target(fresh(1), ctx()), spot(STONES[0]));
    assertEquals(step.target(raise(fresh(1), `met:${STONES[0].word}`), ctx()), spot(STONES[1]));
    // standing on the market, the stone underfoot is the nearest; read, the next nearest
    const over = on("market", fresh(1), STONES[3]);
    assertEquals(step.target(over, ctx()), spot(STONES[3]));
    const read = raise(over, `met:${STONES[3].word}`);
    const next = step.target(read, ctx());
    const left = STONES.filter((stone) => stone !== STONES[3]);
    assert(left.some((stone) => stone.x === next.x && stone.y === next.y));
    assert(left.every((stone) => apart(stone, read.pose) >= apart(next, read.pose)));
  },
);

Deno.test("resting the spirits counts up to three, or to every word of a smaller place", () => {
  const market = quest("market.spirits");
  const [step] = market.steps;
  assertEquals(step.hint, "Lay 3 of its spirits to rest");
  assertEquals(step.measure(tally(fresh(1), "rested:market", 2), ctx()), { done: 2, of: 3 });
  assertEquals(step.measure(tally(fresh(1), "rested:market", 7), ctx()), { done: 3, of: 3 });
  assert(!complete(market, tally(fresh(1), "rested:market", 2), ctx()));
  assert(complete(market, tally(fresh(1), "rested:market", 3), ctx()));
  assert(!complete(market, tally(fresh(1), "rested:hearth", 3), ctx()));
  assert(complete(quest("hearth.spirits"), tally(fresh(1), "rested:hearth"), ctx()));
  assert(!complete(quest("stacks.spirits"), tally(fresh(1), "rested:stacks"), ctx()));
  assert(complete(quest("stacks.spirits"), tally(fresh(1), "rested:stacks", 2), ctx()));
  assertEquals(step.target(fresh(1), ctx()), at(HAUNT));
});

Deno.test("the errand steps from finding the asked item to handing it over, at the keeper", () => {
  const [asked, decoy] = ITEMS;
  const opened = standing("market.errand", fresh(1));
  assertEquals(opened.step.hint, "Ask the keeper what they need, and find it");
  assertEquals(opened.step.target(fresh(1), ctx()), at(KEEPER));
  const tricked = tally(fresh(1), `gained:word:${decoy}`);
  assertEquals(standing("market.errand", tricked).step.hint, opened.step.hint);
  const found = tally(tricked, `gained:word:${asked}`);
  const bringing = standing("market.errand", found).step;
  assertEquals(bringing.hint, "Bring it to the keeper");
  assertEquals(bringing.target(found, ctx()), at(KEEPER));
  const handed = raise(tally(found, `used:word:${asked}`), "errand:market");
  const done = standing("market.errand", handed);
  assertEquals([done.step, done.done], [undefined, true]);
});

Deno.test(
  "the warden wakes on memory, four of the six words held, and is done once restored",
  () => {
    const warden = quest("market.warden");
    assertEquals(warden.steps[0].hint, "Hold 4 of its 6 words to wake the warden");
    assertEquals(quest("hearth.warden").steps[0].hint, "Hold its one word to wake the warden");
    const three = {
      "w.pan": "KNOWN",
      "w.queso": "LEARNING",
      "w.manzana": "GRADUATED",
      "w.dinero": "UNKNOWN",
    };
    const four = { ...three, "w.camisa": "LEARNING" };
    assertEquals(warden.steps[0].measure(fresh(1), ctx(three)), { done: 3, of: 4 });
    assertEquals(standing("market.warden", fresh(1), three).step.hint, warden.steps[0].hint);
    assertEquals(standing("market.warden", fresh(1), four).step.hint, warden.steps[1].hint);
    assertEquals(warden.steps[1].target(fresh(1), ctx(four)), at(WARDEN));
    assert(!complete(warden, fresh(1), ctx(four)));
    const fallen = raise(fresh(1), "restored:market");
    assert(complete(warden, fallen, ctx(four)));
    // memory slips once the place stands restored: the quest stays done
    assert(complete(warden, fallen, ctx({})));
  },
);

Deno.test("progress covers the open places only, each quest at its first unmet step", () => {
  assertEquals(Object.keys(progress(WORLD, fresh(1), ctx())), ["market"]);
  const opened = raised(fresh(1), restored(["market"]));
  assertEquals(Object.keys(progress(WORLD, opened, ctx())), ["market", "hearth", "stacks"]);
  const market = progress(WORLD, opened, ctx()).market;
  assertEquals(
    market.map((entry) => entry.done),
    [false, false, false, false, true],
  );
  assertEquals(market[0].step.hint, "Read every stone of Market Row");
});

Deno.test(
  "settle rewards a complete quest once: the receipt, the coins, the journal's word",
  () => {
    const settled = settle(state(raised(fresh(1), met(STONES.map((stone) => stone.word)))), ctx());
    assertEquals(settled.effects, [
      { type: "quest", quest: "market.stones", done: true },
      { type: "coins", amount: 20 },
    ]);
    assertEquals(settled.events, [{ type: "flag", flag: "rewarded:market.stones" }]);
    assertEquals(settled.state.run.counters["coins+"], 20);
    assert(settled.state.run.flags.includes("rewarded:market.stones"));

    const again = settle(settled.state, ctx());
    assertStrictEquals(again.state, settled.state);
    assertEquals(again.effects, []);
    assertEquals(again.events, []);
  },
);

Deno.test("the errand's reward refills the hearts; full hearts are not healed again", () => {
  const handed = raise(tally(fresh(1), `gained:word:${ITEMS[0]}`), "errand:market");
  const hurt = settle(state({ ...handed, hearts: 2 }), ctx());
  assertEquals(hurt.state.run.hearts, HEARTS);
  assertEquals(hurt.effects, [
    { type: "quest", quest: "market.errand", done: true },
    { type: "coins", amount: 30 },
    { type: "heal", hearts: HEARTS },
  ]);
  assertEquals(
    settle(state(handed), ctx()).effects.map((effect) => effect.type),
    ["quest", "coins"],
  );
});

Deno.test("the warden's quest pays nothing of its own, yet lands once", () => {
  const fallen = settle(state(raise(fresh(1), "restored:market")), ctx());
  assertEquals(fallen.effects, [{ type: "quest", quest: "market.warden", done: true }]);
  assertEquals(fallen.events, [{ type: "flag", flag: "rewarded:market.warden" }]);
  assertEquals(fallen.state.run.counters["coins+"], undefined);
});

Deno.test("restoring the crossroads hands over the compass, once", () => {
  const run = raised(fresh(1), restored(["market", "hearth", "crossroads"]));
  const settled = settle(state(run), ctx());
  const crossroads = settled.effects.findIndex(
    (effect) => effect.type === "quest" && effect.quest === "crossroads.warden",
  );
  assertEquals(settled.effects[crossroads + 1], { type: "gained", item: "compass" });
  assertEquals(
    settled.effects.filter((effect) => effect.type === "gained"),
    [{ type: "gained", item: "compass" }],
  );
  assertEquals(held(settled.state.run, "compass"), 1);
  const again = settle(settled.state, ctx());
  assertEquals([again.effects, held(again.state.run, "compass")], [[], 1]);
  // no other warden hands anything over
  assertEquals(
    WORLD.order.filter((place) => Object.keys(quest(`${place}.warden`).reward).length > 0),
    ["crossroads"],
  );
});

Deno.test("a locked place is never settled: its finished quests wait for it to open", () => {
  const early = raise(tally(fresh(1), "rested:hearth"), "asked:hearth");
  assertEquals(settle(state(early), ctx()).effects, []);
  const opened = settle(state(raise(early, "restored:market")), ctx());
  assertEquals(
    opened.effects.filter((effect) => effect.type === "quest").map((effect) => effect.quest),
    ["market.warden", "hearth.spirits", "hearth.question"],
  );
  assertEquals(opened.state.run.counters["coins+"], 20 + 30);
});

Deno.test("settle leaves the state it was handed untouched", () => {
  const handed = raise(
    tally(raised(fresh(1), met(STONES.map((stone) => stone.word))), `gained:word:${ITEMS[0]}`),
    "errand:market",
  );
  const before = state({ ...handed, hearts: 1 });
  const copy = structuredClone(before);
  assertEquals(settle(before, ctx()).effects.length, 5);
  assertEquals(before, copy);
});

Deno.test(
  "the tracker follows the frontier's first open quest, never resting spirits for its own sake",
  () => {
    assertEquals(tracker(WORLD, fresh(1), ctx()), {
      place: "market",
      title: "Read the stones",
      hint: "Read every stone of Market Row",
      progress: { done: 0, of: 6 },
      target: { map: "market", x: STONES[0].x, y: STONES[0].y },
    });
    // every stone read and no word due: the spirits wait, the keeper's errand is next
    const read = raised(fresh(1), met(STONES.map((stone) => stone.word)));
    assertEquals(tracker(WORLD, read, ctx()), {
      place: "market",
      title: "The keeper's errand",
      hint: "Ask the keeper what they need, and find it",
      progress: null,
      target: at(KEEPER),
    });
    const told = raised(tally(read, `gained:word:${ITEMS[0]}`), ["errand:market", "asked:market"]);
    assertEquals(tracker(WORLD, told, ctx(statuses(["w.pan"], "KNOWN"))), {
      place: "market",
      title: "The warden",
      hint: "Hold 4 of its 6 words to wake the warden",
      progress: { done: 1, of: 4 },
      target: null,
    });
  },
);

Deno.test("words fallen due come before any quest: their spirits gather at the haunt", () => {
  assertEquals(tracker(WORLD, fresh(1), ctx({}, ["w.queso", "w.hola", "w.dinero"])), {
    place: "market",
    title: "Restless spirits",
    hint: "2 words of Market Row are due: lay their spirits to rest",
    progress: null,
    target: at(HAUNT),
  });
  assertEquals(
    tracker(WORLD, fresh(1), ctx({}, ["w.camisa"])).hint,
    "A word of Market Row is due: lay its spirit to rest",
  );
  // another place's due words leave this one's tracker on its quests
  assertEquals(tracker(WORLD, fresh(1), ctx({}, ["w.hola"])).title, "Read the stones");
});

Deno.test("a woken warden comes before everything; slipping memory puts it back to sleep", () => {
  assertEquals(tracker(WORLD, fresh(1), ctx(WOKEN, ["w.queso"])), {
    place: "market",
    title: "The warden",
    hint: "Face the warden in its lair",
    progress: null,
    target: at(WARDEN),
  });
  const slipped = { ...WOKEN, "w.camisa": "UNKNOWN" };
  assertEquals(tracker(WORLD, fresh(1), ctx(slipped, ["w.queso"])).title, "Restless spirits");
});

Deno.test(
  "restored, the tracker moves along the order; all restored, the summit; crowned, nothing",
  () => {
    const market = raised(fresh(1), restored(["market"]));
    const lane = WORLD.maps.hearth.stones[0];
    assertEquals(tracker(WORLD, market, ctx()), {
      place: "hearth",
      title: "Read the stones",
      hint: "Read every stone of Hearth Lane",
      progress: { done: 0, of: 1 },
      target: { map: "hearth", x: lane.x, y: lane.y },
    });
    // a wing asks only for its warden: waking it points at a stone still unread, then nowhere
    const wing = raised(market, restored(["hearth", "crossroads"]));
    const hall = WORLD.maps.stacks.stones[0];
    assertEquals(tracker(WORLD, wing, ctx()), {
      place: "stacks",
      title: "The warden",
      hint: "Hold 2 of its 2 words to wake the warden",
      progress: { done: 0, of: 2 },
      target: { map: "stacks", x: hall.x, y: hall.y },
    });
    const read = raised(wing, met(["w.libro", "w.leer"]));
    assertEquals(tracker(WORLD, read, ctx()).target, null);
    // a wing's spirits gather at no haunt: their step points nowhere
    assertEquals(tracker(WORLD, read, ctx({}, ["w.leer"])).target, null);
    const whole = raised(fresh(1), restored(WORLD.order));
    assertEquals(tracker(WORLD, whole, ctx()), {
      place: null,
      title: "The summit",
      hint: "Climb to the summit and face what waits there",
      progress: null,
      target: { map: "summit", x: 4, y: 1 },
    });
    assertEquals(tracker(WORLD, raise(whole, "crowned"), ctx()), null);
  },
);

Deno.test("an empty valley gives the tracker nothing to follow", () => {
  const empty = chart(7, { places: {}, words: {} }, MAPS);
  assertEquals(tracker(empty, fresh(1), ctx()), null);
});

Deno.test(
  "markers: '!' over a keeper while its errand or question is open, '?' over a woken warden",
  () => {
    const keeper = { x: KEEPER.x, y: KEEPER.y, kind: "quest" };
    const awake = { x: WARDEN.x, y: WARDEN.y, kind: "awake" };
    assertEquals(markers(WORLD, fresh(1), ctx(), "market"), [keeper]);
    const errand = raise(tally(fresh(1), `gained:word:${ITEMS[0]}`), "errand:market");
    assertEquals(markers(WORLD, errand, ctx(), "market"), [keeper]);
    const answered = raise(errand, "asked:market");
    assertEquals(markers(WORLD, answered, ctx(), "market"), []);
    assertEquals(markers(WORLD, answered, ctx(WOKEN), "market"), [awake]);
    assertEquals(markers(WORLD, fresh(1), ctx(WOKEN), "market"), [keeper, awake]);
    assertEquals(markers(WORLD, raise(answered, "restored:market"), ctx(WOKEN), "market"), []);
    // the lane's keeper only asks a question; answered, nothing hangs over them
    assertEquals(markers(WORLD, fresh(1), ctx(), "hearth"), [keeper]);
    assertEquals(markers(WORLD, raise(fresh(1), "asked:hearth"), ctx(), "hearth"), []);
    // a wing's hall: a warden and no keeper
    const held = statuses(["w.libro", "w.leer"], "KNOWN");
    assertEquals(markers(WORLD, fresh(1), ctx(held), "stacks"), [{ x: 8, y: 1, kind: "awake" }]);
  },
);

Deno.test("the square, a house and a fallow map hang no marker", () => {
  assertEquals(markers(WORLD, fresh(1), ctx(WOKEN), "square"), []);
  assertEquals(markers(WORLD, fresh(1), ctx(), "hearth.house"), []);
  assertEquals(markers(WORLD, fresh(1), ctx(), "clockhill"), []);
});

Deno.test("over the authored valley, tracker and markers point at whom its maps post", () => {
  const valley = chart(7, ATLAS);
  const posted = (map, kind) => {
    const found = valley.maps[map].fixtures.find((fixture) => fixture.kind === kind);
    return { map, x: found.x, y: found.y };
  };
  const looking = (memory, due) => ({ world: valley, memory, due, now: 0, random: () => 0.5 });
  const keeper = posted("market", "keeper");
  assertEquals(markers(valley, fresh(1), looking({}, []), "market"), [
    { x: keeper.x, y: keeper.y, kind: "quest" },
  ]);
  assertEquals(
    tracker(valley, fresh(1), looking({}, ["w.queso"])).target,
    posted("market", "haunt"),
  );
  assertEquals(tracker(valley, fresh(1), looking(WOKEN, [])).target, posted("market", "warden"));
  const whole = raised(fresh(1), restored(valley.order));
  assertEquals(tracker(valley, whole, looking({}, [])).target, posted("summit", "summit"));
});

Deno.test("the tracker and the markers read the run and memory without touching them", () => {
  const run = raised(tally(fresh(1), "rested:market", 2), met(["w.pan"]));
  const memory = { ...WOKEN };
  const copy = structuredClone({ run, memory });
  tracker(WORLD, run, ctx(memory, ["w.queso"]));
  markers(WORLD, run, ctx(memory), "market");
  assertEquals({ run, memory }, copy);
});
