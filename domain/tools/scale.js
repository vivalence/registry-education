import { v, Vector } from "@vivalence/typology";
import { PROFILE } from "../schematics.js";

export const scale = new Vector().open(
  {
    nature: "/scale",
    valence: [
      "Move the memory strength of a whole set of literals at once, without reviewing each.",
      "Use it when the learner already knows material, or wants a set back in rotation.",
      "Pass exactly one of status or percent.",
    ].join("\n"),
    input: v
      .object({
        where: v
          .record(v.string(), v.unknown())
          .desc("The literal filter; symbols takes an array or { $all, $in, $none }.")
          .example(
            { symbols: ["proficiency.cefr.a1", "conjugation"] },
            {
              symbols: {
                $all: ["conjugation"],
                $in: ["word.lemma.ser", "word.lemma.estar", "word.lemma.ir"],
              },
            },
            { slug: { $in: ["hola.interjection", "gracias.interjection"] } },
          ),
        status: v
          .enum(["UNKNOWN", "LEARNING", "KNOWN", "GRADUATED"])
          .optional()
          .desc(
            "The strength by name: UNKNOWN = back in minutes · LEARNING = two hours · " +
              "KNOWN = three days · GRADUATED = seven weeks.",
          )
          .example("LEARNING"),
        percent: v
          .number({ minimum: 0, maximum: 100 })
          .optional()
          .desc(
            "The strength as a number: 0 = forgotten in a minute · 10 = an hour · " +
              "50 = a month · 100 = a year.",
          )
          .example(40),
        direction: v
          .enum(["advance", "drop", "set"], { default: "advance" })
          .desc(
            "advance = only raise, a stronger literal stays · drop = only lower, a weaker " +
              "literal stays · set = every literal lands on the target.",
          )
          .example("advance"),
      })
      .example({ where: { symbols: ["proficiency.cefr.a1"] }, status: "LEARNING" }),
  },
  async (ctx) => {
    if (!ctx.user?.id) {
      return { condition: "ERROR", message: "scale needs an authorized caller" };
    }
    if ((ctx.input.status == null) === (ctx.input.percent == null)) {
      return { condition: "ERROR", message: "scale takes exactly one of status or percent" };
    }
    const percent = ctx.input.status ? PROFILE[ctx.input.status] : ctx.input.percent;
    const { scaled, kept } = await ctx.call["/scale/literal"]({
      user: ctx.user,
      mode: ctx.mode,
      input: { where: ctx.input.where, percent, direction: ctx.input.direction },
    });
    return {
      message: `${ctx.input.direction}: ${scaled.length} scaled · ${kept.length} kept`,
    };
  },
);
