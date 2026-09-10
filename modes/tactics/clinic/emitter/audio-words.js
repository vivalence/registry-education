import { array, object } from "@vivalence/typology";

export default async (ctx) => {
  const literals = await ctx.entities.literal.feed(
    object.merge({ traits: ["VOCALIZED"] }, ctx.input.where),
    { limit: ctx.input.limit ?? 6, blacklist: ctx.input.blacklist },
  );
  if (!literals.length) return;

  const distractors = await ctx.entities.literal.feed(
    object.merge({ ontology: "word" }, ctx.input.where),
    { limit: 20, blacklist: ctx.input.blacklist },
  );

  for (const literal of literals) {
    const strong = literal.assess() && !literal.assess().is.virgin && literal.assess().strength >= 0.3;
    ctx.pool.add(
      ctx.modes.game["dojo"].emit.listen.literal({
        literal,
        distractors,
        gameplay: strong ? "TYPE" : "PICK",
        recall: "KNOWN",
      }),
    );
  }

  ctx.pool.apply(array.shuffle);
};
