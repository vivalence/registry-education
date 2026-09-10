import { Twitch } from "@vivalence/typology";
import { rankOf } from "./traits/literal/ranked.js";

const annotated = (entity) => (entity.trait?.ANNOTATED?.tokens ?? []).map((token) => token.literal).filter(Boolean);

const conjugated = (entity) => {
  const held = entity.trait?.CONJUGATED;
  if (!held) return [];
  return [...Object.values(held.paradigm ?? {}), held.infinitive].filter(Boolean);
};

export const twitch = new Twitch();

for (const op of ["create", "update"]) {
  twitch.open(`/before/literal/${op}`, (ctx) => {
    const { entity } = ctx.input;
    if (entity.trait?.RANKED) entity.trait = { ...entity.trait, RANKED: { ...entity.trait.RANKED, rank: rankOf(entity.trait) } };
  });

  twitch.open(`/after/literal/${op}`, async (ctx) => {
    const slugs = [...new Set([...annotated(ctx.input.entity), ...conjugated(ctx.input.entity)])];
    if (!slugs.length) return;
    const { literal } = ctx.entities;
    const entity = await literal.findOneOrFail({ id: ctx.input.entity.id }, { populate: ["uses"] });
    const used = await literal.find({ slug: { $in: slugs } });
    const missing = used.filter((row) => !entity.uses.contains(row));
    if (!missing.length) return;
    entity.uses.add(missing);
    await literal.em.flush();
  });
}
