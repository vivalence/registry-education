import { Vector } from "@vivalence/typology";
import * as types from "./types.js";
import { begin } from "./deal.js";

// a save carries no words: the world is charted from /atlas, so minting one is minting a fresh run
export const emitter = new Vector().open({ nature: "/feed", input: types.FEED_INPUT }, (ctx) =>
  ctx.mode.buffer({ data: { run: begin() } }),
);
