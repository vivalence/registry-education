import { SWIFT, options, picked } from "../duel.js";
import { count, has, out } from "../run.js";
import { draw } from "../random.js";
import { CHOICES, askable, hear, reviewed, voice } from "./question.js";
import { amend, close, moves } from "./scene.js";

// a rod cast into water: the float sits, a fish bites, the learner hooks it in time, and the fish
// is a word — named right, it is landed. hooked too soon or too late it is lost unasked, and what
// was never asked is never reviewed

// the float sits this long, at the least and at the most, from the cast to the bite
export const WAIT = { least: 2000, most: 6000 };

// a bite stays on the hook this long
export const HOOK = 1200;

// a hooked fish waits this long for its word to be named
export const CATCH = 6000;

// what bites here, a word of this map's place that reads on both sides: a due one first, else
// one whose stone is read, else the place's signature. a map of no place has nothing in its water
const lure = (state, ctx) => {
  const place = ctx.world.maps[state.run.pose.map].place;
  if (place === null) return null;
  const { words, signature } = ctx.world.places[place];
  const askables = words.filter((word) => askable(ctx.world, word));
  const pools = [
    askables.filter((word) => ctx.due.includes(word)),
    askables.filter((word) => has(state.run, `met:${word}`)),
    askables.filter((word) => word === signature),
  ];
  const pool = pools.find((candidates) => candidates.length > 0);
  return pool === undefined ? null : draw(pool, ctx.random);
};

// the cast: the bite falls between WAIT's bounds, as the dice fall. water with nothing to bite in
// it is only water
const start = (state, args, ctx) => {
  const bite = ctx.now + WAIT.least + Math.round(ctx.random() * (WAIT.most - WAIT.least));
  const word = lure(state, ctx);
  if (word === null) return out(state, [{ type: "bump" }]);
  const game = {
    kind: "fishing",
    spot: args.spot,
    word,
    phase: "waiting",
    bite,
    slip: bite + HOOK,
    question: null,
    verdict: null,
  };
  return out({ ...state, scene: { ...state.scene, game } }, [{ type: "game", kind: "fishing" }]);
};

// hooked before the bite: there was nothing on the line yet, and the fish is gone
const spook = (state) => out(amend(state, { phase: "spooked" }));

// hooked inside the bite's window: the catch is put to the learner, heard when it has a voice,
// read when it has none, and its clock runs
const hook = (state, value, ctx) => {
  const game = state.scene.game;
  const place = ctx.world.maps[state.run.pose.map].place;
  const question = {
    format: ctx.world.words[game.word].audio === null ? "PICK" : "LISTEN",
    word: game.word,
    recall: "known",
    options: options({ word: game.word, place }, "known", ctx, CHOICES),
    asked: ctx.now,
    deadline: ctx.now + CATCH,
  };
  return out(amend(state, { phase: "asking", question }), voice(ctx.world, game.word));
};

// named right, the fish is landed — MASTERY inside the first third of its clock; named wrong, it
// gets away
const answer = (state, value, ctx) => {
  const game = state.scene.game;
  const swift = ctx.now - game.question.asked <= CATCH * SWIFT;
  const verdict = picked(game.word, value, swift ? "MASTERY" : "SUCCESS");
  const tallied = count(state.run, verdict.right ? "right" : "wrong");
  return out(
    {
      ...amend(state, { phase: verdict.right ? "caught" : "lost", verdict }),
      run: verdict.right ? count(tallied, "gained:fish") : tallied,
    },
    [...reviewed(verdict), ...(verdict.right ? [{ type: "catch", word: game.word }] : [])],
  );
};

// the catch's clock ran out unanswered: it gets away, a FAILURE on its word
const lapse = (state) => {
  const verdict = {
    right: false,
    signal: "FAILURE",
    value: null,
    reviews: [{ literal: state.scene.game.word, signal: "FAILURE" }],
  };
  return out(
    { ...amend(state, { phase: "lost", verdict }), run: count(state.run, "wrong") },
    reviewed(verdict),
  );
};

const play = moves({
  waiting: { hook: spook },
  biting: { hook },
  asking: { answer, hear },
  caught: { next: close, hear },
  lost: { next: close, hear },
  spooked: { next: close },
  slipped: { next: close },
});

// the line's clock: the float dips at the bite, a bite left unhooked slips off, a catch left
// unnamed gets away. the window opens at the bite itself, however late the tick that saw it
const tick = (state, ctx) => {
  const game = state.scene.game;
  if (game.phase === "waiting" && ctx.now >= game.bite)
    return tick(amend(state, { phase: "biting" }), ctx);
  if (game.phase === "biting" && ctx.now >= game.slip)
    return out(amend(state, { phase: "slipped" }));
  if (game.phase === "asking" && ctx.now >= game.question.deadline) return lapse(state);
  return out(state);
};

// time away never runs the line: the bite, its window and the catch's clock all move by it
const shift = (state, away) => {
  const game = state.scene.game;
  const later = (moment) => moment + away;
  const question = game.question && {
    ...game.question,
    asked: later(game.question.asked),
    deadline: later(game.question.deadline),
  };
  return out(amend(state, { bite: later(game.bite), slip: later(game.slip), question }));
};

export const fishing = { start, play, tick, shift, quit: close };
