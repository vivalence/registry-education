import * as types from "../types.js";
import { audible } from "../emitter/audible.js";
import * as fold from "../fold.js";
import { picks, cap } from "./picks.js";

const tables = async (ctx, rows, listening) => {
  if (!rows.length) return new Map();
  const populated = await ctx.entities.literal.find(
    { id: { $in: rows.map((row) => row.id) } },
    { populate: ["uses", "uses.notes", "uses.symbols", "symbols", "notes"] },
  );
  return new Map(
    populated
      .map(fold.paradigm)
      .filter((table) => table.tokens.length)
      .filter((table) => !listening || table.tokens.every((token) => token.asset))
      .map((table) => [table.literal, table]),
  );
};

export const resolve = async (ctx, { set = [] } = {}, { prompt, blacklist = [] } = {}) => {
  const listening = types.listening(prompt);
  const taken = new Set(blacklist);
  const clauses = [];
  const cards = new Map();

  for (const clause of set) {
    const pick = picks[clause.pick];
    if (!pick) {
      clauses.push({ literals: [], knowables: [], count: 0 });
      continue;
    }
    const limit = cap(clause);
    const drawn = await pick(ctx, clause, {
      blacklist: [...taken],
      limit: listening ? limit * types.OVERFETCH : limit,
    });
    const fresh = drawn.literals.filter((literal) => !taken.has(literal.id));
    const built = await tables(
      ctx,
      fresh.filter((literal) => literal.ontology === "conjugation"),
      listening,
    );

    const covered = new Set(
      [...built.values()].flatMap((table) => table.tokens.map((token) => token.literal)).filter(Boolean),
    );

    const spoken = [];
    const paradigms = [];
    for (const literal of fresh) {
      if (spoken.length + paradigms.length >= limit) break;
      if (literal.ontology === "conjugation") {
        const table = built.get(literal.id);
        if (!table) continue;
        paradigms.push(literal);
        cards.set(literal.id, table);
      } else if (!covered.has(literal.id) && (!listening || (await audible(ctx, literal)))) spoken.push(literal);
    }

    for (const literal of [...spoken, ...paradigms]) taken.add(literal.id);
    for (const id of covered) taken.add(id);
    clauses.push({
      literals: [...spoken, ...paradigms],
      knowables: drawn.knowables ?? [],
      count: drawn.count ?? spoken.length + paradigms.length + (drawn.knowables?.length ?? 0),
    });
  }

  return {
    clauses,
    literals: clauses.flatMap((entry) => entry.literals),
    knowables: clauses.flatMap((entry) => entry.knowables),
    cards,
  };
};

export const empty = (resolved) => !resolved.literals.length && !resolved.knowables.length;
