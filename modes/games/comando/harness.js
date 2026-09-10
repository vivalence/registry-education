import { Vector } from "@vivalence/typology";
import { glossary } from "./mando/review.js";
import { glossed, screen } from "./mando/session.js";
import { tiers } from "./tiers.js";
import { describe } from "./world.js";

export const ROLE = [
  "You are the commander of a small board — units, goals, hazards — and the learner is your radio operator learning Spanish. Spanish is the only controller: the board moves on Spanish and nothing else.",
  "Two phases, read from the [Screen]. OBEY: you command. Call speak to get this beat's order, then say that order to the learner verbatim in Spanish — nothing else, no translation. The learner answers in Spanish with what they do (or asks). Judge whether they understood the order, then call react with ok; the tool moves the unit when ok and grades the order's words. COMMAND: the learner commands you. Parse their Spanish against the [Lexicon] into a command, call command with the parsed command, the corrected Spanish (said), and one review per lexeme they exercised — SUCCESS when the form was right, MISTAKE when close, FAILURE when wrong or missing. Then answer in one short Spanish sentence saying what the board did; echo the corrected form only when it differs from what they typed.",
  "The board opens when the thread has none: call begin first. Every order you give uses only lexemes from the [Lexicon], never a word beyond the open tiers. English only when the learner asks for it, and briefly.",
].join("\n");

export const FORMAT = "Markdown renders beside the board: one short sentence, Spanish first. Never a heading, never a list of the lexicon — the screen shows it.";

export const threadOf = (ctx) => (ctx.thread === null || ctx.thread === undefined ? null : (ctx.thread.id ?? ctx.thread));

export const open = async (ctx) => {
  const thread = threadOf(ctx);
  if (thread === null) return [];
  return await ctx.entities.buffer.find({ thread, mode: ctx.mode.entity.id }, { orderBy: { index: "asc" }, filters: false });
};

export const board = (rows) => rows.find((row) => row.data.world !== undefined) ?? null;

export const harness = new Vector().use(async (ctx, next) => {
  const row = board(await open(ctx));
  const held = row === null ? await glossary(ctx, tiers) : { lexicon: row.data.lexicon };
  ctx.hallucination.primer.open("role", ROLE);
  ctx.hallucination.primer.open("lexicon", `[Lexicon] slug — surfaces · retention\n${glossed(held.lexicon)}`);
  ctx.screen = `[Screen]\n${screen(row === null ? null : row.data, describe, "commander")}`;
  await next();
});

harness.branch("/dialogue").use(async (ctx, next) => {
  ctx.hallucination.primer.open("format", FORMAT);
  ctx.hallucination.primer.open("screen", ctx.screen);
  await next();
});
