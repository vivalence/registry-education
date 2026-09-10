import { v, Vector } from "@vivalence/typology";
import { SIGNAL } from "../schematics.js";

export const review = new Vector().open(
  {
    nature: "/review",
    valence: [
      "Record the outcome of every literal the learner exercised this exchange. Signals:",
      "MASTERY — effortless and fast · SUCCESS — correct · NEUTRAL — shown or skipped · MISTAKE — wrong but close · FAILURE — blank or wrong.",
      "One call per exchange, at the end, carrying every exercised literal. Never the same literal twice in one call. Never review plain conversation — only items actually exercised.",
      "Each review reschedules the item and answers with its new status and next date; an exchange you do not review never happened.",
      "EXCEPT when a reviewer rides the session: if review rounds already appear in the history without you calling this tool, reviews are wired in automatically — then never call this yourself unless explicitly instructed.",
    ].join("\n"),
    input: v.object({
      reviews: v.array(
        v.object({
          literal: v.string().desc("The literal's slug, exactly as the read tools report it."),
          signal: v.enum(SIGNAL),
        }),
        { minItems: 1, maxItems: 10 },
      ),
    }),
  },
  async (ctx) => {
    if (!ctx.user?.id) {
      return {
        condition: "ERROR",
        message: "review needs an authorized caller — no user on this path",
      };
    }

    const lines = [];
    const reviewed = [];
    for (const item of ctx.input.reviews) {
      const literal = await ctx.entities.literal.findOne(
        ctx.entities.literal.reference(item.literal),
      );
      if (!literal) {
        lines.push(`${item.literal} — not in the corpus`);
        continue;
      }
      const note = await ctx.call["/review/literal"]({
        user: ctx.user,
        mode: ctx.mode,
        thread: ctx.thread ? { id: ctx.thread } : null,
        input: { literal: literal.slug, signal: item.signal },
      });
      lines.push(`${literal.slug} ${item.signal} → ${note.trait.RETAINED.status}, next ${note.trait.RETAINED.due?.slice(0, 10) ?? "—"}`);
      reviewed.push(note);
    }
    return { message: lines.join("\n"), entities: { note: reviewed } };
  },
);
