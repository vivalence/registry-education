import { specimen } from "@vivalence/typology";
import { RequestContext, UniqueConstraintViolationException } from "@mikro-orm/core";
import { UserEntity } from "@vivalence/runtime";
import { world } from "../scenarios/italian.js";

const HOUR = 3_600_000;

let rig;
let italian;
let alice;
let bob;
let fixtures;

const as = (user, task) =>
  RequestContext.create(rig.scenario.orm.em, async () => {
    RequestContext.getEntityManager().setFilterParams("user", { user: user.id });
    return task(RequestContext.getEntityManager());
  });

const context = (user) => ({ daemon: { entities: italian }, user, mode: null, thread: null });

specimen.beforeAll(async () => {
  rig = await world(["italian"]);
  italian = rig.daemons.italian.entities;
  alice = rig.user;
  await rig.within(async () => {
    bob = rig.em.create(UserEntity, { slug: "bob" });
    const dojo = italian.mode.create({ type: "game", slug: "dojo" });
    const hello = italian.literal.create({ slug: "hello", mode: dojo });
    const goodbye = italian.literal.create({ slug: "goodbye", mode: dojo });
    await rig.em.flush();
    const now = Date.now();
    const retained = (row, RETAINED) =>
      italian.note.create({ user: alice, literal: row, slug: `retention.${row.slug}`, traits: ["RETAINED"], trait: { RETAINED: { ...italian.note.schematics.RETAINED.create(), ...RETAINED } } });
    const known = retained(hello, { status: "KNOWN", lastSignal: "SUCCESS", lastAt: now, due: new Date(now + 24 * HOUR).toISOString() });
    retained(goodbye, { status: "LEARNING", lastSignal: "MISTAKE", lastAt: now, due: new Date(now - 24 * HOUR).toISOString() });
    await rig.em.flush();
    italian.note.create({ user: alice, literal: hello, parent: known, slug: "trace.hello", traits: ["TRACED"], trait: { TRACED: { signal: "SUCCESS", snapshot: {} } } });
    await rig.em.flush();
    fixtures = { hello, goodbye };
  });
});

specimen.afterAll(async () => await rig.close());

specimen.describe("userspace — RETAINED and TRACED notes are per user, the literal is shared", { sanitizeResources: false, sanitizeOps: false }, () => {
  specimen.it("alice's RETAINED notes are invisible to bob: the same literal is novel for him", async () => {
    const forAlice = await as(alice, () => italian.literal.novel({}, { limit: 50 }));
    specimen.expect(forAlice.map((row) => row.slug)).not.toContain("hello");
    const forBob = await as(bob, () => italian.literal.novel({}, { limit: 50 }));
    specimen.expect(forBob.map((row) => row.slug)).toContain("hello");
    specimen.expect(forBob.map((row) => row.slug)).toContain("goodbye");
    const dueForBob = await as(bob, () => italian.literal.due({}, { limit: 50 }));
    specimen.expect(dueForBob.length).toBe(0);
  });

  specimen.it("bob's review writes HIS RETAINED note and TRACED child; alice's stay untouched; each sees only their own", async () => {
    const bobs = await as(bob, async () => {
      const row = await italian.literal.findOne({ slug: "hello" });
      return italian.literal.review(row, "FAILURE", context(await italian.em.findOneOrFail(UserEntity, { id: bob.id })));
    });
    specimen.expect(bobs.user.id).toBe(bob.id);

    const aliceRetained = await as(alice, () => italian.note.find({ literal: fixtures.hello.id, traits: "RETAINED" }));
    specimen.expect(aliceRetained.length).toBe(1);
    specimen.expect(aliceRetained[0].trait.RETAINED.status).toBe("KNOWN");
    specimen.expect(aliceRetained[0].user.id).toBe(alice.id);

    const bobRetained = await as(bob, () => italian.note.find({ literal: fixtures.hello.id, traits: "RETAINED" }));
    specimen.expect(bobRetained.map((note) => note.id)).toEqual([bobs.id]);

    const bobTraces = await as(bob, () => italian.note.find({ traits: "TRACED" }));
    specimen.expect(bobTraces.map((note) => note.trait.TRACED.signal)).toEqual(["FAILURE"]);
    const aliceTraces = await as(alice, () => italian.note.find({ traits: "TRACED" }));
    for (const trace of aliceTraces) specimen.expect(trace.user.id).toBe(alice.id);
  });

  specimen.it("one RETAINED note per user·literal: the coalesce unique refuses a second retention.<slug>", async () => {
    const second = as(alice, async (scoped) => {
      italian.note.create({ user: alice.id, literal: fixtures.hello.id, slug: "retention.hello", traits: ["RETAINED"], trait: { RETAINED: italian.note.schematics.RETAINED.create() } });
      await scoped.flush();
    });
    await specimen.expect(second).rejects.toThrow(UniqueConstraintViolationException);
  });

  specimen.it("status · byStrength · sample answer per user", async () => {
    const aliceKnown = await as(alice, () => italian.literal.sample({}, { status: ["KNOWN"], limit: 10 }));
    specimen.expect(aliceKnown.map((row) => row.slug)).toEqual(["hello"]);
    const bobKnown = await as(bob, () => italian.literal.sample({}, { status: ["KNOWN"], limit: 10 }));
    specimen.expect(bobKnown.length).toBe(0);
    const bobStrength = await as(bob, () => italian.literal.byStrength({}, { limit: 10 }));
    specimen.expect(bobStrength.map((row) => row.slug)).toEqual(["hello"]);
    const bobSample = await as(bob, () => italian.literal.sample({}, { limit: 10 }));
    specimen.expect(bobSample.map((row) => row.slug)).toEqual(["hello"]);
    const aliceSample = await as(alice, () => italian.literal.sample({}, { status: ["LEARNING"], limit: 10 }));
    specimen.expect(aliceSample.map((row) => row.slug)).toEqual(["goodbye"]);
  });
});

specimen.describe("userspace — deleting a literal cascades to every user's RETAINED and TRACED notes", { sanitizeResources: false, sanitizeOps: false }, () => {
  specimen.it("no orphan notes survive the literal", async () => {
    const connection = rig.scenario.orm.em.getConnection();
    const id = fixtures.hello.id;
    const count = async () => (await connection.execute("select count(*) as notes from Note where literal_id = ?", [id]))[0].notes;
    specimen.expect(await count()).toBe(4);
    await as(alice, async (scoped) => {
      scoped.remove(await italian.literal.findOne({ id }));
      await scoped.flush();
    });
    specimen.expect(await count()).toBe(0);
  });
});
