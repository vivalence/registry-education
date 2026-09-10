import { Vector, v } from "@vivalence/typology";
import { STATUS } from "../types.js";

// the board — ONE optimized read backing the whole homepage dashboard. Every panel
// (status bar, strength×due scatter, weakest/strongest ranks) derives from this single
// array, so they can never disagree. One note.find over the RETAINED notes, literal populated.
const BOARD = v.array(
  v.object({
    slug: v.string(),
    en: v.string(), // known (english) — the gloss
    pt: v.string(), // learning (brazilian) — the headword
    ontology: v.enum(["word", "sentence", "conjugation"]),
    status: v.enum(STATUS),
    strength: v.number(),
    nextDays: v.number(), // days until review (negative = overdue); 0 when never scheduled
    seen: v.boolean(), // status past UNTOUCHED → has been studied
  }),
);

export const board = new Vector().open(
  { nature: "/assistant/wakeup/board", input: v.object({}), output: BOARD },
  async (ctx) => {
    const DAY = 86_400_000;
    const now = Date.now();
    const retained = await ctx.entities.note.find({ traits: "RETAINED" }, { populate: ["literal"] });
    return retained.map((note) => {
      const literal = note.literal;
      const translated = literal?.trait?.TRANSLATED ?? {};
      const assessed = note.assess(now);
      return {
        slug: literal?.slug ?? "",
        en: translated.known ?? "",
        pt: translated.learning ?? "",
        ontology: literal?.ontology || "word",
        status: assessed.status,
        strength: assessed.strength ?? 0,
        nextDays: assessed.due ? (Date.parse(assessed.due) - now) / DAY : 0,
        seen: assessed.status !== "UNTOUCHED",
      };
    });
  },
);
