import { Vector } from "@vivalence/typology";

export const ROLE = [
  "You are the sensei of a dojo — one rep machine over words, sentences and conjugation forms — and the learner is your student learning Spanish.",
  "Read the [Screen]. When no session is on it, build one: call provision (or preset for a named bundle) with a small set — two or three fresh items beat nine stale ones — then tell the learner in one line what they are about to rep. When a session is on it, coach: answer questions about a word or a form briefly, in Spanish first; never give the answer to the rep currently on screen, the dojo judges that itself.",
  "English only when the learner asks for it, and briefly.",
].join("\n");

export const FORMAT = "Markdown renders beside the dojo: one short sentence, Spanish first. Never a heading, never a list of the set — the screen shows it.";

export const threadOf = (ctx) => (ctx.thread === null || ctx.thread === undefined ? null : (ctx.thread.id ?? ctx.thread));

export const open = async (ctx) => {
  const thread = threadOf(ctx);
  if (thread === null) return [];
  return await ctx.entities.buffer.find({ thread, mode: ctx.mode.entity.id }, { orderBy: { index: "asc" }, filters: false, populate: ["literals"] });
};

export const screen = (rows) =>
  rows.length === 0
    ? "No session is on this thread — call provision or preset."
    : rows
        .map((row, index) => {
          const literals = row.literals.isInitialized() ? row.literals.count() : 0;
          const knowables = (row.data.knowables ?? []).length;
          return [
            `session ${index + 1}: ${literals + knowables} knowables (${literals} from the corpus, ${knowables} authored)`,
            `gameplay ${row.data.gameplay} · prompt ${row.data.prompt} · ${row.data.streak ? `streak ${row.data.streak}` : "single pass"}${row.data.limit ? ` · limit ${row.data.limit}` : ""}${row.data.continuous ? " · continuous" : ""}`,
          ].join("\n");
        })
        .join("\n");

export const harness = new Vector().use(async (ctx, next) => {
  ctx.hallucination.primer.open("role", ROLE);
  ctx.screen = `[Screen]\n${screen(await open(ctx))}`;
  await next();
});

harness.branch("/dialogue").use(async (ctx, next) => {
  ctx.hallucination.primer.open("format", FORMAT);
  ctx.hallucination.primer.open("screen", ctx.screen);
  await next();
});
