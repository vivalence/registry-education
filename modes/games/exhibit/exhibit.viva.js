import { object, Vector, v, mime } from "@vivalence/typology";

const manifest = {
  type: "game",
  slug: "exhibit",
  name: "Exhibit",
  description:
    "Present structured knowledge. Tables, patterns, contrasts. No testing — pure absorption.",
  version: "0.1.0",
  traits: ["VIEWABLE", "EMITTER"],
};

const ontology = ["word", "sentence"];

const buffer = v.buffer({
  data: {
    layout: v.string({ default: "TABLE" }),
    title: v.string({ default: "" }),
    subtitle: v.string().optional(),
    template: v.string().optional(),
  },
});

const views = [
  { slug: "exhibit", mount: "buffer/Exhibit.svelte", mime: mime.dom.svelte },
];

const emitter = new Vector()
  .open("/present", async (ctx) => {
    return ctx.mode.buffer({
      data: {
        layout: ctx.input.layout ?? "TABLE",
        title: ctx.input.title ?? "",
        subtitle: ctx.input.subtitle,
        template: ctx.input.template,
      },
      literals: ctx.input.literals,
    });
  })
  .open("/feed", async (ctx) => {
    const limit = ctx.input.limit ?? 8;
    const literals = await ctx.entities.literal.feed(
      object.merge(ctx.input.where, { ontology: { $in: ontology } }),
      { limit, blacklist: ctx.input.blacklist },
    );
    if (!literals.length) return [];
    return ctx.mode.buffer({
      data: {
        layout: ctx.input.layout ?? "TABLE",
        title: ctx.input.title ?? "",
        subtitle: ctx.input.subtitle,
      },
      literals,
    });
  });

const dataset = {
  intent: [
    {
      slug: "feed",
      name: "Exhibit",
      traits: ["MASKED", "AIMED", "QUEUEING"],
      trait: {
        MASKED: { limit: 8 },
        AIMED: { mount: "/emit/feed" },
        QUEUEING: { depth: 1 },
      },
    },
  ],
};

export { manifest, buffer, views, emitter, dataset };
