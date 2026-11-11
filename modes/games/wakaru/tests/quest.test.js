import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { chart } from "../engine/world.js";
import { complete, progress, quests, settle, wanted } from "../engine/quest.js";
import { HEARTS, fresh, raise, tally } from "../engine/run.js";

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

// Market Row: six words, five of them nouns for the errand. Hearth Lane: one interjection,
// which leaves its entry room without a stone and the lane without an item.
// The Stacks: a wing of two words
const ATLAS = {
  places: {
    market: {
      words: ["w.pan", "w.queso", "w.gracias", "w.manzana", "w.dinero", "w.camisa"],
      sentences: [],
    },
    hearth: { words: ["w.hola"], sentences: [] },
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
      word("w.libro", "libro.noun", "book", "libro", 8),
      word("w.leer", "leer.verb", "to read", "leer", 9),
    ].map((entry) => [entry.id, entry]),
  ),
};

const WORLD = chart(7, ATLAS);

const ENTRY = WORLD.rooms[WORLD.places.market.entry].stones.map((stone) => stone.word);

const ITEMS = WORLD.places.market.rooms.flatMap((room) => WORLD.rooms[room].items);

const ctx = (memory = {}) => ({ world: WORLD, memory, due: [], now: 0, random: () => 0.5 });

const state = (run) => ({
  run,
  scene: { room: "market.0", spirits: [], duel: null, dialogue: null },
});

const raised = (run, flags) => flags.reduce(raise, run);

const met = (words) => words.map((word) => `met:${word}`);

const quest = (id) => quests(WORLD, id.split(".")[0]).find((told) => told.id === id);

// a quest as the journal reads it: where its place's progress has it
const standing = (id, run, memory) =>
  progress(WORLD, run, ctx(memory))[id.split(".")[0]].find((entry) => entry.quest.id === id);

Deno.test("the charted world holds what these tests read", () => {
  assertEquals(WORLD.order, ["market", "hearth", "stacks"]);
  assertEquals(ENTRY.length, 3);
  assert(ITEMS.length >= 2);
  assertEquals(WORLD.rooms[WORLD.places.hearth.entry].stones, []);
  assertEquals(
    WORLD.places.hearth.rooms.flatMap((room) => WORLD.rooms[room].items),
    [],
  );
});

Deno.test(
  "a district tells five quests, a wing two; a quest its place cannot hold is not told",
  () => {
    const market = quests(WORLD, "market");
    assertEquals(
      market.map((told) => told.id),
      ["market.light", "market.spirits", "market.errand", "market.question", "market.warden"],
    );
    assertEquals(
      market.map((told) => told.reward),
      [{ coins: 20 }, { coins: 20 }, { coins: 30, refill: true }, { coins: 30 }, { coins: 0 }],
    );
    assert(market.every((told) => told.place === "market" && told.steps.length > 0));
    assertEquals(
      quests(WORLD, "hearth").map((told) => told.id),
      ["hearth.spirits", "hearth.question", "hearth.warden"],
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
    assertEquals(wanted(WORLD, "market"), ITEMS[0].word);
    assertEquals(wanted(WORLD, "hearth"), undefined);
  },
);

Deno.test("first light is every stone of the entry room read, and only those", () => {
  const light = quest("market.light");
  const elsewhere = WORLD.places.market.words.filter((word) => !ENTRY.includes(word));
  const most = raised(fresh(1), met([...ENTRY.slice(1), ...elsewhere]));
  assert(!complete(light, most, ctx()));
  assert(complete(light, raise(most, `met:${ENTRY[0]}`), ctx()));
  assert(complete(light, raised(fresh(1), met(ENTRY)), ctx()));
});

Deno.test("resting the spirits counts up to three, or to every word of a smaller place", () => {
  const market = quest("market.spirits");
  assertEquals(market.steps[0].hint, "Lay 3 of its spirits to rest");
  assert(!complete(market, tally(fresh(1), "rested:market", 2), ctx()));
  assert(complete(market, tally(fresh(1), "rested:market", 3), ctx()));
  assert(!complete(market, tally(fresh(1), "rested:hearth", 3), ctx()));
  assert(complete(quest("hearth.spirits"), tally(fresh(1), "rested:hearth"), ctx()));
  assert(!complete(quest("stacks.spirits"), tally(fresh(1), "rested:stacks"), ctx()));
  assert(complete(quest("stacks.spirits"), tally(fresh(1), "rested:stacks", 2), ctx()));
});

Deno.test("the errand steps from finding the asked item to handing it over", () => {
  const [asked, decoy] = ITEMS.map((item) => item.word);
  const opened = standing("market.errand", fresh(1));
  assertEquals(opened.step.hint, "Ask the keeper what they need, and find it");
  const tricked = tally(fresh(1), `gained:word:${decoy}`);
  assertEquals(standing("market.errand", tricked).step.hint, opened.step.hint);
  const found = tally(tricked, `gained:word:${asked}`);
  assertEquals(standing("market.errand", found).step.hint, "Bring it to the keeper");
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
    assertEquals(standing("market.warden", fresh(1), three).step.hint, warden.steps[0].hint);
    assertEquals(standing("market.warden", fresh(1), four).step.hint, warden.steps[1].hint);
    assert(!complete(warden, fresh(1), ctx(four)));
    const restored = raise(fresh(1), "restored:market");
    assert(complete(warden, restored, ctx(four)));
    // memory slips once the place stands restored: the quest stays done
    assert(complete(warden, restored, ctx({})));
  },
);

Deno.test("progress covers the open places only, each quest at its first unmet step", () => {
  assertEquals(Object.keys(progress(WORLD, fresh(1), ctx())), ["market"]);
  const restored = raise(fresh(1), "restored:market");
  assertEquals(Object.keys(progress(WORLD, restored, ctx())), ["market", "hearth", "stacks"]);
  const market = progress(WORLD, restored, ctx()).market;
  assertEquals(
    market.map((entry) => entry.done),
    [false, false, false, false, true],
  );
  assertEquals(market[0].step.hint, "Read every stone in the first room");
});

Deno.test(
  "settle rewards a complete quest once: the receipt, the coins, the journal's word",
  () => {
    const settled = settle(state(raised(fresh(1), met(ENTRY))), ctx());
    assertEquals(settled.effects, [
      { type: "quest", quest: "market.light", done: true },
      { type: "coins", amount: 20 },
    ]);
    assertEquals(settled.events, [{ type: "flag", flag: "rewarded:market.light" }]);
    assertEquals(settled.state.run.counters["coins+"], 20);
    assert(settled.state.run.flags.includes("rewarded:market.light"));

    const again = settle(settled.state, ctx());
    assertStrictEquals(again.state, settled.state);
    assertEquals(again.effects, []);
    assertEquals(again.events, []);
  },
);

Deno.test("the errand's reward refills the hearts; full hearts are not healed again", () => {
  const handed = raise(tally(fresh(1), `gained:word:${ITEMS[0].word}`), "errand:market");
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

Deno.test("the warden's quest pays no coins of its own, yet lands once", () => {
  const restored = settle(state(raise(fresh(1), "restored:market")), ctx());
  assertEquals(restored.effects, [{ type: "quest", quest: "market.warden", done: true }]);
  assertEquals(restored.events, [{ type: "flag", flag: "rewarded:market.warden" }]);
  assertEquals(restored.state.run.counters["coins+"], undefined);
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
    tally(raised(fresh(1), met(ENTRY)), `gained:word:${ITEMS[0].word}`),
    "errand:market",
  );
  const before = state({ ...handed, hearts: 1 });
  const copy = structuredClone(before);
  assertEquals(settle(before, ctx()).effects.length, 5);
  assertEquals(before, copy);
});
