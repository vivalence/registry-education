import { fold } from "../duel.js";
import { out } from "../run.js";

// a word put to the learner inside a game: told apart from others of its place, its answer graded
// and reviewed as the duel's are — memory is written by answers, and by nothing else

// a game's pick is among three: quick to read on a phone, each answer big under a thumb
export const CHOICES = 3;

// a game asks only a word that reads on both sides: what it means, and how it is said
export const askable = (world, id) =>
  fold(world.words[id].known) !== "" && fold(world.words[id].learning) !== "";

// a verdict's reviews, as the effects that write the learner's memory
export const reviewed = (verdict) =>
  verdict.reviews.map((review) => ({ type: "review", ...review }));

// a word with a voice is heard; one without stays silent
export const voice = (world, word) =>
  world.words[word].audio === null ? [] : [{ type: "audio", word }];

// the game's word heard again: a replay, never an answer, so it writes nothing
export const hear = (state, value, ctx) => out(state, voice(ctx.world, state.scene.game.word));
