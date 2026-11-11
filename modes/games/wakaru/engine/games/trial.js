import { count, flagged, has, out, raise, tally } from "../run.js";
import { builds, judge, options, picked, scramble } from "../duel.js";
import { draw } from "../random.js";
import { CHOICES, askable, hear, reviewed, voice } from "./question.js";
import { amend, close, moves } from "./scene.js";

// a stone bumped: its card shows the word, what it means, how it is used, and plays its voice. a
// stone not yet read then checks the learner — its meaning among three, then a sentence of it built
// where the place has one — and the last answer lights it. no clock runs and no heart is spent

// a stone lit pays this, once
const COIN = 1;

// a sentence is built from this many tokens or more: fewer are hardly an order to find
const TOKENS = 3;

// what a stone not yet read asks, in order — each check only where it can be asked
const CHECKS = [
  // its meaning among three: a word without one, or alone in its place, has none to tell apart
  (subject, ctx) => {
    if (!askable(ctx.world, subject.word)) return null;
    const choices = options(subject, "known", ctx, CHOICES);
    if (choices.length < 2) return null;
    return { format: "PICK", word: subject.word, recall: "known", options: choices };
  },
  // a sentence of it, built from shuffled tiles
  (subject, ctx) => {
    const sentences = builds(ctx.world, subject).filter(
      (sentence) => sentence.tokens.length >= TOKENS,
    );
    if (sentences.length === 0) return null;
    const sentence = draw(sentences, ctx.random);
    return {
      format: "BUILD",
      word: subject.word,
      sentence: sentence.id,
      order: scramble(sentence.tokens, ctx.random),
      options: null,
    };
  },
];

// a pick has no clock to be swift inside, so a right one is a SUCCESS; a build is the duel's
const GRADES = {
  PICK: (question, value) => picked(question.word, value, "SUCCESS"),
  BUILD: (question, value, ctx) => judge(question, value, ctx),
};

// the trial passed: the stone is met for good, and pays its coin
const light = (state, word) => {
  const flag = `met:${word}`;
  return out(
    { ...state, run: tally(raise(state.run, flag), "coins+", COIN) },
    [
      { type: "met", word },
      { type: "coins", amount: COIN },
    ],
    flagged(state.run, flag),
  );
};

// the card opens, its word heard. a stone read before asks nothing; one with nothing it can ask
// is met by reading its card
const start = (state, args, ctx) => {
  const { word } = args;
  const fresh = !has(state.run, `met:${word}`);
  const subject = { word, place: ctx.world.maps[state.run.pose.map].place };
  const checks = fresh
    ? CHECKS.map((check) => check(subject, ctx)).filter((check) => check !== null)
    : [];
  const game = { kind: "trial", word, fresh, phase: "card", checks, question: null, verdict: null };
  const opened = { ...state, scene: { ...state.scene, game } };
  const effects = [{ type: "game", kind: "trial" }, ...voice(ctx.world, word)];
  if (!fresh || checks.length > 0) return out(opened, effects);
  const met = light(opened, word);
  return out(met.state, [...effects, ...met.effects], met.events);
};

// on from the card or a verdict: the next check posed, or none left, the stone put away
const onward = (state, value, ctx) => {
  const [check, ...checks] = state.scene.game.checks;
  if (check === undefined) return close(state);
  const question = { ...check, asked: ctx.now };
  return out(amend(state, { phase: "asking", checks, question, verdict: null }));
};

// a check takes one answer, graded and reviewed; a miss shows the right one. the last answer,
// right or wrong, lights the stone: what the learner missed is in their memory now, not here
const answer = (state, value, ctx) => {
  const game = state.scene.game;
  const verdict = GRADES[game.question.format](game.question, value, ctx);
  const answered = {
    ...amend(state, { phase: "answered", verdict }),
    run: count(state.run, verdict.right ? "right" : "wrong"),
  };
  if (game.checks.length > 0) return out(answered, reviewed(verdict));
  const met = light(answered, game.word);
  return out(met.state, [...reviewed(verdict), ...met.effects], met.events);
};

const play = moves({
  card: { next: onward, hear },
  asking: { answer, hear },
  answered: { next: onward, hear },
});

// a trial runs no clock
const tick = (state) => out(state);

// time away never counts toward a build's swiftness: the moment its check was posed moves with it
const shift = (state, away) => {
  const { question } = state.scene.game;
  if (question === null) return out(state);
  return out(amend(state, { question: { ...question, asked: question.asked + away } }));
};

export const trial = { start, play, tick, shift, quit: close };
