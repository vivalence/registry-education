import { contexts, shard, specimen, steer, Vector } from "@vivalence/typology";
import { mount } from "../scenarios/domain.js";

let scenario;

specimen.beforeAll(async () => {
  scenario = await mount();
});

specimen.afterAll(async () => await scenario?.orm?.close());

const greetings = { symbols: ["greeting"] };
const held = (traits) => scenario.scoped(() => scenario.daemon.entities.note.find({ traits }));
const novel = async () => (await scenario.invoke("/queue", { pick: "novel", symbols: ["greeting"], limit: 50 })).message;

const harnessed = (input) => {
  const armed = new Vector()
    .use(async (ctx, next) => {
      Object.assign(ctx, shard.context.lift(contexts.daemonDie, scenario.daemon), { user: scenario.fixtures.user, mode: null, thread: null });
      await next();
    })
    .graft(scenario.domain.tools);
  return scenario.scoped(() => steer.dispatch.invoke(armed, "/scale", steer.strategy.guarded)(input));
};

specimen.describe("tools — scale", () => {
  specimen.it("refuses a caller without a user", async () => {
    const out = await scenario.invoke("/scale", { where: greetings, status: "KNOWN", direction: "advance" }, { user: null });
    specimen.expect(out.condition).toBe("ERROR");
  });

  specimen.it("status and percent together, or neither, is refused", async () => {
    const both = await scenario.invoke("/scale", { where: greetings, status: "KNOWN", percent: 40, direction: "advance" });
    const neither = await scenario.invoke("/scale", { where: greetings, direction: "advance" });
    specimen.expect(both.condition).toBe("ERROR");
    specimen.expect(neither.condition).toBe("ERROR");
    specimen.expect((await held("RETAINED")).length).toBe(2);
  });

  specimen.it("drop lowers the reviewed, keeps the never-reviewed novel and mints them no note", async () => {
    const out = await scenario.invoke("/scale", { where: greetings, status: "UNKNOWN", direction: "drop" });
    specimen.expect(out.message).toBe("drop: 2 scaled · 2 kept");
    specimen.expect((await held("RETAINED")).map((note) => note.trait.RETAINED.status)).toEqual(["UNKNOWN", "UNKNOWN"]);
    specimen.expect(await novel()).toContain("thanks");
    specimen.expect(await novel()).toContain("please");
  });

  specimen.it("advance mints the missing notes; the queue stops offering them as novel", async () => {
    const out = await scenario.invoke("/scale", { where: greetings, status: "KNOWN", direction: "advance" });
    specimen.expect(out.message).toBe("advance: 4 scaled · 0 kept");
    const notes = await held("RETAINED");
    specimen.expect(notes.map((note) => note.trait.RETAINED.status)).toEqual(["KNOWN", "KNOWN", "KNOWN", "KNOWN"]);
    specimen.expect(await novel()).not.toContain("thanks");
  });

  specimen.it("advance keeps what is already stronger", async () => {
    const out = await scenario.invoke("/scale", { where: greetings, status: "LEARNING", direction: "advance" });
    specimen.expect(out.message).toBe("advance: 0 scaled · 4 kept");
  });

  specimen.it("set by percent lands a composed symbols set on the target", async () => {
    const where = { symbols: { $all: ["greeting"], $in: ["casual"] } };
    const out = await scenario.invoke("/scale", { where, percent: 60, direction: "set" });
    specimen.expect(out.message).toBe("set: 2 scaled · 0 kept");
    const statuses = (await held("RETAINED")).map((note) => note.trait.RETAINED.status).sort();
    specimen.expect(statuses).toEqual(["GRADUATED", "GRADUATED", "KNOWN", "KNOWN"]);
  });

  specimen.it("the harness's guarded call fills direction and refuses a percent off the scale", async () => {
    const out = await harnessed({ where: greetings, status: "LEARNING" });
    specimen.expect(out.message).toBe("advance: 0 scaled · 4 kept");
    let refused = null;
    try {
      await harnessed({ where: greetings, percent: 150 });
    } catch (error) {
      refused = error;
    }
    specimen.expect(refused.constructor.name).toBe("ValidationError");
  });

  specimen.it("a scale writes no trace", async () => {
    specimen.expect((await held("TRACED")).length).toBe(2);
  });
});
