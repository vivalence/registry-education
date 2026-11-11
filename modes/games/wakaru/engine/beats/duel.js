import { STATUS, rank } from "../atlas.js";
import { HEARTS, count, flagged, has, held, out, raise, tally } from "../run.js";
import { CHARM, PAUSE, ask, expected, grip, judge, typed } from "../duel.js";
import { enter, respawn } from "../world.js";

// the strikes a foe stands, and the coins it pays: at its fall, or in a round for each right answer
const STRIKES = { spirit: 1, warden: 5, summit: 8 };
const COINS = { spirit: 5, warden: 50, summit: 200, pilgrim: 2 };

const status = (ctx, word) => STATUS[rank(ctx.memory[word])];

// a warden asks every word to be produced: one held less than KNOWN is asked as if KNOWN
const produced = (ctx, word) => STATUS[Math.max(rank(ctx.memory[word]), rank("KNOWN"))];

// what the learner holds least comes first, then what is most frequent
const weakest = (ctx, words) =>
  words.toSorted(
    (one, other) =>
      grip(ctx, one) - grip(ctx, other) || ctx.world.words[one].rank - ctx.world.words[other].rank,
  );

// the words still to ask: the unasked, else any but the last asked, else the one there is
const turn = (asked, words) => {
  const unasked = words.filter((word) => !asked.includes(word));
  if (unasked.length > 0) return unasked;
  const others = words.filter((word) => word !== asked.at(-1));
  return others.length > 0 ? others : words;
};

const restored = (world, run) => world.order.filter((place) => has(run, `restored:${place}`));

// the place a word is asked in: the first of these that holds it
const holding = (world, places, word) =>
  places.find((place) => world.places[place].words.includes(word));

// the summit asks over every word of every restored place
const crowd = (world, run) => [
  ...new Set(restored(world, run).flatMap((place) => world.places[place].words)),
];

// the due words a pilgrim can be asked: those a place holds
const askable = (world, words) =>
  words.filter((word) => holding(world, world.order, word) !== undefined);

// a spirit laid to rest: its place's tally rises, its coins are paid, it leaves the room
const rest = (state, ctx) => {
  const word = state.scene.duel.foe.word;
  const place = ctx.world.maps[state.run.pose.map].place;
  const run = tally(count(state.run, `rested:${place}`), "coins+", COINS.spirit);
  const spirits = state.scene.spirits.filter((spirit) => spirit.word !== word);
  return out({ run, scene: { ...state.scene, spirits, duel: null } }, [
    { type: "rested", word },
    { type: "coins", amount: COINS.spirit },
  ]);
};

// a warden's fall raises its flag; its coins and its moment come with the first fall only
const triumph = (state, flag, moment, coins) => {
  const scene = { ...state.scene, duel: null };
  if (has(state.run, flag)) return out({ ...state, scene });
  const run = tally(raise(state.run, flag), "coins+", coins);
  return out({ run, scene }, [moment, { type: "coins", amount: coins }], flagged(state.run, flag));
};

// each foe: how many strikes it stands, which word it asks next and at what status, what its fall
// brings. a round, the shrine's pilgrim, is no fight: each answer spends a word, none costs a heart
const FOES = {
  // a spirit is its word: it asks nothing else, so it falls only once its own word is answered
  spirit: {
    vigor: () => STRIKES.spirit,
    subject: (run, duel, ctx) => ({
      word: duel.foe.word,
      place: ctx.world.maps[run.pose.map].place,
      status: status(ctx, duel.foe.word),
    }),
    round: false,
    beaten: rest,
  },
  warden: {
    vigor: (run, foe, ctx) => Math.min(STRIKES.warden, ctx.world.places[foe.place].words.length),
    subject: (run, duel, ctx) => {
      const [word] = turn(duel.asked, weakest(ctx, ctx.world.places[duel.foe.place].words));
      return { word, place: duel.foe.place, status: produced(ctx, word) };
    },
    round: false,
    beaten: (state) => {
      const place = state.scene.duel.foe.place;
      return triumph(state, `restored:${place}`, { type: "restored", place }, COINS.warden);
    },
  },
  summit: {
    vigor: (run, foe, ctx) => Math.min(STRIKES.summit, crowd(ctx.world, run).length),
    subject: (run, duel, ctx) => {
      const [word] = turn(duel.asked, weakest(ctx, crowd(ctx.world, run)));
      const place = holding(ctx.world, restored(ctx.world, run), word);
      return { word, place, status: produced(ctx, word) };
    },
    round: false,
    beaten: (state) => triumph(state, "crowned", { type: "crowned" }, COINS.summit),
  },
  pilgrim: {
    vigor: (run, foe, ctx) => askable(ctx.world, foe.words).length,
    subject: (run, duel, ctx) => {
      const word = askable(ctx.world, duel.foe.words)[duel.asked.length];
      return { word, place: holding(ctx.world, ctx.world.order, word), status: status(ctx, word) };
    },
    round: true,
    beaten: (state) => out({ ...state, scene: { ...state.scene, duel: null } }),
  },
};

const lengthen = (question) => ({ ...question, deadline: question.deadline + CHARM });

// a question is up: asked, its verdict not yet given
const asking = (duel) => duel !== null && duel.verdict === null;

// the duel's next question: the foe names the word, the word's standing names the format;
// a word asked before in this duel had its answer shown, so it comes back seen (reviewed at most
// NEUTRAL); a charmed duel lends it the charm's time, a word to be heard is played
const challenge = (state, duel, ctx) => {
  const subject = FOES[duel.foe.kind].subject(state.run, duel, ctx);
  const plain = ask(subject, ctx);
  const posed = duel.asked.includes(subject.word) ? { ...plain, seen: true } : plain;
  const question = duel.charmed ? lengthen(posed) : posed;
  const heard = question.format === "LISTEN" ? [{ type: "audio", word: question.word }] : [];
  return out(
    { ...state, scene: { ...state.scene, duel: { ...duel, question, verdict: null } } },
    heard,
  );
};

// a foe met opens a duel on its first question; a foe with nothing to ask opens none
export const engage = (state, foe, ctx) => {
  const vigor = FOES[foe.kind].vigor(state.run, foe, ctx);
  if (vigor === 0) return out(state);
  const opened = challenge(state, { foe, vigor, asked: [], charmed: false }, ctx);
  return out(opened.state, [{ type: "duel", foe }, ...opened.effects]);
};

// the learner burns a candle on a typed question: its answer's first letter shows, and a right
// answer to it is only a peek
const light = (state, action, ctx) => {
  const duel = state.scene.duel;
  if (!asking(duel) || !typed(duel.question) || "hint" in duel.question) return out(state);
  if (held(state.run, "candle") <= 0) return out(state);
  const hint = expected(ctx.world, duel.question).match(/[\p{L}\p{N}]/u)[0];
  const question = { ...duel.question, hint };
  return out({
    run: count(state.run, "used:candle"),
    scene: { ...state.scene, duel: { ...duel, question } },
  });
};

// the learner spends a charm, once a duel: the question up and every one after it take longer
const charm = (state) => {
  const duel = state.scene.duel;
  if (!asking(duel) || duel.charmed || held(state.run, "charm") <= 0) return out(state);
  const question = lengthen(duel.question);
  return out({
    run: count(state.run, "used:charm"),
    scene: { ...state.scene, duel: { ...duel, charmed: true, question } },
  });
};

// every answer is graded and reviewed: a right one strikes, a wrong one costs a heart —
// in a round every answer spends a word, and a right one pays
const answer = (state, action, ctx) => {
  const duel = state.scene.duel;
  if (!asking(duel)) return out(state);
  const foe = FOES[duel.foe.kind];
  const verdict = judge(duel.question, action.value, ctx);
  const hurt = !verdict.right && !foe.round;
  const wage = verdict.right && foe.round ? COINS[duel.foe.kind] : 0;
  const tallied = count(state.run, verdict.right ? "right" : "wrong");
  const paid = wage > 0 ? tally(tallied, "coins+", wage) : tallied;
  const run = hurt ? { ...paid, hearts: paid.hearts - 1 } : paid;
  const settled = {
    ...duel,
    vigor: verdict.right || foe.round ? duel.vigor - 1 : duel.vigor,
    asked: [...duel.asked, duel.question.word],
    verdict: { ...verdict, until: ctx.now + PAUSE },
  };
  return out({ run, scene: { ...state.scene, duel: settled } }, [
    ...verdict.reviews.map((review) => ({ type: "review", ...review })),
    ...(verdict.right ? [{ type: "strike" }] : []),
    ...(hurt ? [{ type: "hurt" }] : []),
    ...(wage > 0 ? [{ type: "coins", amount: wage }] : []),
  ]);
};

// no hearts left: the learner wakes whole where the world sends a fallen learner, the map afresh
const fall = (state, ctx) => {
  const run = count({ ...state.run, hearts: HEARTS, pose: respawn(ctx.world, state.run) }, "falls");
  return out({ run, scene: enter(ctx.world, run, ctx) }, [{ type: "fallen" }]);
};

// a duel's clock: past the deadline the question fails; once the verdict has been read, the foe
// falls, the learner falls, or the next question comes
export const advance = (state, ctx) => {
  const duel = state.scene.duel;
  if (asking(duel))
    return ctx.now >= duel.question.deadline ? answer(state, { value: null }, ctx) : out(state);
  if (ctx.now < duel.verdict.until) return out(state);
  if (duel.vigor <= 0) return FOES[duel.foe.kind].beaten(state, ctx);
  if (state.run.hearts <= 0) return fall(state, ctx);
  return challenge(state, duel, ctx);
};

// time away, the app hidden or the phone locked, never runs a duel's clock: it shifts by the time
export const shift = (state, away) => {
  const duel = state.scene.duel;
  const later = (moment) => moment + away;
  const question = {
    ...duel.question,
    asked: later(duel.question.asked),
    deadline: later(duel.question.deadline),
  };
  const verdict = duel.verdict && { ...duel.verdict, until: later(duel.verdict.until) };
  return out({ ...state, scene: { ...state.scene, duel: { ...duel, question, verdict } } });
};

export const duel = { answer, light, charm };
