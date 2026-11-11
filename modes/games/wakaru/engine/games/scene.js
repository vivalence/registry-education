import { out } from "../run.js";

// the open game lives in the scene: amended in place, put away, and moved by the phase it is in

export const amend = (state, fields) => ({
  ...state,
  scene: { ...state.scene, game: { ...state.scene.game, ...fields } },
});

// the game put away: the learner stands in the world again
export const close = (state) => out({ ...state, scene: { ...state.scene, game: null } });

// a game's play, from what each of its phases takes: a move { name: value } the phase does not
// take is let go — a tap that lands after the clock moved the game on changes nothing
export const moves = (phases) => (state, move, ctx) => {
  const [[name, value]] = Object.entries(move);
  const take = phases[state.scene.game.phase][name];
  return take === undefined ? out(state) : take(state, value, ctx);
};
