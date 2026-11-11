import { walk } from "./beats/walk.js";
import { duel } from "./beats/duel.js";
import { talk } from "./beats/talk.js";
import { settle } from "./quest.js";

const BEATS = { ...walk, ...duel, ...talk };

// the one rule of the game: (state, action, ctx) → the next state, what the screen must do, what happened.
// ctx = { world, memory, due, now, random } — the beat reads no global, so a run replays.
// every beat's events then settle the quests, so a reward lands on the beat that earned it.
export const beat = (state, action, ctx) => {
  const result = BEATS[action.type](state, action, ctx);
  const settled = settle(result.state, ctx);
  return {
    state: settled.state,
    effects: [...result.effects, ...settled.effects],
    events: [...result.events, ...settled.events],
  };
};

export const ACTIONS = Object.keys(BEATS);
