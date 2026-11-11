import { out } from "../run.js";
import { trial } from "./trial.js";
import { fishing } from "./fishing.js";
import { swarm } from "./swarm.js";

// a mini-game is a scene the walk opens — scene.game = { kind, ... } — and every kind answers five:
//   start(state, args, ctx) → out   the walk opens it: trial { word } on a stone, fishing { spot } on
//                                   water while a rod is held, swarm { haunt } at a haunt
//   play(state, move, ctx) → out    the learner's move, from { type: "play", move }
//   tick(state, ctx) → out          its clock, every tick while it is up
//   shift(state, away) → out        time away shifts its clock
//   quit(state) → out               the learner leaves it: an answer already given and not yet
//                                   reviewed is reviewed now, and scene.game goes back to null
// it ends itself the same way. every graded answer in it emits { type: "review", literal, signal },
// exactly as a duel's does.
export const GAMES = { trial, fishing, swarm };

// a move is judged where the game's clock stands at its moment: what ran out before it, ran out,
// however late the last tick came
const play = (state, action, ctx) => {
  if (state.scene.game === null) return out(state);
  const rules = GAMES[state.scene.game.kind];
  const ticked = rules.tick(state, ctx);
  const moved = rules.play(ticked.state, action.move, ctx);
  return out(
    moved.state,
    [...ticked.effects, ...moved.effects],
    [...ticked.events, ...moved.events],
  );
};

const quit = (state) =>
  state.scene.game === null ? out(state) : GAMES[state.scene.game.kind].quit(state);

export const games = { play, quit };
