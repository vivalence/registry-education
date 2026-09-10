import { v, Vector } from "@vivalence/typology";
import { board, open, threadOf } from "../harness.js";
import { slugs } from "../mando/lexicon.js";
import { glossary, passed, review, SIGNALS, stated } from "../mando/review.js";
import * as session from "../mando/session.js";
import { tiers } from "../tiers.js";
import * as world from "../world.js";

const COMMAND = v.object({
  kind: v.enum(["move", "stop"]).desc('move or stop. Example: "move"'),
  direction: v.enum(world.DIRECTIONS).optional().desc('The direction lexeme, for a move. Example: "izquierda.noun"'),
  count: v.integer({ minimum: 1, maximum: 3 }).default(1).desc("Cells to move; 1 unless a numeral was said. Example: 2"),
  unit: v.enum(world.UNITS).optional().desc('The unit addressed, when named. Example: "soldado.noun"'),
  color: v.enum(world.COLORS).optional().desc('The colour addressed, when named. Example: "rojo.adjective"'),
});

const REVIEW = v.object({
  literal: v.enum(slugs).desc('A lexeme the learner exercised, by slug. Example: "subir.imperative"'),
  signal: v.enum(SIGNALS).desc('How it went. Example: "SUCCESS"'),
});

const normalized = (command) => ({ kind: command.kind, direction: command.direction ?? null, count: command.count, unit: command.unit ?? null, color: command.color ?? null });

const shown = async (ctx) => {
  const rows = await open(ctx);
  const held = board(rows);
  if (held === null) throw new Error("[comando] no board is open on this thread — call begin first");
  return { rows, data: held.data };
};

const landed = async (ctx, rows, data) => {
  for (const row of rows) row.data = data;
  await ctx.entities.em.flush();
  return { message: session.screen(data, world.describe, "commander"), buffer: rows, object: data };
};

export const tools = new Vector()
  .open(
    {
      nature: "/begin",
      valence: "Open the board on this thread — the tier from the learner's retention, a fresh world, phase OBEY. Call once, when the [Screen] says no board is open. Example: { units: 1 }",
      input: v.object({ units: v.integer({ minimum: 1, maximum: 3 }).default(1).desc("Units on the board. Example: 1") }),
    },
    async (ctx) => {
      const { tier, lexicon } = await glossary(ctx, tiers);
      const data = session.begin({ tier, lexicon, world: world.create({ units: ctx.input.units }) });
      const rows = await open(ctx);
      return await landed(ctx, rows.length === 0 ? [await ctx.mode.buffer({ data, thread: threadOf(ctx) })] : rows, data);
    },
  )
  .open(
    {
      nature: "/speak",
      valence: "OBEY only: the world picks this beat's order within the open tier and remembers what it expects. Returns the Spanish to say to the learner verbatim. Example: {}",
      input: v.object({}),
    },
    async (ctx) => {
      const { rows, data } = await shown(ctx);
      if (data.phase !== "OBEY") return { condition: "ERROR", message: "phase COMMAND — the learner commands now; wait for their Spanish, then call command" };
      const spoken = world.speak(data.world, data.tier);
      const said = world.utterance(spoken);
      const result = await landed(ctx, rows, session.heard(data, spoken, said));
      return { ...result, message: `say to the learner, verbatim: «${said}»\n${result.message}` };
    },
  )
  .open(
    {
      nature: "/react",
      valence: "OBEY only, after speak: your judgement of the learner's answer to the spoken order. ok moves the unit as ordered and grades the order's lexemes SUCCESS; not ok grades them MISTAKE. Three ok in a row open COMMAND. Example: { ok: true }",
      input: v.object({ ok: v.boolean().desc("Did the learner understand the order? Example: true") }),
    },
    async (ctx) => {
      const { rows, data } = await shown(ctx);
      if (data.spoken === null) return { condition: "ERROR", message: "nothing was spoken — call speak first" };
      const { command, slugs: exercised } = data.spoken;
      const reviews = [];
      for (const slug of exercised) reviews.push(await review(ctx, slug, ctx.input.ok ? "SUCCESS" : "MISTAKE"));
      const moved = ctx.input.ok ? world.order(data.world, command) : data.world;
      const result = await landed(ctx, rows, session.reacted(data, ctx.input.ok, world.step(moved, data.tempo)));
      return { ...result, message: `${stated(reviews)}\n${result.message}` };
    },
  )
  .open(
    {
      nature: "/command",
      valence: "COMMAND only: the learner's Spanish, parsed by you. The command moves the board; said is the corrected Spanish; reviews grade each lexeme they exercised. Example: { command: { kind: \"move\", direction: \"arriba.adverb\", count: 2 }, said: \"sube dos arriba\", reviews: [{ literal: \"subir.imperative\", signal: \"SUCCESS\" }, { literal: \"dos.numeral\", signal: \"SUCCESS\" }, { literal: \"arriba.adverb\", signal: \"SUCCESS\" }] }",
      input: v.object({ command: COMMAND, said: v.string().desc('The command in correct Spanish. Example: "sube dos arriba"'), reviews: v.array(REVIEW, { minItems: 1, maxItems: 6 }) }),
    },
    async (ctx) => {
      const { rows, data } = await shown(ctx);
      if (data.phase !== "COMMAND") return { condition: "ERROR", message: "phase OBEY — you command now; call speak" };
      const command = normalized(ctx.input.command);
      if (command.kind === "move" && command.direction === null) return { condition: "ERROR", message: "a move needs a direction" };
      const reviews = [];
      for (const entry of ctx.input.reviews) reviews.push(await review(ctx, entry.literal, entry.signal));
      const ok = ctx.input.reviews.every((entry) => passed(entry.signal));
      const moved = ok ? world.order(data.world, command) : data.world;
      const result = await landed(ctx, rows, session.commanded(data, ok, ctx.input.said, world.step(moved, data.tempo)));
      return { ...result, message: `${ok ? "executed" : "not executed — a lexeme missed"}\n${stated(reviews)}\n${result.message}` };
    },
  );
