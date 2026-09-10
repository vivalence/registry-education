import { Vector } from "@vivalence/typology";

import * as hal from "./hal/index.js";

export const harness = new Vector().use(async (ctx, next) => {
  ctx.hallucination.primer.open("tutor", [
    hal.tutor.identity,
    hal.tutor.mission,
    hal.tutor.capabilities,
    hal.tutor.language(ctx.statics?.language),
  ].join("\n\n"));
  await next();
});
