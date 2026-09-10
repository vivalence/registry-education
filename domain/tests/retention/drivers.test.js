import { specimen, traits } from "@vivalence/typology";
import drivers from "../../retention/index.js";
import boolean from "../../retention/boolean.js";
import counter from "../../retention/counter.js";
import bayesian from "../../retention/bayesian.js";
import { RETAINED } from "../../traits/note/retained.js";
import { STATUS, SIGNAL } from "../../schematics.js";

const enumerated = (property) => RETAINED.schematic.properties[property].anyOf.map((variant) => variant.const);
const RetentionStatus = enumerated("status");

const signal = (value) => ({ enum: value });

specimen.describe("retention drivers — the registry", () => {
  specimen.it("registers every driver under its type, each with encode · evolve · assess · sql.strength", () => {
    specimen.expect(Object.keys(drivers).sort()).toEqual(["BAYESIAN", "BOOLEAN", "COUNTER"]);
    for (const driver of Object.values(drivers)) {
      specimen.expect(typeof driver.encode).toBe("function");
      specimen.expect(typeof driver.evolve).toBe("function");
      specimen.expect(typeof driver.assess).toBe("function");
      specimen.expect(typeof driver.sql.strength((field) => `m.${field}`)).toBe("string");
    }
    specimen.expect(Object.keys(drivers).sort()).toEqual(enumerated("driver").sort());
  });

  specimen.it("every driver speaks the domain's status ladder and accepts every domain signal", () => {
    for (const driver of Object.values(drivers)) {
      for (const value of SIGNAL) {
        const encoded = driver.encode(signal(value));
        specimen.expect(STATUS).toContain(encoded.status);
        specimen.expect(RetentionStatus).toContain(encoded.status);
        const evolved = driver.evolve(signal(value), { state: encoded.state, lastAt: new Date(Date.now() - 3600000), traces: [] });
        specimen.expect(STATUS).toContain(evolved.status);
        specimen.expect(evolved.nextAt instanceof Date || typeof evolved.nextAt === "string").toBe(true);
        specimen.expect(typeof evolved.nextIn).toBe("number");
      }
    }
  });

  specimen.it("a compound signal {enum, ratio} evolves on the RATIO — the enum is the trace label", () => {
    const base = bayesian.encode({ enum: "NEUTRAL" });
    const retention = () => ({ state: base.state, lastAt: new Date(Date.now() - 3600000), traces: [] });
    const halflife = (result) => result.state[2];
    const full = bayesian.evolve({ enum: "NEUTRAL", ratio: { success: 8, total: 8 } }, retention());
    const most = bayesian.evolve({ enum: "NEUTRAL", ratio: { success: 6, total: 8 } }, retention());
    const none = bayesian.evolve({ enum: "NEUTRAL", ratio: { success: 0, total: 8 } }, retention());
    const enumOnly = bayesian.evolve({ enum: "NEUTRAL" }, retention());
    specimen.expect(halflife(full)).toBeGreaterThan(halflife(most));
    specimen.expect(halflife(most)).toBeGreaterThan(halflife(none));
    specimen.expect(halflife(full)).not.toBe(halflife(enumOnly));
    specimen.expect(boolean.evolve({ enum: "SUCCESS", ratio: { success: 0, total: 8 } }, retention()).state).toBe(false);
  });

  specimen.it("refuses an empty signal", () => {
    for (const driver of Object.values(drivers)) {
      let threw = false;
      try {
        driver.encode({});
      } catch {
        threw = true;
      }
      specimen.expect(threw).toBe(true);
    }
  });
});

specimen.describe("boolean driver — known or not, nothing between", () => {
  specimen.it("positive signals graduate, negative ones stay unknown, both on encode and evolve", () => {
    for (const value of ["MASTERY", "SUCCESS", "NEUTRAL"]) {
      specimen.expect(boolean.encode(signal(value))).toMatchObject({ state: true, status: "GRADUATED", nextIn: 9999999 });
      specimen.expect(boolean.evolve(signal(value), { state: false })).toMatchObject({ state: true, status: "GRADUATED" });
    }
    for (const value of ["MISTAKE", "FAILURE"]) {
      specimen.expect(boolean.encode(signal(value))).toMatchObject({ state: false, status: "UNKNOWN", nextIn: 0 });
      specimen.expect(boolean.evolve(signal(value), { state: true })).toMatchObject({ state: false, status: "UNKNOWN" });
    }
  });

  specimen.it("ratios: encode needs half, evolve needs a third", () => {
    specimen.expect(boolean.encode({ ratio: { success: 1, total: 2 } }).state).toBe(true);
    specimen.expect(boolean.encode({ ratio: { success: 1, total: 3 } }).state).toBe(false);
    specimen.expect(boolean.evolve({ ratio: { success: 1, total: 3 } }, { state: false }).state).toBe(true);
    specimen.expect(boolean.evolve({ ratio: { success: 1, total: 4 } }, { state: true }).state).toBe(false);
  });

  specimen.it("assess: no state = UNTOUCHED, due now", () => {
    specimen.expect(boolean.assess({ state: undefined })).toMatchObject({ status: "UNTOUCHED", nextIn: 0 });
  });
});

specimen.describe("counter driver — a streak schedule", () => {
  specimen.it("encode starts the streak on a hit and zeroes it on a miss", () => {
    specimen.expect(counter.encode(signal("SUCCESS"))).toMatchObject({ state: { streak: 1, total: 1, successes: 1 }, status: "UNKNOWN", nextIn: 1 });
    specimen.expect(counter.encode(signal("FAILURE"))).toMatchObject({ state: { streak: 0, total: 1, successes: 0 }, status: "UNKNOWN", nextIn: 1 });
  });

  specimen.it("climbs UNKNOWN → LEARNING (2) → KNOWN (5) → GRADUATED (8) along the schedule, and a miss resets the streak but not the totals", () => {
    let retention = { state: counter.encode(signal("SUCCESS")).state };
    const seen = [];
    for (let index = 0; index < 8; index += 1) {
      const next = counter.evolve(signal("SUCCESS"), retention);
      seen.push([next.state.streak, next.status, next.nextIn]);
      retention = { state: next.state };
    }
    specimen.expect(seen.map(([streak]) => streak)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    specimen.expect(seen.map(([, status]) => status)).toEqual(["LEARNING", "LEARNING", "LEARNING", "KNOWN", "KNOWN", "KNOWN", "GRADUATED", "GRADUATED"]);
    specimen.expect(seen.map(([, , nextIn]) => nextIn)).toEqual([24, 24, 24, 168, 168, 168, 9999999, 9999999]);
    const missed = counter.evolve(signal("MISTAKE"), retention);
    specimen.expect(missed.state).toEqual({ streak: 0, total: 10, successes: 9 });
    specimen.expect(missed.status).toBe("UNKNOWN");
  });

  specimen.it("requires an enum signal", () => {
    let threw = false;
    try {
      counter.encode({ ratio: { success: 1, total: 1 } });
    } catch {
      threw = true;
    }
    specimen.expect(threw).toBe(true);
  });
});

specimen.describe("note.evolve — the RETAINED verb applies a driver's verdict to the payload", () => {
  const notes = { schematics: { RETAINED: RETAINED.schematic }, claim: (row, name) => traits.claim(row, name, { RETAINED: RETAINED.schematic }) };
  const evolve = (note, signal) => RETAINED.repository.evolve.call(notes, note, signal);
  const fresh = (driver = "BAYESIAN") => ({ traits: ["RETAINED"], trait: { RETAINED: { ...RETAINED.schematic.create(), driver } } });

  specimen.it("encodes on first signal, evolves after, accepts a bare string signal, stamps lastAt and due", () => {
    const note = fresh();
    const before = Date.now();
    evolve(note, "SUCCESS");
    const first = note.trait.RETAINED;
    specimen.expect(first.lastSignal).toBe("SUCCESS");
    specimen.expect(Array.isArray(first.state)).toBe(true);
    specimen.expect(new Date(first.due).getTime()).toBeGreaterThan(before);
    specimen.expect(first.lastAt).toBeGreaterThanOrEqual(before);
    evolve(note, { enum: "FAILURE" });
    specimen.expect(new Date(note.trait.RETAINED.due).getTime()).toBeLessThan(new Date(first.due).getTime());
    specimen.expect(["UNKNOWN", "LEARNING"]).toContain(note.trait.RETAINED.status);
  });

  specimen.it("every driver runs through the verb, statuses stay inside the enum", () => {
    for (const driver of Object.keys(drivers)) {
      const note = fresh(driver);
      for (const value of ["SUCCESS", "SUCCESS", "MISTAKE", "SUCCESS", "MASTERY"]) {
        evolve(note, value);
        specimen.expect(RetentionStatus).toContain(note.trait.RETAINED.status);
      }
    }
  });
});
