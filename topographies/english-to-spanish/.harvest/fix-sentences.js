import { Datasink } from "@vivalence/typology";
const T = Deno.env.get("HOME") + "/.viva/registry/education/topographies/english-to-spanish";
const FILE = `${T}/dataset/literals/sentences.js`;
const rows = (await import(FILE)).default;
const targets = Object.fromEntries(JSON.parse(await Deno.readTextFile(`${T}/.harvest/sent-targets.json`)).map((t) => [t.slug, t]));
const slugs = new Set();
for await (const f of Deno.readDir(`${T}/dataset/literals/words`)) if (f.name.endsWith(".js")) for (const w of (await import(`${T}/dataset/literals/words/${f.name}`)).default) slugs.add(w.slug);
const by = Object.fromEntries(rows.map((r) => [r.slug, r]));

const tok = (...list) => list.map(([form, gloss, deprel, literal], index) => {
  const t = { deprel, form, gloss, index };
  if (literal) { if (!slugs.has(literal)) throw new Error(`no word row ${literal}`); t.literal = literal; }
  return t;
});
const sym = (...xs) => ["sentence", ...xs, "proficiency.survival"].map((slug) => ({ slug }));
const DECL = "sentence.force.declarative", INT = "sentence.force.interrogative", IMPF = "sentence.force.imperative";
const POLAR = "sentence.interrogative-type.polar", CONTENT = "sentence.interrogative-type.content";
const IND = "sentence.mood.indicative", COND = "sentence.mood.conditional", SUBJ = "sentence.mood.subjunctive", IMPM = "sentence.mood.imperative";
const PRES = "sentence.tense.present", PAST = "sentence.tense.past", FUT = "sentence.tense.future", IMPERF = "sentence.tense.imperfect";
const POS = "sentence.polarity.positive", NEG = "sentence.polarity.negative";
const A1 = "proficiency.cefr.a1", A2 = "proficiency.cefr.a2";

const keep = {
  "vamos-a-la-playa": { known: "We're going to the beach, it's an excellent day.", symbols: sym(DECL, IND, PRES, POS, A1), tokens: tok(
    ["Vamos", "we go", "root", "ir.verb.indicative.present.first.plural"], ["a", "to", "case", "a.adposition"], ["la", "the", "det", "la.determiner"], ["playa", "beach", "obl", "playa.noun"],
    ["hace", "it is", "parataxis", "hacer.verb.indicative.present.third.singular"], ["un", "a", "det", "un.determiner"], ["día", "day", "obj", "día.noun"], ["excelente", "excellent", "amod"]) },
  "comes-pan": { known: "Can I eat this bread?", symbols: sym(INT, POLAR, IND, PRES, POS, A1), tokens: tok(
    ["Me", "myself", "expl", "me.pronoun"], ["puedo", "I can", "root", "poder.verb.indicative.present.first.singular"], ["comer", "eat", "xcomp", "comer.verb.infinitive"], ["este", "this", "det", "este.pronoun"], ["pan", "bread", "obj", "pan.noun"]) },
  "no-comprendo": { known: "Excuse me, but I don't understand.", symbols: sym(DECL, IND, PRES, NEG, "sentence.politeness.formal", A1), tokens: tok(
    ["Perdóneme", "excuse me", "discourse"], ["pero", "but", "cc", "pero.coordinating-conjunction"], ["no", "not", "advmod", "no.adverb"], ["comprendo", "I understand", "root", "comprender.verb.indicative.present.first.singular"]) },
  "fui-al-mercado": { known: "I didn't go to the market.", symbols: sym(DECL, IND, PAST, NEG, A2), tokens: tok(
    ["No", "not", "advmod", "no.adverb"], ["fui", "I went", "root", "ir.verb.indicative.past.first.singular"], ["al", "to the", "case", "al.contraction"], ["mercado", "market", "obl", "mercado.noun"]) },
  "estuve-en-casa": { known: "Were you at home last night?", symbols: sym(INT, POLAR, IND, PAST, POS, A2), tokens: tok(
    ["Estuviste", "you were", "root", "estar.verb.indicative.past.second.singular"], ["en", "at", "case", "en.adposition"], ["casa", "home", "obl", "casa.noun"], ["anoche", "last night", "advmod"]) },
  "cuando-comemos": { known: "When do we eat? I'm hungry!", symbols: sym(INT, CONTENT, IND, PRES, POS, A1), tokens: tok(
    ["Cuándo", "when", "advmod", "cuándo.adverb"], ["comemos", "we eat", "root", "comer.verb.indicative.present.first.plural"], ["Tengo", "I have", "parataxis", "tener.verb.indicative.present.first.singular"], ["hambre", "hunger", "obj", "hambre.noun"]) },
  "tendre-tiempo": { known: "I don't know if I'll have time.", symbols: sym(DECL, IND, FUT, NEG, A2), tokens: tok(
    ["No", "not", "advmod", "no.adverb"], ["sé", "I know", "root", "saber.verb.indicative.present.first.singular"], ["si", "if", "mark", "si.subordinating-conjunction"], ["tendré", "I will have", "ccomp", "tener.verb.indicative.future.first.singular"], ["tiempo", "time", "obj", "tiempo.noun"]) },
  "no-podre-ir": { known: "I won't be able to go, because I'm working tomorrow afternoon.", symbols: sym(DECL, IND, FUT, NEG, A2), tokens: tok(
    ["Yo", "I", "nsubj", "yo.pronoun"], ["no", "not", "advmod", "no.adverb"], ["podré", "I will be able", "root", "poder.verb.indicative.future.first.singular"], ["ir", "to go", "xcomp", "ir.verb.infinitive"],
    ["porque", "because", "mark", "porque.subordinating-conjunction"], ["trabajo", "I work", "advcl", "trabajar.verb.indicative.present.first.singular"], ["mañana", "tomorrow", "advmod", "mañana.adverb"], ["por", "in", "case", "por.adposition"], ["la", "the", "det", "la.determiner"], ["tarde", "afternoon", "obl", "tarde.noun"]) },
  "hare-la-comida": { known: "We will make the food.", symbols: sym(DECL, IND, FUT, POS, A2), tokens: tok(
    ["Haremos", "we will make", "root", "hacer.verb.indicative.future.first.plural"], ["la", "the", "det", "la.determiner"], ["comida", "food", "obj", "comida.noun"]) },
  "tenia-un-gato": { known: "You had a cat.", symbols: sym(DECL, IND, IMPERF, POS, A2), tokens: tok(
    ["Tenías", "you had", "root", "tener.verb.indicative.imperfect.second.singular"], ["un", "a", "det", "un.determiner"], ["gato", "cat", "obj", "gato.noun"]) },
  "podria-comer": { known: "How could I eat this?", symbols: sym(INT, CONTENT, COND, POS, A2), tokens: tok(
    ["Cómo", "how", "advmod", "cómo.adverb"], ["podría", "I could", "root", "poder.verb.conditional.first.singular"], ["comer", "eat", "xcomp", "comer.verb.infinitive"], ["esto", "this", "obj", "esto.pronoun"]) },
  "ve-a-casa": { known: "Go home quickly.", symbols: sym(IMPF, IMPM, POS, A1), tokens: tok(
    ["Ve", "go", "root", "ir.verb.imperative.second.singular"], ["rápido", "quickly", "advmod"], ["a", "to", "case", "a.adposition"], ["casa", "home", "obl", "casa.noun"]) },
  "quiero-que-hables": { known: "I don't want you to talk about my son.", symbols: sym(DECL, SUBJ, PRES, NEG, A2), tokens: tok(
    ["No", "not", "advmod", "no.adverb"], ["quiero", "I want", "root", "querer.verb.indicative.present.first.singular"], ["que", "that", "mark", "que.subordinating-conjunction"], ["hables", "you talk", "ccomp", "hablar.verb.subjunctive.present.second.singular"],
    ["de", "about", "case", "de.adposition"], ["mi", "my", "det", "mi.pronoun"], ["hijo", "son", "obl", "hijo.noun"]) },
  "compramos-fruta": { known: "We have to buy fruit and vegetables.", symbols: sym(DECL, IND, PRES, POS, A1), tokens: tok(
    ["Tenemos", "we have", "root", "tener.verb.indicative.present.first.plural"], ["que", "to", "mark", "que.subordinating-conjunction"], ["comprar", "buy", "xcomp", "comprar.verb.infinitive"], ["fruta", "fruit", "obj", "fruta.noun"], ["y", "and", "cc", "y.coordinating-conjunction"], ["verdura", "vegetables", "conj", "verdura.noun"]) },
};
const restore = ["vivo-en-un-piso-pequeno", "tengo-un-billete", "tuve-un-problema", "no-comi-carne", "comia-pan", "el-parque-es-grande", "viviria-aqui", "seria-facil", "comeria-pan", "come-la-fruta", "habla-espanol", "haz-la-comida", "es-importante-que-coma", "quiero-que-comas", "no-tengo-tiempo", "estudio-espanol", "compro-pan", "bebo-agua", "trabajo-mucho", "estudias-espanol", "leo-un-libro"];

const strip = (s) => s.toLowerCase().replace(/[¿?¡!.,;:]/g, "").replace(/\s+/g, " ").trim();
const report = { kept: [], restored: [], edited: [] };
for (const [slug, d] of Object.entries(keep)) {
  const r = by[slug]; if (!r?.trait.VOCALIZED) throw new Error(`keep ${slug}`);
  if (strip(d.tokens.map((t) => t.form).join(" ")) !== strip(r.trait.TRANSLATED.learning)) throw new Error(`tokens ≠ learning ${slug}`);
  report.kept.push(`${r.trait.RANKED.rank} ${r.trait.TRANSLATED.learning} | ${r.trait.TRANSLATED.known} → ${d.known}`);
  r.trait.TRANSLATED.known = d.known; r.symbols = d.symbols; r.trait.ANNOTATED.tokens = d.tokens;
}
for (const slug of restore) {
  const r = by[slug]; const t = targets[slug]; if (!r?.trait.VOCALIZED || !t) throw new Error(`restore ${slug}`);
  if (strip(r.trait.ANNOTATED.tokens.map((t) => t.form).join(" ")) !== strip(t.text)) throw new Error(`authored tokens ≠ target ${slug}`);
  report.restored.push(`${r.trait.RANKED.rank} ${r.trait.TRANSLATED.learning} → ${t.text} | ${r.trait.TRANSLATED.known}`);
  r.trait.TRANSLATED.learning = t.text;
  delete r.trait.VOCALIZED; r.traits = r.traits.filter((x) => x !== "VOCALIZED");
}

{ const r = by["hoy-es-lunes"]; r.trait.TRANSLATED.known = "Is today Monday?"; r.symbols = sym(INT, POLAR, IND, PRES, POS, A1); report.edited.push(`${r.trait.RANKED.rank} known → Is today Monday? · interrogative polar`); }
{ const r = by["no-se"] ?? rows.find((r) => r.trait.TRANSLATED.learning === "¡No sé!"); r.trait.TRANSLATED.known = "I don't know!"; report.edited.push(`${r.trait.RANKED.rank} known → I don't know!`); }
{ const r = rows.find((r) => r.trait.TRANSLATED.learning === "¡Necesito ayuda!"); r.trait.TRANSLATED.known = "I need help!"; report.edited.push(`${r.trait.RANKED.rank} known → I need help!`); }
{ const r = by["busco-trabajo-pero-no-encuentro"]; r.slug = "busco-trabajo-pero-no-lo-encuentro"; r.trait.TRANSLATED.learning = "Busco trabajo pero no lo encuentro"; r.trait.TRANSLATED.known = "I look for work but I don't find it";
  r.trait.ANNOTATED.tokens.splice(4, 0, { deprel: "obj", form: "lo", gloss: "it", index: 4, literal: "lo.pronoun" }); r.trait.ANNOTATED.tokens.forEach((t, i) => (t.index = i)); report.edited.push(`${r.trait.RANKED.rank} Busco trabajo pero no encuentro → Busco trabajo pero no lo encuentro | I look for work but I don't find it`); }

let cefr = 0, untensed = 0;
for (const r of rows) {
  const has = (s) => r.symbols.some((x) => x.slug === s);
  if (has(COND) && has(PRES)) { r.symbols = r.symbols.filter((x) => x.slug !== PRES); untensed++; }
  const want = [PAST, FUT, IMPERF, COND, SUBJ].some(has) ? A2 : A1;
  if (!has(want)) { r.symbols = r.symbols.map((x) => (x.slug.startsWith("proficiency.cefr.") ? { slug: want } : x)); cefr++; }
}
const learnings = rows.map((r) => strip(r.trait.TRANSLATED.learning)); const dup = learnings.filter((l, i) => learnings.indexOf(l) !== i);
const ranks = new Set(rows.map((r) => r.trait.RANKED.rank));
if (dup.length || ranks.size !== rows.length || Math.max(...ranks) !== rows.length) throw new Error(`dup ${dup} ranks ${ranks.size}/${rows.length}`);
await Deno.writeTextFile(FILE, Datasink.canonical(rows, "js"));
console.log(`rows ${rows.length} · kept ${report.kept.length} · restored ${report.restored.length} · cefr→a2 ${cefr} · conditionals untensed ${untensed}`);
for (const [k, v] of Object.entries(report)) { console.log(`== ${k}`); v.forEach((l) => console.log("  " + l)); }
