import { Vector } from "@vivalence/typology";
import * as types from "./types.js";
import { saved, seat } from "./deal.js";

const SAID =
  "A Wakaru run is on screen: the valley is charted from the learner's own words and painted by what they remember.";

export const tools = new Vector().open(
  {
    nature: "/play",
    valence:
      "Put a Wakaru run on the learner's screen: a top-down valley town in ruins that comes back to life as their words take root. " +
      "The world is read from their memory, never kept beside it — each district is a set of words, a stone is a word (dark until touched, " +
      "gold once held), the spirits that walk are the words due for review, and a district's warden wakes once 60% of its words are held. " +
      "Every duel answer, errand and reply to a keeper is a review on that word's literal; a duel's format climbs with the word's retention status. " +
      "Fills the thread's blank seat when one waits, else mints a new save.",
    input: types.PLAY_INPUT,
  },
  async (ctx) => {
    // the thread's blank seat becomes the run; a second save is minted only when none waits. an
    // outgrown save is a blank seat too
    const saves = await ctx.entities.buffer.find(
      { thread: ctx.thread, mode: ctx.mode.entity.id },
      { filters: false },
    );
    const blank = saves.find((buffer) => !saved(buffer));
    if (blank) {
      await seat(ctx, blank);
      return { message: SAID };
    }
    const emission = await ctx.mode.emit.feed({ thread: ctx.thread });
    return { message: SAID, ...emission.product };
  },
);
