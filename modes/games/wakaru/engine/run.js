import { MAPS } from "./maps/index.js";

// one game run, whole: what the buffer keeps. knowledge is never here — it lives in the learner's memory.

export const HEARTS = 5;

// every run wakes on the square, at its start — the square already visited, so travel finds it
export const fresh = (seed) => ({
  seed,
  flags: ["visited:square"],
  counters: { steps: 0, right: 0, wrong: 0, falls: 0 },
  pose: { map: "square", ...MAPS.square.spawns.start },
  hearts: HEARTS,
});

export const has = (run, flag) => run.flags.includes(flag);

export const raise = (run, flag) =>
  has(run, flag) ? run : { ...run, flags: [...run.flags, flag] };

export const tally = (run, counter, by = 1) => ({
  ...run,
  counters: { ...run.counters, [counter]: (run.counters[counter] ?? 0) + by },
});

export const count = (run, counter) => tally(run, counter, 1);

export const read = (run, counter) => run.counters[counter] ?? 0;

// coins and items are grow-only tallies: what came in minus what went out
export const coins = (run) => read(run, "coins+") - read(run, "coins-");

export const held = (run, item) => read(run, `gained:${item}`) - read(run, `used:${item}`);

// a beat's answer: the next state, what the screen must do, what happened
export const out = (state, effects = [], events = []) => ({ state, effects, events });

export const flagged = (run, flag) => (has(run, flag) ? [] : [{ type: "flag", flag }]);
