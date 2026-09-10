import { contexts, shape, shard, specimen, steer, Vector } from "@vivalence/typology";
import { mountMode } from "@vivalence/runtime/scenarios";
import { viewable } from "./viewable.js";
import { harness, ROLE } from "../harness.js";
import { tools } from "../tools/index.js";

import * as cocina from "../cocina.viva.js";
import * as domain from "../../../../domain/domain.viva.js";

const { describe, it, expect, beforeAll, afterAll } = specimen;

describe("cocina harness — what the model is handed", () => {
  let scenario;
  let thread;

  beforeAll(async () => {
    scenario = await mountMode(cocina, { domain });
    viewable(scenario, cocina);
    await scenario.scoped(async () => {
      thread = scenario.daemon.entities.thread.create({ user: scenario.fixtures.user, mode: scenario.mode.entity.id });
      await scenario.daemon.entities.em.flush();
    });
  });

  afterAll(async () => {
    await scenario?.orm?.close();
  });

  const probe = (avenue) => {
    const vector = new Vector().graft(harness);
    vector.branch(avenue).open("/probe", async (ctx) => ({ system: await shape.primer.load(ctx.hallucination.primer, ctx) }));
    return scenario.scoped(() => steer.dispatch.invoke(vector, `${avenue}/probe`, steer.strategy.direct)({ ...shard.context.lift(contexts.host, scenario.daemon), mode: scenario.mode, thread, hallucination: { policy: {}, primer: new Vector() }, input: {} }));
  };

  it("P-sections: role and lexicon at the root; format and screen on the dialogue only; the lexicon lists tier 0 with retention", async () => {
    const dialogue = await probe("/dialogue");
    expect(Object.keys(dialogue.system)).toEqual(["role", "lexicon", "format", "screen"]);
    expect(dialogue.system.role).toBe(ROLE);
    expect(dialogue.system.lexicon.split("\n")[0]).toBe("[Lexicon] slug — surfaces · retention");
    expect(dialogue.system.lexicon).toContain("cebolla.noun (tier 0) — la cebolla · cebolla · UNTOUCHED");
    expect(dialogue.system.lexicon).not.toContain("medio.adjective");
    expect(dialogue.system.screen).toBe("[Screen]\nNo chef is open on this thread — call begin.");
    const object = await probe("/object");
    expect(Object.keys(object.system)).toEqual(["role", "lexicon"]);
  });

  it("P-blank: a blank buffer on the thread (the /mode seat, stall.js:14) is no kitchen — the lexicon still comes from retention", async () => {
    await scenario.scoped(async () => {
      scenario.daemon.entities.em.create(scenario.daemon.entities.buffer.getEntityName(), { mode: scenario.mode.entity.id, mime: scenario.mode.buffer.mime, index: 0, thread: thread.id, data: {} });
      await scenario.daemon.entities.em.flush();
    });
    const dialogue = await probe("/dialogue");
    expect(dialogue.system.lexicon).toContain("(tier 0)");
    expect(dialogue.system.screen).toBe("[Screen]\nNo chef is open on this thread — call begin.");
  });

  it("P-screen: once begin ran on the thread, the screen carries the rail", async () => {
    const armed = new Vector().graft(tools).use(shard.context.spread(contexts.host, scenario.daemon)).use(shard.context.bind("mode", scenario.mode)).use(shard.context.bind("user", scenario.fixtures.user)).use(shard.context.bind("thread", thread.id));
    await scenario.scoped(() => steer.dispatch.invoke(armed, "/begin", steer.strategy.guarded)({}));
    const dialogue = await probe("/dialogue");
    expect(dialogue.system.screen.split("\n")[1]).toBe("phase OBEY · tier 0 · tempo ×1 · obeyed 0/3 · commands 0/0");
    expect(dialogue.system.screen).toContain("kitchen · beat 1 · served 0 · lost 0");
    expect(dialogue.system.screen).toMatch(/tickets: (tortilla|tostada|bocadillo) 0\/3 \(next: corta (la cebolla|el pan)\) due beat 11/);
  });
});
