const R = Deno.env.get("HOME") + "/.viva/registry/education";
const vocab = new Set();
for (const top of ["word", "sentence"]) for await (const f of Deno.readDir(`${R}/topologies/${top}/dataset/symbols`)) if (f.name.endsWith(".js")) for (const s of (await import(`${R}/topologies/${top}/dataset/symbols/${f.name}`)).default) vocab.add(s.slug);
console.log("topology symbol vocab:", vocab.size);
const exists = async (p) => { try { await Deno.stat(p); return true; } catch { return false; } };
for (const lang of ["italian", "spanish"]) {
  const T = `${R}/topographies/english-to-${lang}`;
  const local = new Set(vocab);
  for await (const f of Deno.readDir(`${T}/dataset/symbols`)) if (f.name.endsWith(".js")) for (const s of (await import(`${T}/dataset/symbols/${f.name}`)).default) local.add(s.slug);
  const files = ["sentences.js", "conjugation.js"];
  for await (const f of Deno.readDir(`${T}/dataset/literals/words`)) if (f.name.endsWith(".js")) files.push(`words/${f.name}`);
  files.sort();
  const all = new Map(); const rows = {};
  for (const f of files) { rows[f] = (await import(`${T}/dataset/literals/${f}`)).default; for (const r of rows[f]) all.set(r.slug, r); }
  console.log(`\n==== ${lang} · ${all.size} literals · local symbols ${local.size}`);
  const out = [];
  for (const f of files) {
    const rs = rows[f]; const hist = {}; const issues = {};
    const bump = (k) => (issues[k] = (issues[k] ?? 0) + 1);
    let ordered = "rank-asc"; let prevRank = -Infinity; let prevSlug = "";
    let slugAsc = true;
    const seen = new Set();
    for (const r of rs) {
      const key = (r.traits ?? []).slice().sort().join("+"); hist[key] = (hist[key] ?? 0) + 1;
      if (seen.has(r.slug)) bump("dup-slug"); seen.add(r.slug);
      for (const t of r.traits ?? []) if (!(t in (r.trait ?? {}))) bump(`trait-listed-no-body:${t}`);
      for (const t of Object.keys(r.trait ?? {})) if (!(r.traits ?? []).includes(t)) bump(`body-not-listed:${t}`);
      const tr = r.trait ?? {};
      if (tr.TRANSLATED && !(tr.TRANSLATED.known && tr.TRANSLATED.learning)) bump("TRANSLATED-empty");
      if (tr.EXEMPLIFIED && !(tr.EXEMPLIFIED.known && tr.EXEMPLIFIED.learning)) bump("EXEMPLIFIED-empty");
      if (tr.RANKED) { if (typeof tr.RANKED.rank !== "number") bump("RANKED-no-rank"); else { if (tr.RANKED.rank < prevRank) ordered = "unordered"; prevRank = tr.RANKED.rank; } }
      if (r.slug < prevSlug) slugAsc = false; prevSlug = r.slug;
      if (tr.VOCALIZED) { const p = tr.VOCALIZED.asset?.path; if (!p) bump("VOCALIZED-no-path"); else if (!(await exists(`${T}/freight/audio/${p}`))) bump("VOCALIZED-missing-mp3"); }
      if (tr.ANNOTATED) { const toks = tr.ANNOTATED.tokens ?? []; if (!toks.length) bump("ANNOTATED-no-tokens"); for (const t of toks) { if (t.literal && !all.has(t.literal)) bump("ANNOTATED-token-literal-unknown"); if (!t.gloss) bump("ANNOTATED-token-no-gloss"); if (!t.deprel) bump("ANNOTATED-token-no-deprel"); } }
      if (tr.CONJUGATED) { if (!all.has(tr.CONJUGATED.infinitive)) bump("CONJUGATED-infinitive-unknown"); for (const v of Object.values(tr.CONJUGATED.paradigm ?? {})) if (!all.has(v)) bump("CONJUGATED-form-unknown"); }
      for (const s of r.symbols ?? []) { const slug = s.slug ?? s; if (!local.has(slug) && !slug.startsWith("word.lemma.")) bump(`symbol-unknown:${slug.split(".").slice(0,2).join(".")}`); }
      if (!(r.symbols ?? []).length) bump("no-symbols");
    }
    const ranked = rs.some((r) => r.trait?.RANKED);
    out.push({ file: f, rows: rs.length, order: ranked ? ordered : (slugAsc ? "slug-asc" : "unordered"), traits: Object.entries(hist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" | "), issues: Object.entries(issues).map(([k, v]) => `${k}=${v}`).join(" ") });
  }
  for (const o of out) console.log(`${o.file}\n  rows ${o.rows} · order ${o.order}\n  traits ${o.traits}\n  issues ${o.issues || "none"}`);
  const mp3s = []; for (const d of ["words", "sentences"]) { try { for await (const f of Deno.readDir(`${T}/freight/audio/${d}`)) if (f.name.endsWith(".mp3")) mp3s.push(`${d}/${f.name}`); } catch {} }
  const referenced = new Set([...all.values()].map((r) => r.trait?.VOCALIZED?.asset?.path).filter(Boolean));
  console.log(`freight mp3 ${mp3s.length} · referenced ${referenced.size} · orphan ${mp3s.filter((m) => !referenced.has(m)).length}`);
}
