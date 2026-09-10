import { tier as openTier } from "./dial.js";
import { lexemeOf } from "./lexicon.js";

export const SIGNALS = ["MASTERY", "SUCCESS", "NEUTRAL", "MISTAKE", "FAILURE"];

export const passed = (signal) => signal === "MASTERY" || signal === "SUCCESS";

export const review = async (ctx, literal, signal) => {
  const row = await ctx.entities.literal.findOne({ slug: literal });
  if (!row) throw new Error(`[mando] ${literal} is not in the corpus — the lexicon dataset is not installed`);
  const note = await ctx.entities.literal.review(row, signal);
  return { literal, signal, status: note.trait.RETAINED.status };
};

export const frontier = async (ctx, slugs) => {
  const rows = await ctx.entities.literal.find({ slug: { $in: slugs } }, { populate: ["notes"] });
  return Object.fromEntries(rows.map((row) => [row.slug, row.assess()?.status ?? "UNTOUCHED"]));
};

export const glossary = async (ctx, tiers) => {
  const held = await frontier(ctx, tiers.flat());
  const tier = openTier(tiers, held);
  const lexicon = tiers
    .slice(0, tier + 1)
    .flatMap((slugs, index) => slugs.map((slug) => ({ slug, tier: index, surfaces: lexemeOf(slug).surfaces, status: held[slug] ?? "UNTOUCHED" })));
  return { tier, lexicon };
};

export const stated = (reviews) => reviews.map((entry) => `${entry.literal} ${entry.signal} → ${entry.status}`).join("\n");
