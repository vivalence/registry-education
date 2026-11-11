import { HEARTS, coins, count, flagged, has, held, out, raise, tally } from "../run.js";
import { complete, quests, wanted } from "../quest.js";
import { ITEMS, pay } from "../loot.js";
import { strewn } from "../world.js";
import { engage } from "./duel.js";

// what the vendor sells, at its price
export const WARES = [
  { item: "candle", price: 12 },
  { item: "charm", price: 25 },
  { item: "tea", price: 10 },
  { item: "lantern", price: 60 },
];

// what the vendor buys back, at what it pays for each
export const WANTS = [{ item: "fish", price: 6 }];

// the keeper's question is answered once a reply is graded SUCCESS or better
export const PASSING = ["MASTERY", "SUCCESS"];

// the dialogue turns to a page; the run and what the screen must do ride along
const turn = (state, page, effects = [], events = []) =>
  out(
    { ...state, scene: { ...state.scene, dialogue: { ...state.scene.dialogue, page } } },
    effects,
    events,
  );

const closed = (state) => ({ ...state, scene: { ...state.scene, dialogue: null } });

// a page waiting on the daemon names the action that brings its content: any other arrival is
// stale — so is a grade of another reply than the page's — and one that failed on its way leaves
// the keeper quiet, with the way back open
const arrival = (receive) => (state, action, ctx) => {
  if (state.scene.dialogue?.page.awaits !== action.type) return out(state);
  if ("reply" in action && action.reply !== state.scene.dialogue.page.reply) return out(state);
  if (action.failed) return turn(state, { kind: "quiet", awaits: null, options: ["back"] });
  return receive(state, action, ctx);
};

// the first line, sentence or question the keeper gives raises heard:<place>
const spoken = (state, page, effects = []) => {
  const flag = `heard:${state.scene.dialogue.who.place}`;
  return turn({ ...state, run: raise(state.run, flag) }, page, effects, flagged(state.run, flag));
};

// the errand and the question are offered only while their quest is open; listening, only where
// a sentence is annotated, the only kind the keeper reads out
const menu = (run, place, ctx) => {
  const open = quests(ctx.world, place)
    .filter((quest) => !complete(quest, run, ctx))
    .map((quest) => quest.id);
  const offered = {
    listen: ctx.world.places[place].sentences.some((id) => ctx.world.words[id].tokens !== null),
    talk: true,
    errand: open.includes(`${place}.errand`),
    question: open.includes(`${place}.question`),
    leave: true,
  };
  return { kind: "menu", options: Object.keys(offered).filter((option) => offered[option]) };
};

const OPENINGS = {
  keeper: (state, who, ctx) => menu(state.run, who.place, ctx),
  vendor: () => ({ kind: "shop", bought: null, sold: null, options: ["leave"] }),
  shrine: (state, who, ctx) => ({
    kind: "shrine",
    due: ctx.due.length,
    options: ctx.due.length > 0 ? ["begin", "leave"] : ["leave"],
  }),
  bed: () => ({ kind: "bed", options: ["leave"] }),
};

// the walk bumped into a keeper, the vendor, the shrine or a bed
export const converse = (state, who, ctx) =>
  out({
    ...state,
    scene: { ...state.scene, dialogue: { who, page: OPENINGS[who.kind](state, who, ctx) } },
  });

const close = (state) => (state.scene.dialogue ? out(closed(state)) : out(state));

// a meaning picked is a review on the sentence itself
const pick = (state, meaning) => {
  const { page } = state.scene.dialogue;
  const signal = meaning === page.sentence.known ? "SUCCESS" : "MISTAKE";
  return turn(state, { ...page, picked: meaning, options: ["listen", "back"] }, [
    { type: "review", literal: page.sentence.id, signal },
  ]);
};

const GO = {
  listen: (state) =>
    turn(state, { kind: "listen", awaits: "listened", options: ["back"] }, [
      { type: "listen", place: state.scene.dialogue.who.place },
    ]),

  talk: (state) =>
    turn(state, { kind: "talk", awaits: "heard", options: ["back"] }, [
      { type: "speak", place: state.scene.dialogue.who.place },
    ]),

  question: (state) =>
    turn(state, { kind: "question", awaits: "asked", options: ["back"] }, [
      { type: "ask", place: state.scene.dialogue.who.place },
    ]),

  errand: (state, action, ctx) => {
    const word = wanted(ctx.world, state.scene.dialogue.who.place);
    return turn(
      state,
      { kind: "errand", word, handed: null, options: ["back"] },
      ctx.world.words[word].audio ? [{ type: "audio", word }] : [],
    );
  },

  // the daemon grades the reply and reviews it server-side, so no review leaves here.
  // the walk holds still while a dialogue is open, so the page keeps a way back while the grade
  // is out: leaving then keeps the review, and the question stays open to answer again
  reply: (state, action) => {
    const { who, page } = state.scene.dialogue;
    const reply = action.reply.trim();
    if (reply === "") return out(state);
    return turn(state, { ...page, awaits: "judged", reply, options: ["back"] }, [
      { type: "judge", place: who.place, question: page.question, reply, target: page.target },
    ]);
  },

  back: (state, action, ctx) => turn(state, menu(state.run, state.scene.dialogue.who.place, ctx)),

  leave: close,

  begin: (state, action, ctx) =>
    ctx.due.length === 0
      ? out(state)
      : engage(closed(state), { kind: "pilgrim", words: ctx.due }, ctx),
};

// a page's options are what it offers; a listen page still asking also takes one of its meanings
const choose = (state, action, ctx) => {
  const { dialogue } = state.scene;
  if (!dialogue) return out(state);
  const { page } = dialogue;
  if (page.kind === "listen" && page.picked === null && page.meanings.includes(action.option))
    return pick(state, action.option);
  if (!page.options.includes(action.option)) return out(state);
  return GO[action.option](state, action, ctx);
};

const heard = arrival((state, action) =>
  spoken(state, {
    kind: "talk",
    awaits: null,
    line: action.line,
    gloss: action.gloss,
    options: ["talk", "back"],
  }),
);

// no sentence came: the place has none annotated, and a keeper who read nothing has not spoken
const listened = arrival((state, action) => {
  const { sentence, options } = action;
  if (sentence === null)
    return turn(state, {
      kind: "listen",
      awaits: null,
      sentence: null,
      meanings: [],
      picked: null,
      options: ["back"],
    });
  return spoken(
    state,
    { kind: "listen", awaits: null, sentence, meanings: options, picked: null, options: ["back"] },
    sentence.audio ? [{ type: "audio", word: sentence.id }] : [],
  );
});

const asked = arrival((state, action) =>
  spoken(state, {
    kind: "question",
    awaits: null,
    question: action.question,
    gloss: action.gloss,
    target: action.target,
    reply: null,
    verdict: null,
    options: ["reply", "back"],
  }),
);

const judged = arrival((state, action) => {
  const { who, page } = state.scene.dialogue;
  const verdict = { grade: action.grade, feedback: action.feedback, correction: action.correction };
  if (!PASSING.includes(verdict.grade))
    return turn(state, { ...page, awaits: null, verdict, options: ["question", "back"] });
  const flag = `asked:${who.place}`;
  return turn(
    { ...state, run: raise(state.run, flag) },
    { ...page, awaits: null, verdict, options: ["back"] },
    [],
    flagged(state.run, flag),
  );
});

// handing an item over is a review: the right one SUCCESS, a wrong one MISTAKE on both words;
// the keeper keeps whatever is handed. a keeper takes only what their own place strews — another
// place's item stays in the satchel for its own keeper's errand
const deliver = (state, { item }, ctx) => {
  const { dialogue } = state.scene;
  if (dialogue?.page.kind !== "errand" || held(state.run, `word:${item}`) === 0) return out(state);
  const { who, page } = dialogue;
  if (!strewn(ctx.world, who.place).includes(item)) return out(state);
  const flag = `errand:${who.place}`;
  if (has(state.run, flag)) return out(state);
  const run = count(state.run, `used:word:${item}`);
  const handed = { ...page, handed: item };
  if (item !== page.word)
    return turn({ ...state, run }, handed, [
      { type: "review", literal: page.word, signal: "MISTAKE" },
      { type: "review", literal: item, signal: "MISTAKE" },
    ]);
  return turn(
    { ...state, run: raise(run, flag) },
    handed,
    [{ type: "review", literal: item, signal: "SUCCESS" }],
    flagged(run, flag),
  );
};

// a ware is sold while the coins cover it; a tool is sold once, for it is never spent
const buy = (state, { item }) => {
  const { dialogue } = state.scene;
  const ware = WARES.find((offered) => offered.item === item);
  if (dialogue?.who.kind !== "vendor" || ware === undefined || coins(state.run) < ware.price)
    return out(state);
  if (ITEMS[item].kind === "tool" && held(state.run, item) > 0) return out(state);
  const run = count(tally(state.run, "coins-", ware.price), `gained:${item}`);
  return turn({ ...state, run }, { ...dialogue.page, bought: item, sold: null });
};

// the vendor buys back what it wants, one at a time, while the learner carries one
const sell = (state, { item }) => {
  const { dialogue } = state.scene;
  const want = WANTS.find((offer) => offer.item === item);
  if (dialogue?.who.kind !== "vendor" || want === undefined || held(state.run, item) === 0)
    return out(state);
  const run = tally(count(state.run, `used:${item}`), "coins+", want.price);
  return turn({ ...state, run }, { ...dialogue.page, bought: null, sold: item }, [
    { type: "coins", amount: want.price },
  ]);
};

// only tea is used here, and it mends a heart between fights — never in a duel, whose fall is owed
// by the hearts its answers spent. the candle and the charm are spent inside a duel, through the
// duel's own light and charm
const use = (state, { item }) => {
  const { run } = state;
  if (item !== "tea" || state.scene.duel !== null || held(run, "tea") === 0 || run.hearts >= HEARTS)
    return out(state);
  const hearts = run.hearts + 1;
  return out({ ...state, run: { ...count(run, "used:tea"), hearts } }, [{ type: "heal", hearts }]);
};

// a bed mends every heart: the learner sleeps, wakes whole and walks on. a learner already whole
// is not tired
const nap = (state) => {
  if (state.scene.dialogue?.who.kind !== "bed" || state.run.hearts >= HEARTS) return out(state);
  const paid = pay(state.run, { refill: true });
  return out({ ...closed(state), run: paid.run }, paid.effects);
};

export const talk = { choose, heard, listened, asked, judged, deliver, buy, sell, use, nap, close };
