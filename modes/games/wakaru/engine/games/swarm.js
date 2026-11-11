import { fold } from "../duel.js";
import { count, held, out, tally } from "../run.js";
import { shuffle } from "../random.js";
import { askable, voice } from "./question.js";
import { amend, close, moves } from "./scene.js";

// the spirits gathered at a haunt, as pairs under one clock: each word on the left, each meaning on
// the right. a pair made lays its spirit to rest; a word mis-paired first is a MISTAKE when it is
// paired at last; a word the clock leaves unpaired is a FAILURE. every word is reviewed once, and
// what it was reviewed as stays on the game for the learner to read. no heart is spent

// at most this many spirits gather
const PAIRS = 5;

// one word beside one meaning answers itself: a match needs two pairs at the least
const FEWEST = 2;

// the swarm's clock, and what a charm spent on it adds
export const CLOCK = 30000;
export const CHARM = 10000;

// a spirit rested at a haunt pays this
const COINS = 3;

// nothing taken on either side
const NONE = { left: null, right: null };

// two words that read alike on either side would pair either way
const alike = (world, one, other) =>
  ["learning", "known"].some(
    (side) => fold(world.words[one][side]) === fold(world.words[other][side]),
  );

// the spirits that gather: the scene's own, in its order, each a word that reads on both sides
// and like none gathered before it
const gather = (world, spirits) =>
  spirits
    .map((spirit) => spirit.word)
    .filter((word) => askable(world, word))
    .reduce(
      (gathered, word) =>
        gathered.some((other) => alike(world, word, other)) ? gathered : [...gathered, word],
      [],
    )
    .slice(0, PAIRS);

// the meanings never stand in their words' order: read straight across, it would answer itself
const across = (left, right) =>
  right.every((word, row) => word === left[row]) ? [...right.slice(1), right[0]] : right;

// the haunt wakes on the spirits that gather; too few, and it sleeps
const start = (state, args, ctx) => {
  const words = gather(ctx.world, state.scene.spirits);
  if (words.length < FEWEST) return out(state, [{ type: "quiet" }]);
  const left = shuffle(words, ctx.random);
  const game = {
    kind: "swarm",
    haunt: args.haunt,
    phase: "playing",
    left,
    right: across(left, shuffle(words, ctx.random)),
    chosen: NONE,
    miss: null,
    missed: [],
    reviewed: {},
    since: ctx.now,
    until: ctx.now + CLOCK,
    charms: held(state.run, "charm"),
    charmed: false,
  };
  return out({ ...state, scene: { ...state.scene, game } }, [{ type: "game", kind: "swarm" }]);
};

// a word reviewed is settled: laid to rest, or left unpaired when the clock ran out
const settled = (game, word) => word in game.reviewed;

// a spirit laid to rest: its word reviewed once — a MISTAKE if it was mis-paired first — its
// place's tally rises, its coins are paid, it leaves the map. the last one clears the haunt
const rest = (state, word, ctx) => {
  const game = state.scene.game;
  const place = ctx.world.maps[state.run.pose.map].place;
  const signal = game.missed.includes(word) ? "MISTAKE" : "SUCCESS";
  const reviewed = { ...game.reviewed, [word]: signal };
  const phase = game.left.every((one) => one in reviewed) ? "cleared" : "playing";
  const { scene } = amend(state, { chosen: NONE, reviewed, phase });
  return out(
    {
      run: tally(count(count(state.run, "right"), `rested:${place}`), "coins+", COINS),
      scene: { ...scene, spirits: scene.spirits.filter((spirit) => spirit.word !== word) },
    },
    [
      { type: "review", literal: word, signal },
      { type: "rested", word },
      { type: "coins", amount: COINS },
    ],
  );
};

// a pair tried: a word and its own meaning rest its spirit; any other meaning marks the word on the
// left as mis-paired, and both tiles are let go
const pair = (state, ctx) => {
  const { chosen, missed } = state.scene.game;
  if (chosen.left === chosen.right) return rest(state, chosen.left, ctx);
  const marked = missed.includes(chosen.left) ? missed : [...missed, chosen.left];
  return out({
    ...amend(state, { chosen: NONE, miss: chosen, missed: marked }),
    run: count(state.run, "wrong"),
  });
};

// a tile taken on one side — taken again, it is let go. a word is heard as it is taken; with a
// tile taken on each side, the two are tried as a pair
const choose = (side) => (state, word, ctx) => {
  const game = state.scene.game;
  if (!game[side].includes(word) || settled(game, word)) return out(state);
  const chosen = { ...game.chosen, [side]: game.chosen[side] === word ? null : word };
  const taken = amend(state, { chosen, miss: null });
  const heard = side === "left" && chosen.left === word ? voice(ctx.world, word) : [];
  if (chosen.left === null || chosen.right === null) return out(taken, heard);
  const tried = pair(taken, ctx);
  return out(tried.state, [...heard, ...tried.effects], tried.events);
};

// a charm spent, once a swarm, holds the spirits CHARM longer
const charm = (state) => {
  const game = state.scene.game;
  if (game.charmed || held(state.run, "charm") <= 0) return out(state);
  return out({
    ...amend(state, { charmed: true, charms: game.charms - 1, until: game.until + CHARM }),
    run: count(state.run, "used:charm"),
  });
};

const play = moves({
  playing: { left: choose("left"), right: choose("right"), charm },
  cleared: { next: close },
  over: { next: close },
});

// the clock ran out: every word still unpaired is a FAILURE, and its spirit stays
const disperse = (state) => {
  const game = state.scene.game;
  const unpaired = game.left.filter((word) => !settled(game, word));
  const failed = Object.fromEntries(unpaired.map((word) => [word, "FAILURE"]));
  return out(
    {
      ...amend(state, {
        phase: "over",
        chosen: NONE,
        miss: null,
        reviewed: { ...game.reviewed, ...failed },
      }),
      run: tally(state.run, "wrong", unpaired.length),
    },
    unpaired.map((word) => ({ type: "review", literal: word, signal: "FAILURE" })),
  );
};

const tick = (state, ctx) => {
  const game = state.scene.game;
  return game.phase === "playing" && ctx.now >= game.until ? disperse(state) : out(state);
};

// time away never runs the swarm's clock
const shift = (state, away) => {
  const game = state.scene.game;
  return out(amend(state, { since: game.since + away, until: game.until + away }));
};

// leaving the haunt: a word mis-paired was answered wrong, and is reviewed so before the spirits
// scatter; a word never tried was never answered, and writes nothing
const quit = (state) => {
  const game = state.scene.game;
  const owed = game.missed.filter((word) => !settled(game, word));
  return out(
    close(state).state,
    owed.map((word) => ({ type: "review", literal: word, signal: "MISTAKE" })),
  );
};

export const swarm = { start, play, tick, shift, quit };
