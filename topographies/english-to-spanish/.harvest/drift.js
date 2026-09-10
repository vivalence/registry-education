const T = Deno.env.get("HOME") + "/.viva/registry/education/topographies/english-to-spanish";
const targets = JSON.parse(await Deno.readTextFile(`${T}/.harvest/sent-targets.json`));
const landed = JSON.parse(await Deno.readTextFile(`${T}/.harvest/landed-sentences.json`));
const rows = (await import(`${T}/dataset/literals/sentences.js`)).default;
const norm = (s) => s.toLowerCase().replace(/[^a-záéíóúñü ]/g, "").replace(/\s+/g, " ").trim();
const bySlug = Object.fromEntries(targets.map((t) => [t.slug, t]));
let drifted = [], kept = 0, noTarget = 0;
for (const r of rows) {
  const t = bySlug[r.slug]; if (!t) { noTarget++; continue; }
  if (norm(t.text) === norm(r.trait.TRANSLATED.learning)) kept++; else drifted.push([r.trait.RANKED.rank, t.text, "→", r.trait.TRANSLATED.learning, "| known:", r.trait.TRANSLATED.known, r.trait.VOCALIZED ? "♪" : ""]);
}
console.log(`targets ${targets.length} · rows ${rows.length} · exact ${kept} · drifted ${drifted.length} · no target ${noTarget}`);
console.log("drifted in top 100:", drifted.filter((d) => d[0] <= 100).length, "· vocalized among drifted:", drifted.filter((d) => d.at(-1) === "♪").length);
drifted.sort((a, b) => a[0] - b[0]).slice(0, 14).forEach((d) => console.log(" ", d.join(" ")));
