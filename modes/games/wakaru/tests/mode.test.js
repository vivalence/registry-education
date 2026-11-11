import { contexts, shape, shard, specimen, steer, Vector } from "@vivalence/typology";
import { mountMode } from "@vivalence/runtime/scenarios";
import { viewable } from "./viewable.js";

import * as wakaru from "../wakaru.viva.js";
import * as types from "../types.js";
import * as hal from "../hal/index.js";
import * as domain from "../../../../domain/domain.viva.js";
import { fresh, raise } from "../engine/run.js";
import { remembered } from "../engine/atlas.js";
import { saved } from "../deal.js";

// a save the first slice kept, as one stands live: its chambers were numbered
const SLICE = {
  seed: 2933376779,
  flags: ["met:01a1b1c0-dda9-711f-b01b-ef73acc951e7", "heard:0"],
  counters: { steps: 40, right: 4, wrong: 6, falls: 1 },
  pose: { room: 0, x: 7, y: 1 },
  hearts: 4,
};

// a save the room game kept: it stood in a numbered room of a district, before the valley had maps
const ROOMED = {
  ...SLICE,
  flags: ["reached:market.0"],
  pose: { room: "market.0", x: 3, y: 4 },
  hearts: 5,
};

const DAY = 86_400_000;

const WORD = [
  "id",
  "slug",
  "ontology",
  "known",
  "learning",
  "rank",
  "example",
  "audio",
  "tokens",
  "paradigm",
  "infinitive",
  "tense",
];

const emitted = (result) => result.product.buffer;

// tier, effort and rounds are the learner's, never the mode's: a keeper renders under exactly what
// the learner's thread wears (HARNESSED), as a chat turn does. the first slice named its own tier
// and 500'd live; naming none, the cortex could not choose among its models and 500'd again
const WORN = { tier: "fast", effort: "high", rounds: 3 };

const AS_WORN = { policy: { tier: "fast", rounds: 3 }, settings: { effort: "high" } };

const wear = (scenario) =>
  scenario.scoped(async () => {
    const { em, thread } = scenario.daemon.entities;
    const worn = await thread.findOneOrFail({ id: scenario.fixtures.thread.id });
    worn.traits = [...new Set([...worn.traits, "HARNESSED"])];
    worn.trait = { ...worn.trait, HARNESSED: { ...worn.trait.HARNESSED, ...WORN } };
    await em.flush();
  });

// what a render call carried of the learner's harness, unset keys dropped
const harnessed = (render) =>
  JSON.parse(JSON.stringify({ policy: render.policy, settings: render.settings }));

const stub = async (scenario, object, body) => {
  const calls = [];
  const stubbed = {
    hallucinate: {
      object: { render: (input) => (calls.push(input), { product: { object } }) },
    },
  };
  const original = Object.getOwnPropertyDescriptor(scenario.daemon, "cortex");
  Object.defineProperty(scenario.daemon, "cortex", { value: stubbed, configurable: true });
  try {
    await body(calls);
  } finally {
    if (original) Object.defineProperty(scenario.daemon, "cortex", original);
    else delete scenario.daemon.cortex;
  }
};

// the scenario seeds no domain.* set, so the test charts a market over it: four food words around a due one,
// fifty money words to overflow the cap, sentences that use them — and the memory that paints them
const market = async ({ daemon: { entities }, fixtures }) => {
  const { daemon, mode, user } = fixtures;
  const symbol = (slug) =>
    entities.symbol.create({ slug, mode, daemon, traits: ["STRUCTURAL"], trait: {} });
  const food = symbol("domain.food");
  const money = symbol("domain.money");
  const home = symbol("domain.home");
  await entities.em.flush();

  const literal = (slug, { known, learning, rank, ontology = "word", symbols = [], ...trait }) => {
    const row = entities.literal.create({
      slug,
      mode,
      daemon,
      ontology,
      traits: ["TRANSLATED", "RANKED", ...Object.keys(trait)],
      trait: { TRANSLATED: { known, learning }, RANKED: { rank }, ...trait },
      symbol: {},
    });
    for (const held of symbols) row.symbols.add(held);
    return row;
  };
  const sentence = (slug, meaning, tokens) => {
    const row = literal(slug, {
      ...meaning,
      ontology: "sentence",
      ANNOTATED: {
        tokens: tokens.map(([form, gloss, used]) => ({
          form,
          gloss,
          ...(used && { literal: used.slug }),
        })),
      },
    });
    row.uses.add(tokens.map(([, , used]) => used).filter(Boolean));
    return row;
  };

  const agua = literal("agua.noun", {
    known: "water",
    learning: "água",
    rank: 90,
    symbols: [food],
    EXEMPLIFIED: { known: "The water is cold", learning: "A água está fria" },
    VOCALIZED: { asset: { path: "words/agua.noun.mp3" } },
  });
  const pao = literal("pao.noun", { known: "bread", learning: "pão", rank: 120, symbols: [food] });
  const comer = literal("comer.verb", {
    known: "to eat",
    learning: "comer",
    rank: 150,
    symbols: [food],
  });
  const cafe = literal("cafe.noun", {
    known: "coffee",
    learning: "café",
    rank: 300,
    symbols: [food],
  });
  const coins = Array.from({ length: 50 }, (_, index) =>
    literal(`moeda-${index}.noun`, {
      known: `coin ${index}`,
      learning: `moeda ${index}`,
      rank: 1000 + index,
      symbols: [money],
    }),
  );
  const lar = entities.literal.create({
    slug: "lar.noun",
    mode,
    daemon,
    ontology: "word",
    traits: ["TRANSLATED"],
    trait: { TRANSLATED: { known: "home", learning: "lar" } },
    symbol: {},
  });
  lar.symbols.add(home);
  const casa = literal("casa.noun", {
    known: "house",
    learning: "casa",
    rank: 200,
    symbols: [home],
  });
  await entities.em.flush();

  sentence("cafe-com-agua", { known: "coffee with water", learning: "Café com água", rank: 10 }, [
    ["Café", "coffee", cafe],
    ["com", "with"],
    ["água", "water", agua],
  ]);
  sentence("eu-como-pao", { known: "I eat bread", learning: "Eu como pão", rank: 40 }, [
    ["Eu", "I"],
    ["como", "eat", comer],
    ["pão", "bread", pao],
  ]);
  sentence("agua-e-pao", { known: "water and bread", learning: "Água e pão", rank: 60 }, [
    ["Água", "water", agua],
    ["e", "and"],
    ["pão", "bread", pao],
  ]);
  for (const [index, coin] of coins.slice(0, 13).entries())
    sentence(
      `moedas-${index}`,
      { known: `${index} coins`, learning: `${index} moedas`, rank: 500 + index },
      [
        [`${index}`, `${index}`],
        ["moedas", "coins", coin],
      ],
    );
  await entities.em.flush();

  const now = Date.now();
  const retained = (row, status, due) =>
    entities.note.create({
      user,
      daemon,
      literal: row,
      slug: `retention.${row.slug}`,
      traits: ["RETAINED"],
      trait: {
        RETAINED: {
          driver: "BAYESIAN",
          status,
          lastSignal: "SUCCESS",
          state: [4, 4, 24],
          due: new Date(due).toISOString(),
          lastAt: now,
        },
      },
    });
  retained(agua, "UNKNOWN", now - DAY);
  retained(pao, "KNOWN", now + 7 * DAY);
  retained(comer, "LEARNING", now + DAY);
  retained(fixtures.chamo, "UNKNOWN", now - DAY);
  // due, but past the market's cap: it has no stone in the valley, so it never walks as a spirit
  retained(coins[44], "UNKNOWN", now - DAY);
  await entities.em.flush();

  return { agua, pao, comer, cafe, coins, casa, lar };
};

specimen.describe("wakaru", () => {
  let scenario;
  let corpus;

  specimen.beforeAll(async () => {
    scenario = await mountMode(wakaru, { domain });
    viewable(scenario, wakaru);
    corpus = await scenario.scoped(() => market(scenario));
  });

  specimen.afterAll(async () => {
    await scenario?.orm?.close();
  });

  const call = (route, input) => scenario.authedConn.call(`/mode/game/wakaru/${route}`, input);

  const save = async () => {
    const [buffer] = emitted(
      await scenario.mode.emit.feed({ thread: scenario.fixtures.thread.id }),
    );
    await scenario.daemon.entities.em.flush();
    return buffer;
  };

  const blank = async (thread = scenario.fixtures.thread.id, data = {}) => {
    const row = scenario.daemon.entities.em.create(
      scenario.daemon.entities.buffer.getEntityName(),
      {
        mode: scenario.mode.entity.id,
        mime: scenario.mode.buffer.mime,
        index: 9,
        thread,
        data,
      },
    );
    await scenario.daemon.entities.em.flush();
    return row;
  };

  specimen.it(
    "/emit/feed mints one save: a fresh run and nothing else — the world comes from /atlas",
    async () => {
      await scenario.scoped(async () => {
        const buffers = emitted(
          await scenario.mode.emit.feed({ thread: scenario.fixtures.thread.id }),
        );
        specimen.expect(buffers.length).toBe(1);
        specimen.expect(buffers[0].data).toEqual({ run: fresh(buffers[0].data.run.seed) });
        specimen.expect(buffers[0].literals.getItems()).toEqual([]);
        specimen.expect(types.run.faults(buffers[0].data.run)).toEqual([]);
      });
    },
  );

  specimen.it(
    "/begin puts a fresh run on a blank seat, and hands the same run back to a second caller",
    async () => {
      await scenario.scoped(async () => {
        const row = await blank();
        const begun = await call("begin", { buffer: row.id });
        specimen.expect(begun).toEqual({ begun: true, run: fresh(begun.run.seed) });
        await scenario.daemon.entities.em.refresh(row);
        specimen.expect(row.data.run).toEqual(begun.run);
        specimen.expect(row.status).toBe("ACTIVE");
        specimen.expect(await call("begin", { buffer: row.id })).toEqual(begun);
      });
    },
  );

  specimen.it(
    "a save the game has outgrown (the first slice's, the room game's) is a blank seat: no run is read off it, and /begin seats a fresh one",
    async () => {
      specimen.expect(saved({ data: { run: fresh(7) } })).toEqual(fresh(7));
      specimen.expect(saved({ data: {} })).toBeNull();
      specimen.expect(saved({ data: { run: SLICE } })).toBeNull();
      specimen.expect(saved({ data: { run: ROOMED } })).toBeNull();
      await scenario.scoped(async () => {
        const row = await blank(scenario.fixtures.thread.id, { run: SLICE });
        const begun = await call("begin", { buffer: row.id });
        specimen.expect(begun).toEqual({ begun: true, run: fresh(begun.run.seed) });
        await scenario.daemon.entities.em.refresh(row);
        specimen.expect(row.data.run).toEqual(begun.run);
      });
    },
  );

  specimen.it(
    "/keep keeps the run quietly, refuses a misfit, and crowned closes the buffer",
    async () => {
      await scenario.scoped(async () => {
        const buffer = await save();
        const broadcasts = [];
        scenario.daemon.twitch.open("/after/buffer/update", (ctx) =>
          broadcasts.push(ctx.input.entity.id),
        );

        const walked = {
          ...buffer.data.run,
          pose: { map: "market", x: 3, y: 4, facing: "south" },
          counters: { ...buffer.data.run.counters, steps: 2, "coins+": 5, "rested:market": 1 },
        };
        specimen
          .expect(await call("keep", { buffer: buffer.id, run: walked }))
          .toEqual({ kept: true });
        specimen.expect(broadcasts).toEqual([]);
        const stored = await scenario.daemon.entities.buffer.findOneOrFail({ id: buffer.id });
        await scenario.daemon.entities.em.refresh(stored);
        specimen.expect(stored.data.run).toEqual(walked);
        specimen.expect(stored.status).not.toBe("DONE");

        for (const misfit of [
          { seed: 1, flags: "crowned" },
          { ...walked, pose: { room: 0, x: 1, y: 1 } },
          { ...walked, hearts: 6 },
          { ...walked, scene: {} },
        ])
          specimen
            .expect(
              await call("keep", { buffer: buffer.id, run: misfit }).then(
                () => null,
                (error) => error,
              ),
            )
            .not.toBeNull();

        specimen
          .expect(await call("keep", { buffer: buffer.id, run: raise(walked, "crowned") }))
          .toEqual({ kept: true });
        const closed = await scenario.daemon.entities.buffer.findOneOrFail({ id: buffer.id });
        await scenario.daemon.entities.em.refresh(closed);
        specimen.expect(closed.status).toBe("DONE");
      });
    },
  );

  specimen.it(
    "/atlas charts every place with a word in it: districts by their sets and rank, capped; the stacks a fixed shelf; the forge resolved",
    async () => {
      const { agua, pao, comer, cafe, coins, casa, lar } = corpus;
      const { chamo, chamas, chamar, paradigm, hello, goodbye } = scenario.fixtures;
      const atlas = await call("atlas", {});

      specimen.expect(Object.keys(atlas.places)).toEqual(["market", "hearth", "stacks", "forge"]);
      specimen.expect(atlas.places.hearth).toEqual({ words: [casa.id, lar.id], sentences: [] });
      specimen.expect(atlas.words[lar.id].rank).toBe(999999);

      const market = atlas.places.market;
      specimen.expect(market.words.length).toBe(48);
      specimen
        .expect(market.words.slice(0, 5))
        .toEqual([agua.id, pao.id, comer.id, cafe.id, coins[0].id]);
      specimen.expect(market.words).toContain(coins[43].id);
      specimen.expect(market.words).not.toContain(coins[44].id);
      specimen.expect(market.sentences.length).toBe(12);
      specimen
        .expect(market.sentences.slice(0, 3).map((id) => atlas.words[id].slug))
        .toEqual(["cafe-com-agua", "eu-como-pao", "agua-e-pao"]);
      specimen
        .expect(market.sentences.map((id) => atlas.words[id].rank))
        .toEqual([10, 40, 60, 500, 501, 502, 503, 504, 505, 506, 507, 508]);

      // the stacks: the most frequent words no set holds, a fixed shelf by rank — a word held there
      // stays there, so its warden wakes as the learner learns (hello is KNOWN and not due)
      const stacks = atlas.places.stacks;
      specimen.expect(stacks.sentences).toEqual([]);
      for (const shelved of [hello, goodbye, chamo])
        specimen.expect(stacks.words).toContain(shelved.id);
      const ranks = stacks.words.map((id) => atlas.words[id].rank);
      specimen.expect(ranks).toEqual([...ranks].sort((one, other) => one - other));
      specimen.expect(stacks.words.some((id) => market.words.includes(id))).toBe(false);

      specimen.expect(atlas.places.forge).toEqual({ words: [paradigm.id], sentences: [] });
      specimen.expect(atlas.words[paradigm.id]).toEqual({
        id: paradigm.id,
        slug: "chamar.presente.indicativo",
        ontology: "conjugation",
        known: "",
        learning: "",
        rank: 999999,
        example: null,
        audio: null,
        tokens: null,
        paradigm: { "first.singular": chamo.id, "second.singular": chamas.id },
        infinitive: chamar.id,
        tense: "presente.indicativo",
      });

      specimen.expect(atlas.words[agua.id]).toEqual({
        id: agua.id,
        slug: "agua.noun",
        ontology: "word",
        known: "water",
        learning: "água",
        rank: 90,
        example: { known: "The water is cold", learning: "A água está fria" },
        audio: "words/agua.noun.mp3",
        tokens: null,
        paradigm: null,
        infinitive: null,
        tense: null,
      });
      const eats = Object.values(atlas.words).find((word) => word.slug === "eu-como-pao");
      specimen.expect(eats.tokens).toEqual([
        { form: "Eu", gloss: "I", literal: null, index: 0 },
        { form: "como", gloss: "eat", literal: comer.id, index: 1 },
        { form: "pão", gloss: "bread", literal: pao.id, index: 2 },
      ]);

      for (const word of Object.values(atlas.words))
        specimen.expect(Object.keys(word)).toEqual(WORD);
      const pointed = Object.values(atlas.words).flatMap((word) => [
        ...(word.tokens ?? []).map((token) => token.literal).filter(Boolean),
        ...Object.values(word.paradigm ?? {}),
        ...(word.infinitive ? [word.infinitive] : []),
      ]);
      for (const id of pointed) specimen.expect(atlas.words[id]).toBeDefined();
      for (const held of Object.values(atlas.places))
        for (const id of [...held.words, ...held.sentences])
          specimen.expect(atlas.words[id]).toBeDefined();
    },
  );

  specimen.it(
    "/memory reads the learner's RETAINED notes: an id without one is absent, which is UNTOUCHED",
    async () => {
      const { agua, pao, comer, cafe } = corpus;
      const { hello, goodbye } = scenario.fixtures;
      specimen
        .expect(
          await call("memory", {
            literals: [hello.id, goodbye.id, agua.id, pao.id, comer.id, cafe.id],
          }),
        )
        .toEqual({
          [hello.id]: "KNOWN",
          [goodbye.id]: "LEARNING",
          [agua.id]: "UNKNOWN",
          [pao.id]: "KNOWN",
          [comer.id]: "LEARNING",
        });
      specimen.expect(await call("memory", { literals: [] })).toEqual({});
    },
  );

  specimen.it(
    "/spirits walks a place's due words; the forge walks the paradigms with a form due; null is the shrine's round",
    async () => {
      const { agua } = corpus;
      const { goodbye, chamo, paradigm } = scenario.fixtures;
      specimen.expect(await call("spirits", { place: "market" })).toEqual([agua.id]);
      specimen
        .expect((await call("spirits", { place: "stacks" })).sort())
        .toEqual([goodbye.id, chamo.id].sort());
      specimen.expect(await call("spirits", { place: "forge" })).toEqual([paradigm.id]);
      specimen.expect(await call("spirits", { place: "hearth" })).toEqual([]);
      const shrine = await call("spirits", { place: null });
      specimen.expect(shrine.sort()).toEqual([goodbye.id, agua.id, chamo.id].sort());
    },
  );

  specimen.it(
    "/speak keeps the keeper to the words the learner holds plus one new place word (i+1)",
    async () => {
      const { agua } = corpus;
      const buffer = await scenario.scoped(save);
      await wear(scenario);
      await stub(
        scenario,
        { line: "Olá! A água canta.", gloss: "Hello! The water sings." },
        async (calls) => {
          const spoken = await call("speak", { buffer: buffer.id, place: "market" });
          specimen.expect(spoken).toEqual({
            line: "Olá! A água canta.",
            gloss: "Hello! The water sings.",
            target: agua.id,
          });
          specimen.expect(calls.length).toBe(1);
          const [render] = calls;
          specimen.expect(harnessed(render)).toEqual(AS_WORN);
          specimen
            .expect(Object.keys(render).sort())
            .toEqual(["controller", "output", "policy", "settings", "system", "turns"]);
          specimen.expect(Object.keys(render.system)).toEqual(["voice", "words", "task"]);
          specimen.expect(render.system.voice).toContain("keeper of Market Row");
          specimen.expect(render.system.voice).toContain("never met this traveller");
          for (const held of ["pão — bread", "comer — to eat", "olá — hello", "tchau — goodbye"])
            specimen.expect(render.system.words).toContain(held);
          specimen
            .expect(render.system.words)
            .toContain("ONE new word you bring them now:\n  água — water");
          specimen.expect(render.system.words).not.toContain("café");
          specimen.expect(render.system.words).not.toContain("moeda");
          specimen.expect(render.output.schema).toBe(hal.speak.output);
        },
      );
    },
  );

  specimen.it("/ask asks at i+1 and names the word it teaches", async () => {
    const { agua } = corpus;
    const buffer = await scenario.scoped(save);
    await call("keep", {
      buffer: buffer.id,
      run: raise(raise(buffer.data.run, "heard:market"), "restored:market"),
    });
    await wear(scenario);
    await stub(
      scenario,
      { question: "Você quer água?", gloss: "Do you want water?" },
      async (calls) => {
        const asked = await call("ask", { buffer: buffer.id, place: "market" });
        specimen
          .expect(asked)
          .toEqual({ question: "Você quer água?", gloss: "Do you want water?", target: agua.id });
        specimen.expect(harnessed(calls[0])).toEqual(AS_WORN);
        specimen.expect(calls[0].system.voice).toContain("spoken with this traveller before");
        specimen.expect(calls[0].system.voice).toContain("Market Row stands restored");
        specimen.expect(calls[0].system.task).toContain("question");
        specimen.expect(calls[0].system.words).toContain("água — water");
      },
    );
  });

  specimen.it(
    "/listen plays the place sentence the learner can almost read, among four meanings",
    async () => {
      const { comer, pao } = corpus;
      const listened = await call("listen", { place: "market" });
      specimen.expect(listened.sentence.slug).toBe("eu-como-pao");
      specimen
        .expect(listened.sentence.tokens.map((token) => token.literal))
        .toEqual([null, comer.id, pao.id]);
      specimen.expect(listened.options.length).toBe(4);
      specimen.expect(new Set(listened.options).size).toBe(4);
      specimen.expect(listened.options).toContain("I eat bread");
      specimen
        .expect(await call("listen", { place: "forge" }))
        .toEqual({ sentence: null, options: [] });

      // a sentence heard and reviewed waits its turn with the domain: the next listen reads another
      await scenario.scoped(async () => {
        const heard = await scenario.daemon.entities.literal.findOneOrFail({ slug: "eu-como-pao" });
        await scenario.daemon.entities.literal.review(heard, "SUCCESS");
      });
      const next = await call("listen", { place: "market" });
      specimen.expect(["cafe-com-agua", "agua-e-pao"]).toContain(next.sentence.slug);
    },
  );

  specimen.it(
    "/judge grades the reply through the cortex, then reviews the taught word and every place word used right",
    async () => {
      const { agua, pao } = corpus;
      const notes = scenario.daemon.entities.note;
      const traced = () => scenario.scoped(() => notes.count({ traits: "TRACED" }));
      const before = await traced();
      const verdict = {
        grade: "SUCCESS",
        feedback: "Good — água is right.",
        correction: "",
        used: [1, 0, 999, 1],
      };
      const buffer = await scenario.scoped(save);
      await wear(scenario);
      await stub(scenario, verdict, async (calls) => {
        const judged = await call("judge", {
          buffer: buffer.id,
          place: "market",
          question: "Você quer água?",
          reply: "Sim, quero água e pão",
          target: agua.id,
        });
        specimen.expect(Object.keys(judged)).toEqual(["grade", "feedback", "correction", "memory"]);
        specimen.expect(judged.grade).toBe("SUCCESS");
        specimen.expect(judged.feedback).toBe("Good — água is right.");
        specimen.expect(Object.keys(judged.memory).sort()).toEqual([agua.id, pao.id].sort());
        specimen
          .expect(judged.memory)
          .toEqual(await call("memory", { literals: [agua.id, pao.id] }));

        specimen.expect(harnessed(calls[0])).toEqual(AS_WORN);
        const rubric = calls[0].system.rubric;
        for (const said of [
          '"Você quer água?"',
          '"Sim, quero água e pão"',
          '"água" (water)',
          "[0] água — water",
          "[1] pão — bread",
        ])
          specimen.expect(rubric).toContain(said);
      });
      specimen.expect(await traced()).toBe(before + 2);
      await scenario.scoped(async () => {
        for (const row of [agua, pao]) {
          const note = await notes.findOneOrFail({ traits: "RETAINED", literal: row.id });
          specimen.expect(note.trait.RETAINED.lastSignal).toBe("SUCCESS");
        }
      });
    },
  );

  specimen.it(
    "/daily counts the streak of days with a review back from today, today's reviews, and what is due",
    async () => {
      const { daemon, user, hello } = scenario.fixtures;
      const entities = scenario.daemon.entities;
      await scenario.scoped(async () => {
        const noon = (back) => {
          const today = new Date();
          return new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - back, 12),
          );
        };
        for (const back of [1, 2, 4]) {
          const trace = entities.note.create({
            user,
            daemon,
            literal: hello,
            slug: `trace.${crypto.randomUUID()}`,
            traits: ["TRACED"],
            trait: { TRACED: { signal: { enum: "SUCCESS" }, snapshot: {} } },
          });
          await entities.em.flush();
          await entities.note.nativeUpdate({ id: trace.id }, { createdAt: noon(back) });
        }
      });
      const [traces, due] = await scenario.scoped(() =>
        Promise.all([entities.note.find({ traits: "TRACED" }), entities.literal.due({}, {})]),
      );
      const today = new Date().toISOString().slice(0, 10);
      specimen.expect(await call("daily", { zone: "UTC" })).toEqual({
        due: due.length,
        streak: 3,
        today: traces.filter((trace) => trace.createdAt.toISOString().slice(0, 10) === today)
          .length,
      });
    },
  );

  const armed = () =>
    new Vector()
      .graft(wakaru.tools)
      .use(shard.context.spread(contexts.daemonDie, scenario.daemon))
      .use(shard.context.bind("mode", scenario.mode))
      .use(shard.context.bind("user", scenario.fixtures.user))
      .use(shard.context.bind("thread", scenario.fixtures.thread.id));

  specimen.it(
    "the play tool fills the blank seat first, and mints a save only when none waits",
    async () => {
      await scenario.scoped(async () => {
        const count = () =>
          scenario.daemon.entities.buffer.count(
            { thread: scenario.fixtures.thread.id, mode: scenario.mode.entity.id },
            { filters: false },
          );
        const row = await blank();
        const before = await count();
        const filled = await steer.dispatch.invoke(armed(), "/play", steer.strategy.guarded)({});
        specimen
          .expect(filled)
          .toEqual({ message: specimen.expect.stringContaining("A Wakaru run is on screen") });
        specimen.expect(await count()).toBe(before);
        await scenario.daemon.entities.em.refresh(row);
        specimen.expect(row.data.run).toEqual(fresh(row.data.run.seed));

        const minted = await steer.dispatch.invoke(armed(), "/play", steer.strategy.guarded)({});
        specimen.expect(minted.buffer.length).toBe(1);
        specimen.expect(minted.buffer[0].thread.id).toBe(scenario.fixtures.thread.id);
        specimen.expect(await count()).toBe(before + 1);
      });
    },
  );

  specimen.it(
    "the harness reads a blank seat as no run, and a run as where the learner stands and what each open place holds",
    async () => {
      let other;
      const probe = () => {
        const vector = new Vector().graft(wakaru.harness);
        vector.branch("/dialogue").open("/probe", async (ctx) => ({
          system: await shape.primer.load(ctx.hallucination.primer, ctx),
        }));
        return scenario.scoped(() =>
          steer.dispatch.invoke(
            vector,
            "/dialogue/probe",
            steer.strategy.direct,
          )({
            ...shard.context.lift(contexts.daemonDie, scenario.daemon),
            mode: scenario.mode,
            thread: other,
            hallucination: { policy: {}, primer: new Vector() },
            input: {},
          }),
        );
      };
      await scenario.scoped(async () => {
        other = scenario.daemon.entities.thread.create({
          user: scenario.fixtures.user,
          mode: scenario.mode.entity.id,
        });
        await scenario.daemon.entities.em.flush();
        await blank(other.id);
      });
      const seated = await probe();
      specimen.expect(Object.keys(seated.system)).toEqual(["role", "format", "screen"]);
      specimen.expect(seated.system.screen).toBe("[Screen]\nNo run is on this thread — call play.");

      const [buffer] = await scenario.scoped(async () =>
        emitted(await scenario.mode.emit.feed({ thread: other.id })),
      );
      const atlas = await call("atlas", {});
      const known = await call("memory", { literals: atlas.places.market.words });
      const held = atlas.places.market.words.filter((id) => remembered(known[id])).length;
      const share = `${Math.round((held / 48) * 100)}%`;

      const running = (await probe()).system.screen.split("\n");
      specimen
        .expect(running.slice(0, 2))
        .toEqual(["[Screen]", "run 1: standing in The Square · 5 of 5 hearts · 0 coins"]);
      specimen
        .expect(running[2].startsWith(`Market Row: ${held} of 48 words held (${share}) · `))
        .toBe(true);
      for (const step of [
        "Rest the spirits: Lay 3 of its spirits to rest",
        "The keeper's question: Answer the keeper's question",
        "The warden: Hold 29 of its 48 words to wake the warden",
      ])
        specimen.expect(running[2]).toContain(step);
      specimen.expect(running.length).toBe(3);

      const restored = ["asked:market", "restored:market"].reduce(raise, {
        ...buffer.data.run,
        pose: { map: "market", x: 2, y: 3, facing: "north" },
        counters: { ...buffer.data.run.counters, "coins+": 70, "coins-": 20, "rested:market": 3 },
      });
      await call("keep", { buffer: buffer.id, run: restored });
      const later = (await probe()).system.screen.split("\n");
      specimen.expect(later[1]).toBe("run 1: standing in Market Row · 5 of 5 hearts · 50 coins");
      for (const step of [
        "Rest the spirits: done",
        "The keeper's question: done",
        "The warden: done",
      ])
        specimen.expect(later[2]).toContain(step);
      specimen.expect(later[3]).toMatch(/^Hearth Lane: \d of 2 words held \(\d+%\) · /);
      specimen
        .expect(later[4])
        .toMatch(
          /^The Stacks: \d+ of \d+ words held \(\d+%\) · Rest the spirits: Lay \d of its spirits to rest · The warden: /,
        );
      specimen.expect(later.length).toBe(5);
    },
  );
});
