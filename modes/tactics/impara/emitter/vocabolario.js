import { array, random, v, Vector } from "@vivalence/typology";

export const vocabolario = new Vector().open(
  {
    nature: "/vocabolario",
    input: v.object({
      where: v.object({}).optional(),
      limit: v.integer({ minimum: 1, maximum: 40 }).default(12),
      thread: v.string().optional(),
    }),
  },
  async (ctx) => {
    const game = ctx.modes.game;

    const words = await ctx.entities.literal.feed(ctx.input.where, {
      limit: ctx.input.limit,
      blacklist: ctx.input.blacklist,
      populate: ["notes"],
    });
    if (!words.length) return;

    const distractors = await ctx.entities.literal.feed(ctx.input.where, { limit: 30 });

    const untouched = words.filter((word) => !word.assess() || word.assess().is.virgin);
    if (untouched.length && game.exhibit) {
      ctx.pool.add(
        game.exhibit.emit.present({
          layout: "TABLE",
          title: "Nuove parole",
          literals: untouched,
        }),
      );
    }

    const practice = ctx.pool.section();

    for (const word of words) {
      const vocalized = word.traits?.includes("VOCALIZED");

      if (!word.assess() || word.assess().is.virgin) {
        practice.add(
          game.judge
            ? game.judge.emit.literal({
                literal: word,
                distractors,
                recall: "LEARNING",
                speed: { rate: "SLOW" },
              })
            : game["dojo"].emit.literal({
                literal: word,
                distractors,
                gameplay: "PICK",
                recall: "LEARNING",
                preview: { when: "ONCE", speed: { rate: "SLOW" } },
              }),
        );
      } else if (word.assess().is.failed) {
        practice.add(
          game.judge
            ? game.judge.emit.literal({
                literal: word,
                distractors,
                recall: "LEARNING",
                speed: { rate: "FAST" },
              })
            : game["dojo"].emit.literal({
                literal: word,
                distractors,
                gameplay: "PICK",
                recall: "LEARNING",
                preview: { when: "MISSED", speed: { rate: "FAST" } },
              }),
        );
      } else if (vocalized && random.coinflip(0.5)) {
        practice.add(
          game["dojo"].emit.listen.literal({
            literal: word,
            distractors,
            gameplay: word.assess().is.weak ? "PICK" : "TYPE",
            recall: "KNOWN",
          }),
        );
      } else if (word.assess().is.weak) {
        practice.add(game["dojo"].emit.literal({ literal: word, distractors, gameplay: "PICK", recall: "LEARNING" }));
      } else {
        practice.add(game["dojo"].emit.write.literals({ literal: word, recall: "LEARNING" }));
      }
    }

    if (words.length >= 4 && game.match) {
      practice.add(
        game.match.emit.batch({
          literals: words.slice(0, 6),
          gameplay: "TRANSLATE",
          recall: "LEARNING",
        }),
      );
    }

    practice.apply(array.shuffle);
  },
);
