import { v, Vector } from "@vivalence/typology";
import { board, open, threadOf } from "../harness.js";
import { slugs } from "../mando/lexicon.js";
import { glossary, passed, review, SIGNALS, stated } from "../mando/review.js";
import * as session from "../mando/session.js";
import { tiers } from "../tiers.js";
import * as world from "../world.js";

const COMMAND = v.object({
  prep: v.enum(world.PREPS).desc('The step\'s prep lexeme. Example: "cortar.imperative"'),
  ingredient: v.enum(world.INGREDIENTS).desc('The ingredient lexeme. Example: "cebolla.noun"'),
  count: v.integer({ minimum: 1, maximum: 2 }).default(1).desc("How many; 1 unless a numeral was said. Example: 2"),
});

const REVIEW = v.object({
  literal: v.enum(slugs).desc('A lexeme the learner exercised, by slug. Example: "cortar.imperative"'),
  signal: v.enum(SIGNALS).desc('How it went. Example: "SUCCESS"'),
});

const shown = async (ctx) => {
  const rows = await open(ctx);
  const held = board(rows);
  if (held === null) throw new Error("[cocina] no kitchen is open on this thread — call begin first");
  return { rows, data: held.data };
};

const landed = async (ctx, rows, data) => {
  for (const row of rows) row.data = data;
  await ctx.entities.em.flush();
  return { message: session.screen(data, world.describe, "chef"), buffer: rows, object: data };
};

const stocked = (held, tempo) => (held.tickets.length === 0 ? world.step(held, tempo) : held);

export const tools = new Vector()
  .open(
    {
      nature: "/begin",
      valence: "Open the kitchen on this thread — the tier from the learner's retention, a first ticket on the rail, phase OBEY. Call once, when the [Screen] says no kitchen is open. Example: {}",
      input: v.object({}),
    },
    async (ctx) => {
      const { tier, lexicon } = await glossary(ctx, tiers);
      const data = session.begin({ tier, lexicon, world: world.step(world.create(), 1) });
      const rows = await open(ctx);
      return await landed(ctx, rows.length === 0 ? [await ctx.mode.buffer({ data, thread: threadOf(ctx) })] : rows, data);
    },
  )
  .open(
    {
      nature: "/speak",
      valence: "OBEY only: the kitchen picks a ticket's next step within the open tier and remembers what it expects. Returns the Spanish to say to the learner verbatim. Example: {}",
      input: v.object({}),
    },
    async (ctx) => {
      const { rows, data } = await shown(ctx);
      if (data.phase !== "OBEY") return { condition: "ERROR", message: "phase COMMAND — the learner calls the steps now; wait for their Spanish, then call command" };
      const held = stocked(data.world, data.tempo);
      const spoken = world.speak(held, data.tier);
      const said = world.utterance(spoken);
      const result = await landed(ctx, rows, { ...session.heard(data, spoken, said), world: held });
      return { ...result, message: `say to the learner, verbatim: «${said}»\n${result.message}` };
    },
  )
  .open(
    {
      nature: "/react",
      valence: "OBEY only, after speak: your judgement of the learner's answer to the spoken step. ok advances the ticket and grades the step's lexemes SUCCESS; not ok grades them MISTAKE. Three ok in a row open COMMAND. Example: { ok: true }",
      input: v.object({ ok: v.boolean().desc("Did the learner understand the step? Example: true") }),
    },
    async (ctx) => {
      const { rows, data } = await shown(ctx);
      if (data.spoken === null) return { condition: "ERROR", message: "nothing was spoken — call speak first" };
      const { command, slugs: exercised } = data.spoken;
      const reviews = [];
      for (const slug of exercised) reviews.push(await review(ctx, slug, ctx.input.ok ? "SUCCESS" : "MISTAKE"));
      const cooked = ctx.input.ok ? world.order(data.world, command) : data.world;
      const result = await landed(ctx, rows, session.reacted(data, ctx.input.ok, world.step(cooked, data.tempo)));
      return { ...result, message: `${stated(reviews)}\n${result.message}` };
    },
  )
  .open(
    {
      nature: "/command",
      valence: "COMMAND only: the learner's Spanish, parsed by you. The command cooks on the rail; said is the corrected Spanish; reviews grade each lexeme they exercised. Example: { command: { prep: \"cortar.imperative\", ingredient: \"cebolla.noun\" }, said: \"corta la cebolla\", reviews: [{ literal: \"cortar.imperative\", signal: \"SUCCESS\" }, { literal: \"cebolla.noun\", signal: \"SUCCESS\" }] }",
      input: v.object({ command: COMMAND, said: v.string().desc('The step in correct Spanish. Example: "corta la cebolla"'), reviews: v.array(REVIEW, { minItems: 1, maxItems: 6 }) }),
    },
    async (ctx) => {
      const { rows, data } = await shown(ctx);
      if (data.phase !== "COMMAND") return { condition: "ERROR", message: "phase OBEY — you call the steps now; call speak" };
      const reviews = [];
      for (const entry of ctx.input.reviews) reviews.push(await review(ctx, entry.literal, entry.signal));
      const ok = ctx.input.reviews.every((entry) => passed(entry.signal));
      const cooked = ok ? world.order(data.world, ctx.input.command) : data.world;
      const result = await landed(ctx, rows, session.commanded(data, ok, ctx.input.said, world.step(cooked, data.tempo)));
      return { ...result, message: `${ok ? (cooked.cook.hit ? "a ticket advanced" : "cooked, but no ticket wanted that") : "not cooked — a lexeme missed"}\n${stated(reviews)}\n${result.message}` };
    },
  );
