import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { chart } from "../engine/world.js";
import { beat } from "../engine/beat.js";
import { wanted } from "../engine/quest.js";
import { converse } from "../engine/beats/talk.js";
import { HEARTS, coins, fresh, has, held, raise, tally } from "../engine/run.js";
import { mulberry } from "../engine/random.js";

const word = (id, slug, known, learning, rank, audio = null) => ({
  id,
  slug,
  ontology: "word",
  known,
  learning,
  rank,
  example: null,
  audio,
  tokens: null,
  paradigm: null,
  infinitive: null,
  tense: null,
});

const SENTENCE = {
  ...word(
    "s.compro",
    "compro-pan.sentence",
    "I buy bread",
    "Compro pan",
    10,
    "sentences/compro-pan.mp3",
  ),
  ontology: "sentence",
  tokens: [
    { form: "Compro", gloss: "I buy", literal: null, index: 0 },
    { form: "pan", gloss: "bread", literal: "w.pan", index: 1 },
  ],
};

// Market Row: six words, its nouns voiced, and a sentence to listen to. Hearth Lane: one
// interjection and one sentence never annotated, so nothing to listen to and no item.
// The Stacks: a wing of two words
const ATLAS = {
  places: {
    market: {
      words: ["w.pan", "w.queso", "w.gracias", "w.manzana", "w.dinero", "w.camisa"],
      sentences: ["s.compro"],
    },
    hearth: { words: ["w.hola"], sentences: ["s.hola"] },
    stacks: { words: ["w.libro", "w.leer"], sentences: [] },
  },
  words: Object.fromEntries(
    [
      word("w.pan", "pan.noun", "bread", "pan", 1, "words/pan.noun.mp3"),
      word("w.queso", "queso.noun", "cheese", "queso", 2, "words/queso.noun.mp3"),
      word("w.gracias", "gracias.interjection", "thank you", "gracias", 3),
      word("w.manzana", "manzana.noun", "apple", "manzana", 4, "words/manzana.noun.mp3"),
      word("w.dinero", "dinero.noun", "money", "dinero", 5, "words/dinero.noun.mp3"),
      word("w.camisa", "camisa.noun", "shirt", "camisa", 6, "words/camisa.noun.mp3"),
      word("w.hola", "hola.interjection", "hello", "hola", 7),
      word("w.libro", "libro.noun", "book", "libro", 8),
      word("w.leer", "leer.verb", "to read", "leer", 9),
      SENTENCE,
      {
        ...word("s.hola", "hola-amigo.sentence", "Hello, friend", "Hola, amigo", 11),
        ontology: "sentence",
      },
    ].map((entry) => [entry.id, entry]),
  ),
};

const WORLD = chart(7, ATLAS);

const ITEMS = WORLD.places.market.rooms.flatMap((room) => WORLD.rooms[room].items);

const KEEPER = { kind: "keeper", place: "market" };

const MEANINGS = ["I sell fish", "I buy bread", "The shirt is red", "Thank you very much"];

const QUESTION = {
  type: "asked",
  question: "¿Qué compras hoy?",
  gloss: "What are you buying today?",
  target: "w.pan",
};

const context = (due = []) => ({ world: WORLD, memory: {}, due, now: 1000, random: mulberry(3) });

// the learner on a room's entry, nothing open yet
const at = (room, run = fresh(7)) => ({
  run: { ...run, pose: { room, ...WORLD.rooms[room].entry } },
  scene: { room, spirits: [], duel: null, dialogue: null },
});

// actions through the game's one rule, with all the screen was told along the way
const play = (state, actions, ctx) =>
  actions.reduce(
    (played, action) => {
      const result = beat(played.state, action, ctx);
      return {
        state: result.state,
        effects: [...played.effects, ...result.effects],
        events: [...played.events, ...result.events],
      };
    },
    { state, effects: [], events: [] },
  );

Deno.test("the charted world holds what these tests read", () => {
  assertEquals(WORLD.order, ["market", "hearth", "stacks"]);
  assertEquals(WORLD.places.market.sentences, ["s.compro"]);
  assert(ITEMS.length >= 2);
  assert(ITEMS.every((item) => WORLD.words[item.word].audio !== null));
});

Deno.test(
  "the keeper's menu offers the errand and the question only while their quests are open",
  () => {
    const ctx = context();
    const page = (room, who, run = fresh(7)) =>
      converse(at(room, run), who, ctx).state.scene.dialogue.page;
    assertEquals(page("market.0", KEEPER), {
      kind: "menu",
      options: ["listen", "talk", "errand", "question", "leave"],
    });
    const asked = wanted(WORLD, "market");
    const answered = raise(
      raise(tally(fresh(7), `gained:word:${asked}`), "errand:market"),
      "asked:market",
    );
    assertEquals(page("market.0", KEEPER, answered).options, ["listen", "talk", "leave"]);
    // the lane's one sentence was never annotated and it has no item; a wing's keeper only talks
    assertEquals(page("hearth.0", { kind: "keeper", place: "hearth" }).options, [
      "talk",
      "question",
      "leave",
    ]);
    assertEquals(page("stacks.0", { kind: "keeper", place: "stacks" }).options, ["talk", "leave"]);
    const opening = converse(at("market.0"), KEEPER, ctx);
    assertEquals(opening.effects, []);
    assertEquals(opening.state.scene.dialogue.who, KEEPER);
  },
);

Deno.test(
  "listen: the sentence plays as it arrives, and its right meaning is a SUCCESS on it",
  () => {
    const ctx = context();
    const asking = beat(
      converse(at("market.0"), KEEPER, ctx).state,
      { type: "choose", option: "listen" },
      ctx,
    );
    assertEquals(asking.effects, [{ type: "listen", place: "market" }]);
    assertEquals(asking.state.scene.dialogue.page.awaits, "listened");
    const arrived = beat(
      asking.state,
      { type: "listened", sentence: SENTENCE, options: MEANINGS },
      ctx,
    );
    assertEquals(arrived.effects, [{ type: "audio", word: "s.compro" }]);
    assertEquals(arrived.events, [{ type: "flag", flag: "heard:market" }]);
    const right = beat(arrived.state, { type: "choose", option: "I buy bread" }, ctx);
    assertEquals(right.effects, [{ type: "review", literal: "s.compro", signal: "SUCCESS" }]);
    assertEquals(right.state.scene.dialogue.page.picked, "I buy bread");
    assertEquals(right.state.scene.dialogue.page.options, ["listen", "back"]);
    // one pick per sentence; another sentence is asked of the daemon again
    const twice = beat(right.state, { type: "choose", option: "I sell fish" }, ctx);
    assertStrictEquals(twice.state, right.state);
    assertEquals(twice.effects, []);
    assertEquals(beat(right.state, { type: "choose", option: "listen" }, ctx).effects, [
      { type: "listen", place: "market" },
    ]);
  },
);

Deno.test(
  "listen: a wrong meaning is a MISTAKE on the sentence; a sentence without audio plays nothing",
  () => {
    const ctx = context();
    const played = play(
      converse(at("market.0"), KEEPER, ctx).state,
      [
        { type: "choose", option: "listen" },
        { type: "listened", sentence: { ...SENTENCE, audio: null }, options: MEANINGS },
        { type: "choose", option: "The shirt is red" },
      ],
      ctx,
    );
    assertEquals(played.effects, [
      { type: "listen", place: "market" },
      { type: "review", literal: "s.compro", signal: "MISTAKE" },
    ]);
    assertEquals(played.state.scene.dialogue.page.picked, "The shirt is red");
  },
);

Deno.test("listen: no sentence to read is said so, with nothing played, heard or reviewed", () => {
  const ctx = context();
  const asking = beat(
    converse(at("market.0"), KEEPER, ctx).state,
    { type: "choose", option: "listen" },
    ctx,
  );
  const none = beat(asking.state, { type: "listened", sentence: null, options: [] }, ctx);
  assertEquals([none.effects, none.events], [[], []]);
  assertEquals(none.state.scene.dialogue.page, {
    kind: "listen",
    awaits: null,
    sentence: null,
    meanings: [],
    picked: null,
    options: ["back"],
  });
  assertEquals(
    beat(none.state, { type: "choose", option: "back" }, ctx).state.scene.dialogue.page.kind,
    "menu",
  );
});

Deno.test(
  "talk: the keeper's line lands on its page; heard:<place> rises the first time only",
  () => {
    const ctx = context();
    const line = { type: "heard", line: "El pan es bueno.", gloss: "The bread is good." };
    const first = play(
      converse(at("market.0"), KEEPER, ctx).state,
      [{ type: "choose", option: "talk" }, line],
      ctx,
    );
    assertEquals(first.effects, [{ type: "speak", place: "market" }]);
    assertEquals(first.events, [{ type: "flag", flag: "heard:market" }]);
    assertEquals(first.state.scene.dialogue.page, {
      kind: "talk",
      awaits: null,
      line: line.line,
      gloss: line.gloss,
      options: ["talk", "back"],
    });
    const second = play(first.state, [{ type: "choose", option: "talk" }, line], ctx);
    assertEquals(second.effects, [{ type: "speak", place: "market" }]);
    assertEquals(second.events, []);
  },
);

Deno.test("content arriving for a page no longer shown is dropped", () => {
  const ctx = context();
  const menu = converse(at("market.0"), KEEPER, ctx).state;
  const left = play(
    menu,
    [
      { type: "choose", option: "talk" },
      { type: "choose", option: "back" },
    ],
    ctx,
  );
  assertEquals(left.state.scene.dialogue.page.kind, "menu");
  const late = beat(left.state, { type: "heard", line: "Hola.", gloss: "Hello." }, ctx);
  assertStrictEquals(late.state, left.state);
  assertEquals([late.effects, late.events], [[], []]);
  const talking = beat(menu, { type: "choose", option: "talk" }, ctx).state;
  assertStrictEquals(beat(talking, QUESTION, ctx).state, talking);
  const idle = at("market.0");
  assertStrictEquals(
    beat(idle, { type: "listened", sentence: SENTENCE, options: MEANINGS }, ctx).state,
    idle,
  );
  assertStrictEquals(
    beat(idle, { type: "judged", grade: "SUCCESS", feedback: "", correction: "" }, ctx).state,
    idle,
  );
});

Deno.test(
  "an answer that failed on its way leaves the keeper quiet: nothing heard, played or reviewed, the way back open",
  () => {
    const ctx = context();
    const menu = converse(at("market.0"), KEEPER, ctx).state;
    for (const [option, type] of [
      ["talk", "heard"],
      ["listen", "listened"],
      ["question", "asked"],
    ]) {
      const waiting = beat(menu, { type: "choose", option }, ctx).state;
      const failed = beat(waiting, { type, failed: true }, ctx);
      assertEquals([failed.effects, failed.events], [[], []]);
      assertEquals(failed.state.scene.dialogue.page, {
        kind: "quiet",
        awaits: null,
        options: ["back"],
      });
      assertEquals(failed.state.run, waiting.run);
      assertEquals(
        beat(failed.state, { type: "choose", option: "back" }, ctx).state.scene.dialogue.page.kind,
        "menu",
      );
    }
    // a grade that never came: asked:<place> stays down, so the question stays open
    const replied = play(
      menu,
      [
        { type: "choose", option: "question" },
        QUESTION,
        { type: "choose", option: "reply", reply: "Compro pan" },
      ],
      ctx,
    );
    const ungraded = beat(replied.state, { type: "judged", failed: true }, ctx);
    assertEquals(ungraded.state.scene.dialogue.page.kind, "quiet");
    assertEquals([ungraded.effects, ungraded.events], [[], []]);
    // a failure for a page no longer shown is stale like any other arrival
    assertStrictEquals(beat(menu, { type: "heard", failed: true }, ctx).state, menu);
  },
);

Deno.test(
  "the errand: the asked item reviews SUCCESS, raises errand:<place> and settles a refill",
  () => {
    const ctx = context();
    const asked = wanted(WORLD, "market");
    const run = { ...tally(fresh(7), `gained:word:${asked}`), hearts: 2 };
    const errand = beat(
      converse(at("market.0", run), KEEPER, ctx).state,
      { type: "choose", option: "errand" },
      ctx,
    );
    assertEquals(errand.effects, [{ type: "audio", word: asked }]);
    assertEquals(errand.state.scene.dialogue.page, {
      kind: "errand",
      word: asked,
      handed: null,
      options: ["back"],
    });
    const handed = beat(errand.state, { type: "deliver", item: asked }, ctx);
    assertEquals(handed.effects, [
      { type: "review", literal: asked, signal: "SUCCESS" },
      { type: "quest", quest: "market.errand", done: true },
      { type: "coins", amount: 30 },
      { type: "heal", hearts: HEARTS },
    ]);
    assertEquals(handed.events, [
      { type: "flag", flag: "errand:market" },
      { type: "flag", flag: "rewarded:market.errand" },
    ]);
    assertEquals(handed.state.run.hearts, HEARTS);
    assertEquals(held(handed.state.run, `word:${asked}`), 0);
    assertEquals(handed.state.scene.dialogue.page.handed, asked);
    // done: the menu no longer offers it
    const back = beat(handed.state, { type: "choose", option: "back" }, ctx);
    assertEquals(back.state.scene.dialogue.page.options, ["listen", "talk", "question", "leave"]);
  },
);

Deno.test("a wrong item is a MISTAKE on both words, and the keeper keeps it", () => {
  const ctx = context();
  const asked = wanted(WORLD, "market");
  const decoy = ITEMS.find((item) => item.word !== asked).word;
  const run = tally(tally(fresh(7), `gained:word:${asked}`), `gained:word:${decoy}`);
  const errand = beat(
    converse(at("market.0", run), KEEPER, ctx).state,
    { type: "choose", option: "errand" },
    ctx,
  );
  const wrong = beat(errand.state, { type: "deliver", item: decoy }, ctx);
  assertEquals(wrong.effects, [
    { type: "review", literal: asked, signal: "MISTAKE" },
    { type: "review", literal: decoy, signal: "MISTAKE" },
  ]);
  assertEquals(wrong.events, []);
  assertEquals(held(wrong.state.run, `word:${decoy}`), 0);
  assert(!has(wrong.state.run, "errand:market"));
  assertEquals(wrong.state.scene.dialogue.page.handed, decoy);
  // handed is gone: it cannot be handed again, and the asked item still can
  assertStrictEquals(beat(wrong.state, { type: "deliver", item: decoy }, ctx).state, wrong.state);
  assertEquals(beat(wrong.state, { type: "deliver", item: asked }, ctx).effects[0], {
    type: "review",
    literal: asked,
    signal: "SUCCESS",
  });
  // nothing is handed away from the errand's page
  const menu = converse(at("market.0", run), KEEPER, ctx).state;
  assertStrictEquals(beat(menu, { type: "deliver", item: asked }, ctx).state, menu);
});

Deno.test("a keeper takes only what their own place strews: another place's item stays in the satchel", () => {
  const ctx = context();
  const foreign = WORLD.places.hearth.words[0];
  assert(!ITEMS.some((item) => item.word === foreign));
  const run = tally(fresh(7), `gained:word:${foreign}`);
  const errand = beat(
    converse(at("market.0", run), KEEPER, ctx).state,
    { type: "choose", option: "errand" },
    ctx,
  );
  const refused = beat(errand.state, { type: "deliver", item: foreign }, ctx);
  assertStrictEquals(refused.state, errand.state);
  assertEquals([refused.effects, refused.events], [[], []]);
  assertEquals(held(refused.state.run, `word:${foreign}`), 1);
});

Deno.test(
  "the question: the reply goes to the judge, never to a review; SUCCESS answers it",
  () => {
    const ctx = context();
    const replied = play(
      converse(at("market.0"), KEEPER, ctx).state,
      [
        { type: "choose", option: "question" },
        QUESTION,
        { type: "choose", option: "reply", reply: "   " },
        { type: "choose", option: "reply", reply: " Compro pan. " },
      ],
      ctx,
    );
    assertEquals(replied.effects, [
      { type: "ask", place: "market" },
      {
        type: "judge",
        place: "market",
        question: QUESTION.question,
        reply: "Compro pan.",
        target: "w.pan",
      },
    ]);
    const judging = replied.state.scene.dialogue.page;
    assertEquals(
      [judging.awaits, judging.reply, judging.options],
      ["judged", "Compro pan.", ["back"]],
    );

    const missed = beat(
      replied.state,
      { type: "judged", grade: "MISTAKE", feedback: "Almost.", correction: "Compro pan." },
      ctx,
    );
    assertEquals([missed.effects, missed.events], [[], []]);
    assertEquals(missed.state.scene.dialogue.page.options, ["question", "back"]);

    const passed = play(
      missed.state,
      [
        { type: "choose", option: "question" },
        QUESTION,
        { type: "choose", option: "reply", reply: "Compro pan y queso." },
        { type: "judged", grade: "SUCCESS", feedback: "Good.", correction: "" },
      ],
      ctx,
    );
    assertEquals(
      passed.effects.filter((effect) => effect.type === "review"),
      [],
    );
    assertEquals(passed.effects.slice(-2), [
      { type: "quest", quest: "market.question", done: true },
      { type: "coins", amount: 30 },
    ]);
    assertEquals(passed.events, [
      { type: "flag", flag: "asked:market" },
      { type: "flag", flag: "rewarded:market.question" },
    ]);
    assertEquals(passed.state.scene.dialogue.page.options, ["back"]);
  },
);

Deno.test("a reply graded MASTERY answers the question too; NEUTRAL and below do not", () => {
  const ctx = context();
  const judging = play(
    converse(at("market.0"), KEEPER, ctx).state,
    [
      { type: "choose", option: "question" },
      QUESTION,
      { type: "choose", option: "reply", reply: "Pan." },
    ],
    ctx,
  ).state;
  const answers = (grade) =>
    has(
      beat(judging, { type: "judged", grade, feedback: "", correction: "" }, ctx).state.run,
      "asked:market",
    );
  assertEquals(["MASTERY", "SUCCESS", "NEUTRAL", "MISTAKE", "FAILURE"].map(answers), [
    true,
    true,
    false,
    false,
    false,
  ]);
});

Deno.test("the vendor sells what the coins cover and refuses the rest", () => {
  const ctx = context();
  const shop = converse(at("hub", tally(fresh(7), "coins+", 50)), { kind: "vendor" }, ctx).state;
  assertEquals(shop.scene.dialogue.page, { kind: "shop", bought: null, options: ["leave"] });
  const lantern = beat(shop, { type: "buy", item: "lantern" }, ctx);
  assertEquals(lantern.effects, []);
  assertEquals([coins(lantern.state.run), held(lantern.state.run, "lantern")], [20, 1]);
  assertEquals(lantern.state.scene.dialogue.page.bought, "lantern");
  // twenty coins left: the charm is refused, the tea is not
  assertStrictEquals(beat(lantern.state, { type: "buy", item: "charm" }, ctx).state, lantern.state);
  const tea = beat(lantern.state, { type: "buy", item: "tea" }, ctx);
  assertEquals([coins(tea.state.run), held(tea.state.run, "tea")], [0, 1]);
  // nothing the vendor does not sell, and nothing bought away from the vendor
  assertStrictEquals(beat(shop, { type: "buy", item: "sword" }, ctx).state, shop);
  const keeper = converse(at("market.0", tally(fresh(7), "coins+", 50)), KEEPER, ctx).state;
  assertStrictEquals(beat(keeper, { type: "buy", item: "tea" }, ctx).state, keeper);
});

Deno.test("tea mends one heart up to the full; nothing else is used by hand", () => {
  const ctx = context();
  const thirsty = at("hub", { ...tally(fresh(7), "gained:tea", 2), hearts: HEARTS - 1 });
  const drunk = beat(thirsty, { type: "use", item: "tea" }, ctx);
  assertEquals(drunk.effects, [{ type: "heal", hearts: HEARTS }]);
  assertEquals([drunk.state.run.hearts, held(drunk.state.run, "tea")], [HEARTS, 1]);
  // whole again: the second cup is kept
  assertStrictEquals(beat(drunk.state, { type: "use", item: "tea" }, ctx).state, drunk.state);
  const dry = at("hub", { ...fresh(7), hearts: 1 });
  assertStrictEquals(beat(dry, { type: "use", item: "tea" }, ctx).state, dry);
  // never in a duel: a fall its answers owe is not drunk away
  const fighting = { ...thirsty, scene: { ...thirsty.scene, duel: { foe: { kind: "spirit" } } } };
  assertStrictEquals(beat(fighting, { type: "use", item: "tea" }, ctx).state, fighting);
  // the lantern and the charm are spent inside a duel
  const carried = at("hub", {
    ...tally(tally(fresh(7), "gained:lantern"), "gained:charm"),
    hearts: 1,
  });
  assertStrictEquals(beat(carried, { type: "use", item: "lantern" }, ctx).state, carried);
  assertStrictEquals(beat(carried, { type: "use", item: "charm" }, ctx).state, carried);
});

Deno.test("the shrine counts the words due and begins the pilgrim round over them", () => {
  const due = ["w.pan", "w.queso"];
  const ctx = context(due);
  const shrine = converse(at("hub"), { kind: "shrine" }, ctx).state;
  assertEquals(shrine.scene.dialogue.page, { kind: "shrine", due: 2, options: ["begin", "leave"] });
  const begun = beat(shrine, { type: "choose", option: "begin" }, ctx);
  assertEquals(begun.state.scene.dialogue, null);
  assert(begun.state.scene.duel !== null);
  assertEquals(
    begun.effects.find((effect) => effect.type === "duel"),
    { type: "duel", foe: { kind: "pilgrim", words: due } },
  );
  const quiet = converse(at("hub"), { kind: "shrine" }, context()).state;
  assertEquals(quiet.scene.dialogue.page.options, ["leave"]);
  assertStrictEquals(beat(quiet, { type: "choose", option: "begin" }, context()).state, quiet);
});

Deno.test("leave and close end a dialogue; an option the page does not offer is no choice", () => {
  const ctx = context();
  const menu = converse(at("market.0"), KEEPER, ctx).state;
  assertEquals(beat(menu, { type: "choose", option: "leave" }, ctx).state.scene.dialogue, null);
  assertEquals(beat(menu, { type: "close" }, ctx).state.scene.dialogue, null);
  assertStrictEquals(beat(menu, { type: "choose", option: "begin" }, ctx).state, menu);
  const idle = at("market.0");
  assertStrictEquals(beat(idle, { type: "close" }, ctx).state, idle);
  assertStrictEquals(beat(idle, { type: "choose", option: "talk" }, ctx).state, idle);
});
