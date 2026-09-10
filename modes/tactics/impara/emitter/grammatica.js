import { array, v, Vector } from "@vivalence/typology";

export const grammatica = new Vector().open(
  {
    nature: "/grammatica",
    input: v.object({
      where: v.object({}).optional(),
      limit: v.integer({ minimum: 1, maximum: 10 }).default(3),
      thread: v.string().optional(),
    }),
  },
  async (ctx) => {
    const game = ctx.modes.game;

    const conjugations = await ctx.entities.literal.feed(
      ctx.input.where,
      {
        limit: ctx.input.limit,
        blacklist: ctx.input.blacklist,
        populate: ["uses", "symbols", "notes"],
      },
    );
    if (!conjugations.length) return;

    const forms = conjugations.flatMap((conjugation) =>
      conjugation.uses.getItems()
    );
    const untouched = forms.filter((form) =>
      !form.assess() || form.assess().is.virgin
    );
    if (untouched.length && game.exhibit) {
      ctx.pool.add(
        game.exhibit.emit.present({
          layout: "TABLE",
          title: "Verbi nuovi",
          literals: untouched,
        }),
      );
    }

    const practice = ctx.pool.section();

    for (const conjugation of conjugations) {
      practice.add(game["dojo"].emit.literals({ literals: [conjugation], gameplay: "CONJUGATE", recall: "LEARNING" }));
    }

    const failed = forms.filter((form) => form.assess()?.is.failed);
    if (failed.length) {
      practice.add(
        game["dojo"].emit.conjugations({
          where: { uses: { $in: failed.map((form) => form.id) } },
          count: failed.length,
        }),
      );
    }

    practice.apply(array.shuffle);
  },
);
