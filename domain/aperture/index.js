import { Aperture, fromm, object } from "@vivalence/typology";
import { is } from "@vivalence/typology";
import { LANGUAGE } from "../schematics.js";

const languages = (ctx) => {
  const declared = ctx.statics?.language ?? {};
  const provided = fromm.modes(ctx.modes).flat.map((mode) => mode.statics?.language ?? {});
  const side = (entry) =>
    entry?.slug ? LANGUAGE.cast(object.merge(...provided.map((table) => table[entry.slug] ?? {}), entry)) : null;
  return { known: side(declared.known), learning: side(declared.learning) };
};

export const aperture = new Aperture()
  .open("/language", (input, ctx) => languages(ctx))

  .open("/pick/literal/feed", async (input, ctx) => {
    return ctx.entities.literal.feed(input.where, { limit: input.limit || 10, blacklist: input.blacklist });
  })

  .open("/pick/literal/novel", async (input, ctx) => {
    return ctx.entities.literal.novel(input.where, { limit: input.limit || 10, blacklist: input.blacklist });
  })

  .open("/pick/literal/due", async (input, ctx) => {
    return ctx.entities.literal.due(input.where, { limit: input.limit || 10, blacklist: input.blacklist });
  })

  .open("/pick/literal/byStatus", async (input, ctx) => {
    const { blacklist, where, status } = input;
    const limit = input.limit || 10;
    return ctx.entities.literal.sample(where, { status: [status].flat(), blacklist, limit });
  })

  .open("/pick/literal/byStrength", async (input, ctx) => {
    return ctx.entities.literal.byStrength(input.where, { limit: input.limit || 10, blacklist: input.blacklist });
  })

  .open("/review/literal", async (input, ctx) => {
    const { scope = {}, signal } = input;

    const ref = scope.literal || input.literal;
    if (!ref) return { status: "bounce", message: "literal required" };

    const query = is.id(ref) ? ref : typeof ref === "string" ? { slug: ref } : ref;
    const literal = await ctx.entities.literal.findOne(query);
    if (!literal) return { status: "bounce", message: "literal not found" };

    return ctx.entities.literal.review(literal, signal);
  });
