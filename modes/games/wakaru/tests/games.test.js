import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { HEARTS, fresh, has, held, out, read } from "../engine/run.js";
import { mulberry } from "../engine/random.js";
import { SWIFT, fold } from "../engine/duel.js";
import { GAMES, games } from "../engine/games/index.js";
import { CHOICES } from "../engine/games/question.js";
import { CATCH, HOOK, WAIT } from "../engine/games/fishing.js";
import { CHARM, CLOCK } from "../engine/games/swarm.js";

const SEED = 7;

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

const WORDS = [
  word("pan", "bread", "pan", 10, {
    audio: "words/pan.mp3",
    example: { known: "I want bread.", learning: "Quiero pan." },
  }),
  word("agua", "water", "agua", 11, { audio: "words/agua.mp3" }),
  word("queso", "cheese", "queso", 12),
  word("leche", "milk", "leche", 13),
  word("dinero", "money", "dinero", 14),
  word("plata", "Money!", "plata", 15),
  word("tea", "tea", "té", 16),
  word("te", "you", "te", 17, { slug: "te.pronoun" }),
  // a word the corpus never translated reads on neither side
  word("nada", "", "", 18),
  word("quiero", "I want", "quiero", 40),
  sentence("quiero-pan", "Quiero pan y agua.", "I want bread and water", 50, [
    ["Quiero", "quiero"],
    ["pan", "pan"],
    ["y", null],
    ["agua", "agua"],
  ]),
  sentence("pan-pan", "Pan, pan, pan.", "Bread, bread, bread", 51, [
    ["Pan", "pan"],
    ["pan", "pan"],
    ["pan", "pan"],
  ]),
  sentence("pan-si", "Pan, sí.", "Bread, yes", 52, [
    ["Pan", "pan"],
    ["sí", null],
  ]),
  sentence("con-leche", "Con leche.", "With milk", 53, [
    ["Con", null],
    ["leche", "leche"],
  ]),
  sentence("bare", "El queso es bueno.", "The cheese is good", 54, null),
  // the forge's kind of word: a paradigm reads on neither side, its forms do
  word("hablar.present", "", "", 60, {
    slug: "hablar.present.indicative",
    ontology: "conjugation",
    paradigm: { firstSingular: "hablo", thirdSingular: "habla" },
    infinitive: "hablar",
    tense: "present.indicative",
  }),
  word("hablar", "to speak", "hablar", 61),
  word("hablo", "I speak", "hablo", 62),
  word("habla", "she speaks", "habla", 63),
];

const map = (id, place) => ({
  id,
  name: id,
  kind: "outdoor",
  place,
  dark: false,
  rows: ["~~~~~~~~", "........", "........"],
  spawns: { entry: { x: 1, y: 1, facing: "north" } },
  portals: [],
  fixtures: [],
  chests: [],
  pots: [],
  stones: [],
  items: [],
  spawnPoints: [],
});

// a world as WORLD charts it, cut down to what the games read
const WORLD = {
  seed: SEED,
  maps: {
    market: map("market", "market"),
    forge: map("forge", "forge"),
    square: map("square", null),
  },
  places: {
    market: {
      id: "market",
      name: "Market Row",
      biome: "market",
      words: ["pan", "agua", "queso", "leche", "dinero", "plata", "tea", "te", "nada"],
      sentences: ["quiero-pan", "pan-pan", "pan-si", "con-leche", "bare"],
      maps: ["market"],
      home: "market",
      signature: "pan",
    },
    forge: {
      id: "forge",
      name: "The Forge",
      biome: "ember",
      words: ["hablar.present"],
      sentences: [],
      maps: ["forge"],
      home: "forge",
      signature: "hablar.present",
    },
  },
  words: Object.fromEntries(WORDS.map((entry) => [entry.id, entry])),
  order: ["market", "forge"],
};

const SPOT = { x: 1, y: 0 };
const HAUNT = { kind: "haunt", x: 3, y: 2 };

const spirit = (word, x) => ({
  word,
  x,
  y: 2,
  facing: "south",
  home: { x, y: 2 },
  mode: "roam",
  next: 0,
});

// gathered, they pair as pan · agua · queso · dinero · leche: nada reads on neither side, plata
// folds as dinero's money, and tea comes sixth
const HAUNTED = ["pan", "agua", "nada", "queso", "dinero", "plata", "leche", "tea"].map(spirit);

// a learner standing on a map with nothing open, as the walk leaves them before a game
const standing = ({ map = "market", flags = [], counters = {}, spirits = [] } = {}) => {
  const run = fresh(SEED);
  return {
    run: {
      ...run,
      flags,
      counters: { ...run.counters, ...counters },
      pose: { map, x: 1, y: 1, facing: "north" },
    },
    scene: { spirits, duel: null, dialogue: null, game: null },
  };
};

// a game played beat by beat as the screen plays it: a clock that moves only when told, dice from
// a seed, every effect and event kept
const table = ({ state = standing(), due = [], dice = 3 } = {}) => {
  const ctx = { world: WORLD, memory: {}, due, now: 1000, random: mulberry(dice) };
  const kept = { state, effects: [], events: [] };
  const apply = (result) => {
    kept.state = result.state;
    kept.effects.push(...result.effects);
    kept.events.push(...result.events);
    return result;
  };
  const rules = () => GAMES[kept.state.scene.game.kind];
  return {
    ctx,
    kept,
    game: () => kept.state.scene.game,
    open: (kind, args) => apply(GAMES[kind].start(kept.state, args, ctx)),
    move: (move, elapsed = 0) => {
      ctx.now += elapsed;
      return apply(games.play(kept.state, { type: "play", move }, ctx));
    },
    tick: (elapsed = 0) => {
      ctx.now += elapsed;
      return apply(rules().tick(kept.state, ctx));
    },
    shift: (away) => apply(rules().shift(kept.state, away)),
    quit: () => apply(games.quit(kept.state)),
  };
};

const kinds = (effects, type) => effects.filter((effect) => effect.type === type);

const reviews = (effects) =>
  kinds(effects, "review").map(({ literal, signal }) => ({ literal, signal }));

Deno.test(
  "the seam: three kinds answer start · play · tick · shift · quit; with no game up, play and quit change nothing",
  () => {
    assertEquals(Object.keys(GAMES), ["trial", "fishing", "swarm"]);
    for (const rules of Object.values(GAMES))
      assertEquals(Object.keys(rules), ["start", "play", "tick", "shift", "quit"]);
    const state = standing();
    const ctx = { world: WORLD, memory: {}, due: [], now: 0, random: mulberry(1) };
    assertEquals(games.play(state, { type: "play", move: { next: true } }, ctx), out(state));
    assertEquals(games.quit(state), out(state));
  },
);

Deno.test(
  "a stone read before shows its card again: its voice heard, nothing asked, nothing reviewed",
  () => {
    const { kept, game, open, move } = table({ state: standing({ flags: ["met:pan"] }) });
    const opened = open("trial", { word: "pan" });
    assertEquals(opened.effects, [
      { type: "game", kind: "trial" },
      { type: "audio", word: "pan" },
    ]);
    assertEquals(game(), {
      kind: "trial",
      word: "pan",
      fresh: false,
      phase: "card",
      checks: [],
      question: null,
      verdict: null,
    });
    move({ answer: "pan" });
    assertEquals(game().phase, "card", "a card takes no answer");
    move({ next: true });
    assertEquals(game(), null);
    assertEquals(reviews(kept.effects), []);
    assertEquals(kept.events, []);
    assertEquals([kept.state.run.flags, read(kept.state.run, "coins+")], [["met:pan"], 0]);
  },
);

Deno.test(
  "a stone not yet read: its card, its meaning among three, a sentence of it built — the last answer lights it",
  () => {
    const { ctx, kept, game, open, move } = table();
    const opened = open("trial", { word: "pan" });
    assertEquals(opened.effects, [
      { type: "game", kind: "trial" },
      { type: "audio", word: "pan" },
    ]);
    assertEquals(
      game().checks.map((check) => check.format),
      ["PICK", "BUILD"],
    );
    move({ answer: "pan" });
    assertEquals(game().phase, "card", "a card takes no answer");

    move({ next: true }, 4000);
    const pick = game().question;
    assertEquals(
      [game().phase, pick.format, pick.recall, pick.asked],
      ["asking", "PICK", "known", ctx.now],
    );
    move({ next: true });
    assertEquals(game().phase, "asking", "a check is answered, never skipped");
    const first = move({ answer: "pan" }, 900);
    assertEquals(
      reviews(first.effects),
      [{ literal: "pan", signal: "SUCCESS" }],
      "no clock, no MASTERY",
    );
    assertEquals([game().phase, game().verdict.right], ["answered", true]);
    assert(!has(kept.state.run, "met:pan"), "a check is still to come");

    move({ next: true });
    const build = game().question;
    assertEquals([build.format, build.sentence, build.options], ["BUILD", "quiero-pan", null]);
    assertNotEquals(build.order, [0, 1, 2, 3]);
    assertEquals(build.order.toSorted(), [0, 1, 2, 3]);
    const second = move({ answer: [0, 1, 2, 3] }, 1000);
    assertEquals(
      reviews(second.effects),
      [
        { literal: "quiero-pan", signal: "MASTERY" },
        { literal: "quiero", signal: "SUCCESS" },
        { literal: "pan", signal: "SUCCESS" },
        { literal: "agua", signal: "SUCCESS" },
      ],
      "graded as the duel grades a build",
    );
    assertEquals(kinds(second.effects, "met"), [{ type: "met", word: "pan" }]);
    assertEquals(kinds(second.effects, "coins"), [{ type: "coins", amount: 1 }]);
    assertEquals(second.events, [{ type: "flag", flag: "met:pan" }]);
    const { run } = kept.state;
    assert(has(run, "met:pan"));
    assertEquals(
      [read(run, "coins+"), read(run, "right"), read(run, "wrong"), run.hearts],
      [1, 2, 0, HEARTS],
    );
    move({ next: true });
    assertEquals(game(), null);
  },
);

Deno.test(
  "a trial's meaning is asked among three of its place: none blank, no two alike once folded",
  () => {
    for (let dice = 1; dice <= 40; dice += 1) {
      const { game, open, move } = table({ dice });
      open("trial", { word: "dinero" });
      move({ next: true });
      const { options } = game().question;
      assertEquals([options.length, CHOICES], [3, 3]);
      assert(options.includes("dinero"));
      assert(options.every((option) => WORLD.places.market.words.includes(option)));
      const meanings = options.map((option) => fold(WORLD.words[option].known));
      assertEquals(new Set(meanings).size, CHOICES);
      assert(!meanings.includes(""), "nada reads as nothing");
      assert(!options.includes("plata"), "Money! folds as money");
    }
  },
);

Deno.test(
  "a trial's first pick is its graded one: a miss is a MISTAKE on both words, shows the right one, and still passes",
  () => {
    const { kept, game, open, move } = table();
    open("trial", { word: "queso" });
    assertEquals(
      game().checks.map((check) => check.format),
      ["PICK"],
      "its one sentence was never annotated",
    );
    move({ next: true });
    const wrong = game().question.options.find((option) => option !== "queso");
    const missed = move({ answer: wrong });
    assertEquals(reviews(missed.effects), [
      { literal: "queso", signal: "MISTAKE" },
      { literal: wrong, signal: "MISTAKE" },
    ]);
    assertEquals([game().verdict.right, game().question.word], [false, "queso"]);
    assertEquals(kinds(missed.effects, "met"), [{ type: "met", word: "queso" }]);
    assertEquals(move({ answer: "queso" }).effects, [], "the first pick was the graded one");
    const { run } = kept.state;
    assertEquals([read(run, "right"), read(run, "wrong"), run.hearts], [0, 1, HEARTS]);
  },
);

Deno.test(
  "a check is asked only where it can be; a stone with nothing to ask is met by reading its card",
  () => {
    const checks = (word, map = "market", dice = 3) => {
      const { game, open } = table({ state: standing({ map }), dice });
      open("trial", { word });
      return game().checks;
    };
    const formats = (word, map) => checks(word, map).map((check) => check.format);
    assertEquals(formats("leche"), ["PICK"], "con leche is two tokens");
    assertEquals(formats("queso"), ["PICK"], "its sentence was never annotated");
    assertEquals(formats("nada"), [], "it reads on neither side, and no sentence uses it");
    assertEquals(formats("hablar.present", "forge"), [], "a paradigm reads on neither side");
    for (let dice = 1; dice <= 20; dice += 1)
      assertEquals(
        checks("pan", "market", dice)[1].sentence,
        "quiero-pan",
        "pan-pan has no order to find, pan-si is two tokens",
      );

    const { kept, game, open } = table({ state: standing({ map: "forge" }) });
    const opened = open("trial", { word: "hablar.present" });
    assertEquals(opened.effects, [
      { type: "game", kind: "trial" },
      { type: "met", word: "hablar.present" },
      { type: "coins", amount: 1 },
    ]);
    assertEquals([game().phase, has(kept.state.run, "met:hablar.present")], ["card", true]);
    assertEquals(reviews(kept.effects), []);
  },
);

Deno.test(
  "the cast: a bite two to six seconds on, as the dice fall; an unhooked bite slips HOOK after it",
  () => {
    const cast = (random) =>
      GAMES.fishing.start(
        standing(),
        { spot: SPOT },
        {
          world: WORLD,
          memory: {},
          due: [],
          now: 1000,
          random,
        },
      );
    const soonest = cast(() => 0);
    assertEquals(soonest.effects, [{ type: "game", kind: "fishing" }]);
    assertEquals(soonest.state.scene.game, {
      kind: "fishing",
      spot: SPOT,
      word: "pan",
      phase: "waiting",
      bite: 1000 + WAIT.least,
      slip: 1000 + WAIT.least + HOOK,
      question: null,
      verdict: null,
    });
    assertEquals(cast(() => 0.99999).state.scene.game.bite, 1000 + WAIT.most);
    for (let dice = 1; dice <= 50; dice += 1) {
      const { bite } = cast(mulberry(dice)).state.scene.game;
      assert(bite >= 1000 + WAIT.least && bite <= 1000 + WAIT.most);
    }
    assertEquals([WAIT, HOOK, CATCH], [{ least: 2000, most: 6000 }, 1200, 6000]);
  },
);

Deno.test(
  "hooked too soon the fish spooks, too late it slips: both end unasked, and nothing is reviewed",
  () => {
    const early = table({ due: ["pan"] });
    early.open("fishing", { spot: SPOT });
    early.move({ hook: true }, early.game().bite - early.ctx.now - 1);
    assertEquals([early.game().phase, early.game().question], ["spooked", null]);
    early.move({ hook: true });
    assertEquals(early.game().phase, "spooked", "gone is gone");
    early.move({ next: true });
    assertEquals(early.game(), null);

    const late = table({ due: ["pan"] });
    late.open("fishing", { spot: SPOT });
    late.tick(late.game().bite - late.ctx.now);
    assertEquals(late.game().phase, "biting");
    late.tick(HOOK - 1);
    assertEquals(late.game().phase, "biting");
    late.tick(1);
    assertEquals(late.game().phase, "slipped");
    late.move({ hook: true });
    assertEquals([late.game().phase, late.game().question], ["slipped", null]);

    // a hook that lands after the window shut, before any tick saw it shut, is late all the same
    const unseen = table({ due: ["pan"] });
    unseen.open("fishing", { spot: SPOT });
    unseen.move({ hook: true }, unseen.game().slip - unseen.ctx.now);
    assertEquals([unseen.game().phase, unseen.game().question], ["slipped", null]);

    for (const { kept } of [early, late, unseen]) {
      assertEquals(reviews(kept.effects), []);
      assertEquals(held(kept.state.run, "fish"), 0);
    }
  },
);

// a line cast and hooked at a moment of its bite's window — by default as the float dips
const hooked = (due = ["queso"], moment = (game) => game.bite) => {
  const at = table({ due });
  at.open("fishing", { spot: SPOT });
  const result = at.move({ hook: true }, moment(at.game()) - at.ctx.now);
  return { ...at, result };
};

Deno.test(
  "hooked inside its window, the catch is asked: heard when it has a voice, read when it has none",
  () => {
    const last = (game) => game.slip - 1;
    const heard = hooked(["pan"], last);
    assertEquals([heard.game().phase, heard.game().question.format], ["asking", "LISTEN"]);
    assertEquals(heard.result.effects, [{ type: "audio", word: "pan" }]);
    const seen = hooked(["queso"], last);
    assertEquals([seen.game().phase, seen.game().question.format], ["asking", "PICK"]);
    assertEquals(seen.result.effects, []);
    for (const { ctx, game } of [heard, seen]) {
      const { word, recall, options, asked, deadline } = game().question;
      assertEquals([recall, asked, deadline], ["known", ctx.now, ctx.now + CATCH]);
      assertEquals(options.length, CHOICES);
      assert(options.includes(word));
      assertEquals(new Set(options.map((option) => fold(WORLD.words[option].known))).size, CHOICES);
    }
  },
);

Deno.test(
  "named right the fish is landed: a fish gained, the catch told, its word reviewed — MASTERY only inside the first third",
  () => {
    const landed = (thinking) => {
      const at = hooked();
      return { ...at, result: at.move({ answer: "queso" }, thinking) };
    };
    const swift = landed(CATCH * SWIFT);
    assertEquals(swift.result.effects, [
      { type: "review", literal: "queso", signal: "MASTERY" },
      { type: "catch", word: "queso" },
    ]);
    assertEquals([swift.game().phase, held(swift.kept.state.run, "fish")], ["caught", 1]);
    for (const thinking of [CATCH * SWIFT + 1, CATCH - 1]) {
      const steady = landed(thinking);
      assertEquals(reviews(steady.result.effects), [{ literal: "queso", signal: "SUCCESS" }]);
      assertEquals(held(steady.kept.state.run, "fish"), 1);
    }
    assertEquals(swift.move({ answer: "queso" }).effects, [], "a landed fish is answered once");
    swift.move({ next: true });
    assertEquals(swift.game(), null);
    assertEquals(swift.kept.state.run.hearts, HEARTS);
  },
);

Deno.test(
  "named wrong the fish gets away, a MISTAKE on both words; left unnamed it gets away, a FAILURE",
  () => {
    const wrong = hooked();
    const taken = wrong.game().question.options.find((option) => option !== "queso");
    const missed = wrong.move({ answer: taken }, 1000);
    assertEquals(missed.effects, [
      { type: "review", literal: "queso", signal: "MISTAKE" },
      { type: "review", literal: taken, signal: "MISTAKE" },
    ]);
    assertEquals([wrong.game().phase, held(wrong.kept.state.run, "fish")], ["lost", 0]);
    assertEquals(wrong.move({ answer: "queso" }).effects, [], "it is gone");

    const lapsed = hooked();
    lapsed.tick(CATCH - 1);
    assertEquals(lapsed.game().phase, "asking");
    assertEquals(reviews(lapsed.tick(1).effects), [{ literal: "queso", signal: "FAILURE" }]);
    assertEquals([lapsed.game().phase, lapsed.game().verdict.value], ["lost", null]);

    // an answer that lands after the clock ran out, before any tick saw it, is no answer
    const tardy = hooked();
    const result = tardy.move({ answer: "queso" }, CATCH);
    assertEquals(reviews(result.effects), [{ literal: "queso", signal: "FAILURE" }]);
    assertEquals(held(tardy.kept.state.run, "fish"), 0);
    for (const { kept } of [wrong, lapsed, tardy]) assertEquals(kept.state.run.hearts, HEARTS);
  },
);

Deno.test(
  "what bites: a due word of the map's place first, else one whose stone is read, else its signature",
  () => {
    const bitten = (options) => {
      const { game, open } = table(options);
      open("fishing", { spot: SPOT });
      return game().word;
    };
    for (let dice = 1; dice <= 20; dice += 1) {
      assertEquals(
        bitten({ due: ["hablar.present", "nada", "queso"], dice }),
        "queso",
        "a word due elsewhere, or one reading on neither side, never bites",
      );
      assertEquals(bitten({ state: standing({ flags: ["met:leche"] }), dice }), "leche");
      assertEquals(
        bitten({ state: standing({ flags: ["met:leche"] }), due: ["queso"], dice }),
        "queso",
        "a due word before a read one",
      );
      assertEquals(bitten({ due: ["nada"], dice }), "pan", "its signature");
    }
    const caught = Array.from({ length: 30 }, (_, dice) =>
      bitten({ due: ["queso", "leche"], dice }),
    );
    assertEquals(new Set(caught), new Set(["queso", "leche"]));
  },
);

Deno.test(
  "water with nothing to bite is only water: a map of no place, a place with no word that reads",
  () => {
    for (const map of ["square", "forge"]) {
      const { kept, open } = table({ state: standing({ map }), due: ["hablar.present"] });
      assertEquals(open("fishing", { spot: SPOT }).effects, [{ type: "bump" }]);
      assertEquals(kept.state.scene.game, null);
    }
  },
);

Deno.test(
  "the haunt gathers up to five spirits as pairs: both sides shuffled, none blank, none alike once folded",
  () => {
    const lefts = new Set();
    for (let dice = 1; dice <= 40; dice += 1) {
      const { ctx, game, open } = table({ state: standing({ spirits: HAUNTED }), dice });
      assertEquals(open("swarm", { haunt: HAUNT }).effects, [{ type: "game", kind: "swarm" }]);
      const { left, right } = game();
      assertEquals(left.toSorted(), ["agua", "dinero", "leche", "pan", "queso"]);
      assertEquals(right.toSorted(), left.toSorted());
      assertNotEquals(right, left, "a column read straight across would answer itself");
      assertEquals(
        [game().phase, game().since, game().until, game().chosen],
        ["playing", ctx.now, ctx.now + CLOCK, { left: null, right: null }],
      );
      lefts.add(left.join());
    }
    assert(lefts.size > 1, "the words are shuffled");
    assertEquals([CLOCK, CHARM], [30000, 10000]);
    for (let dice = 1; dice <= 30; dice += 1) {
      const { game, open } = table({
        state: standing({ spirits: ["pan", "agua"].map(spirit) }),
        dice,
      });
      open("swarm", { haunt: HAUNT });
      assertNotEquals(game().right, game().left, "two pairs never stand straight across either");
    }
  },
);

Deno.test("fewer than two pairs is no match: the haunt stays quiet", () => {
  for (const words of [[], ["pan"], ["dinero", "plata"], ["pan", "nada"]]) {
    const state = standing({ spirits: words.map(spirit) });
    const { kept, open } = table({ state });
    assertEquals(open("swarm", { haunt: HAUNT }).effects, [{ type: "quiet" }]);
    assertEquals(kept.state, state);
  }
});

Deno.test(
  "a pair made lays its spirit to rest: its word reviewed once, its place tallied, three coins, gone from the map",
  () => {
    const { kept, game, open, move } = table({ state: standing({ spirits: HAUNTED }) });
    open("swarm", { haunt: HAUNT });
    assertEquals(move({ left: "pan" }).effects, [{ type: "audio", word: "pan" }]);
    assertEquals(game().chosen, { left: "pan", right: null });
    assertEquals(move({ right: "pan" }).effects, [
      { type: "review", literal: "pan", signal: "SUCCESS" },
      { type: "rested", word: "pan" },
      { type: "coins", amount: 3 },
    ]);
    assertEquals(
      [game().reviewed, game().chosen],
      [{ pan: "SUCCESS" }, { left: null, right: null }],
    );
    assertEquals(
      kept.state.scene.spirits.map((one) => one.word),
      HAUNTED.map((one) => one.word).filter((one) => one !== "pan"),
    );
    const { run } = kept.state;
    assertEquals(
      [read(run, "rested:market"), read(run, "coins+"), read(run, "right"), run.hearts],
      [1, 3, 1, HEARTS],
    );
    move({ left: "pan" });
    move({ right: "pan" });
    assertEquals(
      reviews(kept.effects),
      [{ literal: "pan", signal: "SUCCESS" }],
      "a spirit rests once",
    );
    assertEquals(game().chosen, { left: null, right: null });
  },
);

Deno.test(
  "a mis-pair marks the word on the left: paired at last it is a MISTAKE; the meaning it was taken for is not",
  () => {
    const { kept, game, open, move } = table({ state: standing({ spirits: HAUNTED }) });
    open("swarm", { haunt: HAUNT });
    move({ left: "agua" });
    assertEquals(reviews(move({ right: "queso" }).effects), []);
    assertEquals(
      [game().missed, game().miss, game().chosen],
      [["agua"], { left: "agua", right: "queso" }, { left: null, right: null }],
    );
    move({ right: "agua" });
    assertEquals(game().miss, null);
    assertEquals(
      reviews(move({ left: "agua" }).effects),
      [{ literal: "agua", signal: "MISTAKE" }],
      "a pair is a pick on each side, in either order",
    );
    move({ left: "queso" });
    move({ right: "queso" });
    assertEquals(reviews(kept.effects), [
      { literal: "agua", signal: "MISTAKE" },
      { literal: "queso", signal: "SUCCESS" },
    ]);
    assertEquals(game().reviewed, { agua: "MISTAKE", queso: "SUCCESS" });
    assertEquals([read(kept.state.run, "right"), read(kept.state.run, "wrong")], [2, 1]);
  },
);

Deno.test("leaving a swarm reviews each word it mis-paired, once, and no word never tried", () => {
  const { kept, game, open, move, quit } = table({ state: standing({ spirits: HAUNTED }) });
  open("swarm", { haunt: HAUNT });
  move({ left: "agua" });
  move({ right: "queso" });
  move({ left: "pan" });
  move({ right: "pan" });
  move({ left: "leche" });
  move({ right: "dinero" });
  assertEquals(game().missed, ["agua", "leche"]);
  assertEquals(reviews(quit().effects), [
    { literal: "agua", signal: "MISTAKE" },
    { literal: "leche", signal: "MISTAKE" },
  ]);
  assertEquals(kept.state.scene.game, null);
  assertEquals(
    reviews(kept.effects),
    [
      { literal: "pan", signal: "SUCCESS" },
      { literal: "agua", signal: "MISTAKE" },
      { literal: "leche", signal: "MISTAKE" },
    ],
    "a word rested is not reviewed again; the meanings mis-taken are not reviewed at all",
  );
});

Deno.test("a tile taken again is let go; another taken on its side takes its place", () => {
  const { kept, game, open, move } = table({ state: standing({ spirits: HAUNTED }) });
  open("swarm", { haunt: HAUNT });
  move({ left: "queso" });
  move({ left: "queso" });
  assertEquals(game().chosen, { left: null, right: null });
  move({ right: "leche" });
  move({ right: "dinero" });
  assertEquals(game().chosen, { left: null, right: "dinero" });
  move({ left: "tea" });
  move({ right: "plata" });
  assertEquals(game().chosen, { left: null, right: "dinero" }, "a word not gathered is no tile");
  assertEquals(reviews(kept.effects), []);
});

Deno.test("the clock runs out: every word left unpaired is a FAILURE, and its spirit stays", () => {
  const { kept, game, open, move, tick } = table({ state: standing({ spirits: HAUNTED }) });
  open("swarm", { haunt: HAUNT });
  move({ left: "pan" });
  move({ right: "pan" }, 1000);
  tick(CLOCK - 1001);
  assertEquals(game().phase, "playing");
  const lapsed = tick(1);
  assertEquals(
    reviews(lapsed.effects).toSorted((one, other) => one.literal.localeCompare(other.literal)),
    ["agua", "dinero", "leche", "queso"].map((literal) => ({ literal, signal: "FAILURE" })),
  );
  assertEquals(game().phase, "over");
  assertEquals(game().reviewed, {
    pan: "SUCCESS",
    agua: "FAILURE",
    dinero: "FAILURE",
    leche: "FAILURE",
    queso: "FAILURE",
  });
  assertEquals(
    kept.state.scene.spirits.map((one) => one.word),
    HAUNTED.map((one) => one.word).filter((one) => one !== "pan"),
  );
  move({ left: "agua" });
  move({ right: "agua" });
  assertEquals(reviews(kept.effects).length, 5, "after the clock nothing pairs");
  assertEquals([read(kept.state.run, "wrong"), kept.state.run.hearts], [4, HEARTS]);
  move({ next: true });
  assertEquals(game(), null);

  // a pair that lands after the clock ran out, before any tick saw it, rests nothing
  const tardy = table({ state: standing({ spirits: HAUNTED }) });
  tardy.open("swarm", { haunt: HAUNT });
  tardy.move({ left: "pan" });
  const result = tardy.move({ right: "pan" }, CLOCK);
  assertEquals(kinds(result.effects, "rested"), []);
  assertEquals(reviews(result.effects).length, 5);
  assert(reviews(result.effects).every((review) => review.signal === "FAILURE"));
});

Deno.test("every pair made clears the haunt before its clock: nothing is left to fail", () => {
  const { kept, game, open, move, tick } = table({ state: standing({ spirits: HAUNTED }) });
  open("swarm", { haunt: HAUNT });
  for (const word of game().left) {
    move({ left: word });
    move({ right: word }, 500);
  }
  assertEquals(game().phase, "cleared");
  tick(CLOCK);
  assertEquals(
    reviews(kept.effects).map((review) => review.signal),
    Array(5).fill("SUCCESS"),
  );
  const { run } = kept.state;
  assertEquals([read(run, "coins+"), read(run, "rested:market")], [15, 5]);
  assertEquals(
    kept.state.scene.spirits.map((one) => one.word),
    ["nada", "plata", "tea"],
  );
});

Deno.test("a charm, spent once a swarm, holds the spirits ten seconds longer", () => {
  const charmed = table({
    state: standing({ spirits: HAUNTED, counters: { "gained:charm": 2 } }),
  });
  charmed.open("swarm", { haunt: HAUNT });
  assertEquals([charmed.game().charms, charmed.game().charmed], [2, false]);
  assertEquals(charmed.move({ charm: true }).effects, []);
  const span = () => charmed.game().until - charmed.game().since;
  assertEquals([span(), charmed.game().charms, charmed.game().charmed], [CLOCK + CHARM, 1, true]);
  assertEquals(held(charmed.kept.state.run, "charm"), 1);
  charmed.move({ charm: true });
  assertEquals([span(), held(charmed.kept.state.run, "charm")], [CLOCK + CHARM, 1], "once a swarm");
  charmed.tick(CLOCK);
  assertEquals(charmed.game().phase, "playing");
  charmed.tick(CHARM);
  assertEquals(charmed.game().phase, "over");

  const bare = table({ state: standing({ spirits: HAUNTED }) });
  bare.open("swarm", { haunt: HAUNT });
  bare.move({ charm: true });
  assertEquals(
    [bare.game().until - bare.game().since, bare.game().charmed, bare.game().charms],
    [CLOCK, false, 0],
  );
});

Deno.test("whatever is tapped, a swarm reviews each of its words exactly once", () => {
  for (let dice = 1; dice <= 30; dice += 1) {
    const thumb = mulberry(1000 + dice);
    const at = table({
      state: standing({ spirits: HAUNTED, counters: { "gained:charm": 1 } }),
      dice,
    });
    at.open("swarm", { haunt: HAUNT });
    const words = [...at.game().left];
    while (at.game().phase === "playing") {
      const roll = thumb();
      const word = words[Math.floor(thumb() * words.length)];
      const move = roll < 0.45 ? { left: word } : roll < 0.9 ? { right: word } : { charm: true };
      at.move(move, Math.floor(thumb() * 1500));
    }
    const given = reviews(at.kept.effects);
    assertEquals(given.map((review) => review.literal).toSorted(), words.toSorted());
    assertEquals(
      at.game().reviewed,
      Object.fromEntries(given.map(({ literal, signal }) => [literal, signal])),
      "the game keeps what it reviewed",
    );
    // a word whose spirit left the map was paired: SUCCESS, or a MISTAKE if mis-paired first;
    // a word whose spirit still haunts it was left unpaired
    const haunting = at.kept.state.scene.spirits.map((one) => one.word);
    for (const { literal, signal } of given) {
      const paired = at.game().missed.includes(literal) ? "MISTAKE" : "SUCCESS";
      assertEquals(signal, haunting.includes(literal) ? "FAILURE" : paired);
    }
    assertEquals(at.kept.state.run.hearts, HEARTS);
  }
});

Deno.test(
  "nothing that is not an answer writes memory: a card, a replay, a hook, a charm, one tile, a quit",
  () => {
    const silent = (result) => assertEquals(reviews(result.effects), []);
    const stone = table();
    silent(stone.open("trial", { word: "pan" }));
    for (const move of [{ hear: true }, { next: true }, { hear: true }]) silent(stone.move(move));
    silent(stone.quit());
    assertEquals([stone.game(), has(stone.kept.state.run, "met:pan")], [null, false]);

    const line = table({ due: ["pan"] });
    silent(line.open("fishing", { spot: SPOT }));
    silent(line.tick(line.game().bite - line.ctx.now));
    silent(line.move({ hook: true }));
    silent(line.move({ hear: true }));
    silent(line.quit());

    const ring = table({ state: standing({ spirits: HAUNTED, counters: { "gained:charm": 1 } }) });
    silent(ring.open("swarm", { haunt: HAUNT }));
    for (const move of [{ left: "pan" }, { left: "pan" }, { right: "agua" }, { charm: true }])
      silent(ring.move(move));
    silent(ring.quit());
    for (const { kept } of [stone, line, ring]) assertEquals(reviews(kept.effects), []);
  },
);

Deno.test(
  "time away moves every clock a game runs: nothing runs out while the learner is gone",
  () => {
    const line = table({ due: ["pan"] });
    line.open("fishing", { spot: SPOT });
    const { bite, slip } = line.game();
    line.shift(60000);
    assertEquals([line.game().bite, line.game().slip], [bite + 60000, slip + 60000]);
    line.tick(bite - line.ctx.now);
    assertEquals(line.game().phase, "waiting", "the old bite came and went unseen");
    line.tick(60000);
    line.move({ hook: true });
    const { asked, deadline } = line.game().question;
    line.shift(30000);
    assertEquals(
      [line.game().question.asked, line.game().question.deadline],
      [asked + 30000, deadline + 30000],
    );
    line.tick(CATCH);
    assertEquals(line.game().phase, "asking");

    const ring = table({ state: standing({ spirits: HAUNTED }) });
    ring.open("swarm", { haunt: HAUNT });
    const { since, until } = ring.game();
    ring.shift(45000);
    assertEquals([ring.game().since, ring.game().until], [since + 45000, until + 45000]);
    ring.tick(CLOCK);
    assertEquals(ring.game().phase, "playing");

    const stone = table();
    stone.open("trial", { word: "pan" });
    const card = structuredClone(stone.kept.state);
    assertEquals(stone.shift(9000).state, card, "a card runs no clock");
    stone.move({ next: true });
    stone.move({ answer: "pan" });
    stone.move({ next: true });
    const posed = stone.game().question.asked;
    stone.shift(60000);
    assertEquals(stone.game().question.asked, posed + 60000);
    const built = stone.move({ answer: [0, 1, 2, 3] }, 60000 + 1000);
    assertEquals(reviews(built.effects)[0], { literal: "quiero-pan", signal: "MASTERY" });
  },
);
