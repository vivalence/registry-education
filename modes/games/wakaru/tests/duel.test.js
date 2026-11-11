import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { chart, enter, roam } from "../engine/world.js";
import { HEARTS, fresh, has, held, out, raise, read, tally } from "../engine/run.js";
import { mulberry } from "../engine/random.js";
import {
  CHARM,
  CLOCK,
  PAUSE,
  SWIFT,
  ask,
  expected,
  fold,
  formats,
  graded,
  judge,
} from "../engine/duel.js";
import { duel, engage } from "../engine/beats/duel.js";

const word = (id, known, learning, rank, traits = {}) => ({
  id,
  slug: `${id}.noun`,
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
  ...traits,
});

// tokens as [form, literal]; a literal of null is a token the annotator left unlinked
const sentence = (id, learning, known, rank, tokens) =>
  word(id, known, learning, rank, {
    slug: `${id}.sentence`,
    ontology: "sentence",
    tokens:
      tokens === null
        ? null
        : tokens.map(([form, literal], index) => ({ form, gloss: form, literal, index })),
  });

// a paradigm as the daemon deals it: its cells keyed as the corpus spells them, each a form
// literal of its own, and its tense the slug without the verb
const conjugation = (verb, known, rank, cells) => [
  word(`${verb}.present`, "", "", rank, {
    slug: `${verb}.present.indicative`,
    ontology: "conjugation",
    paradigm: Object.fromEntries(cells.map(([person, form]) => [person, form])),
    infinitive: verb,
    tense: "present.indicative",
  }),
  word(verb, known, verb, rank + 1, { slug: `${verb}.verb.infinitive` }),
  ...cells.map(([person, form, gloss], index) =>
    word(form, gloss, form, rank + 2 + index, { slug: `${verb}.verb.${person}` }),
  ),
];

const HABLAR = [
  ["firstSingular", "hablo", "I speak"],
  ["secondSingular", "hablas", "you speak"],
  ["thirdSingular", "habla", "she speaks"],
  ["firstPlural", "hablamos", "we speak"],
  ["secondPlural", "habláis", "you all speak"],
  ["thirdPlural", "hablan", "they speak"],
];

// as in the Brazilian corpus: no second person
const COMER = [
  ["firstSingular", "como", "I eat"],
  ["thirdSingular", "come", "she eats"],
];

const WORDS = [
  word("pan", "bread", "pan", 10, { audio: "words/pan.mp3" }),
  word("agua", "water", "agua", 11, { audio: "words/agua.mp3" }),
  word("queso", "cheese", "queso", 12),
  word("leche", "milk", "leche", 13),
  word("cafe", "coffee", "café", 14),
  word("dinero", "money", "dinero", 15),
  word("plata", "Money!", "plata", 16),
  word("tea", "tea", "té", 17),
  word("te", "you", "te", 18, { slug: "te.pronoun" }),
  word("casa", "house", "casa", 20),
  word("madre", "mother", "madre", 21),
  word("padre", "father", "padre", 22),
  word("perro", "dog", "perro", 23),
  word("mismo", "same", "mismo / misma", 24, { slug: "mismo.adjective" }),
  ...conjugation("comer", "to eat", 25, COMER),
  ...conjugation("hablar", "to speak", 30, HABLAR),
  word("quiero", "I want", "quiero", 40, { slug: "querer.verb.present.first.singular" }),
  // its "y" names a literal the atlas does not hold
  sentence("quiero-pan", "Quiero pan y agua.", "I want bread and water", 50, [
    ["Quiero", "quiero"],
    ["pan", "pan"],
    ["y", "y"],
    ["agua", "agua"],
  ]),
  sentence("cafe-leche", "Café con leche.", "Coffee with milk", 51, [
    ["Café", "cafe"],
    ["con", null],
    ["leche", "leche"],
  ]),
  sentence("pan-pan", "Pan, pan, pan.", "Bread, bread, bread", 52, [
    ["Pan", "pan"],
    ["pan", "pan"],
    ["pan", "pan"],
  ]),
  sentence("bare", "El queso es bueno.", "The cheese is good", 53, null),
];

const ATLAS = {
  places: {
    market: {
      words: ["pan", "agua", "queso", "leche", "cafe", "dinero", "plata", "tea", "te"],
      sentences: ["quiero-pan", "cafe-leche", "pan-pan", "bare"],
    },
    hearth: { words: ["casa", "madre", "padre", "perro", "mismo"], sentences: [] },
    forge: { words: ["comer.present", "hablar.present"], sentences: [] },
  },
  words: Object.fromEntries(WORDS.map((entry) => [entry.id, entry])),
};

const SEED = 7;
const WORLD = chart(SEED, ATLAS);

// a duel played beat by beat: a clock that moves only when told, dice from a seed
const arena = ({ memory = {}, due = [], run = fresh(SEED), room = "market.0", dice = 3 } = {}) => {
  const ctx = { world: WORLD, memory, due, now: 1000, random: mulberry(dice) };
  const placed = { ...run, pose: { room, ...WORLD.rooms[room].entry } };
  const game = {
    state: { run: placed, scene: enter(WORLD, placed, ctx) },
    effects: [],
    events: [],
  };
  const apply = (result) => {
    game.state = result.state;
    game.effects.push(...result.effects);
    game.events.push(...result.events);
    return result;
  };
  const act = (type, payload = {}, elapsed = 0) => {
    ctx.now += elapsed;
    return apply(duel[type](game.state, { type, ...payload }, ctx));
  };
  const meet = (foe) => apply(engage(game.state, foe, ctx));
  return { ctx, game, act, meet };
};

// what a learner who knows the answer gives, whatever the format
const knowing = (question) => {
  if (question.format === "BUILD") return [...WORLD.words[question.sentence].tokens.keys()];
  if (question.options !== null) return question.word;
  return expected(WORLD, question);
};

// what a learner who does not gives: another option, a wrong word, the order as shown
const guessing = (question) => {
  if (question.format === "BUILD") return question.order;
  if (question.options !== null) return question.options.find((option) => option !== question.word);
  return "zzzz";
};

// plays the duel out: each question answered as `answering` would (null lets the clock run out),
// each verdict read through its pause; every graded beat comes back with its question
const fight = ({ game, act, ctx }, answering, think = 3000) => {
  const rounds = [];
  while (game.state.scene.duel !== null) {
    const { question, verdict } = game.state.scene.duel;
    if (verdict !== null) {
      act("tick", {}, PAUSE);
      continue;
    }
    const value = answering(question);
    const result =
      value === null
        ? act("tick", {}, question.deadline - ctx.now)
        : act("answer", { value }, think);
    rounds.push({ question, effects: result.effects, verdict: game.state.scene.duel.verdict });
  }
  return rounds;
};

// the ctx a beat is handed, at a moment, with dice from a seed and what the learner holds
const moment = (now, dice = 1, memory = {}) => ({
  world: WORLD,
  memory,
  due: [],
  now,
  random: mulberry(dice),
});

// the question a subject is asked as in the wanted format: dice are rolled until it comes up
const posed = (subject, format, now = 1000) => {
  for (let dice = 1; dice < 200; dice += 1) {
    const question = ask(subject, moment(now, dice));
    if (question.format === format) return question;
  }
  throw new Error(`${subject.word} is never asked as ${format}`);
};

const kinds = (effects, type) => effects.filter((effect) => effect.type === type);

Deno.test("the ladder: a word's status picks its rung, its traits narrow it", () => {
  const rung = (word, status, place = "market") =>
    formats(WORLD, { word, place, status }).map((entry) => entry.format);
  assertEquals(rung("pan", "UNTOUCHED"), ["PICK", "LISTEN"]);
  assertEquals(rung("pan", "UNKNOWN"), ["PICK", "LISTEN"]);
  assertEquals(rung("queso", "UNTOUCHED"), ["PICK"]);
  assertEquals(rung("pan", "LEARNING"), ["PICK", "CLOZE", "LISTEN"]);
  assertEquals(rung("leche", "LEARNING"), ["PICK", "CLOZE"]);
  assertEquals(rung("pan", "KNOWN"), ["TYPE", "CLOZE", "BUILD"]);
  assertEquals(rung("pan", "GRADUATED"), ["TYPE", "CLOZE", "BUILD"]);
  assertEquals(rung("queso", "KNOWN"), ["TYPE"]);
  assertEquals(rung("casa", "GRADUATED", "hearth"), ["TYPE"]);
  for (const status of ["UNTOUCHED", "LEARNING", "GRADUATED"])
    assertEquals(rung("hablar.present", status, "forge"), ["CONJUGATE"]);
});

Deno.test(
  "a cloze blanks the word's one use: picked among words, or typed as the sentence has it",
  () => {
    const picked = posed({ word: "pan", place: "market", status: "LEARNING" }, "CLOZE");
    assertEquals([picked.sentence, picked.blank, picked.recall], ["quiero-pan", 1, "learning"]);
    assert(picked.options.includes("pan"));
    const written = posed({ word: "cafe", place: "market", status: "KNOWN" }, "CLOZE");
    assertEquals([written.sentence, written.blank, written.options], ["cafe-leche", 0, null]);
    assertEquals(expected(WORLD, written), "Café");
    const at = moment(written.asked + 1000);
    assertEquals(judge(written, "café", at).reviews, [{ literal: "cafe", signal: "MASTERY" }]);
  },
);

Deno.test("options: the word and three others of its place, no two folding alike", () => {
  for (let dice = 1; dice <= 40; dice += 1) {
    const ctx = moment(0, dice);
    const recognised = ask({ word: "dinero", place: "market", status: "UNTOUCHED" }, ctx);
    const recalled = ask({ word: "tea", place: "market", status: "LEARNING" }, ctx);
    assertEquals([recognised.recall, recalled.recall], ["known", "learning"]);
    for (const question of [recognised, recalled]) {
      assertEquals(question.format, "PICK");
      assertEquals(question.options.length, 4);
      assert(question.options.includes(question.word));
      assert(question.options.every((option) => WORLD.places.market.words.includes(option)));
      const texts = question.options.map((option) => fold(WORLD.words[option][question.recall]));
      assertEquals(new Set(texts).size, 4);
    }
    assert(!recognised.options.includes("plata"), "Money! folds as money");
    assert(!recalled.options.includes("te"), "te folds as té");
  }
});

Deno.test("a pick: right is SUCCESS, swift is MASTERY, wrong is a MISTAKE on both words", () => {
  const question = posed({ word: "queso", place: "market", status: "UNTOUCHED" }, "PICK");
  const at = (elapsed) => moment(question.asked + elapsed);
  const wrong = question.options.find((option) => option !== "queso");
  assertEquals(judge(question, "queso", at(Math.floor(CLOCK.PICK * SWIFT))), {
    right: true,
    signal: "MASTERY",
    value: "queso",
    reviews: [{ literal: "queso", signal: "MASTERY" }],
  });
  assertEquals(judge(question, "queso", at(Math.ceil(CLOCK.PICK * SWIFT))).signal, "SUCCESS");
  assertEquals(judge(question, wrong, at(500)), {
    right: false,
    signal: "MISTAKE",
    value: wrong,
    reviews: [
      { literal: "queso", signal: "MISTAKE" },
      { literal: wrong, signal: "MISTAKE" },
    ],
  });
});

Deno.test("typing forgives case and punctuation; accents or one slipped letter are NEUTRAL", () => {
  const spell = (word, value, place = "market") => {
    const question = posed({ word, place, status: "KNOWN" }, "TYPE");
    return judge(question, value, moment(question.asked + 9000));
  };
  assertEquals(fold("  Niño! "), "nino");
  assertEquals(spell("cafe", "¡CAFÉ!").signal, "SUCCESS");
  assertEquals(spell("cafe", "cafe"), {
    right: true,
    signal: "NEUTRAL",
    value: "cafe",
    reviews: [{ literal: "cafe", signal: "NEUTRAL" }],
  });
  assertEquals(spell("queso", "qeso").signal, "NEUTRAL");
  assertEquals(spell("queso", "quesos").signal, "NEUTRAL");
  assertEquals(spell("queso", "qesos").signal, "MISTAKE");
  assertEquals(spell("pan", "pon").signal, "MISTAKE", "one letter in a short word is another word");
  assertEquals(spell("mismo", "misma", "hearth").signal, "SUCCESS");
  assertEquals(spell("mismo", "Mismo / misma", "hearth").signal, "SUCCESS");
  assertEquals(spell("mismo", "mesmo", "hearth").signal, "NEUTRAL");
  assertEquals(spell("pan", "  ").signal, "FAILURE");
});

Deno.test(
  "a conjugation drills its weakest form and reviews it; a slip is the wrong person",
  () => {
    const subject = { word: "hablar.present", place: "forge", status: "KNOWN" };
    const paradigm = WORLD.words["hablar.present"].paradigm;
    const held = Object.fromEntries(Object.values(paradigm).map((form) => [form, "KNOWN"]));
    const shaky = { ...held, habláis: "UNKNOWN" };
    for (let dice = 1; dice <= 10; dice += 1)
      assertEquals(ask(subject, moment(1000, dice, shaky)).person, "secondPlural");
    const untouched = Array.from(
      { length: 20 },
      (_, dice) => ask(subject, moment(1000, dice)).person,
    );
    assert(new Set(untouched).size > 1, "a tie among the weakest is drawn");
    const question = posed(subject, "CONJUGATE");
    assertEquals(question.form, paradigm[question.person]);
    assertEquals([question.options, graded(question)], [null, question.form]);
    const cell = (person) => ({ ...question, person, form: paradigm[person] });
    const at = moment(question.asked + 6000);
    assertEquals(judge(cell("firstSingular"), "HABLO", at).reviews, [
      { literal: "hablo", signal: "SUCCESS" },
    ]);
    assertEquals(judge(cell("firstSingular"), "habla", at).signal, "MISTAKE");
    assertEquals(judge(cell("secondPlural"), "hablais", at).signal, "NEUTRAL");
  },
);

Deno.test(
  "a build is shown out of order; it reviews the sentence, then each known word by where it landed",
  () => {
    const subject = { word: "pan", place: "market", status: "KNOWN" };
    const builds = Array.from({ length: 60 }, (_, dice) => ask(subject, moment(1000, dice))).filter(
      (question) => question.format === "BUILD",
    );
    assert(builds.length > 5);
    for (const question of builds) {
      assertEquals(question.sentence, "quiero-pan", "pan-pan has no order to find");
      assertEquals(question.order.toSorted(), [0, 1, 2, 3]);
      assertNotEquals(question.order, [0, 1, 2, 3]);
    }
    const turned = ask(subject, { ...moment(1000), random: () => 0.999 });
    assertEquals(
      [turned.format, turned.order],
      ["BUILD", [1, 2, 3, 0]],
      "a shuffle in order turns",
    );
    const at = (elapsed) => moment(turned.asked + elapsed);
    assertEquals(judge(turned, [0, 1, 2, 3], at(1000)).reviews, [
      { literal: "quiero-pan", signal: "MASTERY" },
      { literal: "quiero", signal: "SUCCESS" },
      { literal: "pan", signal: "SUCCESS" },
      { literal: "agua", signal: "SUCCESS" },
    ]);
    assertEquals(judge(turned, [1, 0, 2, 3], at(9000)).reviews, [
      { literal: "quiero-pan", signal: "MISTAKE" },
      { literal: "quiero", signal: "MISTAKE" },
      { literal: "pan", signal: "MISTAKE" },
      { literal: "agua", signal: "SUCCESS" },
    ]);
  },
);

Deno.test("timed out or left blank is a FAILURE on the literal the question grades", () => {
  const at = moment(2000);
  const typed = posed({ word: "casa", place: "hearth", status: "KNOWN" }, "TYPE");
  const built = posed({ word: "pan", place: "market", status: "KNOWN" }, "BUILD");
  const conjugated = posed(
    { word: "hablar.present", place: "forge", status: "KNOWN" },
    "CONJUGATE",
  );
  assertEquals(judge(typed, null, at).reviews, [{ literal: "casa", signal: "FAILURE" }]);
  assertEquals(judge(typed, " ", at).right, false);
  assertEquals(judge(built, [], at).reviews, [{ literal: "quiero-pan", signal: "FAILURE" }]);
  assertEquals(judge(conjugated, null, at).reviews, [
    { literal: conjugated.form, signal: "FAILURE" },
  ]);
});

Deno.test("each format runs on its own clock", () => {
  const subjects = {
    PICK: { word: "queso", place: "market", status: "UNTOUCHED" },
    LISTEN: { word: "pan", place: "market", status: "UNTOUCHED" },
    CLOZE: { word: "pan", place: "market", status: "LEARNING" },
    TYPE: { word: "casa", place: "hearth", status: "KNOWN" },
    BUILD: { word: "pan", place: "market", status: "KNOWN" },
    CONJUGATE: { word: "hablar.present", place: "forge", status: "KNOWN" },
  };
  for (const [format, subject] of Object.entries(subjects)) {
    const question = posed(subject, format, 5000);
    assertEquals([question.asked, question.deadline], [5000, 5000 + CLOCK[format]]);
  }
  assertEquals(CLOCK, {
    PICK: 7000,
    LISTEN: 9000,
    CLOZE: 10000,
    TYPE: 14000,
    BUILD: 18000,
    CONJUGATE: 14000,
  });
});

Deno.test("a word to be heard is played as it is asked", () => {
  let heard = 0;
  for (let dice = 1; dice <= 20; dice += 1) {
    const { game, meet } = arena({ due: ["pan"], room: WORLD.home.pan, dice });
    const { effects } = meet({ kind: "spirit", word: "pan" });
    const listening = game.state.scene.duel.question.format === "LISTEN";
    heard += listening ? 1 : 0;
    assertEquals(effects, [
      { type: "duel", foe: { kind: "spirit", word: "pan" } },
      ...(listening ? [{ type: "audio", word: "pan" }] : []),
    ]);
  }
  assert(heard > 0);
});

Deno.test("a spirit is its word: it asks nothing else, and one right answer lays it to rest", () => {
  const { game, act, meet } = arena({ due: ["queso"], room: WORLD.home.queso });
  assert(game.state.scene.spirits.some((spirit) => spirit.word === "queso"));
  meet({ kind: "spirit", word: "queso" });
  const first = game.state.scene.duel.question;
  assertEquals([first.word, first.format, game.state.scene.duel.vigor], ["queso", "PICK", 1]);
  assertEquals(first.seen, undefined);
  assertEquals(act("answer", { value: "queso" }, 3000).effects, [
    { type: "review", literal: "queso", signal: "SUCCESS" },
    { type: "strike" },
  ]);
  assertEquals(act("answer", { value: "queso" }, 10).effects, [], "one answer to a question");
  assertEquals(act("tick", {}, PAUSE - 11).effects, []);
  assertEquals(game.state.scene.duel.question, first, "the verdict holds through its pause");
  assertEquals(act("tick", {}, 1).effects, [
    { type: "rested", word: "queso" },
    { type: "coins", amount: 5 },
  ]);
  const { run, scene } = game.state;
  assertEquals(scene.duel, null);
  assert(!scene.spirits.some((spirit) => spirit.word === "queso"));
  assertEquals([read(run, "rested:market"), read(run, "coins+"), read(run, "right")], [1, 5, 1]);
  assertEquals(game.events, []);
});

Deno.test(
  "a word asked again in one duel had its answer shown: it comes back seen, and right reviews NEUTRAL",
  () => {
    const { game, act, meet } = arena({ due: ["queso"], room: WORLD.home.queso });
    meet({ kind: "spirit", word: "queso" });
    const first = game.state.scene.duel.question;
    const wrong = first.options.find((option) => option !== "queso");
    assert(act("answer", { value: wrong }, 3000).effects.some((effect) => effect.type === "hurt"));
    act("tick", {}, PAUSE);
    const again = game.state.scene.duel.question;
    assertEquals([again.word, again.seen], ["queso", true]);
    assertEquals(act("answer", { value: "queso" }, 3000).effects, [
      { type: "review", literal: "queso", signal: "NEUTRAL" },
      { type: "strike" },
    ]);
    assertEquals(act("tick", {}, PAUSE).effects, [
      { type: "rested", word: "queso" },
      { type: "coins", amount: 5 },
    ]);
    assertEquals([read(game.state.run, "right"), read(game.state.run, "wrong")], [1, 1]);
  },
);

Deno.test("a warden asks for production, weakest word first, and restores its place once", () => {
  const memory = { pan: "KNOWN", agua: "KNOWN", queso: "LEARNING" };
  const fighter = arena({ memory, room: WORLD.places.market.lair });
  fighter.meet({ kind: "warden", place: "market" });
  assertEquals(fighter.game.state.scene.duel.vigor, 5);
  const rounds = fight(fighter, knowing);
  const asked = rounds.map((round) => round.question);
  assertEquals(
    asked.map((question) => question.word),
    ["leche", "cafe", "dinero", "plata", "tea"],
  );
  assert(asked.every((question) => ["TYPE", "CLOZE", "BUILD"].includes(question.format)));
  assert(asked.every((question) => question.options === null));
  const { game } = fighter;
  assert(has(game.state.run, "restored:market"));
  assertEquals(game.events, [{ type: "flag", flag: "restored:market" }]);
  assertEquals(game.effects.slice(-2), [
    { type: "restored", place: "market" },
    { type: "coins", amount: 50 },
  ]);
  fighter.meet({ kind: "warden", place: "market" });
  fight(fighter, knowing);
  assertEquals([read(game.state.run, "coins+"), game.events.length], [50, 1], "restored once");
});

Deno.test("the forge's warden asks first the paradigm whose weakest form is weakest", () => {
  const fighter = arena({
    memory: { como: "KNOWN", come: "KNOWN" },
    room: WORLD.places.forge.lair,
  });
  fighter.meet({ kind: "warden", place: "forge" });
  assertEquals(fighter.game.state.scene.duel.vigor, 2);
  const asked = fight(fighter, knowing).map((round) => round.question);
  assertEquals(
    asked.map((question) => question.word),
    ["hablar.present", "comer.present"],
    "comer is the more frequent, hablar the less held",
  );
  assert(asked.every((question) => question.format === "CONJUGATE"));
  assert(has(fighter.game.state.run, "restored:forge"));
});

Deno.test(
  "the summit asks over every restored place and crowns once; none restored, no summit",
  () => {
    const unwoken = arena({ room: "hub" });
    assertEquals(unwoken.meet({ kind: "summit" }).effects, []);
    assertEquals(unwoken.game.state.scene.duel, null);
    const run = raise(raise(fresh(SEED), "restored:market"), "restored:hearth");
    const memory = Object.fromEntries(WORLD.places.market.words.map((word) => [word, "KNOWN"]));
    const fighter = arena({ run, memory, room: "hub" });
    fighter.meet({ kind: "summit" });
    assertEquals(fighter.game.state.scene.duel.vigor, 8);
    const asked = fight(fighter, knowing).map((round) => round.question);
    assertEquals(
      asked.map((question) => question.word),
      ["casa", "madre", "padre", "perro", "mismo", "pan", "agua", "queso"],
    );
    assert(asked.every((question) => question.options === null));
    assertEquals(fighter.game.events, [{ type: "flag", flag: "crowned" }]);
    assertEquals(fighter.game.effects.slice(-2), [
      { type: "crowned" },
      { type: "coins", amount: 200 },
    ]);
  },
);

Deno.test(
  "a pilgrim asks each due word once, costs no heart, and pays for each right answer",
  () => {
    const words = ["queso", "ghost", "casa", "hablar.present"];
    const pilgrim = arena({ due: words, room: "hub" });
    pilgrim.meet({ kind: "pilgrim", words });
    assertEquals(pilgrim.game.state.scene.duel.vigor, 3, "ghost is held by no place");
    const answers = { queso: knowing, casa: guessing, "hablar.present": knowing };
    const rounds = fight(pilgrim, (question) => answers[question.word](question));
    assertEquals(
      rounds.map((round) => round.question.word),
      ["queso", "casa", "hablar.present"],
    );
    const { run } = pilgrim.game.state;
    assertEquals(run.hearts, HEARTS);
    assertEquals(kinds(pilgrim.game.effects, "hurt"), []);
    assertEquals(kinds(pilgrim.game.effects, "rested"), []);
    assertEquals(kinds(pilgrim.game.effects, "coins"), [
      { type: "coins", amount: 2 },
      { type: "coins", amount: 2 },
    ]);
    assertEquals([read(run, "right"), read(run, "wrong"), read(run, "coins+")], [2, 1, 4]);
    assertEquals(pilgrim.game.state.scene.duel, null);
    assertEquals(arena({ room: "hub" }).meet({ kind: "pilgrim", words: ["ghost"] }).effects, []);
  },
);

Deno.test("a miss costs a heart; none left wakes the learner whole at the place's entry", () => {
  const spirit = arena({ due: ["queso"], room: WORLD.home.queso });
  spirit.meet({ kind: "spirit", word: "queso" });
  fight(spirit, guessing);
  const { run, scene } = spirit.game.state;
  assertEquals(kinds(spirit.game.effects, "hurt").length, HEARTS);
  assertEquals(spirit.game.effects.at(-1), { type: "fallen" });
  assertEquals([run.hearts, read(run, "falls"), read(run, "wrong")], [HEARTS, 1, HEARTS]);
  assertEquals(run.pose, { room: "market.0", ...WORLD.rooms["market.0"].entry });
  assertEquals([scene.room, scene.duel], ["market.0", null]);

  const summit = arena({ run: raise(fresh(SEED), "restored:hearth"), room: "hub" });
  summit.meet({ kind: "summit" });
  fight(summit, () => null);
  assertEquals(summit.game.state.run.pose, { room: "hub", ...WORLD.rooms.hub.entry });
  assertEquals(read(summit.game.state.run, "falls"), 1);
});

Deno.test("every graded answer reviews the literal it grades, the clock's FAILURE too", () => {
  const random = mulberry(5);
  const wavering = (question) =>
    [knowing, guessing, () => null][Math.floor(random() * 3)](question);
  const memory = { pan: "KNOWN", leche: "KNOWN", cafe: "LEARNING" };
  const fighter = arena({ memory, due: ["queso"], room: WORLD.places.market.lair, dice: 13 });
  const rounds = [];
  for (const foe of [
    { kind: "warden", place: "market" },
    { kind: "pilgrim", words: ["pan", "cafe", "casa", "hablar.present"] },
    { kind: "warden", place: "forge" },
  ]) {
    fighter.meet(foe);
    rounds.push(...fight(fighter, wavering));
  }
  assert(rounds.length > 10);
  assert(new Set(rounds.map((round) => round.verdict.signal)).size >= 3);
  for (const { question, effects, verdict } of rounds) {
    const [review] = kinds(effects, "review");
    assertEquals(review, { type: "review", literal: graded(question), signal: verdict.signal });
  }
});

Deno.test("time away never runs a duel's clock: a resume shifts it, and the pause with it", () => {
  const { game, act, meet } = arena({ due: ["queso"], room: WORLD.home.queso });
  meet({ kind: "spirit", word: "queso" });
  const asked = game.state.scene.duel.question;
  assertEquals(act("resume", { away: 60000 }, 60000).effects, []);
  assertEquals(game.state.scene.duel.question.deadline, asked.deadline + 60000);
  assertEquals(act("tick", {}, 100).effects, []);
  assertEquals(game.state.run.hearts, HEARTS);
  const wrong = asked.options.find((option) => option !== "queso");
  assertEquals(act("answer", { value: wrong }, 200).effects[0].signal, "MISTAKE");
  const until = game.state.scene.duel.verdict.until;
  act("resume", { away: 5000 }, 5000);
  assertEquals(game.state.scene.duel.verdict.until, until + 5000);
  assertEquals(act("tick", {}, PAUSE - 1).effects, []);
  act("tick", {}, 1);
  const next = game.state.scene.duel.question;
  const lapsed = act("tick", {}, CLOCK[next.format]);
  assertEquals(lapsed.effects, [
    { type: "review", literal: graded(next), signal: "FAILURE" },
    { type: "hurt" },
  ]);
});

Deno.test(
  "a lantern lights a typed question's first letter, once; a lit right answer is a peek",
  () => {
    const run = tally(fresh(SEED), "gained:lantern", 2);
    const { game, act, meet } = arena({ run, room: WORLD.places.hearth.lair });
    meet({ kind: "warden", place: "hearth" });
    const first = game.state.scene.duel.question;
    assertEquals([first.word, first.format, "hint" in first], ["casa", "TYPE", false]);
    act("light");
    assertEquals(game.state.scene.duel.question.hint, "c");
    assertEquals(held(game.state.run, "lantern"), 1);
    const lit = game.state;
    act("light");
    assertEquals(game.state, lit, "a question is lit once");
    assertEquals(act("answer", { value: "casa" }, 1000).effects, [
      { type: "review", literal: "casa", signal: "NEUTRAL" },
      { type: "strike" },
    ]);
    act("tick", {}, PAUSE);
    act("light");
    assertEquals(act("answer", { value: "zzzz" }, 1000).effects, [
      { type: "review", literal: "madre", signal: "MISTAKE" },
      { type: "hurt" },
    ]);
    act("tick", {}, PAUSE);
    assertEquals(held(game.state.run, "lantern"), 0);
    const dark = game.state;
    act("light");
    assertEquals(game.state, dark, "no lantern left");

    const picking = arena({ run, due: ["queso"], room: WORLD.home.queso });
    picking.meet({ kind: "spirit", word: "queso" });
    const unlit = picking.game.state;
    picking.act("light");
    assertEquals(picking.game.state, unlit, "a pick takes no lantern");
  },
);

Deno.test("a charm, once a duel, lends the question up and every later one its time", () => {
  const run = tally(fresh(SEED), "gained:charm", 2);
  const { game, act, meet } = arena({ run, room: WORLD.places.hearth.lair });
  meet({ kind: "warden", place: "hearth" });
  const first = game.state.scene.duel.question;
  act("charm");
  assertEquals(game.state.scene.duel.question.deadline, first.deadline + CHARM);
  assertEquals([read(game.state.run, "used:charm"), held(game.state.run, "charm")], [1, 1]);
  const charmed = game.state;
  act("charm");
  assertEquals(game.state, charmed, "once a duel");
  const late = act("answer", { value: knowing(first) }, Math.ceil(CLOCK[first.format] * SWIFT));
  assertEquals(late.effects[0].signal, "SUCCESS", "a charm buys time, never mastery");
  act("tick", {}, PAUSE);
  const second = game.state.scene.duel.question;
  assertEquals(second.deadline - second.asked, CLOCK[second.format] + CHARM);

  const bare = arena({ due: ["queso"], room: WORLD.home.queso });
  bare.meet({ kind: "spirit", word: "queso" });
  const before = bare.game.state;
  bare.act("charm");
  assertEquals(bare.game.state, before, "no charm held");
});

Deno.test(
  "outside a duel a tick is the spirits' roam, and nothing else of the duel's moves",
  () => {
    const { game, ctx } = arena({ due: ["queso", "agua"], room: WORLD.home.queso });
    const state = game.state;
    assertEquals(
      duel.tick(state, { type: "tick" }, { ...ctx, random: mulberry(9) }),
      out(roam(state, { ...ctx, random: mulberry(9) })),
    );
    for (const type of ["answer", "resume", "light", "charm"])
      assertEquals(duel[type](state, { type, value: "queso", away: 500 }, ctx), {
        state,
        effects: [],
        events: [],
      });
  },
);

Deno.test(
  "a duel replays: the same answers under the same clock and dice land the same state",
  () => {
    const play = () => {
      const random = mulberry(4);
      const wavering = (question) =>
        [knowing, guessing, () => null][Math.floor(random() * 3)](question);
      const fighter = arena({ memory: { pan: "KNOWN" }, room: WORLD.places.market.lair, dice: 21 });
      fighter.meet({ kind: "warden", place: "market" });
      fight(fighter, wavering);
      return fighter.game;
    };
    assertEquals(play(), play());
  },
);
