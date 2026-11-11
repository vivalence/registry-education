import { walk } from "./beats/walk.js";
import { duel } from "./beats/duel.js";
import { talk } from "./beats/talk.js";
import { clock } from "./beats/clock.js";
import { games } from "./games/index.js";
import { settle } from "./quest.js";
import { breathe } from "./spirits.js";
import { busy } from "./world.js";

const BEATS = { ...walk, ...duel, ...talk, ...games, ...clock };

// a beat that frees the learner from a duel, a game or a talk lets them breathe: the spirits that
// hunted them walk home, and none keeps watch for a while
const freed = (before, after, now) =>
  busy(before.scene) && !busy(after.scene) ? { ...after, scene: breathe(after.scene, now) } : after;

// the one rule of the game: (state, action, ctx) → the next state, what the screen must do, what happened.
// ctx = { world, memory, due, now, random } — the beat reads no global, so a run replays.
// every beat's events then settle the quests, so a reward lands on the beat that earned it.
export const beat = (state, action, ctx) => {
  const result = BEATS[action.type](state, action, ctx);
  const settled = settle(freed(state, result.state, ctx.now), ctx);
  return {
    state: settled.state,
    effects: [...result.effects, ...settled.effects],
    events: [...result.events, ...settled.events],
  };
};
