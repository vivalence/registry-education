import { contexts, shard, specimen, steer, Vector } from "@vivalence/typology";
import { mountMode } from "@vivalence/runtime/scenarios";
import { viewable } from "./viewable.js";
import { slugs } from "../mando/lexicon.js";
import { tools } from "../tools/index.js";

import * as cocina from "../cocina.viva.js";
import * as domain from "../../../../domain/domain.viva.js";

const { describe, it, expect, beforeAll, afterAll } = specimen;

describe("cocina tools — begin · speak · react · command, the model's hands over the rail", () => {
  let scenario;
  let thread;
  let armed;
  const call = (nature, input) => scenario.scoped(() => steer.dispatch.invoke(armed, nature, steer.strategy.guarded)(input));
  const nextStep = (data) => {
    const ticket = data.world.tickets[0];
    const [prep, ingredient] = ticket.dish.steps[ticket.done];
    return { prep, ingredient };
  };

  beforeAll(async () => {
    scenario = await mountMode(cocina, { domain });
    viewable(scenario, cocina);
    await scenario.scoped(async () => {
      for (const slug of slugs) {
        scenario.daemon.entities.literal.create({ slug, mode: scenario.mode.entity.id, ontology: slug.endsWith(".imperative") ? "conjugation" : "word", traits: ["TRANSLATED"], trait: { TRANSLATED: { known: slug, learning: slug.split(".")[0] } } });
      }
      thread = scenario.daemon.entities.thread.create({ user: scenario.fixtures.user, mode: scenario.mode.entity.id });
      await scenario.daemon.entities.em.flush();
    });
    armed = new Vector()
      .graft(tools)
      .use(shard.context.spread(contexts.host, scenario.daemon))
      .use(shard.context.bind("mode", scenario.mode))
      .use(shard.context.bind("user", scenario.fixtures.user))
      .use(shard.context.bind("thread", thread.id));
  });

  afterAll(async () => {
    await scenario?.orm?.close();
  });

  it("1 · begin opens a tier-0 OBEY kitchen on the thread with one ticket, the tier-0 lexicon beside it", async () => {
    const result = await call("/begin", {});
    expect(result.object.tier).toBe(0);
    expect(result.object.phase).toBe("OBEY");
    expect(result.object.world.tickets.length).toBe(1);
    expect(result.object.lexicon.map((entry) => entry.slug).sort()).toEqual(["cebolla.noun", "cortar.imperative", "freír.imperative", "huevo.noun", "pan.noun", "poner.imperative", "queso.noun", "servir.imperative", "tomate.noun"]);
    expect(result.buffer[0].thread.id).toBe(thread.id);
    expect(result.message.startsWith("phase OBEY · tier 0 · tempo ×1")).toBe(true);
  });

  it("1b · a blank buffer the client minted on the thread (stall.js:14) becomes the kitchen — begin mints no second row, every tool writes every row", async () => {
    await scenario.scoped(async () => {
      scenario.daemon.entities.em.create(scenario.daemon.entities.buffer.getEntityName(), { mode: scenario.mode.entity.id, mime: scenario.mode.buffer.mime, index: 5, thread: thread.id, data: {} });
      await scenario.daemon.entities.em.flush();
    });
    const result = await call("/begin", {});
    expect(result.buffer.length).toBe(2);
    expect(result.buffer.every((row) => row.data.world !== undefined)).toBe(true);
    await scenario.scoped(async () => {
      const rows = await scenario.daemon.entities.buffer.find({ thread: thread.id }, { filters: false });
      expect(rows.length).toBe(2);
      expect(rows.every((row) => row.data.phase === "OBEY")).toBe(true);
    });
  });

  it("2 · speak calls a ticket's next step in Spanish, verbatim; command in OBEY is refused", async () => {
    const result = await call("/speak", {});
    expect(result.message.startsWith("say to the learner, verbatim: «corta ")).toBe(true);
    expect(result.object.spoken.slugs.length).toBe(2);
    const refused = await call("/command", { command: { prep: "cortar.imperative", ingredient: "pan.noun" }, said: "corta el pan", reviews: [{ literal: "cortar.imperative", signal: "SUCCESS" }] });
    expect(refused.condition).toBe("ERROR");
  });

  it("3 · react ok grades both spoken lexemes SUCCESS, advances the ticket, clears the step; three ok open COMMAND", async () => {
    const first = await call("/react", { ok: true });
    expect(first.message.split("\n")[0]).toMatch(/^cortar\.imperative SUCCESS → (UNKNOWN|LEARNING|KNOWN|GRADUATED)$/);
    expect(first.message.split("\n")[1]).toMatch(/^(cebolla|pan)\.noun SUCCESS → /);
    expect(first.object.reactions).toEqual([true]);
    expect(first.object.spoken).toBe(null);
    expect(first.object.world.beat).toBe(2);
    expect(first.object.world.tickets[0].done).toBe(1);
    await call("/speak", {});
    await call("/react", { ok: true });
    await call("/speak", {});
    const third = await call("/react", { ok: true });
    expect(third.object.phase).toBe("COMMAND");
    expect((await call("/speak", {})).condition).toBe("ERROR");
  });

  it("4 · command cooks the step a ticket wants, lands the reviews, keeps the corrected Spanish; a MISTAKE cooks nothing", async () => {
    const before = (await call("/begin", {})).object;
    expect(before.phase).toBe("OBEY");
    await call("/speak", {});
    await call("/react", { ok: true });
    await call("/speak", {});
    await call("/react", { ok: true });
    await call("/speak", {});
    const open = (await call("/react", { ok: true })).object;
    expect(open.phase).toBe("COMMAND");
    const { prep, ingredient } = nextStep(open);
    const hit = await call("/command", { command: { prep, ingredient }, said: "corta la cebolla", reviews: [{ literal: prep, signal: "SUCCESS" }, { literal: ingredient, signal: "MASTERY" }] });
    expect(hit.message.split("\n")[0]).toBe("a ticket advanced");
    expect(hit.object.history).toEqual([true]);
    expect(hit.object.said).toBe("corta la cebolla");
    expect(hit.object.world.cook.hit).toBe(true);
    const miss = await call("/command", { command: { prep: "servir.imperative", ingredient: "queso.noun" }, said: "sirve el queso", reviews: [{ literal: "servir.imperative", signal: "MISTAKE" }, { literal: "queso.noun", signal: "SUCCESS" }] });
    expect(miss.message.split("\n")[0]).toBe("not cooked — a lexeme missed");
    expect(miss.object.history).toEqual([true, false]);
    expect(miss.object.world.cook).toEqual(hit.object.world.cook);
    await scenario.scoped(async () => {
      const notes = await scenario.daemon.entities.note.find({ slug: "retention.servir.imperative" });
      expect(notes.length).toBe(1);
    });
  });
});
