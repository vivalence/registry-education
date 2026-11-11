import { Vector } from "@vivalence/typology";
import { fold, remembered, share } from "./engine/atlas.js";
import { HEARTS, coins, has } from "./engine/run.js";
import { chart } from "./engine/world.js";
import { progress } from "./engine/quest.js";
import { atlas, memory, saved } from "./deal.js";

export const ROLE = [
  "You walk beside the learner through Wakaru — a valley town in ruins that comes back to life as their words take root. " +
    "Each district is a set of words: a stone is a word, dark until touched and gold once held; the spirits that walk are the words due for review; " +
    "each district's keeper, an old gardener, speaks only the words the learner holds plus one new one.",
  "Read the [Screen]. When no run is on it, call play. When a run is on it, be a companion on the road: say where they stand and what the place still asks of them, " +
    "and offer a way to remember a word they are close to holding. Never answer a duel, an errand or a keeper's question for them — the game judges it, and every answer is a review.",
  "Speak the language being learned first, the learner's own only when asked, and briefly.",
].join("\n");

export const FORMAT =
  "Markdown renders beside the game: one or two short sentences. Never a heading, never a word list — the screen shows the words.";

const percent = (part) => `${Math.round(part * 100)}%`;

// where the learner stands: the map's own name — the square, a district, or a house, shop or wing
const standing = (world, map) => `in ${world.maps[map].name}`;

// an open place: how much of it the learner holds, and each of its quests at its first unmet step
const account = (world, id, quests, known) => {
  const { name, words } = world.places[id];
  const held = words.filter((word) => remembered(known[word])).length;
  return [
    `${name}: ${held} of ${words.length} words held (${percent(share(known, words))})`,
    ...quests.map(({ quest, step, done }) => `${quest.title}: ${done ? "done" : step.hint}`),
  ].join(" · ");
};

const describe = (world, run, index, known) => {
  const crowned = has(run, "crowned") ? " · crowned, the summit is won" : "";
  const purse = `${run.hearts} of ${HEARTS} hearts · ${coins(run)} coins${crowned}`;
  return [
    `run ${index + 1}: standing ${standing(world, run.pose.map)} · ${purse}`,
    ...Object.entries(progress(world, run, { memory: known })).map(([id, quests]) =>
      account(world, id, quests, known),
    ),
  ].join("\n");
};

// a thread is seated with a blank buffer before any run begins: that is no run, and neither is a
// save the game has outgrown
const runs = async (ctx) => {
  const saves = await ctx.entities.buffer.find(
    { thread: ctx.thread.id, mode: ctx.mode.entity.id },
    { orderBy: { index: "asc" }, filters: false },
  );
  return saves.map(saved).filter(Boolean);
};

// the world the screen charts: the run's seed over the learner's atlas, painted by their memory
export const screen = async (ctx) => {
  const held = await runs(ctx);
  if (!held.length) return "No run is on this thread — call play.";
  const charted = await atlas(ctx);
  const known = fold(charted.words, await memory(ctx, Object.keys(charted.words)));
  return held.map((run, index) => describe(chart(run.seed, charted), run, index, known)).join("\n");
};

export const harness = new Vector().use(async (ctx, next) => {
  ctx.hallucination.primer.open("role", ROLE);
  ctx.screen = `[Screen]\n${await screen(ctx)}`;
  await next();
});

harness.branch("/dialogue").use(async (ctx, next) => {
  ctx.hallucination.primer.open("format", FORMAT);
  ctx.hallucination.primer.open("screen", ctx.screen);
  await next();
});
