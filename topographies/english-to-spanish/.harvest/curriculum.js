import { Datasink } from "@vivalence/typology";

const T = Deno.env.get("HOME") + "/.viva/registry/education/topographies/english-to-spanish/dataset/literals";
const DRY = Deno.args.includes("--dry");

const files = {};
for await (const f of Deno.readDir(`${T}/words`)) if (f.name.endsWith(".js")) files[f.name] = (await import(`${T}/words/${f.name}`)).default;
const rows = Object.values(files).flat();
const bySlug = new Map(rows.map((r) => [r.slug, r]));
const conjugation = (await import(`${T}/conjugation.js`)).default;

const has = (r, slug) => r.symbols.some((s) => s.slug === slug);
const lemma = (r) => r.slug.split(".")[0];
const isForm = (r) => r.slug.includes(".verb.") && !r.slug.endsWith(".infinitive");
const isInfinitive = (r) => r.slug.endsWith(".verb.infinitive");

// rule 1 — the learner's first 100, a literal seed in curriculum order
const SEED = [
  "de.adposition", "la.determiner", "el.determiner", "que.subordinating-conjunction", "en.adposition", "y.coordinating-conjunction",
  "a.adposition", "no.adverb", "un.determiner", "una.determiner", "por.adposition", "con.adposition", "para.adposition",
  "sí.adverb", "hola.interjection", "gracias.interjection",
  "yo.pronoun", "tu.pronoun", "mi.pronoun", "su.pronoun", "me.pronoun", "te.pronoun", "lo.pronoun", "la.pronoun",
  "ser.verb.infinitive", "ser.verb.indicative.present.first.singular", "ser.verb.indicative.present.third.singular",
  "estar.verb.infinitive", "estar.verb.indicative.present.first.singular", "estar.verb.indicative.present.third.singular",
  "casa.noun", "día.noun", "hombre.noun", "mujer.noun",
  "ir.verb.infinitive", "ir.verb.indicative.present.first.singular", "ir.verb.indicative.present.third.singular",
  "tener.verb.infinitive", "tener.verb.indicative.present.first.singular", "tener.verb.indicative.present.third.singular",
  "agua.noun", "comida.noun", "dinero.noun", "baño.noun",
  "poder.verb.infinitive", "poder.verb.indicative.present.first.singular", "poder.verb.indicative.present.third.singular",
  "querer.verb.infinitive", "querer.verb.indicative.present.first.singular", "querer.verb.indicative.present.third.singular",
  "hacer.verb.infinitive", "hacer.verb.indicative.present.first.singular", "hacer.verb.indicative.present.third.singular",
  "uno.numeral", "dos.numeral", "tres.numeral", "cuatro.numeral", "cinco.numeral", "seis.numeral", "siete.numeral", "ocho.numeral", "nueve.numeral", "diez.numeral",
  "más.adverb", "si.subordinating-conjunction", "pero.coordinating-conjunction", "o.coordinating-conjunction", "al.contraction", "del.contraction",
];
for (const slug of SEED) if (!bySlug.has(slug)) throw new Error(`seed row missing: ${slug}`);
const seeded = new Set(SEED);

// rule 2 — a form's paradigm position from conjugation.js; gerund rides the present, participle the past
const paradigmOf = new Map();
for (const c of conjugation) for (const slug of Object.values(c.trait.CONJUGATED.paradigm)) paradigmOf.set(slug, c.trait.RANKED.rank);
const tenseRank = (l, tense) => conjugation.find((c) => c.slug === `${l}.${tense}.indicative`)?.trait.RANKED.rank;
for (const r of rows) {
  if (r.slug.endsWith(".gerund")) paradigmOf.set(r.slug, tenseRank(lemma(r), "present") + 0.5);
  if (r.slug.endsWith(".participle.past")) paradigmOf.set(r.slug, tenseRank(lemma(r), "past") + 0.5);
  if (r.slug.includes(".imperative.") && !paradigmOf.has(r.slug)) paradigmOf.set(r.slug, 90000 + tenseRank(lemma(r), "present") / 1000);
}
for (const r of rows) if (isForm(r) && !paradigmOf.has(r.slug)) throw new Error(`form outside conjugation.js: ${r.slug}`);
const PERSON = ["third.singular", "first.singular", "second.singular", "third.plural", "first.plural", "second.plural", "gerund", "participle.past"];
const person = (r) => PERSON.findIndex((p) => r.slug.endsWith(p));
const byParadigm = (a, b) => paradigmOf.get(a.slug) - paradigmOf.get(b.slug) || person(a) - person(b) || a.slug.localeCompare(b.slug);

// rule 5 — the tail: vosotros, and every non-lead conditional / subjunctive form
const lead = (r) => r.slug.endsWith("third.singular");
const tail = (r) => r.slug.includes(".second.plural") || (/\.verb\.(conditional|subjunctive)\./.test(r.slug) && !lead(r));

// rule 3 — the non-verb key: cefr, survival, high-frequency, zipf descending, slug
const cefr = (r) => (has(r, "proficiency.cefr.a1") ? 0 : has(r, "proficiency.cefr.a2") ? 1 : 2);
const byProficiency = (a, b) =>
  cefr(a) - cefr(b) ||
  has(b, "proficiency.survival") - has(a, "proficiency.survival") ||
  has(b, "proficiency.high-frequency") - has(a, "proficiency.high-frequency") ||
  (b.trait.RANKED.zipf ?? 0) - (a.trait.RANKED.zipf ?? 0) ||
  a.slug.localeCompare(b.slug);

const rest = rows.filter((r) => !seeded.has(r.slug));
const forms = rest.filter((r) => isForm(r) && !tail(r)).sort(byParadigm);
const firstForm = new Map();
forms.forEach((r, i) => firstForm.has(lemma(r)) || firstForm.set(lemma(r), i));
const infinitives = rest.filter(isInfinitive).sort((a, b) => (firstForm.get(lemma(a)) ?? Infinity) - (firstForm.get(lemma(b)) ?? Infinity) || a.slug.localeCompare(b.slug));
const others = rest.filter((r) => !r.slug.includes(".verb.")).sort(byProficiency);
const last = rest.filter(tail).sort((a, b) => /second\.plural/.test(a.slug) - /second\.plural/.test(b.slug) || byParadigm(a, b));

// rule 4 — interleave three streams by a pace curve: t = (consumed / size) ** pace; the smallest t goes next
const streams = [
  { queue: others, pace: 3.1 },
  { queue: infinitives, pace: 2.6 },
  { queue: forms, pace: 0.55 },
];
const curriculum = SEED.map((slug) => bySlug.get(slug));
const emitted = new Set(SEED);
const emit = (r) => {
  if (isForm(r) && !emitted.has(`${lemma(r)}.verb.infinitive`)) emit(bySlug.get(`${lemma(r)}.verb.infinitive`));
  if (emitted.has(r.slug)) return;
  emitted.add(r.slug);
  curriculum.push(r);
};
const cursor = streams.map(() => 0);
const t = (i) => (cursor[i] / streams[i].queue.length) ** streams[i].pace;
while (cursor.some((c, i) => c < streams[i].queue.length)) {
  let pick = -1;
  for (let i = 0; i < streams.length; i++) {
    if (cursor[i] >= streams[i].queue.length) continue;
    if (pick < 0 || t(i) < t(pick)) pick = i;
  }
  emit(streams[pick].queue[cursor[pick]++]);
}
for (const r of last) emit(r);
if (curriculum.length !== rows.length) throw new Error(`curriculum ${curriculum.length} ≠ rows ${rows.length}`);

curriculum.forEach((r, i) => (r.trait.RANKED.rank = i + 1));

for (const [name, list] of Object.entries(files)) {
  if (DRY) continue;
  await Deno.writeTextFile(`${T}/words/${name}`, Datasink.canonical(list, "js"));
}
console.log(DRY ? "dry" : "written", Object.keys(files).length, "files", rows.length, "rows");
if (DRY) {
  const pos = (r) => r.symbols.find((s) => s.slug.startsWith("word.part-of-speech.")).slug.slice(20);
  const top = curriculum.slice(0, 500);
  const hist = {};
  for (const r of top) hist[isInfinitive(r) ? "infinitive" : isForm(r) ? "verb-form" : pos(r)] = (hist[isInfinitive(r) ? "infinitive" : isForm(r) ? "verb-form" : pos(r)] ?? 0) + 1;
  console.log("top500", JSON.stringify(hist));
  console.log("first 120:", curriculum.slice(0, 120).map((r) => r.trait.TRANSLATED.learning).join(" "));
  for (const lo of [500, 700, 900, 1000, 1100]) console.log(lo, curriculum.slice(lo, lo + 20).map((r) => r.trait.TRANSLATED.learning).join(" "));
  const run = curriculum.reduce((m, r) => { m.cur = isForm(r) ? m.cur + 1 : 0; m.max = Math.max(m.max, m.cur); return m; }, { cur: 0, max: 0 }).max;
  console.log("longest run of verb forms", run, "· tail starts at", curriculum.findIndex(tail) + 1);
}
