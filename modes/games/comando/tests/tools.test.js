import { contexts, shard, specimen, steer, Vector } from "@vivalence/typology";
import { mountMode } from "@vivalence/runtime/scenarios";
import { viewable } from "./viewable.js";
import { slugs } from "../mando/lexicon.js";
import { tools } from "../tools/index.js";

import * as comando from "../comando.viva.js";
import * as domain from "../../../../domain/domain.viva.js";

const { describe, it, expect, beforeAll, afterAll } = specimen;

describe("comando tools — begin · speak · react · command, the model's hands over the board", () => {
  let scenario;
  let thread;
  let armed;
  const call = (nature, input) => scenario.scoped(() => steer.dispatch.invoke(armed, nature, steer.strategy.guarded)(input));

  beforeAll(async () => {
    scenario = await mountMode(comando, { domain });
    viewable(scenario, comando);
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

  it("1 · begin opens a tier-0 OBEY board on the thread, the tier-0 lexicon beside it", async () => {
    const result = await call("/begin", { units: 1 });
    expect(result.object.tier).toBe(0);
    expect(result.object.phase).toBe("OBEY");
    expect(result.object.world.units.length).toBe(1);
    expect(result.object.lexicon.map((entry) => entry.slug).sort()).toEqual(["abajo.adverb", "arriba.adverb", "bajar.imperative", "derecha.noun", "girar.imperative", "ir.imperative", "izquierda.noun", "parar.imperative", "subir.imperative"]);
    expect(result.buffer[0].thread.id).toBe(thread.id);
    expect(result.message.startsWith("phase OBEY · tier 0 · tempo ×1")).toBe(true);
  });

  it("1b · a blank buffer the client minted on the thread (stall.js:14) becomes the board — begin mints no second row, every tool writes every row", async () => {
    await scenario.scoped(async () => {
      scenario.daemon.entities.em.create(scenario.daemon.entities.buffer.getEntityName(), { mode: scenario.mode.entity.id, mime: scenario.mode.buffer.mime, index: 5, thread: thread.id, data: {} });
      await scenario.daemon.entities.em.flush();
    });
    const result = await call("/begin", {units: 1});
    expect(result.buffer.length).toBe(2);
    expect(result.buffer.every((row) => row.data.world !== undefined)).toBe(true);
    await scenario.scoped(async () => {
      const rows = await scenario.daemon.entities.buffer.find({ thread: thread.id }, { filters: false });
      expect(rows.length).toBe(2);
      expect(rows.every((row) => row.data.phase === "OBEY")).toBe(true);
    });
  });

  it("2 · speak remembers an order and hands back the Spanish to say verbatim; command in OBEY is refused", async () => {
    const result = await call("/speak", {});
    expect(result.message.startsWith("say to the learner, verbatim: «")).toBe(true);
    expect(result.object.spoken.slugs.length).toBe(1);
    expect(result.object.said.length).toBeGreaterThan(0);
    const refused = await call("/command", { command: { kind: "move", direction: "arriba.adverb" }, said: "sube arriba", reviews: [{ literal: "subir.imperative", signal: "SUCCESS" }] });
    expect(refused.condition).toBe("ERROR");
  });

  it("3 · react ok grades the spoken lexeme SUCCESS, moves the board a beat, clears the order; three ok open COMMAND", async () => {
    const first = await call("/react", { ok: true });
    expect(first.message.split("\n")[0]).toMatch(/^[a-zá-ú]+\.(adverb|noun) SUCCESS → (UNKNOWN|LEARNING|KNOWN|GRADUATED)$/);
    expect(first.object.reactions).toEqual([true]);
    expect(first.object.spoken).toBe(null);
    expect(first.object.world.beat).toBe(1);
    await call("/speak", {});
    await call("/react", { ok: true });
    await call("/speak", {});
    const third = await call("/react", { ok: true });
    expect(third.object.phase).toBe("COMMAND");
    expect((await call("/speak", {})).condition).toBe("ERROR");
  });

  it("4 · command executes a parsed move, lands the reviews, keeps the corrected Spanish; a MISTAKE executes nothing", async () => {
    const before = (await call("/begin", { units: 1 })).object;
    expect(before.phase).toBe("OBEY");
    await call("/speak", {});
    await call("/react", { ok: true });
    await call("/speak", {});
    await call("/react", { ok: true });
    await call("/speak", {});
    const open = (await call("/react", { ok: true })).object;
    const unit = open.world.units[0];
    const hit = await call("/command", { command: { kind: "move", direction: "abajo.adverb", count: 2 }, said: "baja dos abajo", reviews: [{ literal: "bajar.imperative", signal: "SUCCESS" }, { literal: "dos.numeral", signal: "SUCCESS" }, { literal: "abajo.adverb", signal: "MASTERY" }] });
    expect(hit.message.split("\n")[0]).toBe("executed");
    expect(hit.object.history).toEqual([true]);
    expect(hit.object.said).toBe("baja dos abajo");
    expect(hit.object.world.units[0].y).toBe(Math.min(7, unit.y + 2));
    const miss = await call("/command", { command: { kind: "move", direction: "arriba.adverb", count: 1 }, said: "sube arriba", reviews: [{ literal: "subir.imperative", signal: "MISTAKE" }, { literal: "arriba.adverb", signal: "SUCCESS" }] });
    expect(miss.message.split("\n")[0]).toBe("not executed — a lexeme missed");
    expect(miss.object.history).toEqual([true, false]);
    expect(miss.object.world.units[0].y).toBe(hit.object.world.units[0].y);
    await scenario.scoped(async () => {
      const notes = await scenario.daemon.entities.note.find({ slug: "retention.subir.imperative" });
      expect(notes.length).toBe(1);
    });
  });
});
