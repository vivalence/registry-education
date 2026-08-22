# @education

The language-learning package for [Vivalence](https://github.com/vivalence/vivalence) — the domain, the data, and the modes that teach with it.

This is a **package**: a registry root you tap into a machine, after which its modules resolve by `@education/<type>/<slug>` like anything else in the registry.

```sh
deno task ghost/run /ledger/tap /path/to/vivalence-registry/education
deno task runtime/run     # tap records; the next boot mounts
```

## What's in it

**`domain/`** — `@education/domain/language-learning`. Extends the kernel entities with the traits a language needs — `TRANSLATED · EXEMPLIFIED · RANKED · ANNOTATED · VOCALIZED · CONJUGATED` — and adds the userspace side: retention (`bayesian` · `boolean` · `counter` scorers) and the tools a teacher calls (`lookup` · `review` · `progress` · `queue` · `line`).

**`topologies/`** — the dimensions literals and symbols inhabit. `word` (after Universal Dependencies) · `sentence` · `conjugation`. Each is `DATASET` only: it brings the symbols that organize a language, not the language itself.

**`topographies/`** — the actual data. `english-to-italian` · `english-to-brazilian` · `english-to-spanish`. Each is `DATASET` + `FRAUGHT`: literals and symbols, plus the audio cargo served alongside them.

**`modes/`** — games, dashboards and teachers agents.

## The shape of it

A daemon's kernel is `[domain, topology, topography]` — one language domain, the dimensions it uses, and the corpus that fills them. Modes install on top and are blind to which language they are teaching: they select by symbolic position (`{ symbols: { $all: ["word.part-of-speech.verb", "proficiency.a1"] } }`), never by a join they have to know about.

That indirection is the point. Swap the topography and the same games teach Spanish instead of Italian.

## License

Fair source, same terms as [Vivalence](https://github.com/vivalence/vivalence/blob/main/LICENSE.md) — free for private use, licensed for institutional use.
