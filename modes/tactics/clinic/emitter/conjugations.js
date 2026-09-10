import { array } from "@vivalence/typology";
import { weightedPick, avgStrengthOfParadigms, extractParadigm } from "./tools.js";

export default async (ctx, config = {}) => {
  const game = ctx.modes.game;
  const baseSymbols = [...(ctx.input.where?.symbols ?? []), ...(config.symbols ?? [])];
  const groups = config.groups ?? [{ symbols: [], label: "" }];

  const classes = new Map();
  for (const group of groups) {
    const items = await ctx.entities.literal.find(
      {
        ...ctx.input.where,
        ontology: "conjugation",
        symbols: [...baseSymbols, ...group.symbols],
      },
      { populate: ["uses.notes", "symbols", "notes"] },
    );
    if (items.length) classes.set(group.label, items);
  }
  if (!classes.size) return;

  const entries = [...classes.entries()];
  const [, paradigms] =
    entries.length > 1
      ? weightedPick(entries, ([, list]) => 1 - avgStrengthOfParadigms(list))
      : entries[0];

  const conjugation = paradigms[Math.floor(Math.random() * paradigms.length)];
  const { infinitive, forms, tenseSymbol, moodSymbol } = extractParadigm(conjugation);
  if (!forms.length) return;

  if (conjugation.assess()?.is.virgin ?? true) {
    ctx.pool.add(
      game.exhibit.emit.present({
        layout: "TABLE",
        title: infinitive?.trait?.TRANSLATED?.learning ?? config.title ?? "",
        subtitle: [tenseSymbol?.trait?.LABELED?.name, moodSymbol?.trait?.LABELED?.name]
          .filter(Boolean)
          .join(" "),
        literals: forms,
      }),
    );
  }
  ctx.pool.add(game["dojo"].emit.literals({ literals: [conjugation], gameplay: "CONJUGATE", recall: "LEARNING" }));

  const practice = ctx.pool.section();
  for (const form of forms) {
    if (!form.assess() || form.assess().is.virgin || form.assess().is.failed) {
      practice.add(game["dojo"].emit.shadow.literal({ literal: form }));
    }
  }
  practice.apply(array.shuffle);
};
