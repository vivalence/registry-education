import { traits } from "@vivalence/typology";
import { v } from "@vivalence/typology";

export const UNRANKED = 999999;

export const rankOf = (trait) => {
  const ranked = trait?.RANKED;
  if (!ranked) return UNRANKED;
  if (Number.isInteger(ranked.rank) && ranked.rank >= 1) return ranked.rank;
  if (typeof ranked.zipf === "number" && ranked.zipf > 0) return Math.round(10 ** (9 - ranked.zipf));
  return UNRANKED;
};

export const RANKED = traits.define("RANKED", { schematic: v.object({}, { additionalProperties: true }) });
