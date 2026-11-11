import { object } from "@vivalence/typology";

export const items = (relation) =>
  Array.isArray(relation) ? relation : relation?.isInitialized?.() ? relation.getItems() : [];

const retained = (literal) =>
  items(literal.notes).find((note) => note.traits?.includes("RETAINED"))?.trait?.RETAINED;
const FACETS = { infinitive: "lemma", tense: "tense", mood: "mood", person: "person", number: "number" };

const VERBAL = ["tense", "mood"];

export const verbal = (context) => VERBAL.some((key) => typeof context?.[key] === "string");

export const context = (literal) => {
  const word = literal.symbol?.word;
  if (!word || typeof word.person !== "string") return undefined;
  const pairs = Object.entries(FACETS)
    .map(([key, facet]) => [key, word[facet]])
    .filter(([, value]) => typeof value === "string");
  const facets = Object.fromEntries(pairs);
  if (verbal(facets) || !("infinitive" in facets)) return facets;
  const { infinitive, ...rest } = facets;
  return { lemma: infinitive, ...rest };
};

export const fromLiteral = (literal) => ({
  ontology: literal.ontology,
  known: literal.trait?.TRANSLATED?.known,
  learning: literal.trait?.TRANSLATED?.learning,
  example: literal.trait?.EXEMPLIFIED,
  context: context(literal),
  tokens: literal.trait?.ANNOTATED?.tokens,
  asset: literal.trait?.VOCALIZED?.asset,
  literal: literal.id,
  signal: retained(literal)?.lastSignal ?? undefined,
  status: retained(literal)?.status ?? undefined,
});

const CONJUGATION = {
  tense: "word.tense.",
  mood: "word.mood.",
  suffix: "word.suffix.",
  regularity: "word.regularity.",
};

const TOKEN = ["slot", "form", "gloss", "literal", "person", "number", "asset", "signal"];

const named = (symbol) => symbol?.trait?.LABELED?.name ?? symbol?.slug?.split(".").pop();

const labelled = (form, branch) => {
  const value = form.symbol?.word?.[branch];
  if (typeof value !== "string") return undefined;
  const slug = `word.${branch}.${value}`;
  return named(items(form.symbols).find((symbol) => symbol.slug === slug)) ?? value;
};

export const paradigm = (literal) => {
  const conjugated = literal.trait?.CONJUGATED ?? {};
  const bySlug = new Map(items(literal.uses).map((form) => [form.slug, form]));
  const infinitive = bySlug.get(conjugated.infinitive);
  const symbols = items(literal.symbols);
  const forms = Object.entries(conjugated.paradigm ?? {})
    .map(([slot, slug]) => ({ slot, form: bySlug.get(slug) }))
    .filter((entry) => entry.form);
  const facets = Object.entries(CONJUGATION).map(([key, prefix]) => [
    key,
    named(symbols.find((symbol) => symbol.slug.startsWith(prefix))),
  ]);

  return {
    ontology: "conjugation",
    known: infinitive?.trait?.TRANSLATED?.known ?? "",
    learning: infinitive?.trait?.TRANSLATED?.learning ?? literal.symbol?.word?.lemma ?? "",
    context: object.pluck(Object.fromEntries(facets), Object.keys(CONJUGATION)),
    tokens: forms.map(({ slot, form }) =>
      object.pluck(
        {
          slot,
          form: form.trait?.TRANSLATED?.learning ?? "",
          gloss: form.trait?.TRANSLATED?.known ?? "",
          literal: form.id,
          person: labelled(form, "person"),
          number: labelled(form, "number"),
          asset: form.trait?.VOCALIZED?.asset,
          signal: retained(form)?.lastSignal,
        },
        TOKEN,
      ),
    ),
    literal: literal.id,
    ...(infinitive?.trait?.VOCALIZED?.asset && { asset: infinitive.trait.VOCALIZED.asset }),
    ...(retained(literal)?.lastSignal && { signal: retained(literal).lastSignal }),
  };
};

export const speakable = (knowable) => Boolean(knowable?.known && knowable?.learning);

export const table = (knowable) => knowable?.ontology === "conjugation";

export const card = (literal) => (table(literal) ? paradigm(literal) : fromLiteral(literal));

export const authored = (pair) => ({
  ontology: (pair.learning ?? "").split(/\s+/).length > 2 ? "sentence" : "word",
  ...pair,
});
