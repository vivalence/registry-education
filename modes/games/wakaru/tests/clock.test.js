import { assert, assertEquals } from "@std/assert";
import { CALM, chart, enter, entry } from "../engine/world.js";
import { beat } from "../engine/beat.js";
import { PAUSE, expected } from "../engine/duel.js";
import { fresh } from "../engine/run.js";
import { mulberry } from "../engine/random.js";
import { roam } from "../engine/spirits.js";
import { clock } from "../engine/beats/clock.js";
import { engage } from "../engine/beats/duel.js";
import { GAMES } from "../engine/games/index.js";

const word = (id, known, learning, rank) => ({
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
});

const WORDS = [
  word("pan", "bread", "pan", 10),
  word("agua", "water", "agua", 11),
  word("queso", "cheese", "queso", 12),
  word("leche", "milk", "leche", 13),
];

const ATLAS = {
  places: { market: { words: WORDS.map((entry) => entry.id), sentences: [] } },
  words: Object.fromEntries(WORDS.map((entry) => [entry.id, entry])),
};

const WORLD = chart(7, ATLAS);

// the learner at the market's entry, its due words risen as spirits
const standing = (now = 1000, dice = 3) => {
  const ctx = {
    world: WORLD,
    memory: {},
    due: ["pan", "agua", "queso"],
    now,
    random: mulberry(dice),
  };
  const run = { ...fresh(7), pose: { map: "market", ...entry(WORLD.maps.market) } };
  return { ctx, state: { run, scene: enter(WORLD, run, ctx) } };
};

const nothing = (state) => ({ state, effects: [], events: [] });

Deno.test("outside a duel, a game and a dialogue, a tick is the spirits' roam", () => {
  for (const now of [1000, 5000, 9000]) {
    const { ctx, state } = standing(now);
    assert(state.scene.spirits.length > 0);
    assertEquals(
      clock.tick(state, { type: "tick" }, { ...ctx, random: mulberry(9) }),
      roam(state, { ...ctx, random: mulberry(9) }),
    );
  }
});

Deno.test("a spirit that reaches the learner opens its duel on the same tick", () => {
  const { ctx, state } = standing();
  const [first, ...rest] = state.scene.spirits;
  const upon = { ...first, x: state.run.pose.x, y: state.run.pose.y, next: ctx.now + 60000 };
  const met = clock.tick(
    { ...state, scene: { ...state.scene, spirits: [upon, ...rest] } },
    { type: "tick" },
    ctx,
  );
  assertEquals(met.state.scene.duel.foe, { kind: "spirit", word: upon.word });
  assertEquals(
    met.effects.filter((effect) => effect.type === "duel"),
    [{ type: "duel", foe: { kind: "spirit", word: upon.word } }],
    "what the roam said first, then the duel",
  );
});

Deno.test("a duel up: the tick is the duel's own clock, and the spirits stand still", () => {
  const { ctx, state } = standing();
  const dueling = engage(state, { kind: "spirit", word: "pan" }, ctx).state;
  const later = { ...ctx, now: ctx.now + 200 };
  const ticked = clock.tick(dueling, { type: "tick" }, later);
  assertEquals(ticked.state.scene.spirits, dueling.scene.spirits);
  const lapsed = clock.tick(
    dueling,
    { type: "tick" },
    { ...ctx, now: dueling.scene.duel.question.deadline },
  );
  assertEquals(lapsed.effects[0].type, "review", "past the deadline the question fails");
  assertEquals(lapsed.effects[0].signal, "FAILURE");
});

Deno.test("someone talking: the tick moves nothing", () => {
  const { ctx, state } = standing();
  const talking = { ...state, scene: { ...state.scene, dialogue: { who: { kind: "shrine" } } } };
  assertEquals(clock.tick(talking, { type: "tick" }, ctx), nothing(talking));
});

Deno.test("a game up: the tick and the time away are the game's own", () => {
  const { ctx, state } = standing();
  const playing = GAMES.trial.start(state, { word: "pan" }, ctx).state;
  assertEquals(clock.tick(playing, { type: "tick" }, ctx), GAMES.trial.tick(playing, ctx));
  assertEquals(
    clock.resume(playing, { type: "resume", away: 4000 }, ctx),
    GAMES.trial.shift(playing, 4000),
  );
});

Deno.test("time away shifts an open duel's clock, and nothing when nothing runs", () => {
  const { ctx, state } = standing();
  assertEquals(clock.resume(state, { type: "resume", away: 4000 }, ctx), nothing(state));
  const dueling = engage(state, { kind: "spirit", word: "pan" }, ctx).state;
  assertEquals(clock.resume(dueling, { type: "resume", away: 0 }, ctx), nothing(dueling));
  const shifted = clock.resume(dueling, { type: "resume", away: 4000 }, ctx).state;
  assertEquals(shifted.scene.duel.question.deadline, dueling.scene.duel.question.deadline + 4000);
});

Deno.test("a beat that frees the learner lets them breathe: the other hunters walk home", () => {
  const { ctx, state } = standing();
  const dueling = engage(state, { kind: "spirit", word: "pan" }, ctx).state;
  const other = dueling.scene.spirits.find((spirit) => spirit.word !== "pan");
  const hunter = { ...other, mode: "chase", closest: 4, since: ctx.now, next: ctx.now + 320 };
  const hunted = {
    ...dueling,
    scene: {
      ...dueling.scene,
      spirits: dueling.scene.spirits.map((spirit) => (spirit === other ? hunter : spirit)),
    },
  };
  const { question } = hunted.scene.duel;
  const value = question.options !== null ? question.word : expected(WORLD, question);
  const answered = beat(hunted, { type: "answer", value }, ctx).state;
  assertEquals(answered.scene.calm, hunted.scene.calm, "the verdict still holds the learner");
  const now = ctx.now + PAUSE;
  const won = beat(answered, { type: "tick" }, { ...ctx, now }).state;
  assertEquals(won.scene.duel, null);
  assertEquals(won.scene.calm, now + CALM);
  assertEquals(won.scene.spirits.find((spirit) => spirit.word === hunter.word).mode, "return");
});

Deno.test("an arrival opens on the calm: for its length no spirit spots the learner", () => {
  const { ctx, state } = standing(1000);
  assertEquals(state.scene.calm, 1000 + CALM);
  const [first, ...rest] = state.scene.spirits;
  const { x, y } = state.run.pose;
  const watcher = { ...first, x: x - 2, y, facing: "east", mode: "roam", next: 99999 };
  const watched = { ...state, scene: { ...state.scene, spirits: [watcher, ...rest] } };
  const tick = (now) => clock.tick(watched, { type: "tick" }, { ...ctx, now }).effects;
  assertEquals(tick(1000 + CALM - 1), [], "in the calm");
  assertEquals(tick(1000 + CALM).filter((effect) => effect.type === "spotted").length, 1);
});
