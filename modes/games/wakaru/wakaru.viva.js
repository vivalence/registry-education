import { mime, v } from "@vivalence/typology";
import * as types from "./types.js";

export { emitter } from "./emitter.js";
export { aperture } from "./aperture.js";
export { tools } from "./tools.js";
export { harness } from "./harness.js";

export const manifest = {
  type: "game",
  slug: "wakaru",
  name: "Wakaru",
  description:
    "A valley you walk, charted from the learner's own memory: a square, eight districts and their houses, three wings and a dark summit. Read the word stones, catch the due words that roam as spirits, fish, answer the keepers, wake the wardens — every answer a review.",
  version: "0.3.0",
  traits: ["VIEWABLE", "EMITTER", "INTENTED", "EXPOSED", "TOOLING", "HARNESS"],
};

export const buffer = v
  .buffer({
    data: {
      run: types.run.optional(),
    },
  })
  .desc(
    `Wakaru: one buffer is one save, and a save keeps only data.run. A buffer without data.run is a blank seat: /begin puts a fresh run on it, and so does a save of a shape the game has outgrown.
Game state lives here; language state lives in the domain. The game never counts what the learner knows — every graded answer is a review on a literal, and the world reads the learner's memory back.
The world is never stored. data.run.seed + /atlas chart it over authored maps: the square at its heart, eight districts around it — each a set of words (symbol sets) by frequency, with the sentences that use them — their houses, the shop, three wings off the square (the Stacks: the learner's own feed outside every district; the Hall of Forms: the function words; the Forge: the conjugations), and a dark cave up to the summit. Every word stands as a stone on its place's map, dark while untouched, lit once touched, gold once held (/memory paints it); an unread stone opens a short trial.
Spirits are the learner's due words (/spirits): they roam their district's tall grass, see the learner, give chase, and a duel or a haunt's pair match lays them to rest — reviewing their words; tomorrow they walk again where words fall due. A duel's format climbs with the word's retention status — recognise its meaning, then produce it — so the difficulty ladder is the memory model. A rod fishes a due word out of any water.
A district blooms with the share of its words held; its warden wakes once 60% are held, and its fall restores the district and opens the next. Chests, pots, the shop, a lantern for the dark and a compass for travel are the game's own.
Each keeper is an old gardener who speaks through the cortex in the learning language using only words the learner holds plus one new one (/speak, /ask), plays the corpus sentence they can almost read (/listen), and grades a typed reply server-side, reviewing it (/judge). The shrine's daily round walks every due word (/spirits null, /daily).
The screen runs the engine — beat(state, action, ctx) → state, effects, events — plays the effects, and keeps data.run through /keep, quietly. The summit's fall raises crowned and the buffer goes DONE.`,
  );

export const views = [{ slug: "wakaru", mount: "buffer/Wakaru.svelte", mime: mime.dom.svelte }];

export const dataset = {
  intent: [
    {
      slug: "wander",
      name: "Wakaru",
      traits: ["AIMED", "QUEUEING"],
      trait: {
        AIMED: { mount: "/emit/feed" },
        QUEUEING: { depth: 1 },
      },
    },
  ],
};
