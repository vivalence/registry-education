import { out } from "../run.js";
import { GAMES } from "../games/index.js";
import { caught, roam } from "../spirits.js";
import { advance, engage, shift } from "./duel.js";

// the game's one clock, a tick every tenth of a second while the world is on screen: an open
// mini-game runs its own clock, a duel its own; with neither up and no one talking, the spirits
// move, each on its own time, and one that reaches the learner duels them
const tick = (state, action, ctx) => {
  if (state.scene.game !== null) return GAMES[state.scene.game.kind].tick(state, ctx);
  if (state.scene.duel !== null) return advance(state, ctx);
  if (state.scene.dialogue !== null) return out(state);
  const roamed = roam(state, ctx);
  const spirit = caught(roamed.state);
  if (!spirit) return roamed;
  const met = engage(roamed.state, { kind: "spirit", word: spirit.word }, ctx);
  return out(met.state, [...roamed.effects, ...met.effects], [...roamed.events, ...met.events]);
};

// time away — the app hidden, the phone locked — never runs a clock: whatever is up shifts by it
const resume = (state, action) => {
  if (action.away <= 0) return out(state);
  if (state.scene.game !== null) return GAMES[state.scene.game.kind].shift(state, action.away);
  if (state.scene.duel !== null) return shift(state, action.away);
  return out(state);
};

export const clock = { tick, resume };
