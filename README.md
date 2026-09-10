# @education
This package for [vivalence](vivalence/vivalence) contains an already powerful language-learning system, waiting for you to make it your own.

coherent domain - #durable
Agentic Learning 
Customizable Applications
Builtin corpora for `english to italian`, xxx.

the education package will be extended to cover additional domains for music, programming, chess, and more.
education was the original motivation for vivalence. you could say vivalence was designed as an operating system for education and everything else just happened to align perfectly.

## Getting started

Prerequisite: a working `viva` CLI ([quickstart](https://github.com/vivalence/vivalence#quickstart)).

Pull the package with `registry/tap`.
```sh
viva registry/tap https://github.com/vivalence/registry-education
viva registry/list
```

`registry/tap` clones the package to `~/.viva/registry/education` and records the location in `~/.viva/registry.json`. `registry/list` reads that ledger back, one row per tapped package:

```
location    mount                        owner       modes  identifier
education   ~/.viva/registry/education   @education  25     @education/package/education
```

@education ships three ready-made instances — `italian`, `spanish`, `brazilian`. Take one whole:

```sh
viva instance/create @education/instance/italian --use
viva instance/init
# viva instance/run
# viva instance/lighthouse signup <username> <password>
```

[screenshot]


## package content

```
education.viva.js          package manifest — owner @education
instances/                 ready instances: italian, spanish, brazilian
domain/                    language-learning: entities, business logic, tools, skills
topologies/                ontological datasets: word, sentence, conjugation
topographies/              corpora datasets: english-to-italian, -spanish, -brazilian
modes/
  teacher/                 francesca
  games/                   dojo, nyan, riddler
  home/                    dataspace (dashboard), aprende (homepage-starter)
  tactics/                 clinic, impara, survival, harvest
```

### Datasets / Corpora 

| Topography | Words | Sentences | Paradigms | Symbols | Audio |
|---|---|---|---|---|---|
| english-to-italian | 5,092 | 1,136 | 355 | 55 | 2,182 |
| english-to-brazilian | 1,838 | 270 | 108 | 51 | 1,210 |
| english-to-spanish | 1,231 | 354 | 114 | 51 | 186 |

Datasets are plain JS arrays of `{ slug, traits, trait, symbols }`. The `Dataset` class loads them into the daemon's datamap on boot; FILESET records the audio as File rows, served at `/attached/file/:id`.

Audio is sourced from Lingua Libre, Wiktionary and Tatoeba (NM1 recordings), CC-licensed. Sentence text from Tatoeba, CC BY.

### Modes

| Mode | Type | Slug | What it does |
|---|---|---|---|
| dataspace | dashboard | `dataspace` | raw view of the daemon's data |
| francesca | teacher | `francesca` | Italian conversation tutor, HARNESSED + TOOLING, self-reviewing |
| dojo | game | `dojo` | the rep machine: FLIP, PICK, TYPE, CONJUGATE over words, sentences and forms; presets meet · recognize · write · shadow · listen · drill · mixed · ultra |
| nyan | game | `nyan` | typing trainer with learning vocabulary |
| riddler | game | `riddler` | LLM-generated riddles about a literal or topic using known vocabulary |
| impara | tactic | `impara` | Italian course in three buckets: vocabolario, grammatica, frasi |
| aprende | homepage | `aprende` | the landing surface: roster, activity, retention, ranks; emits decks, drills, flashcards, riddles; hosts the tutor |
| harvest | tactic | `harvest` | corpus intake — annotate, classify and file new literals |

### Instances

A daemon composed to teach a language, in this case Italian — `instances/italian/daemon.js`:
```js
import paladin from "@vivalence/paladin";
import { Url } from "@vivalence/typology";

export const italian = {
  manifest: {
    type: "daemon",
    slug: "italian",
    version: "0.0.1",
    name: "Italiano",
    description: "English → Italian. Francesca teaches; harvest feeds the corpus.",
    icon: { emoji: "🇮🇹" },
  },
  statics: {
    language: {
      known: { slug: "english", name: "English" },
      learning: { slug: "italian", name: "Italiano" },
    },
  },
  kernel: [
    "@education/domain/language-learning",
    "@education/topology/word",
    "@education/topology/sentence",
    "@education/topology/conjugation",
    "@education/topography/english-to-italian",

    "@commons/dashboard/dataspace",
    "@education/tactic/harvest",
    "@education/teacher/francesca",
    "@education/game/dojo",
  ],
  consume: {
    nlp: {
      module: "@commons/service/nlp-stanza",
      secrets: { key: () => paladin.secret.get("SECRET_VIVA_SERVICE_NLP_KEY") },
      statics: {
        remote: () => new Url(paladin.env.get("VIVA_SERVICE_NLP_REMOTE")),
        language: "it",
        processors: "tokenize,mwt,pos,lemma,depparse",
      },
    },
  },
};
```

The daemon gets provided LLM services, auth, database, and more by the instance — `instances/italian/italian.viva.js`:

```js
import paladin from "@vivalence/paladin";
import { v } from "@vivalence/typology";
import { italian } from "./daemon.js";

export const manifest = {
  type: "instance",
  slug: "italian",
  version: "0.0.1",
};

export const environment = v.environment({
  VIVA_RUNTIME_ORIGIN: v.url().desc("Origin the runtime is reachable at.").default("http://localhost:2501").group("addresses"),
  // … 8 addresses, 3 NLP service settings, 6 keys — each one described in the file
  SECRET_VIVA_ANTHROPIC_API_KEY: v.string().desc("Anthropic key. The harness needs one.").group("keys"),
});

export const daemons = [italian];

export const runtime = {
  manifest: { slug: "runtime" },
  statics: {
    serve: () => paladin.env.get("VIVA_RUNTIME_SERVE"),
  },
};

export const datamap = { module: "@commons/datamap/libsql" };

export const lighthouse = {
  module: "@commons/lighthouse/multiplayer",
  statics: {
    remote: () => paladin.env.get("PUBLIC_VIVA_LIGHTHOUSE_REMOTE"),
  },
};

export const hallucinators = [
  {
    module: "@commons/hallucinator/anthropic",
    secrets: { key: () => paladin.secret.get("SECRET_VIVA_ANTHROPIC_API_KEY") },
  },
  {
    module: "@commons/hallucinator/openrouter",
    statics: {
      models: {
        fast: { id: "deepseek/deepseek-v4-flash", tune: [0.4, 0.4, 1.0, 1.0], context: 1048576 },
      },
    },
    secrets: { key: () => paladin.secret.get("SECRET_VIVA_OPENROUTER_API_KEY") },
  },
  {
    module: "@commons/hallucinator/elevenlabs",
    secrets: { key: () => paladin.secret.get("SECRET_VIVA_ELEVENLABS_API_KEY") },
  },
  {
    module: "@commons/hallucinator/deepgram",
    secrets: { key: () => paladin.secret.get("SECRET_VIVA_DEEPGRAM_API_KEY") },
  },
];

export const clients = [
  { manifest: { type: "client", slug: "ghost" } },
  {
    manifest: { type: "client", slug: "anima", traits: ["ATTACHED"] },
    statics: {
      serve: () => paladin.env.get("VIVA_CLIENT_ANIMA_SERVE"),
    },
  },
];

export const services = [
  {
    manifest: { type: "lighthouse", slug: "multiplayer" },
    module: "@commons/lighthouse/multiplayer",
    secrets: { jwt: () => paladin.secret.get("SECRET_VIVA_JWT") },
  },
  {
    manifest: { type: "service", slug: "nlp-stanza" },
    module: "@commons/service/nlp-stanza",
    secrets: { key: () => paladin.secret.get("SECRET_VIVA_SERVICE_NLP_KEY") },
    statics: {
      serve: () => paladin.env.get("VIVA_SERVICE_NLP_SERVE"),
      processors: "tokenize,mwt,pos,lemma,depparse",
    },
  },
];
```



## Language Learning Domain
The domain is at the heart of the package. Every other package plugs in to it.
`@education/domain/language-learning`

It provides us with the dataobjects and business logic a language learning system needs. The domain provides us with a model of memory in `Retention`, a way to track activity in `Trace`, and methods for reviewing knowables, for fetching knowables due for review, and to assess learner progress over sets of knowables.

### Schema 
#### Userspace: Retention, Trace, Buffer, Thread, and Turn
##### **Retention**

A `RetentionEntity` is an object thats storing a prediction of the learners recall probability of any `literal`, in the form of a bayesian `retention.state: [α, β, halflife_hours]` and `retention.lastAt: DateTime`. Curtesy of (ebisu)[github].

The domain computes an optimal `retention.nextAt` and buckets memory into the `retention.status` enum `UNTOUCHED → UNKNOWN → LEARNING → KNOWN → GRADUATED`.

Each review lands a `SIGNAL` — `MASTERY · SUCCESS · NEUTRAL · MISTAKE · FAILURE` — and `retention.lastSignal` is the newest one. Signal in, status out; the driver in between is the memory model.

###### snapshot

```json
{
  "id": "01a0…",
  "user": "019d…",
  "literal": { "slug": "essere.verb.indicative.present.third.singular" },
  "driver": "BAYESIAN",
  "state": [4.2343, 4.2343, 19.7326], // α, β, halflife_h
  "status": "LEARNING",
  "nextIn": 19.7323,
  "nextAt": "2026-08-16T09:23:20.188Z",
  "lastAt": "2026-08-15T13:39:24.008Z",
  "lastSignal": "SUCCESS", // formula over the newest trace — not a column
  "strength": 0.37 // formula, exp(-elapsed_h / halflife) — not a column
}
```

###### entity — `domain/entities/userspace/Retention.ts`

```js
const RetentionSchema = new EntitySchema({
  class: RetentionEntity, 
  properties: {
    user:    { kind: "m:1", entity: () => UserEntity }, // Every memory needs someone who has it
    literal: { kind: "m:1", entity: () => LiteralEntity }, // the thing being remembered, or not
    traces:  { kind: "1:m", entity: () => TraceEntity  }, // history of signals

    driver:  { enum: true, items: () => RetentionDriverEnum }, // BAYESIAN · COUNTER · BOOLEAN
    type:    { enum: true, items: () => RetentionTypeEnum }, // INDIVIDUAL. RELATIONAL is drawn, not built.

    state:     { type: types.json }, // whatever the driver keeps — shape is the driver's business
    status:    { enum: true, items: () => RetentionStatusEnum },
    strength:  { lazy: true, formula: (t) => f(t), persist: false } // recall right now

    nextIn: { type: types.integer },  // time in hours till literal becomes due
    nextAt: { type: Date }, // datetime literal becomes due

    lastAt: { type: Date },
    lastSignal: { // the newest trace, reached without populating it
      persist: false, nullable: true,
      formula: (r) => `(SELECT json_extract(t.signal, '$.enum') FROM Trace t
                        WHERE t.retention = ${r}.id ORDER BY t.created_at DESC LIMIT 1)`,
    },
  },
  uniques: [{ properties: ["user", "literal"] }], 
  filters: { user: { cond: (args) => ({ user: args.user }), default: true } }, // authenticated users are only entitled to their own memory.
});

class RetentionEntity extends DataEntity {
  // the predicates every mode asks for, so none of them compare enums by hand
  get is() {
    return {
      virgin: !this.status || this.status === "UNTOUCHED",
      weak: this.status === "UNKNOWN" || this.status === "LEARNING",
      familiar: this.status === "LEARNING" || this.status === "KNOWN",
      strong: this.status === "KNOWN" || this.status === "GRADUATED",
      succeeded: this.lastSignal === "SUCCESS" || this.lastSignal === "MASTERY",
      failed: this.lastSignal === "FAILURE" || this.lastSignal === "MISTAKE",
    };
  }

  evolve(signal) { // update the memory given one signal
    if (typeof signal === "string") signal = { enum: signal };

    const driver = drivers[this.driver]; // the memory model this row was created with
    const result = this.state ? driver.evolve(signal, this) : driver.encode(signal);

    this.state = result.state;
    this.status = result.status;
    this.nextIn = result.nextIn;

    this.nextAt = new Date(result.nextAt);
    this.lastAt = new Date();

    return { ...result, lastAt: this.lastAt, signal }; // the verdict, for the trace
  }
}
```

Additionally, each memory driver contributes its own `sql.strength` formular; BAYESIAN's is `exp(-elapsed_h / state[2])`.

###### code — one signal in, a rescheduled row out

Nobody constructs a retention. `literal.review` finds or mints the learner's row, evolves it, writes the trace, flushes:

```js
const retention = await literal.review("SUCCESS");

retention.status; // "LEARNING"
retention.nextIn; // 19.7323 — hours
retention.nextAt; // 2026-08-16T09:23:20.188Z
```

Underneath, `evolve` is the whole memory update. It reads the driver off its own row, so a `COUNTER` row and a `BAYESIAN` row take the identical call:

```js
const verdict = retention.evolve("MISTAKE"); 
// { state, status, nextIn, nextAt, lastAt, signal } 
```

A mode never queries Retention directly. It queries *through* the literal, because what a game wants on screen is the knowable, not the memory of it:

```js
// due — the retention's nextAt is past
await ctx.daemon.entities.literal.due({ symbols: ["proficiency.survival"] }, { limit: 20 });

// feed — due first, topped up with never-touched rows by rank
await ctx.daemon.entities.literal.feed({ symbols: ["word"] }, { limit: 20 });

// byStrength — retained rows, weakest recall first; strength is the formula column
await ctx.daemon.entities.literal.byStrength({}, { limit: 10, populate: ["retentions"] });

// byLastSignal — everything the learner just got wrong
await ctx.daemon.entities.literal.byLastSignal(["MISTAKE", "FAILURE"], {}, { limit: 12 });
```


###### Retention drivers

Three built in — `BAYESIAN`, `COUNTER`, `BOOLEAN` — registered by type in `domain/retention/index.js`. A driver is two pure functions, one assessor, and one SQL fragment. No state of its own:

```js
{
  type: "BAYESIAN",
  encode: (signal) => ({ state, status, nextIn, nextAt }), // first touch, no prior state
  evolve: (signal, retention) => ({ state, status, nextIn, nextAt }), // every touch after
  assess: ({ state }) => ({ status, nextIn, nextAt }), // state → verdict, no signal needed
  sql: { strength: (table) => "…" }, // recall right now, as a formula column
}
```

`retention.evolve` picks by `this.driver` and dispatches on whether the row has been touched — `state ? driver.evolve : driver.encode`. Nothing else in the domain knows which model a row runs.

A signal arrives in one of two shapes and every driver accepts both:

```js
{ enum: "SUCCESS" } // one exercise, one verdict — what a game sends
{ ratio: { success: 7, total: 9 } } // a batch — what an appraiser over a conversation sends
```

**BAYESIAN** (default) — [ebisu](https://github.com/fasiha/ebisu). Recall is a probability that decays; `state` is `[α, β, halflife_h]`. The signal picks the *first* halflife, and after that it moves the model:

```
signal    encode → initial halflife    evolve
MASTERY   24 h                         updateRecall(1/1), then rescaleHalflife ×3
SUCCESS    3.4 h                       updateRecall(1/1)
NEUTRAL    1.0 h                       updateRecall(0.5/1) — half credit
MISTAKE    0.15 h                      updateRecall(0/1)
FAILURE    0.08 h                      updateRecall(0/1), then rescaleHalflife ×0.3
```

Status is a function of `nextIn` alone — the hours until recall decays to 50% — and of nothing else:

```
nextIn > 45 days    GRADUATED
nextIn >  7 days    KNOWN
nextIn ≥  6 hours   LEARNING
otherwise           UNKNOWN
```

Halflife is clamped to `[0.01 h, 10 years]`, so a run of failures cannot drive a row to zero and a run of masteries cannot park it past a decade.

**COUNTER** — streak-based Leitner. `state` is an object, not an array, and it keeps the totals the bayesian model throws away:

```js
const SCHEDULE = [1, 1, 24, 24, 24, 168, 168, 168]; // hours, indexed by streak
const state = {
  streak: hit ? (prev.streak || 0) + 1 : 0, // a miss resets it
  total: (prev.total || 0) + 1,
  successes: (prev.successes || 0) + (hit ? 1 : 0),
};
```

streak ≥ 2 LEARNING, ≥ 5 KNOWN, ≥ 8 GRADUATED. Past the end of the schedule `nextIn` is `9999999` — due never again.

**BOOLEAN** — `state` is the bare boolean. One positive signal GRADUATED, one negative UNKNOWN, no schedule at all. For checklists, not for vocabulary.

`POSITIVE` is `["MASTERY", "SUCCESS", "NEUTRAL"]` in both COUNTER and BOOLEAN, so a shown-or-skipped item still advances a streak. BAYESIAN is the only driver that reads NEUTRAL as partial credit rather than a hit.

Each driver also contributes its own `sql.strength`, and the entity assembles them into one `CASE` over `driver`:

```sql
BAYESIAN  exp(-(julianday('now') - julianday(r.lastAt / 1000.0, 'unixepoch')) * 24.0
              / json_extract(r.state, '$[2]'))
COUNTER   MIN(json_extract(r.state, '$.streak') * 1.0 / 8.0, 1.0)
BOOLEAN   CASE WHEN json_extract(r.state, '$') = 1 THEN 1.0 ELSE 0.0 END
```

Which is why `byStrength` can order the whole corpus by live recall in one query across mixed drivers — and why registering a fourth driver extends that `ORDER BY` without anybody editing it.


##### **Trace**
An entity to record a learners interactions with a knowable.

###### entity — `domain/entities/userspace/Trace.ts`

```js
new EntitySchema({
  class: TraceEntity,
  properties: {
    user:      { kind: "m:1", entity: () => UserEntity }, // whose review
    literal:   { kind: "m:1", entity: () => LiteralEntity }, // what was reviewed
    retention: { kind: "m:1", entity: () => RetentionEntity }, // the memory it moved

    mode:      { kind: "m:1", entity: () => ModeEntity, nullable: true }, // where — a game, a tactic, the tutor
    thread:    { kind: "m:1", entity: () => ThreadEntity, nullable: true }, // in which session

    signal:    { type: types.json }, // { enum: SIGNAL }
    status:    { type: types.string }, // the status the retention landed in
    snapshot:  { type: types.json }, // { state, nextIn, nextAt } — the verdict, frozen
  },
  filters: { user: { cond: (args) => ({ user: args.user }), default: true } }, // a learner sees only their own history
});
```

Retention holds the head; traces hold the history. Nothing recomputes it.

###### snapshot

```json
{
  "id": "01a0…",
  "user": "019d…",
  "literal": { "slug": "essere.verb.indicative.present.third.singular" },
  "retention": "01a0…",
  "mode": { "type": "game", "slug": "dojo" }, // where the review was taken
  "thread": "01a0…", // in which session
  "signal": { "enum": "SUCCESS" },
  "status": "LEARNING",
  "snapshot": {
    "state": [4.2343, 4.2343, 19.7326],
    "nextIn": 19.7323,
    "nextAt": "2026-08-16T09:23:20.188Z"
  }
}
```

`mode` and `thread` are nullable, and often null — a review taken through the `/review` agent tool outside a session has neither.

###### code — nobody writes a trace

`literal.review` is the only writer. One method: find or mint the retention, evolve it, record the trace, one flush.

```js
// domain/entities/kernel/Literal.ts
async review(signal, ctx) {
  const em = ctx.daemon.entities.em;

  let retention = this.retention ?? (await em.findOne(RetentionEntity, { literal: this.id }));
  if (!retention) {
    retention = em.create(RetentionEntity, {
      user: ctx.user.id, literal: this.id,
      driver: "BAYESIAN", type: "INDIVIDUAL", status: "UNTOUCHED", state: null,
    });
    em.persist(retention);
  }

  const result = retention.evolve(signal);

  em.persist(em.create(TraceEntity, {
    user: ctx.user.id,
    literal: this.id,
    retention,
    mode: ctx.mode.id, // which game, tactic or teacher took it
    thread: ctx.thread.id, // which session it happened in
    signal: result.signal,
  }));

  await em.flush();
  return retention;
}
```

Reading it back is a plain repository query:

```js
const history = await ctx.daemon.entities.trace.find(
  { literal: literal.id },
  { orderBy: { createdAt: "DESC" }, limit: 20, populate: ["mode"] },
);
```

Or from the client:

```js
terminal.daemon.connection.call("/userspace/entities/trace/find", {
  where: { literal },
  options: { orderBy: { createdAt: "DESC" }, limit: 20 },
});
```


##### **Buffer**

One unit of work on screen. What a buffer is *for* is `data`. Any mode writes whatever state it wants there.

###### snapshots

`game/dojo` — the rep machine; `set` is the query, `knowables` its resolution:

```json
{
  "id": "01a0…",
  "mode": { "type": "game", "slug": "dojo" },
  "data": {
    "gameplay": "CONJUGATE",
    "prompt": "TEXT",
    "recall": "LEARNING",
    "forgiving": true,
    "streak": 2,
    "continuous": true,
    "set": [
      { "pick": "all", "where": { "symbols": { "$all": ["proficiency.survival", "conjugation"] } }, "limit": 5 }
    ],
    "knowables": [
      { 
        "ontology": "conjugation",
        "known": "he/she/it is",
        "learning": "è",
        "context": {
          "infinitive": "essere",
          "tense": "Present",
          "mood": "Indicative",
          "person": "Third Person",
          "number": "Singular"
        },
        "literal": "019f…",
        "asset": { "path": "words/essere.verb.indicative.present.third.singular.mp3" }
      }
    ]
  },
  "literals": [], // 
  "symbols": [], // 
  "status": "PENDING",
  "index": 0,
}
```

`game/riddler` — one riddle, the LLM's own transcript riding along:

```json
{
  "mode": { "type": "game", "slug": "riddler" },
  "data": {
    "riddle": "Que dia chega três dias depois de segunda-feira?",
    "answer": "quinta-feira",
    "hint": "Conta um, dois, três passos a partir do início da semana.",
    "history": [
      {
        "role": "system",
        "parts": [{ "type": "text", "text": "You are the Riddler — a theatrical riddle-master who guards knowledge behind riddles. …" }]
      }
    ]
  },
  "literals": ["019d…", "019d…"]
}
```

`game/nyan` — a typing trainer operating on my recently reviewed literals.

```json
{
  "mode": { "type": "game", "slug": "nyan" },
  "index": 59,
  "data": {
    "gameplay": "PLAIN",
    "layout": "block",
    "revealing": "off",
    "words": ["inteiro", "geral", "profissional", "terceiro", "coberta", "pálido", "…"],
    "owners": ["019d…", "019d…", "019d…", "019d…", "019d…", "019d…", "…"]
  },
  "literals": ["019d…", "…"]
}
```

###### code — the shape is the mode's declaration, not the table's

`modes/games/dojo/dojo.viva.js`:

```js
export const views = [{ slug: "dojo", mount: "buffer/Dojo.svelte", mime: mime.dom.svelte }];
export const buffer = v.buffer({
  data: {
    recall: types.recall,
    gameplay: types.gameplay.default(types.DEFAULTS.gameplay),
    prompt: types.prompt.default(types.DEFAULTS.prompt),
    preview: types.preview,
    streak: types.streak,
    continuous: types.continuous,
    limit: types.limit,
    forgiving: types.forgiving.default(types.DEFAULTS.forgiving),
    target: types.target,
    knowables: types.knowables,
    set: types.set.optional(),
  },
  literals: v.array(v.rel(v.literal())).desc(
    "The materialized set — data.set resolved into this buffer by an emitter or by /commission. Reviews land per literal; data.knowables carries authored pairs and resolved conjugation forms beside it."),
  symbols: v.array(v.rel(v.symbol())).desc(
    "Projection: every symbol the declared set mentions. Discoverability only — the clauses are the truth."),
}));
```

###### code — how a buffer is minted

`ctx.mode.buffer({ data, literals })` is the whole mint, and the `buffer` declaration above owns it: `data` is cast against that `v.buffer()` schema, defaults filled, and an unmanaged row comes back. `modes/games/nyan/nyan.viva.js` mints two ways from one emitter:

```js
const emitter = new Vector()
  .open("/play", async (ctx) => {
    const data = {};
	// @beef run an hallucinator instaead
    return ctx.mode.application.buffer({ data });
  });
```

###### code — inside a buffer app

The Svelte App is handed the buffer, which is the persistances and state layer. `modes/games/nyan/buffer/Nyan.svelte`:

```svelte
<script>
  const { buffer, terminal } = $props();

  const { words: seedWords, owners: seedOwners, ...seedConfig } = buffer.data ?? {};
  const literals = buffer.literals;

  const SIGNAL = (label) =>
    label === "clean" ? "SUCCESS" : label === "recall" ? "FAILURE" : "MISTAKE";

  // owners[i] is the literal id for word i; "" is an untracked function word
  function grade(analysis) {
    if (!game.owners?.some(Boolean) || !analysis) return; // generic runs no-op
    for (const attempt of analysis.attempts) {
      const literal = game.owners[attempt.wordIndex];
      if (!literal) continue;
      terminal.daemon.connection.call("/review/literal", { literal, signal: SIGNAL(attempt.label) });
    }
  }

  const ACTIONS = {
    quit: { key: "q", hint: "q", label: "quit", run: () => buffer.release?.() },
  };
</script>
```


##### **Thread**

A thread is one learner's session. Buffers queue on it, turns accumulate on it, and every trace names the one it happened in. Francesca's conversation is a thread; so is a dojo run.

###### entity — `systems/runtime/daemon/entities/userspace/Thread.ts`

```js
new EntitySchema({
  class: ThreadEntity,
  properties: {
    user:     { kind: "m:1", entity: () => UserEntity }, // whose session
    mode:     { kind: "m:1", entity: () => ModeEntity }, // with which mode
    intent:   { kind: "m:1", entity: () => IntentEntity, nullable: true }, // what launched it; its traits are copied in on create

    traits:   { enum: true, array: true, items: () => ThreadTraitsEnum }, // MASKED · AIMED · QUEUEING · LABELED
    trait:    { type: types.json },

    turns:    { kind: "1:m", entity: () => TurnEntity }, // the llm conversation

    buffers:  { kind: "1:m", entity: () => BufferEntity }, // the queue
    phase:    { enum: true, items: () => ThreadPhaseEnum }, // inert · manual · continuous · escort — thread/buffer rendering modes
    counter:  { type: types.integer }, // buffers bound so far — the next buffer's index
    cursor:   { type: types.integer }, // the buffer on screen

    parent:   { kind: "m:1", entity: () => ThreadEntity, nullable: true }, // a thread can fork
    children: { kind: "1:m", entity: () => ThreadEntity },
  },
  filters: { user: { cond: (args) => ({ user: args.user }), default: true } }, // a learner sees only their own sessions
});
```

###### snapshot

The tutor's thread — the one the Trace above happened in:

```json
{
  "id": "01a0…",
  "user": "019d…",
  "mode": { "type": "teacher", "slug": "francesca" },
  "traits": ["LABELED", "INTELLIGENT"],
  "trait": {
    "LABELED": { "name": "Francesca" },
    "INTELLIGENT": { "tune": "balanced", "effort": "none" }
  },
  "counter": 2,
  "cursor": 0,
  "phase": "manual",
  "buffers": [],
  "turns": ["01a0…", "…"], // 53 — see Turn below
  "traces": ["01a0…", "…"] // 9 reviews landed in this conversation
}
```

`LABELED` is one field, `{ name }` — the display name anima writes on the thread tab. `INTELLIGENT` is the thread's intelligence dial, claim-gated (read only while `traits` includes it) and validated at the harness boundary against `v.entities.INTELLIGENT`:


Every field is optional, and an absent one means *the mode decides*. Which is also the trap in the row above: the live thread claims `LABELED` in `traits` and carries no `LABELED` body at all. Presence in `traits` is the fact; the body is where a trait needs one.

A dojo thread, for contrast — no turns, one buffer, no traits claimed at all:

```json
{
  "mode": { "type": "game", "slug": "dojo" },
  "phase": "manual",
  "traits": [],
  "trait": {},
  "counter": 0,
  "cursor": 0,
  "buffers": ["01a0…"],
  "turns": []
}
```

 Francesca used its harness to generate a dojo buffer that was played for ~30 reps:
@beef this is not a thread. this is a buffer. 
```json
{
  "mode": { "type": "game", "slug": "dojo" },
  "status": "PENDING",
  "index": 0,
  "literals": [], // empty — CONJUGATE reviews land on token literals, not on the buffer's
  "symbols": ["conjugation", "proficiency.survival"], // the projection of data.set
  "data": {
    "gameplay": "CONJUGATE",
    "prompt": "TEXT",
    "recall": "LEARNING",
    "forgiving": true,
    "random": "GAMEPLAY",
    "streak": 2,
    "anhieb": 1,
    "continuous": true,
    "set": [
      { "pick": "all", "where": { "symbols": { "$all": ["proficiency.survival", "conjugation"] } }, "limit": 5 }
    ],
    "session": {
      "phase": "playing",
      "streak": 2,
      "attempts": 3,
      "reps": 3,
      "sets": 1,
      "reviews": 33,
      "played": ["019ff2f8-…", "019ff2f8-…", "019ff2f8-…", "019ff2f8-…", "019ff2f8-…"],
      "queue": [
        {
          "ontology": "conjugation",
          "known": "to be",
          "learning": "essere",
          "context": { "tense": "Present", "mood": "Indicative", "suffix": "-ere", "regularity": "Irregular" },
          "literal": "019ff2f8-6f7b-…",
          "asset": { "path": "words/essere.verb.infinitive.mp3" },
          "signal": "SUCCESS",
          "tokens": [
            { "slot": "firstSingular",  "form": "sono",  "gloss": "I am",          "literal": "019ff2f8-7518-…", "signal": "FAILURE" },
            { "slot": "secondSingular", "form": "sei",   "gloss": "you are",       "literal": "019ff2f8-7518-…", "signal": "SUCCESS" },
            { "slot": "thirdSingular",  "form": "è",     "gloss": "he/she/it is",  "literal": "019ff2f8-7518-…", "signal": "SUCCESS" },
            { "slot": "firstPlural",    "form": "siamo", "gloss": "we are",        "literal": "019ff2f8-7549-…", "signal": "SUCCESS" },
            { "slot": "secondPlural",   "form": "siete", "gloss": "you all are",   "literal": "019ff2f8-7549-…" },
            { "slot": "thirdPlural",    "form": "sono",  "gloss": "they are",      "literal": "019ff2f8-7549-…", "signal": "MISTAKE" }
          ]
        },
        { "learning": "avere", "…": "… five paradigms, six tokens each" }
      ]
    }
  }
}
```


###### code 

`modes/home/aprende/emitter/nyan.js` — draw through the domain, sample, hand to the game:

```js
const pool = await ctx.daemon.entities.literal.feed(
  { symbols: [ctx.input.ontology] }, // "word" or "sentence"
  { limit: Math.ceil(ctx.input.count * POOL_FACTOR) },
);

const literals = weightedSample(pool, ctx.input.count);

const buffer = await nyan.emit.literals({
  literals, // 20 rows, weighted-sampled from a pool of 20 × POOL_FACTOR
  gameplay: "PLAIN", // or SUDDENDEATH — one wrong key ends the run
  layout: "river", // or block
  thread: "01a007c6-2cdc-767a-b45f-627e1aa8729f",
});
```

`modes/home/aprende/emitter/riddle.js` — the riddler assembles its own pool and samples its own level, so the caller passes steering, not rows:

```js
const buffer = await riddler.emit.riddle.fromSymbols({
  symbols: ["proficiency.survival", "domain.weekday"], // draw the pool from these sets
  instructions: "Develop a little logic question in riddle dress about what day comes n days before or after another. Keep it to one sentence. No proper nouns.",
  numberOfRiddles: 1,
  levelPoolSize: 12, // how wide to sample before picking a level
});
```

which lands the riddle the buffer snapshot above is holding — `"Que dia chega três dias depois de segunda-feira?"`, answer `quinta-feira`, drawn from `domain.weekday`.

##### **Turn**

A message in a conversation. Turns accumulate on a thread and chain to each other by `parent`. 

###### entity — `systems/runtime/daemon/entities/userspace/Turn.ts`

```js
new EntitySchema({
  class: TurnEntity,
  repository: () => TurnRepository, // history · chain · fold
  properties: {
    role:     { type: types.string }, // user · assistant. that is the whole vocabulary.
    parts:    { type: types.json }, // the content, typed part by part
    meta:     { type: types.json, nullable: true }, // state, usage, provider

    parent:   { kind: "m:1", entity: () => TurnEntity, nullable: true }, // the turn before it
    children: { kind: "1:m", entity: () => TurnEntity }, // a turn can fork

    thread:   { kind: "m:1", entity: () => ThreadEntity }, // whose conversation
    mode:     { kind: "m:1", entity: () => ModeEntity, nullable: true }, // whose harness
  },
});
```



###### snapshot — four consecutive turns, the opening of a session

```json
{ "role": "user", "parts": [{ "type": "text", "text": "my love" }], "meta": null, "parent": null }
```

The assistant answers with prose *and* two tool calls in the same turn, because `parts` is a list and not a field:

```json
{
  "role": "assistant",
  "parts": [
    { "type": "text", "text": "Let me open the session properly" },
    { "type": "tool_use", "id": "call_595cd6…", "name": "progress", "input": {} },
    { "type": "tool_use", "id": "call_da48a2…", "name": "language-learning_queue", "input": { "pick": "due", "limit": 12 } }
  ],
  "meta": {
    "state": "tools",
    "usage": {
      "prompt_tokens": 10054, "completion_tokens": 80, "cost": 0.00038,
      "prompt_tokens_details": { "cached_tokens": 9216 }
    },
    "provider": { "finish_reason": "tool_calls", "model": "deepseek/deepseek-v4-flash" }
  },
  "parent": "3701c0bf…"
}
```

Both of those are domain tools, and only one carries a prefix — `progress` arrives bare, `language-learning_queue` namespaced. The prefixing is the harness's assembly, not the tool's own declaration.

Results land as the next turn, one part per call:

```json
{
  "role": "user",
  "parts": [{
    "type": "tool_result", "id": "call_595cd6…",
    "output": { "message": "[Learner report]\nVocabulary: 6535 literals · 10 with retention (untouched 0 · unknown 10 · …) · 4 due for review.\nWeakest words: avere.present.indicative (), essere.imperfect.indicative (), …" }
  }]
}
```

And then the exchange the learner actually sees:

```json
{
  "role": "assistant",
  "parts": [{ "type": "text", "text": "OK! Ciao, my love ❤️\n\nFour items due, all early stuff (essere, del). Let\u2019s start with the cold ambush I had lined up from last session — then we\u2019ll hit the due queue.\n\n1. **they work**\n2. **you all read**\n…" }],
  "meta": { "state": "complete", "usage": { "prompt_tokens": 10470, "completion_tokens": 141, "cost": 0.00045 } }
}
```

###### code 

```js
<!-- @beef show me how we use our cortex hallucination to stream turns which are automatically regestered into thread turns via harness
also show how another mode might render an object and manually apply that to the thread as a turn. -->
```

#### Dataspace: Literal, Symbol, Mode

What is knowable and learnable, what are its dimensions, properties, and relations?
In the language learning domain I have so far defined three learnable ontologies - `word, sentence, conjugation`

##### Ontological space
 [[@beef here]]

##### **Literal**
any one specifc word, sentence or conjugation.
Any learnable thing. Gets a retention per user; can be attached to buffers.
Slugs are structural: `rosso.adjective.masculine.singular`, `essere.verb.indicative.present.first.singular`, `essere.present.indicative`, `devo-andare-a-dormire`.
carry their payload in traits.

###### entity — `domain/entities/kernel/Literal.ts`, extending the runtime's `Literal`

```js
new EntitySchema({
  class: LiteralEntity, extends: base.schema, //  slug, symbols m:n, mode m:1, traits[], trait{}, uses/in m:n, symbol{}, ontology
  repository: () => LiteralRepository, // due · novel · feed · byStrength · byLastSignal
  properties: {
    traits:     { enum: true, array: true, items: () => LiteralTraitsEnum }, 
    rank:       { type: types.integer, default: 999999 }, // read from RANKED 
    strength:   { lazy: true, formula: (l) => f(l), persist: false }, // the user's recall at t0 
    retentions: { kind: "1:m", entity: () => RetentionEntity }, // one per user
    uses:       { kind: "m:n", entity: () => LiteralEntity }, // sentence uses words
    in:         { kind: "m:n", entity: () => LiteralEntity }, // word in sentences
  },
});
```

The runtime's subscriber folds `symbols` into `symbol{}` and derives `ontology`; the domain's stamps `rank` and, after flush, materialises `ANNOTATED` tokens and `CONJUGATED` forms into `uses`. Callers set neither.

###### traits — the payload, six of them

```
TRANSLATED   { known, learning }                        the pair — every learnable literal has it
EXEMPLIFIED  { known, learning }                        an example sentence for a word
RANKED       { rank?, zipf?, fpm? }                     frequency → literal.rank, the syllabus order
VOCALIZED    { asset: { path } }                        audio in the topography's freight
ANNOTATED    { tokens: [{ form, gloss, literal, … }] }  a sentence's tokens → it uses its words
CONJUGATED   { infinitive, paradigm: { … } }            a paradigm → it uses its six forms
```

`literal.traits` is the array, `literal.trait.<NAME>` the body, `literal.implements("VOCALIZED")` the guard. A mode that cannot render a trait filters on it before it draws.

**TRANSLATED** — the one trait a learnable literal must have. Both sides, `known` first.

```json
"TRANSLATED": { "known": "he/she/it is", "learning": "è" }
```

**EXEMPLIFIED** — a sentence that uses the word, carried *on* the word. Not a literal of its own, so it is never reviewed: the Dojo shows it as a hint, the tutor as context.

```json
"EXEMPLIFIED": { "known": "It is a good restaurant", "learning": "È un buon ristorante" }
```

**RANKED** — frequency, and therefore syllabus order. Three accepted shapes; the subscriber folds them to one integer on every create and update, so nothing downstream has to know which one arrived.

```json
"RANKED": { "rank": 11, "zipf": 7.1, "fpm": 12600 }
```

**VOCALIZED** 

```json
"VOCALIZED": { "asset": { "path": "words/essere.verb.indicative.present.third.singular.mp3" } }
```

2,182 italian literals carry one.

**ANNOTATED** — used on sentences. each token naming the word literal it *is*. This is the trait that turns a sentence into a composite: after flush the subscriber materialises every `token.literal` into `literal.uses`.

```json
"ANNOTATED": { "tokens": [
  { "form": "Oi",   "gloss": "hi",         "deprel": "discourse", "index": 0, "literal": "oi.interjection" },
  { "form": "tudo", "gloss": "everything", "deprel": "nsubj",     "index": 1, "literal": "tudo.pronoun" },
  { "form": "bem",  "gloss": "well",       "deprel": "root",      "index": 2, "literal": "bem.adverb" }
] }
```

```js
// the sentence is the exercise; each word inside it is a knowable of its own
for (const token of sentence.trait.ANNOTATED.tokens) {
  review(token.literal, typed[token.index] === token.form ? "SUCCESS" : "MISTAKE");
}
// six words typed, six retentions moved, one sentence on screen
```

No italian sentence is annotated yet — 0 of 1,136. Brazilian carries 332, spanish 354. Until the annotation pass runs, `uses` is empty for every italian sentence, and cloze has nothing to blank.

**CONJUGATED** — a paradigm, carried on a `conjugation` literal. Same mechanism as ANNOTATED: the six form slugs become `uses`, weakest first.

```json
"CONJUGATED": {
  "infinitive": "essere.verb.infinitive",
  "paradigm": { "firstSingular": "essere.verb.indicative.present.first.singular", "…": "…" }
}
```

```js
// literal.family — given word rows, the paradigms that use them and their infinitives
const kin = await ctx.daemon.entities.literal.family(rows);
// [{ paradigm: <essere.present.indicative>, infinitive: <essere.verb.infinitive> }]
```

###### snapshot

A word, the conjugation that uses it, and a sentence that says it:

```json
{
  "ontology": "word",
  "id": "019f…",
  "slug": "essere.verb.indicative.present.third.singular",
  "traits": ["TRANSLATED", "EXEMPLIFIED", "RANKED", "VOCALIZED"],
  "trait": {
    "TRANSLATED": { "known": "he/she/it is", "learning": "è" },
    "EXEMPLIFIED": { "known": "It is a good restaurant", "learning": "È un buon ristorante" },
    "RANKED": { "rank": 11, "zipf": 7.1, "fpm": 12600 },
    "VOCALIZED": { "asset": { "path": "words/essere.verb.indicative.present.third.singular.mp3" } }
  },
  "rank": 11, // stamped from RANKED
  "symbols": [
    "word", "word.lemma.essere", "word.part-of-speech.verb", "word.verb-form.finite",
    "word.tense.present", "word.mood.indicative", "word.person.third", "word.number.singular",
    "word.voice.active", "word.regularity.irregular", "word.suffix.ere",
    "proficiency.survival", "proficiency.high-frequency", "proficiency.cefr.a1",
    "functional.auxiliary"
  ],
  "uses": [],
  "in": ["essere.present.indicative"]
}
```

```json
{
  "ontology": "conjugation",
  "id": "019f…",
  "slug": "essere.present.indicative",
  "rank": 1,
  "traits": ["RANKED", "CONJUGATED"],
  "trait": {
    "RANKED": { "rank": 1 },
    "CONJUGATED": {
      "infinitive": "essere.verb.infinitive",
      "paradigm": {
        "firstSingular": "essere.verb.indicative.present.first.singular",
        "secondSingular": "essere.verb.indicative.present.second.singular",
        "thirdSingular": "essere.verb.indicative.present.third.singular",
        "firstPlural": "essere.verb.indicative.present.first.plural",
        "secondPlural": "essere.verb.indicative.present.second.plural",
        "thirdPlural": "essere.verb.indicative.present.third.plural"
      }
    }
  },
  "symbols": [
    "conjugation", "word.lemma.essere", "word.tense.present", "word.mood.indicative",
    "word.regularity.irregular", "word.suffix.ere", "proficiency.survival", "proficiency.cefr.a1"
  ],
  "uses": [
    "essere.verb.infinitive",
    "essere.verb.indicative.present.first.singular",
    "essere.verb.indicative.present.second.singular",
    "essere.verb.indicative.present.third.singular",
    "…"
  ],
  "in": []
}
```

```json
{
  "ontology": "sentence",
  "id": "019f…",
  "slug": "chi-e-questo",
  "traits": ["TRANSLATED", "RANKED"],
  "trait": {
    "TRANSLATED": { "known": "Who is this?", "learning": "Chi è questo?" },
    "RANKED": { "rank": 166 }
  },
  "rank": 166,
  "symbols": ["sentence"], // bare — nothing has classified it yet
  "uses": [], // italian sentences are not ANNOTATED yet; where they are, a sentence uses its words
  "in": []
}
```

`symbols` is the truth — an m:n to the Symbol table, and what every `where` clause resolves against. Beside it the runtime's subscriber keeps `symbol{}`, the same slugs folded into a nested object for display and for agents (`{ word: { lemma: "essere", tense: "present", … }, proficiency: { cefr: "a1" }, functional: "auxiliary" }`). A single-segment slug folds to `true`. Read it; never query it.

###### code — the literal is the object everything else is about

Drawing a set, server-side:

```js
const pool = await ctx.daemon.entities.literal.feed(
  { symbols: { $all: ["proficiency.survival", "word.part-of-speech.verb"] } },
  { limit: 20, populate: ["retentions", "retentions.strength", "uses"] },
);
```

Reviewing one. Four callers, one path — each of these ends inside `literal.review`:

```js
// 1 — the entity method. Server-side, when you already hold the row.
await pool[0].review("SUCCESS", ctx);

// 2 — the aperture, from another vector on the same daemon.
await ctx.daemon.call["/review/literal"]({
  user: ctx.user,
  mode: ctx.mode,
  thread: ctx.thread ? { id: ctx.thread } : null,
  input: { literal: "essere.verb.indicative.present.third.singular", signal: "MISTAKE" },
});

// 3 — from a buffer, over the terminal's connection. scope.literal takes an id or a slug.
terminal.daemon.connection.call("/review/literal", { signal: "MASTERY", scope: { literal } });
```

```
4 — the agent tool. One call per exchange, up to ten items, never the same literal twice.

  /review { reviews: [{ literal: "essere.verb.indicative.present.third.singular", signal: "SUCCESS" }] }
  → essere.verb.indicative.present.third.singular SUCCESS → LEARNING, next 2026-08-16
```

Rendering one. `modes/games/cloze/buffer/Cloze.svelte` puts four traits to work at once — ANNOTATED for the blanks, TRANSLATED for the prompt, VOCALIZED for the audio, and each token's own literal for the review:

```svelte
<script>
  const { terminal, buffer } = $props();

  let literal = $state(buffer.literals?.[0] ?? null);

  const tokens = $derived(literal?.trait?.ANNOTATED?.tokens ?? []);
  const known = $derived(literal?.trait?.TRANSLATED?.known);
  const asset = $derived(terminal.daemon.getAsset(literal?.trait?.VOCALIZED?.asset));

  // an empty buffer draws its own row — the trait is the filter
  if (!literal) {
    terminal.daemon.connection
      .call("/pick/literal/feed", { limit: 1, where: { traits: { $contains: "ANNOTATED" } } })
      .then(([lit]) => (literal = lit ?? null));
  }

  function submit() {
    for (const i of blankIndices) {
      const token = tokens[i];
      const correct = string.matches(answers[i] ?? "", token.form, {
        forgiving,
        contractions: language.learning?.contractions ?? null, // from /language
        elision: language.learning?.elision ?? false,
      });
      terminal.daemon.connection.call("/review/literal", {
        signal: correct ? "SUCCESS" : "MISTAKE",
        scope: { literal: token.literal ?? literal.id }, // the word, not the sentence
      });
    }
  }
</script>
```

Three things there are worth naming. The buffer arrives with its literals already populated, so the common case fetches nothing. `traits: { $contains: … }` is how a mode declares what it is able to draw. And the review lands on `token.literal` — the sentence was the exercise, but the word is what the learner actually got right.

Projecting many. The repository's `card` is the shape every list view and every tool response wants:

```js
{
  fields: ["slug", "known", "learning", "ontology", "status"],
  populate: ["retentions"],
  project: (literal) => ({
    slug: literal.slug,
    known: literal.trait?.TRANSLATED?.known ?? "",
    learning: literal.trait?.TRANSLATED?.learning ?? "",
    ontology: literal.ontology,
    status: literal.retention?.status ?? "UNTOUCHED",
  }),
}
```

Reading it from a conversation. The agent tools are the same repository seen from a harness — `/progress` is four repository calls and a string, and it is what opens every tutoring session:

```js
const [total, retentions, weakest, symbols] = await Promise.all([
  ctx.daemon.entities.literal.count({}),
  ctx.daemon.entities.retention.find({}, { fields: ["status", "nextAt"] }),
  ctx.daemon.entities.literal.byStrength({}, { limit: 10 }),
  ctx.daemon.entities.symbol.find({}, { fields: ["slug"] }),
]);
```

```
[Learner report]
Vocabulary: 6583 literals · 74 with retention (untouched 0 · unknown 66 · learning 8 ·
known 0 · graduated 0) · 74 due for review.
Weakest words: andiamo (we go), andate (you all go), dormo (I sleep), lavorano (they work),
siete (you all are), …
Symbol sets for steering exercises: domain.abstract, domain.animals, domain.body, …
```

Traversing it. `uses` and `in` are the composite axis, and `uses` is ordered by `strength ASC` — so a paradigm hands back the form this learner is worst at first, and no caller sorts anything:

```js
const paradigm = await ctx.daemon.entities.literal.findOne(
  { slug: "essere.present.indicative" },
  { populate: ["uses", "uses.retentions"] },
);
paradigm.uses[0]; // siete — halflife 0.19 h, the weakest of the six
paradigm.in; // empty. nothing uses a paradigm; paradigms use words

const form = await ctx.daemon.entities.literal.findOne({ slug: "essere.verb.indicative.present.third.singular" });
form.in; // ["essere.present.indicative"] — the way back up
```

Which is the whole reason `uses` exists as a relation and not as a list of slugs in a trait: a sentence knows its words, a paradigm knows its forms, and every one of them carries its own retention, so a composite can be scored by the weakest thing inside it.


##### **Symbol**

**A symbol is a set.** Annotating a literal with one puts it in that set, and every question the system asks — what is due, what to drill next, what the tutor is allowed to draw on — is a query over sets.

Three families, three different jobs, and they are independent axes. `ONTOLOGICAL` symbols say what a literal **is**: `word.part-of-speech.verb`, `sentence.mood.interrogative`. `STRUCTURAL` symbols say where it sits in a syllabus: `proficiency.cefr.a1`, `domain.food`. `functional.*` — structural too, but cutting across grammar — says what it **does** in a sentence: `functional.modal`, `functional.negation`, `functional.politeness`. `è` is ontologically a third-person singular present indicative verb, structurally an A1 survival word, functionally an auxiliary, and it carries all three at once.

One trait is not a family but a marker: `TOPOGRAPHICAL` is the root of an ontology, exactly one per literal, and it is what sets `literal.ontology`. There are three — `word`, `sentence`, `conjugation`.

###### entity — the domain does not extend Symbol

```js
// domain/entities/kernel/Symbol.ts
new EntitySchema({
  class: SymbolEntity,
  extends: base.schema, // runtime: slug, traits[], trait{}, literals m:n, mode m:1
  properties: {}, // nothing. the domain ships symbols as data, not as schema
});
```

So a symbol is a slug with a label on it, and minting one is a line of dataset:

```js
{
  slug: "domain.weather",
  traits: ["STRUCTURAL", "LABELED"],
  trait: {
    STRUCTURAL: {},
    LABELED: { name: "Domain > Weather", description: "Talking about the weather." },
  },
}
```

From that moment `{ symbols: ["domain.weather"] }` is a valid set for every pick, every emitter and every agent tool in the package. Nothing else has to be told.

The topologies mint the `ONTOLOGICAL` and `TOPOGRAPHICAL` slugs, the topographies mint the `STRUCTURAL` ones, and both stamp `LABELED`.

###### traits

```
LABELED        { name, description } — for display and for agents
STRUCTURAL     curricular grouping
TOPOGRAPHICAL  root of an ontology — sets literal.ontology; exactly one per literal
ONTOLOGICAL    grammatical dimensions
```

###### snapshot

The live `italian` table — 2,593 rows, by what each row is for:

```
ONTOLOGICAL    160   word 115 · sentence 44 · conjugation 1       the dimensions
  TOPOGRAPHICAL  3   word · sentence · conjugation                 the ontology roots
STRUCTURAL      52   proficiency 8 · domain 29 · functional 15     the sets
LABELED        212   every symbol above, and nothing below
(bare)        2381   word.lemma.*                                  minted by reference
```

One of them in full — `word.part-of-speech.verb`, which 2,741 literals carry:

```json
{
  "id": "019f…",
  "slug": "word.part-of-speech.verb",
  "traits": ["ONTOLOGICAL", "LABELED"],
  "trait": {
    "ONTOLOGICAL": {},
    "LABELED": { "name": "Verb", "description": "A word that expresses an action or a state of being." }
  },
  "literals": 2741
}
```

`trait.ONTOLOGICAL` is `{}`, and that is not an oversight — a trait's **presence** is the fact. A body only exists where a trait needs one, which for symbols is `LABELED` alone.

Then the annotation itself, which is the part that matters. A word carries fifteen symbols across all three families:

```json
"essere.verb.indicative.present.third.singular": [
  "word", "word.lemma.essere", "word.part-of-speech.verb", "word.verb-form.finite",
  "word.tense.present", "word.mood.indicative", "word.person.third", "word.number.singular",
  "word.voice.active", "word.regularity.irregular", "word.suffix.ere",
  "proficiency.survival", "proficiency.high-frequency", "proficiency.cefr.a1",
  "functional.auxiliary"
]
```

Its paradigm carries eight — the dimensions all six forms agree on, and nothing they differ by:

```json
"essere.present.indicative": [
  "conjugation", "word.lemma.essere", "word.tense.present", "word.mood.indicative",
  "word.regularity.irregular", "word.suffix.ere", "proficiency.survival", "proficiency.cefr.a1"
]
```

`word.lemma.essere` is on both. That is the whole job of the lemma family: it ties a form to its paradigm without either one having to know about the other.

###### code — a set is a where clause

Every pick, every emitter and every tool takes the same `symbols` key. A plain array ANDs:

```js
// due today, but only the survival verbs
await ctx.daemon.entities.literal.due(
  { symbols: ["proficiency.survival", "word.part-of-speech.verb"] },
  { limit: 12 },
);
```

The object form adds the other two quantifiers:

```js
await ctx.daemon.entities.literal.due(
  {
    symbols: {
      $all: ["proficiency.cefr.a1", "domain.color"], // every one of these
      $in: ["word.part-of-speech.adjective", "word.part-of-speech.noun"], // at least one
      $none: ["word.regularity.irregular"], // and none of these
    },
  },
  { limit: 12 },
);
```

`LiteralRepository.resolveSymbols` compiles it — `$all` into one ANDed clause per slug, `$in` into a single `slug: { $in }`, `$none` into a mikro `$none` subquery — and it runs inside `find` and `findOne`. Which means every routine above it inherits the grammar for free: `due`, `novel`, `feed`, `byStrength`, `byLastSignal`, `sample`.

A tactic is then very nearly nothing but a list of those clauses. `modes/tactics/clinic` is a dozen of them:

```js
// modes/tactics/clinic/emitter/pronouns.js
symbols: [...(ctx.input.where?.symbols ?? []), "word.part-of-speech.pronoun"],
// …/negation.js   → "functional.negation"
// …/questions.js  → "functional.question"
// …/degrees.js    → "word.part-of-speech.adjective"
// …/connectors.js → "functional.connector"
```

And the reverse direction — set to contents — is what the tutor calls on wake-up, so an agent opens a lesson holding real rows instead of remembered ones:

```js
const found = await ctx.daemon.entities.literal.find(
  { symbols: { $all: ctx.input.symbols } },
  { populate: ["symbols"] },
);
// → [{ slug, known, learning, symbols: [slug…] }]
```

##### **Mode**

###### entity — `systems/runtime/daemon/entities/daemon/Mode.ts`; the domain adds no column

```js
new EntitySchema({
  class: ModeEntity,
  uniques: [{ properties: ["slug", "type"] }], // the address: @education/<type>/<slug>
  properties: {
    type:        { type: types.string }, // domain · topology · topography · game · tactic · teacher · homepage · dashboard
    slug:        { type: types.string },
    traits:      { type: 'json' },                                       // what the mode can do — the names of v.traits.mode, validated at the claim
    name:        { type: types.string, nullable: true },
    description: { type: types.string, nullable: true },
    version:     { type: types.string, nullable: true },
    installed:   { type: types.string }, // content hash of the ingested dataset

    intents:  { kind: "1:m", entity: () => IntentEntity }, // what the mode owns
    buffers:  { kind: "1:m", entity: () => BufferEntity },
    turns:    { kind: "1:m", entity: () => TurnEntity },
    literals: { kind: "1:m", entity: () => LiteralEntity },
    symbols:  { kind: "1:m", entity: () => SymbolEntity },
  },
});
```

The traits are the runtime's. What the domain mints is the set of types, each with its own trait signature:

```
domain       EXPOSED TOOLING                  the entities, the aperture, the four tools
topology     DATASET                         ontological slugs — nothing to run
topography   DATASET FILESET DATASINK        corpus and audio files; DATASINK takes harvested rows
game         APPLICATION EMITTER INTENTED    a buffer shape and a Svelte app;
             EXPOSED TOOLING                  EMITTER is what mints the buffers
tactic       CONVERSATIONAL HARNESSED TOOLING a curriculum that emits game buffers
teacher      CONVERSATIONAL HARNESSED        an agent; AGENTIC is what separates it from a tactic
             TOOLING AGENTIC
homepage     APPLICATION EMITTER             where a learner lands; emits into every game
dashboard    APPLICATION                     raw view, no emission
```

###### snapshot — the live `italian` kernel, one row per mounted mode

```json
[
  { "type": "domain",     "slug": "language-learning",  "name": "Language Learning",                "traits": ["EXPOSED", "TOOLING"] },
  { "type": "topology",   "slug": "word",               "name": "Words after Universal Dependencies", "traits": ["DATASET"], "installed": "6f6f4887" },
  { "type": "topography", "slug": "english-to-italian", "name": "Italian Vocabulary",               "traits": ["DATASET", "FILESET", "DATASINK"], "installed": "8a7bfa24" },
  { "type": "game",       "slug": "dojo",               "name": "Dojo",                             "traits": ["APPLICATION", "EMITTER", "INTENTED", "EXPOSED", "TOOLING"] },
  { "type": "tactic",     "slug": "harvest",            "name": "Harvest",                          "traits": ["CONVERSATIONAL", "HARNESSED", "TOOLING"] },
  { "type": "teacher",    "slug": "francesca",          "name": "Francesca",                        "traits": ["CONVERSATIONAL", "HARNESSED", "TOOLING", "AGENTIC"] },
  { "type": "dashboard",  "slug": "dataspace",          "name": "Dataspace",                        "traits": ["APPLICATION"] }
]
```

`installed` is the content hash — non-empty only where a `DATASET` was ingested.

###### code — a mode declares itself; the runtime records the row

```js
export const manifest = {
  type: "game",
  slug: "dojo",
  name: "Dojo",
  description:
    "One rep machine over words, sentences and conjugation forms — prompt, gameplay, preview, streak, continuous and limit all free to combine.",
  version: "0.1.0",
  traits: ["APPLICATION", "EMITTER", "INTENTED", "EXPOSED", "TOOLING"],
};
```


### Business Logic
#### Literal Methods

On `ctx.daemon.entities.literal` (the repository):

| Routine | Returns |
|---|---|
| `due(where, opts)` | literals whose retention `nextAt` is past |
| `novel(where, opts)` | literals the user has never touched, by rank |
| `feed(where, opts)` | due first, topped up with novel to `limit` |
| `byStrength(where, opts)` | retained literals, weakest first |
| `byLastSignal(signals, where, opts)` | retained literals whose newest trace is one of `signals` |
| `sample(where, opts)` | random retained literals, optionally by status |
| `family(rows)` | for word rows, the conjugation paradigms using them and their infinitives |
| `find({ search })` | matches slug and both sides of `TRANSLATED` |

`where` may carry `symbols`, in either grammar — `[slug…]` ANDs, `{ $all, $in, $none }` quantifies (see [Symbol](#symbol)). `opts` carries `limit`, `blacklist: { literals: [id…] }`, `populate`.

On a literal instance:

```js
await literal.review(signal, ctx)
```

Finds or creates the user's retention, evolves it through its driver, writes a trace, flushes, returns the retention.

#### Symbol Methods
#### Aperture

The domain opens these routes on the daemon:

```
/review/literal

/userspace/entities/retention
/userspace/entities/trace

/pick/literal/novel
/pick/literal/due
/pick/literal/feed
/pick/literal/byStatus 
/pick/literal/byStrength
```

#### Agent tools

Four tools, exported from the domain, mounted by any `TOOLING` mode that slurps them:

| Tool | Does |
|---|---|
| `/progress` | learner report: counts by status, due total, ten weakest, the `domain.*` symbol sets |
| `/lookup` | text → literals, matching slug and both translations; reports paradigm and infinitive for a form; retries by lemma through the NLP service when nothing matches |
| `/queue` | one pick: `due` · `feed` · `novel` · `weakest` · `status`, scoped by symbols |
| `/review` | batch of `{ literal, signal }`, one call per exchange |

The tool descriptions carry the rules an agent follows, e.g. "always draw before planning an exercise — work with real items, never remembered ones".




## How-To: Add and change modes

Three surfaces reach the domain three ways.

**Emitters and apertures** (server-side) go through the daemon:

```js
const pool = await ctx.daemon.entities.literal.due({}, {
  limit: 40,
  populate: ["retentions", "retentions.strength", "uses"],
});
const buffer = await ctx.daemon.modes.game.dojo.emit.write.literals({ literals: pool, thread });
```

**Buffers** (client-side Svelte) call the daemon's aperture through the terminal's connection:

```js
terminal.daemon.connection.call("/review/literal", { signal, scope: { literal } });
```

**Harnesses** (agents) get the tools and can ride the conversation. Francesca's harness lets the tutor's turn stream, then runs an appraiser over the exchange and reviews what was exercised, so the tutor never has to call `/review` itself.

A mode declares its language-specific rules in `statics.language`, keyed by language slug. The domain folds every mode's statics into `/language`:

```js
export const statics = {
  language: {
    italian: { elision: true, contractions: { "po'": ["poco"] } },
  },
};
```

## Tests

The package carries no `deno.json`. The suites run from a vivalence checkout, which supplies the import map:

```sh
deno test -A --no-check ~/.viva/registry/education/domain/tests/domain.test.js
deno test -A --no-check ~/.viva/registry/education/domain/tests/retention/
```

Green today: `domain.test.js` (manifest, the five entities, the aperture routes and the four tools), `retention/bayesian.test.js`, `retention/drivers.test.js` — every driver's verdicts stay inside `STATUS` for every `SIGNAL`.

Red today: `aperture/aperture.test.js` and `tools/tools.test.js` fail — the test daemon mounts the plain repository, so `literal.feed` is not a function and `retentions` is not a populatable property. `kernel/literal.test.js` and `userspace/scoping.test.js` do not load at all: they reach out of the package with `../../../../fixtures/data/seed.js`, and there is no `fixtures` sibling in the registry store. Pick order, blacklist scoping, rank stamping and user isolation are therefore written but unverified.
