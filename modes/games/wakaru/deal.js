import { monad } from "@vivalence/typology";
import * as types from "./types.js";
import { PLACES, STATUS, remembered } from "./engine/atlas.js";
import { fresh } from "./engine/run.js";

// what the daemon deals the game: the places charted from the corpus, the learner's memory over
// them, and the seat a run begins on. every read goes through the domain's own repositories.

export const CAP = {
  words: 48,
  sentences: 12,
  stacks: 30,
  forge: 24,
  spirits: 12,
  shrine: 10,
  overall: 30,
};

// a literal without RANKED sorts after every ranked one, as the domain's own UNRANKED does
const UNRANKED = 999999;

const BY_RANK = { trait: { RANKED: { rank: "asc nulls last" } } };

const HELD = STATUS.filter(remembered);

// every set a place is made of: the stacks draw outside all of them, so no word stands twice
const SETS = PLACES.flatMap((entry) => entry.sets ?? []);

const ranked = (ctx, where, opts) =>
  ctx.entities.literal.find(where, { orderBy: BY_RANK, ...opts });

// the slugs a literal points at: a sentence's token words, a paradigm's forms and its infinitive
const references = (row) =>
  [
    ...(row.trait.ANNOTATED ? row.trait.ANNOTATED.tokens.map((token) => token.literal) : []),
    ...(row.trait.CONJUGATED
      ? [...Object.values(row.trait.CONJUGATED.paradigm), row.trait.CONJUGATED.infinitive]
      : []),
  ].filter(Boolean);

export const referenced = (ctx, rows) =>
  ranked(ctx, { slug: { $in: [...new Set(rows.flatMap(references))] } });

// a place's spirits are its drawn words that are due, so every spirit stands by a stone of its own
const due = (ctx, rows) =>
  ctx.entities.literal.due({ id: { $in: rows.map((row) => row.id) } }, { limit: CAP.spirits });

// a paradigm's cells: the slugs of its forms, never its infinitive
const cells = (row) => Object.values(row.trait.CONJUGATED.paradigm);

// how each kind of place draws: a district or the forms wing by its symbol sets, the stacks as the
// most frequent words no set holds, the forge by its conjugations — each a fixed shelf by rank, so a
// word held there stays there and its warden wakes as the learner learns. a paradigm is never
// reviewed whole, its forms are — so the forge's spirits are the drawn paradigms with a form due,
// and its keeper speaks the forms
const DRAWS = {
  sets: {
    where: (entry) => ({ ontology: "word", symbols: { $in: entry.sets } }),
    words: (ctx, where) => ranked(ctx, where, { limit: CAP.words }),
    spirits: due,
    lexicon: (rows) => rows,
    speaks: true,
  },
  common: {
    where: () => ({ ontology: "word", symbols: { $none: SETS } }),
    words: (ctx, where) => ranked(ctx, where, { limit: CAP.stacks }),
    spirits: due,
    lexicon: (rows) => rows,
    speaks: false,
  },
  conjugation: {
    where: () => ({ ontology: "conjugation" }),
    words: (ctx, where) => ranked(ctx, where, { limit: CAP.forge }),
    spirits: async (ctx, paradigms) => {
      const forms = await ctx.entities.literal.due({ slug: { $in: paradigms.flatMap(cells) } });
      const slugs = new Set(forms.map((form) => form.slug));
      return paradigms
        .filter((row) => cells(row).some((slug) => slugs.has(slug)))
        .slice(0, CAP.spirits);
    },
    lexicon: (rows, ctx) => referenced(ctx, rows),
    speaks: false,
  },
};

const kind = (entry) => DRAWS[entry.draw ?? "sets"];

// a place's literals: its words, and for a set place the sentences that use them, by rank
export const draw = async (ctx, entry) => {
  const drawing = kind(entry);
  const words = await drawing.words(ctx, drawing.where(entry));
  const uses = { $in: words.map((word) => word.id) };
  const sentences =
    drawing.speaks && words.length
      ? await ranked(ctx, { ontology: "sentence", uses }, { limit: CAP.sentences })
      : [];
  return { words, sentences };
};

export const spirits = async (ctx, entry) => {
  const drawing = kind(entry);
  return drawing.spirits(ctx, await drawing.words(ctx, drawing.where(entry)));
};

// the words a keeper may say in a place, the most frequent first
export const lexicon = async (ctx, entry) =>
  kind(entry).lexicon((await draw(ctx, entry)).words, ctx);

// every place with a word in it, in PLACES order — a place with none is absent; the world drops it
export const places = async (ctx) => {
  const drawn = await monad.traverse(PLACES, (entry) => draw(ctx, entry));
  return Object.fromEntries(
    PLACES.map((entry, index) => [entry.id, drawn[index]]).filter(([, held]) => held.words.length),
  );
};

// the shrine's round: the due words of every place, so it never asks a word that stands nowhere
export const pilgrims = async (ctx) => {
  const words = Object.values(await places(ctx)).flatMap((held) => held.words);
  return ctx.entities.literal.due(
    { ontology: "word", id: { $in: words.map((row) => row.id) } },
    { limit: CAP.shrine },
  );
};

// one atlas entry; idOf turns a slug the literal points at into the id of an atlas literal
export const word = (row, idOf) => {
  const pair = row.trait.TRANSLATED ?? { known: "", learning: "" };
  const conjugated = row.trait.CONJUGATED;
  return {
    id: row.id,
    slug: row.slug,
    ontology: row.ontology,
    known: pair.known,
    learning: pair.learning,
    rank: row.trait.RANKED ? row.trait.RANKED.rank : UNRANKED,
    example: row.trait.EXEMPLIFIED
      ? { known: row.trait.EXEMPLIFIED.known, learning: row.trait.EXEMPLIFIED.learning }
      : null,
    audio: row.trait.VOCALIZED ? row.trait.VOCALIZED.asset.path : null,
    tokens: row.trait.ANNOTATED
      ? row.trait.ANNOTATED.tokens.map((token, index) => ({
          form: token.form,
          gloss: token.gloss,
          literal: idOf(token.literal),
          index,
        }))
      : null,
    paradigm: conjugated
      ? Object.fromEntries(
          Object.entries(conjugated.paradigm)
            .map(([person, slug]) => [person, idOf(slug)])
            .filter(([, id]) => id),
        )
      : null,
    infinitive: conjugated ? idOf(conjugated.infinitive) : null,
    tense: row.ontology === "conjugation" ? row.slug.split(".").slice(1).join(".") : null,
  };
};

export const resolver = (rows) => {
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
  return (slug) => bySlug.get(slug) ?? null;
};

// the places by id, and every literal they hold or point at as a Word — a token, a paradigm cell
// and an infinitive always name an entry of words
export const atlas = async (ctx) => {
  const drawn = await places(ctx);
  const rows = Object.values(drawn).flatMap((held) => [...held.words, ...held.sentences]);
  const all = [...rows, ...(await referenced(ctx, rows))];
  const idOf = resolver(all);
  return {
    places: Object.fromEntries(
      Object.entries(drawn).map(([id, held]) => [
        id,
        { words: held.words.map((row) => row.id), sentences: held.sentences.map((row) => row.id) },
      ]),
    ),
    words: Object.fromEntries(all.map((row) => [row.id, word(row, idOf)])),
  };
};

// the learner's status per literal; an id without a RETAINED note is UNTOUCHED and stays absent
export const memory = async (ctx, ids) =>
  Object.fromEntries(
    (await ctx.entities.note.find({ traits: "RETAINED", literal: { $in: ids } })).map((note) => [
      note.literal.id,
      note.trait.RETAINED.status,
    ]),
  );

// every literal the learner holds (LEARNING and up)
const holding = async (ctx) => {
  const notes = await ctx.entities.note.find(
    { traits: "RETAINED", trait: { RETAINED: { status: { $in: HELD } } } },
    { fields: ["literal"] },
  );
  return new Set(notes.map((note) => note.literal.id));
};

// what a keeper may say (i+1): the place's words the learner holds, then their most frequent held
// words anywhere, and one new word — the place's most frequent word they do not hold yet, null once
// they hold all
export const vocabulary = async (ctx, entry) => {
  const [words, held] = await Promise.all([lexicon(ctx, entry), holding(ctx)]);
  const overall = await ranked(
    ctx,
    { ontology: "word", id: { $in: [...held] } },
    { limit: CAP.overall },
  );
  const inPlace = words.filter((row) => held.has(row.id));
  return {
    held: [...new Map([...inPlace, ...overall].map((row) => [row.id, row])).values()],
    target: words.find((row) => !held.has(row.id)) ?? null,
  };
};

// a run begins whole: the seed that charts it, nothing flagged, the learner in the hub
export const begin = () => fresh(Math.floor(Math.random() * 2 ** 32));

// the run a save holds, when it is one this game reads: a blank seat holds none, and neither does
// a save of a shape the game has outgrown (the first slice's)
export const saved = (buffer) => {
  const { run } = buffer.data;
  return run && types.run.faults(run).length === 0 ? run : null;
};

// the run starts on a buffer that already exists — the blank one a thread is seated with. a seat
// that already holds a run hands it back untouched, so two screens on one seat begin one run
export const seat = async (ctx, buffer) => {
  if (!saved(buffer)) {
    buffer.data = { ...buffer.data, run: begin() };
    buffer.status = "ACTIVE";
    await ctx.entities.em.flush();
  }
  return { begun: true, run: buffer.data.run };
};
