import { Vector } from "@vivalence/typology";
import { gestalten } from "@vivalence/runtime";

import { progress } from "./progress.js";
import { lookup } from "./lookup.js";
import { queue } from "./queue.js";
import { review } from "./review.js";
import { scale } from "./scale.js";

export const tools = new Vector()
  .graft(progress)
  .graft(lookup)
  .graft(queue)
  .graft(review)
  .graft(scale)
  .graft(gestalten.tools.literal)
  .graft(gestalten.tools.symbol);
