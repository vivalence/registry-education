import { specimen } from "@vivalence/typology";
import { LiteralEntity } from "@vivalence/runtime";
import { world } from "../scenarios/italian.js";
import { rankOf, UNRANKED } from "../../traits/literal/ranked.js";
import { formula, strength } from "../../traits/note/retained.js";

const HOUR = 3_600_000;

let rig;
let italian;
let fixtures;

const run = (task) => rig.within(task);
const rank = (row) => row.trait?.RANKED?.rank ?? UNRANKED;

const word = (slug, trait = {}, extra = {}) =>
  italian.literal.create({
    slug,
    mode: fixtures.dojo,
    ontology: "word",
    traits: ["TRANSLATED", ...Object.keys(trait)],
    trait: { TRANSLATED: { known: slug, learning: slug }, ...trait },
    symbol: {},
    ...extra,
  });

async function seed() {
  const dojo = italian.mode.create({ type: "game", slug: "dojo" });
  await rig.em.flush();
  fixtures = { dojo };

  const symbol = (slug, trait = {}) => italian.symbol.create({ slug, mode: dojo, traits: ["ONTOLOGICAL"], trait });
  const greeting = symbol("greeting");
  const casual = symbol("casual");
  const polite = symbol("polite");
  const tense = symbol("word.tense.presente", { LABELED: { name: "presente" } });
  const mood = symbol("word.mood.indicativo", { LABELED: { name: "indicativo" } });
  const first = symbol("word.person.first", { LABELED: { name: "eu" } });
  const second = symbol("word.person.second", { LABELED: { name: "tu" } });
  const singular = symbol("word.number.singular", { LABELED: { name: "singular" } });
  await rig.em.flush();

  const literal = (slug, known, learning, extra = {}) =>
    italian.literal.create({ slug, mode: dojo, ontology: "word", traits: ["TRANSLATED"], trait: { TRANSLATED: { known, learning } }, symbol: {}, ...extra });

  const hello = literal("hello", "hello", "olá");
  const goodbye = literal("goodbye", "goodbye", "tchau");
  const thanks = literal("thanks", "thanks", "obrigado", {
    traits: ["TRANSLATED", "VOCALIZED"],
    trait: { TRANSLATED: { known: "thanks", learning: "obrigado" }, VOCALIZED: { asset: { path: "audio/thanks.mp3", type: "audio/mpeg" } } },
  });
  const please = literal("please", "please", "por favor");
  const sentence = literal("ola-tchau", "hello and goodbye", "olá e tchau", {
    ontology: "sentence",
    traits: ["TRANSLATED", "ANNOTATED"],
    trait: {
      TRANSLATED: { known: "hello and goodbye", learning: "olá e tchau" },
      ANNOTATED: { tokens: [{ form: "olá", gloss: "hello", literal: "hello" }, { form: "e", gloss: "and" }, { form: "tchau", gloss: "goodbye", literal: "goodbye" }] },
    },
  });
  const chamo = literal("chamo.verb", "I call", "chamo");
  const chamas = literal("chamas.verb", "you call", "chamas");
  const chamar = literal("chamar.verb", "to call", "chamar");
  const paradigm = italian.literal.create({
    slug: "chamar.presente.indicativo",
    mode: dojo,
    ontology: "conjugation",
    traits: ["CONJUGATED"],
    trait: { CONJUGATED: { infinitive: "chamar.verb", paradigm: { "first.singular": "chamo.verb", "second.singular": "chamas.verb" } } },
    symbol: {},
  });
  await rig.em.flush();

  // the link phase's own touch (traits/dataset.js): a fresh row folds its symbols on its first update
  for (const [row, symbols] of [[hello, [greeting, casual]], [goodbye, [greeting, casual]], [thanks, [greeting, polite]], [please, [greeting, polite]], [chamo, [first, singular]], [chamas, [second, singular]], [paradigm, [tense, mood]]]) {
    row.symbols.add(symbols);
    row.assign({ updatedAt: new Date() });
  }
  await rig.em.flush();

  const now = Date.now();
  const retained = (row, RETAINED) =>
    italian.note.create({ user: rig.user, literal: row, slug: `retention.${row.slug}`, traits: ["RETAINED"], trait: { RETAINED: { ...italian.note.schematics.RETAINED.create(), ...RETAINED } } });
  const known = retained(hello, { status: "KNOWN", lastSignal: "SUCCESS", lastAt: now, due: new Date(now + 24 * HOUR).toISOString() });
  const learning = retained(goodbye, { status: "LEARNING", lastSignal: "MISTAKE", lastAt: now, due: new Date(now - 24 * HOUR).toISOString() });
  await rig.em.flush();
  for (const [parent, row, signal] of [[known, hello, "SUCCESS"], [learning, goodbye, "MISTAKE"]])
    italian.note.create({ user: rig.user, literal: row, parent, slug: `trace.${row.slug}`, traits: ["TRACED"], trait: { TRACED: { signal, snapshot: {} } } });
  await rig.em.flush();
  await rig.settle();
  Object.assign(fixtures, { hello, goodbye, thanks, please, sentence, paradigm, chamar, chamo, chamas, greeting });
}

specimen.beforeAll(async () => {
  rig = await world(["italian"]);
  italian = rig.daemons.italian.entities;
  await run(seed);
});

specimen.afterAll(async () => await rig.close());

specimen.describe("rank — RANKED.rank, stamped from the trait by the domain's twitch", { sanitizeResources: false, sanitizeOps: false }, () => {
  specimen.it("follows RANKED.rank when it is a real rank (≥ 1)", () => {
    specimen.expect(rankOf({ RANKED: { rank: 44, zipf: 6.1, fpm: 1250 } })).toBe(44);
    specimen.expect(rankOf({ RANKED: { rank: 1 } })).toBe(1);
  });

  specimen.it("treats rank 0 / negative / missing as NOT a rank — derives from zipf (10^(9−zipf)) or falls to UNRANKED", () => {
    specimen.expect(rankOf({ RANKED: { rank: 0, zipf: 5.6, fpm: 402 } })).toBe(Math.round(10 ** (9 - 5.6)));
    specimen.expect(rankOf({ RANKED: { rank: 0, zipf: 1.36, fpm: 0.0229 } })).toBe(Math.round(10 ** (9 - 1.36)));
    specimen.expect(rankOf({ RANKED: { rank: -3 } })).toBe(UNRANKED);
    specimen.expect(rankOf({ RANKED: {} })).toBe(UNRANKED);
    specimen.expect(rankOf({ TRANSLATED: { known: "x", learning: "y" } })).toBe(UNRANKED);
    specimen.expect(rankOf(undefined)).toBe(UNRANKED);
  });

  specimen.it("is stamped into the payload on create AND on every update", () =>
    run(async () => {
      const entity = word("rank.create", { RANKED: { rank: 7, zipf: 7, fpm: 10000 } });
      await rig.em.flush();
      specimen.expect(entity.trait.RANKED.rank).toBe(7);

      entity.trait = { ...entity.trait, RANKED: { rank: 0, zipf: 7.5, fpm: 30000 } };
      await rig.em.flush();
      specimen.expect(entity.trait.RANKED.rank).toBe(Math.round(10 ** (9 - 7.5)));

      entity.trait = { TRANSLATED: entity.trait.TRANSLATED };
      entity.traits = ["TRANSLATED"];
      await rig.em.flush();
      specimen.expect(rank(entity)).toBe(UNRANKED);
    }));

  specimen.it("a stale rank 0 lands as its zipf-derived rank — a rare verb can no longer sort ahead of essere", () =>
    run(async () => {
      const stale = word("rank.stale", { RANKED: { rank: 0, zipf: 1.36, fpm: 0.0229 } });
      const common = word("rank.common", { RANKED: { rank: 11, zipf: 7.1, fpm: 12600 } });
      await rig.em.flush();
      specimen.expect(rank(stale)).toBeGreaterThan(rank(common));
      specimen.expect(rank(stale)).toBe(Math.round(10 ** (9 - 1.36)));
    }));
});

specimen.describe("feed — due first, then novel by rank, unranked last", { sanitizeResources: false, sanitizeOps: false }, () => {
  specimen.beforeAll(() =>
    run(async () => {
      word("feed.second", { RANKED: { rank: 200, zipf: 5.7, fpm: 500 } });
      word("feed.first", { RANKED: { rank: 20, zipf: 6.7, fpm: 5000 } });
      word("feed.zero", { RANKED: { rank: 0, zipf: 1.2, fpm: 0.02 } });
      await rig.em.flush();
      rig.em.clear();
    }));

  specimen.it("puts the due literal ahead of every novel one, and orders novel by rank ascending", () =>
    run(async () => {
      const rows = await italian.literal.feed({}, { limit: 6 });
      const slugs = rows.map((row) => row.slug);
      specimen.expect(slugs[0]).toBe("goodbye");
      specimen.expect(slugs.indexOf("feed.first")).toBeLessThan(slugs.indexOf("feed.second"));
      const ranks = rows.slice(1).map(rank);
      specimen.expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
    }));

  specimen.it("never surfaces a rank-0 row ahead of ranked ones", () =>
    run(async () => {
      const rows = await italian.literal.feed({}, { limit: 50 });
      const zero = rows.findIndex((row) => row.slug === "feed.zero");
      const ranked = rows.filter((row) => rank(row) < UNRANKED && row.slug !== "feed.zero" && row.slug !== "goodbye");
      specimen.expect(zero).toBeGreaterThan(-1);
      for (const row of ranked) specimen.expect(rows.indexOf(row)).toBeLessThan(zero);
    }));

  specimen.it("respects the limit and the blacklist", () =>
    run(async () => {
      const two = await italian.literal.feed({}, { limit: 2 });
      specimen.expect(two.length).toBe(2);
      const without = await italian.literal.feed({}, { limit: 3, blacklist: { literals: [two[0].id] } });
      specimen.expect(without.map((row) => row.id)).not.toContain(two[0].id);
    }));

  specimen.it("novel never returns a literal the user has a RETAINED note for; due only returns past-due ones", () =>
    run(async () => {
      const novel = await italian.literal.novel({}, { limit: 50 });
      specimen.expect(novel.map((row) => row.slug)).not.toContain("hello");
      specimen.expect(novel.map((row) => row.slug)).not.toContain("goodbye");
      const due = await italian.literal.due({}, { limit: 50 });
      specimen.expect(due.map((row) => row.slug)).toEqual(["goodbye"]);
    }));

  specimen.it("constrains by symbol slugs as an $and over the relation", () =>
    run(async () => {
      const polite = await italian.literal.feed({ symbols: ["greeting", "polite"] }, { limit: 10 });
      specimen.expect(polite.map((row) => row.slug).sort()).toEqual(["please", "thanks"]);
    }));
});

specimen.describe("due — the RETAINED payload's due, read through json_extract", { sanitizeResources: false, sanitizeOps: false }, () => {
  specimen.it("note.due returns the past-due RETAINED notes, ordered by due", () =>
    run(async () => {
      specimen.expect((await italian.note.due()).map((row) => row.slug)).toEqual(["retention.goodbye"]);
      specimen.expect((await italian.note.due()).map((row) => row.slug)).toEqual(["retention.goodbye"]);
    }));

  specimen.it("due() on the seed: its own SQL under explain query plan beside the Note row count — the deferred index measured, never created", () =>
    run(async () => {
      const connection = rig.em.getConnection();
      const execute = connection.execute;
      const issued = [];
      connection.execute = function (query, params, ...rest) {
        issued.push({ query, params });
        return execute.call(this, query, params, ...rest);
      };
      try {
        await italian.note.due();
      } finally {
        delete connection.execute;
      }
      const select = issued.find(({ query }) => typeof query === "string" && /^select/i.test(query));
      specimen.expect(select?.query).toMatch(/json_extract/);
      const plan = await connection.execute(`explain query plan ${select.query}`, select.params ?? []);
      const [{ n }] = await connection.execute("select count(*) as n from Note");
      const indexes = await connection.execute("select name from sqlite_master where type = 'index' and tbl_name = 'Note'");
      console.log(`[due] Note rows ${n} · plan ${plan.map((row) => row.detail).join(" | ")} · indexes ${indexes.map((row) => row.name).join(", ")}`);
      specimen.expect(plan.map((row) => row.detail).join(" ")).not.toMatch(/note_retained_due/);
      specimen.expect(n).toBeGreaterThan(0);
    }));
});

specimen.describe("byStrength — a SQL CASE over the RETAINED payload and now, built from the drivers (fork 6c)", { sanitizeResources: false, sanitizeOps: false }, () => {
  const ROWS = [
    { slug: "fresh", driver: "BAYESIAN", lastAt: 1, state: [1, 1, 24] },
    { slug: "stale", driver: "BAYESIAN", lastAt: 72, state: [1, 1, 24] },
    { slug: "mid", driver: "BAYESIAN", lastAt: 12, state: [1, 1, 24] },
    { slug: "learnt", driver: "BOOLEAN", lastAt: 0, state: true },
    { slug: "streak", driver: "COUNTER", lastAt: 0, state: { streak: 4 } },
  ];

  specimen.beforeAll(() =>
    run(async () => {
      const now = Date.now();
      for (const row of ROWS) {
        const literal = word(`strength.${row.slug}`);
        italian.note.create({
          user: rig.user,
          literal,
          slug: `strength.${row.slug}`,
          traits: ["RETAINED"],
          trait: { RETAINED: { ...italian.note.schematics.RETAINED.create(), driver: row.driver, lastAt: now - row.lastAt * HOUR, state: row.state } },
        });
      }
      await rig.em.flush();
      rig.em.clear();
    }));

  specimen.it("exp() exists on the rig's driver (better-sqlite3 under @mikro-orm/sqlite 6.6.7)", () =>
    run(async () => {
      const [row] = await rig.em.getConnection().execute("select exp(1) as e");
      specimen.expect(row.e).toBeCloseTo(Math.E, 10);
    }));

  specimen.it("note.byStrength orders stale < streak < mid < fresh < learnt", () =>
    run(async () => {
      const rows = await italian.note.byStrength({ slug: { $like: "strength.%" } });
      specimen.expect(rows.map((row) => row.slug.replace("strength.", ""))).toEqual(["stale", "streak", "mid", "fresh", "learnt"]);
    }));

  specimen.it("the same CASE filters: strength < 0.5 is the stale one", () =>
    run(async () => {
      const weak = await italian.note.find({ slug: { $like: "strength.%" }, [strength("n0")]: { $lt: 0.5 } });
      specimen.expect(weak.map((row) => row.slug)).toEqual(["strength.stale"]);
    }));

  specimen.it("literal.byStrength orders the literals by their RETAINED note's strength", () =>
    run(async () => {
      const rows = await italian.literal.byStrength({ slug: { $like: "strength.%" } });
      specimen.expect(rows.map((row) => row.slug.replace("strength.", ""))).toEqual(["stale", "streak", "mid", "fresh", "learnt"]);
    }));

  specimen.it("strength in JS (entity.assess) meets strength in SQL (the drivers' CASE that strength(\"n0\") wraps, selected raw) on the five rows within 1e-6", () =>
    run(async () => {
      rig.em.clear();
      const rows = await italian.note.find({ slug: { $like: "strength.%" } });
      const now = Date.now();
      const selected = await rig.em.getConnection().execute(`select n0.slug, ${formula("n0")} as strength from Note as n0 where n0.slug like 'strength.%'`);
      const sql = Object.fromEntries(selected.map((row) => [row.slug, row.strength]));
      specimen.expect(rows.length).toBe(5);
      for (const row of rows) specimen.expect(Math.abs(row.assess(now).strength - sql[row.slug])).toBeLessThan(1e-6);
    }));

  specimen.it("strength is never stored: the payload carries no strength key", () =>
    run(async () => {
      const rows = await italian.note.find({ slug: { $like: "strength.%" } });
      for (const row of rows) specimen.expect(Object.keys(row.trait.RETAINED)).not.toContain("strength");
    }));
});

specimen.describe("review — a RETAINED note per user·literal, a TRACED child per review", { sanitizeResources: false, sanitizeOps: false }, () => {
  let reviewed;
  let first;

  specimen.it("creates the RETAINED note and writes a TRACED child on first review", () =>
    run(async () => {
      reviewed = word("review.fresh", { RANKED: { rank: 500, zipf: 5.3, fpm: 200 } });
      await rig.em.flush();
      first = await italian.literal.review(reviewed, "SUCCESS");
      specimen.expect(first.id).toBeTruthy();
      specimen.expect(first.traits).toEqual(["RETAINED"]);
      specimen.expect(first.daemon.slug).toBe("italian");
      specimen.expect(first.trait.RETAINED.status).not.toBe("UNTOUCHED");
      const traces = await italian.note.find({ parent: first, traits: "TRACED" });
      specimen.expect(traces.length).toBe(1);
      specimen.expect(traces[0].literal.id).toBe(reviewed.id);
      specimen.expect(traces[0].trait.TRACED.signal).toBe("SUCCESS");
      specimen.expect(traces[0].trait.TRACED.snapshot.status).toBe(first.trait.RETAINED.status);
    }));

  specimen.it("evolves the same note on the second review and appends a second TRACED child", () =>
    run(async () => {
      const again = await italian.literal.review(reviewed, "MISTAKE");
      specimen.expect(again.id).toBe(first.id);
      specimen.expect((await italian.note.find({ literal: reviewed, traits: "RETAINED" })).length).toBe(1);
      specimen.expect(Array.isArray(again.trait.RETAINED.state)).toBe(true);
      specimen.expect((await italian.note.find({ parent: first, traits: "TRACED" })).length).toBe(2);
    }));

  specimen.it("entity.assess reads the RETAINED note off a notes-populated literal: status, lastSignal, is.*", () =>
    run(async () => {
      rig.em.clear();
      const [row] = await italian.literal.find({ slug: "review.fresh" }, { populate: ["notes"] });
      const assessed = row.assess();
      specimen.expect(assessed.status).toBe(row.notes.getItems().find((note) => note.traits.includes("RETAINED")).trait.RETAINED.status);
      specimen.expect(assessed.lastSignal).toBe("MISTAKE");
      specimen.expect(assessed.is.failed).toBe(true);
      specimen.expect(typeof assessed.strength).toBe("number");
      const [novel] = await italian.literal.find({ slug: "please" }, { populate: ["notes"] });
      specimen.expect(novel.assess()).toBeUndefined();
    }));

  specimen.it("entity.assess throws on a literal fetched without its notes", () =>
    run(async () => {
      rig.em.clear();
      const [row] = await italian.literal.find({ slug: "review.fresh" });
      specimen.expect(() => row.assess()).toThrow(/populate: \["notes"\]/);
    }));

  specimen.it("lastSignal is stored on the RETAINED payload and read through note.retention and literal.byLastSignal", () =>
    run(async () => {
      rig.em.clear();
      const held = await italian.note.retention(await italian.literal.findOne({ slug: "review.fresh" }));
      specimen.expect(held.trait.RETAINED.lastSignal).toBe("MISTAKE");
      const missed = await italian.literal.byLastSignal(["MISTAKE"], {}, { limit: 50 });
      specimen.expect(missed.map((entry) => entry.slug)).toContain("review.fresh");
    }));
});

specimen.describe("literal — the corpus word: search, card, reference, symbol facets, uses", { sanitizeResources: false, sanitizeOps: false }, () => {
  specimen.it("search matches slug and both translations", () =>
    run(async () => {
      const byLearning = await italian.literal.find({ search: "obrigado" });
      specimen.expect(byLearning.map((row) => row.slug)).toEqual(["thanks"]);
      const byKnown = await italian.literal.find({ search: "goodbye" });
      specimen.expect(byKnown.map((row) => row.slug).sort()).toEqual(["goodbye", "ola-tchau"]);
      const bySlug = await italian.literal.find({ search: "chamar." });
      specimen.expect(bySlug.map((row) => row.slug).sort()).toEqual(["chamar.presente.indicativo", "chamar.verb"]);
    }));

  specimen.it("reference: an id or a slug, never guessed", () => {
    specimen.expect(italian.literal.reference("hello")).toEqual({ slug: "hello" });
    specimen.expect(italian.literal.reference(fixtures.hello.id)).toEqual({ id: fixtures.hello.id });
  });

  specimen.it("card projects slug · known · learning · ontology · status from a notes-populated row", () =>
    run(async () => {
      const [row] = await italian.literal.find({ slug: "hello" }, { populate: ["notes"] });
      specimen.expect(italian.literal.card.project(row)).toEqual({ slug: "hello", known: "hello", learning: "olá", ontology: "word", status: "KNOWN" });
      const [novel] = await italian.literal.find({ slug: "please" }, { populate: ["notes"] });
      specimen.expect(italian.literal.card.project(novel).status).toBe("UNTOUCHED");
    }));

  specimen.it("symbol json mirrors the symbols collection as nested facets — the dojo's context source", () =>
    run(async () => {
      const [row] = await italian.literal.find({ slug: "chamar.presente.indicativo" });
      specimen.expect(row.symbol.word.tense).toBe("presente");
      specimen.expect(row.symbol.word.mood).toBe("indicativo");
      const [form] = await italian.literal.find({ slug: "chamo.verb" });
      specimen.expect(form.symbol.word.person).toBe("first");
      specimen.expect(form.symbol.word.number).toBe("singular");
    }));

  specimen.it("uses is linked from ANNOTATED tokens and CONJUGATED paradigm+infinitive by the domain's twitch", () =>
    run(async () => {
      const [sentence] = await italian.literal.find({ slug: "ola-tchau" }, { populate: ["uses"] });
      specimen.expect(sentence.uses.getItems().map((row) => row.slug).sort()).toEqual(["goodbye", "hello"]);
      const [paradigm] = await italian.literal.find({ slug: "chamar.presente.indicativo" }, { populate: ["uses"] });
      specimen.expect(paradigm.uses.getItems().map((row) => row.slug).sort()).toEqual(["chamar.verb", "chamas.verb", "chamo.verb"]);
      const [form] = await italian.literal.find({ slug: "chamo.verb" }, { populate: ["in"] });
      specimen.expect(form.in.getItems().map((row) => row.slug)).toEqual(["chamar.presente.indicativo"]);
    }));
});

specimen.describe("two daemons on one datamap — casa once per daemon", { sanitizeResources: false, sanitizeOps: false }, () => {
  let pair;

  specimen.beforeAll(async () => {
    pair = await world(["italian", "spanish"]);
    await pair.within(async () => {
      for (const slug of ["italian", "spanish"]) {
        const { entities } = pair.daemons[slug];
        const dojo = entities.mode.create({ type: "game", slug: "dojo" });
        entities.literal.create({ slug: "casa", mode: dojo, traits: ["RANKED"], trait: { RANKED: { rank: 0, zipf: slug === "italian" ? 6 : 5 } } });
      }
      await pair.em.flush();
      await pair.settle();
      pair.em.clear();
    });
  });

  specimen.afterAll(async () => await pair.close());

  specimen.it("each daemon's repository sees its own casa, and the table holds two", () =>
    pair.within(async () => {
      for (const slug of ["italian", "spanish"]) {
        const rows = await pair.daemons[slug].entities.literal.find({ slug: "casa" });
        specimen.expect(rows.map((row) => row.daemon.slug)).toEqual([slug]);
      }
      specimen.expect(await pair.em.count(LiteralEntity, { slug: "casa" })).toBe(2);
    }));

  specimen.it("the domain's twitch, grafted under both daemons, stamps both rows", () =>
    pair.within(async () => {
      const italianCasa = await pair.daemons.italian.entities.literal.findOne({ slug: "casa" });
      const spanishCasa = await pair.daemons.spanish.entities.literal.findOne({ slug: "casa" });
      specimen.expect([italianCasa.trait.RANKED.rank, spanishCasa.trait.RANKED.rank]).toEqual([1000, 10000]);
    }));

  specimen.it("a review through italian's repositories writes italian's note only", () =>
    pair.within(async () => {
      const casa = await pair.daemons.italian.entities.literal.findOne({ slug: "casa" });
      await pair.daemons.italian.entities.literal.review(casa, "SUCCESS");
      specimen.expect((await pair.daemons.italian.entities.note.find({ traits: "RETAINED" })).length).toBe(1);
      specimen.expect(await pair.daemons.spanish.entities.note.find({ traits: "RETAINED" })).toEqual([]);
      specimen.expect((await pair.daemons.spanish.entities.literal.due({}, { limit: 10 })).length).toBe(0);
    }));
});

specimen.describe("schema — every foreign key targets a table that exists", { sanitizeResources: false, sanitizeOps: false }, () => {
  specimen.it("no dangling FK targets, no foreign_key_check rows", () =>
    run(async () => {
      const connection = rig.em.getConnection();
      const tables = await connection.execute("select name, sql from sqlite_master where type = 'table'");
      const names = new Set(tables.map((row) => row.name));
      for (const table of tables) {
        for (const match of String(table.sql ?? "").matchAll(/references\s+[`"]?(\w+)[`"]?/gi)) {
          specimen.expect(names.has(match[1])).toBe(true);
        }
      }
      const violations = await connection.execute("pragma foreign_key_check");
      specimen.expect(violations.length).toBe(0);
    }));
});
