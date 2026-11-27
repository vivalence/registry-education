import { Path, Vector } from "@vivalence/typology";
import paladin from "@vivalence/paladin";

export const primer = await paladin.find.primer(new Path(import.meta.resolve("./primer")));

export const harness = new Vector().use(async (ctx, next) => {
  ctx.hallucination.policy.tier ??= "capable";
  await next();
});
