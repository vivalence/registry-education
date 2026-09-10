import { Vector, v } from "@vivalence/typology";
import { STATUS, SIGNAL } from "../types.js";

const tally = (keys) => v.object(Object.fromEntries(keys.map((key) => [key, v.integer()])));

const STATISTICS = v.object({
  totals: v.object({
    literals: v.integer(),
    retentions: v.integer(),
    traces: v.integer(),
  }),
  retention: v.object({
    byStatus: tally(STATUS),
    seen: v.integer(),
    due: v.integer(),
  }),
  activity: v.object({
    bySignal: tally(SIGNAL),
    streak: v.integer(), // consecutive days, newest backward, with a trace
  }),
});

export const statistics = new Vector().open(
  {
    nature: "/assistant/wakeup/statistics",
    input: v.object({}),
    output: STATISTICS,
  },
  async (ctx) => {
    const { note, literal } = ctx.entities;

    const byKey = (where) => async (keys) =>
      Object.fromEntries(
        await Promise.all(keys.map(async (key) => [key, await note.count(where(key))])),
      );

    const byStatus = await byKey((status) => ({ traits: "RETAINED", trait: { RETAINED: { status } } }))(STATUS);
    const bySignal = await byKey((enumeration) => ({ traits: "TRACED", trait: { TRACED: { signal: { enum: enumeration } } } }))(
      SIGNAL,
    );

    const [literals, retentions, traces, due] = await Promise.all([
      literal.count({}),
      note.count({ traits: "RETAINED" }),
      note.count({ traits: "TRACED" }),
      note.due({}).then((rows) => rows.length),
    ]);

    // streak — distinct trace-days, newest first, counted while contiguous
    const events = await note.find({ traits: "TRACED" }, { fields: ["createdAt"], orderBy: { createdAt: "DESC" } });
    const days = [...new Set(events.map((event) => event.createdAt.toISOString().slice(0, 10)))];
    const DAY = 86_400_000;
    let streak = 0;
    let cursor = days.length ? Date.parse(days[0]) : 0;
    for (const day of days) {
      if (Date.parse(day) !== cursor) break;
      streak += 1;
      cursor -= DAY;
    }

    return {
      totals: { literals, retentions, traces },
      retention: { byStatus, seen: retentions - (byStatus.UNTOUCHED ?? 0), due },
      activity: { bySignal, streak },
    };
  },
);
