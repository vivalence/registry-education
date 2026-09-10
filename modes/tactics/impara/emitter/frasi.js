import { array, v, Vector } from "@vivalence/typology";

export const frasi = new Vector().open(
  {
    nature: "/frasi",
    input: v.object({
      where: v.object({}).optional(),
      limit: v.integer({ minimum: 1, maximum: 20 }).default(6),
      thread: v.string().optional(),
    }),
  },
  async (ctx) => {
    const game = ctx.modes.game;

    const sentences = await ctx.entities.literal.feed(ctx.input.where, {
      limit: ctx.input.limit,
      blacklist: ctx.input.blacklist,
      populate: ["notes"],
    });
    if (!sentences.length) return;

    const practice = ctx.pool.section();

    for (const sentence of sentences) {
      const vocalized = sentence.traits?.includes("VOCALIZED");

      if (!sentence.assess() || sentence.assess().is.virgin) {
        practice.add(
          game["dojo"].emit.shadow.literals({
            literal: sentence,
            recall: "LEARNING",
            preview: { speed: { rate: "SLOW" } },
          }),
        );
      } else if (vocalized) {
        practice.add(
          game["dojo"].emit.listen.literal({
            literal: sentence,
            gameplay: sentence.assess().is.failed ? "PICK" : "TYPE",
            recall: "LEARNING",
          }),
        );
      } else if (sentence.assess().is.failed) {
        practice.add(
          game["dojo"].emit.shadow.literals({
            literal: sentence,
            recall: "LEARNING",
            preview: { speed: { rate: "SLOW" } },
          }),
        );
      } else {
        practice.add(
          game["dojo"].emit.write.literals({ literal: sentence, recall: "LEARNING" }),
        );
      }
    }

    practice.apply(array.shuffle);
  },
);
