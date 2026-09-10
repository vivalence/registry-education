import { specimen, shape, Vector } from "@vivalence/typology";
import * as domain from "../domain.viva.js";
import { STATUS, SIGNAL } from "../schematics.js";
import drivers from "../retention/index.js";
import { RETAINED } from "../traits/note/retained.js";

const enumerated = (property) => RETAINED.schematic.properties[property].anyOf.map((variant) => variant.const);

specimen.describe("domain module — what the runtime mounts", () => {
  specimen.it("manifest is a TOOLING, EXPOSED domain named language-learning", () => {
    specimen.expect(domain.manifest.type).toBe("domain");
    specimen.expect(domain.manifest.slug).toBe("language-learning");
    specimen.expect([...domain.manifest.traits].sort()).toEqual(["EXPOSED", "TOOLING"]);
  });

  specimen.it("exports traits per kind and a twitch — no entities, no class, no table", () => {
    specimen.expect(domain.entities).toBeUndefined();
    specimen.expect(Object.keys(domain.traits).sort()).toEqual(["literal", "note", "symbol"]);
    specimen.expect(domain.traits.literal.map((held) => held.name)).toEqual(["RETAINED", "ANNOTATED", "RANKED", "TRANSLATED", "EXEMPLIFIED", "VOCALIZED", "CONJUGATED"]);
    specimen.expect(domain.traits.symbol).toEqual([]);
    specimen.expect(domain.traits.note.map((held) => held.name)).toEqual(["RETAINED", "TRACED"]);
    for (const held of [...domain.traits.literal, ...domain.traits.note]) specimen.expect(Object.keys(held).sort()).toEqual(["entity", "name", "repository", "schematic"]);
    specimen.expect(domain.twitch).toBeInstanceOf(Vector);
  });

  specimen.it("exposes the pick + review routes on its aperture and the four tools on its vector", () => {
    const routes = shape.strip(domain.aperture);
    specimen.expect(Object.keys(routes.branches.pick.branches.literal.branches).sort()).toEqual(["byStatus", "byStrength", "due", "feed", "novel"]);
    specimen.expect(Object.keys(routes.branches.review.branches)).toEqual(["literal"]);
    specimen.expect(Object.keys(shape.strip(domain.tools).branches).sort()).toEqual(["lookup", "progress", "queue", "review"]);
    specimen.expect(domain.resolve).toBeUndefined();
  });
});

specimen.describe("domain scales — STATUS and SIGNAL are the one vocabulary every part speaks", () => {
  specimen.it("STATUS is the retention status enum, in ladder order", () => {
    specimen.expect(STATUS).toEqual(enumerated("status"));
    specimen.expect(STATUS).toEqual(["UNTOUCHED", "UNKNOWN", "LEARNING", "KNOWN", "GRADUATED"]);
  });

  specimen.it("every driver's verdicts stay inside STATUS for every SIGNAL, and the driver enum names the registry", () => {
    specimen.expect(Object.keys(drivers).sort()).toEqual(enumerated("driver").sort());
    for (const driver of Object.values(drivers)) {
      for (const value of SIGNAL) {
        const verdict = driver.encode({ enum: value });
        specimen.expect(STATUS).toContain(verdict.status);
      }
    }
  });

  specimen.it("SIGNAL is the five-step verdict scale, and the bayesian TAU table knows every one", () => {
    specimen.expect(SIGNAL).toEqual(["MASTERY", "SUCCESS", "NEUTRAL", "MISTAKE", "FAILURE"]);
    let threw = false;
    try {
      drivers.BAYESIAN.encode({ enum: "SHRUG" });
    } catch {
      threw = true;
    }
    specimen.expect(threw).toBe(true);
  });

  specimen.it("literal traits name the vocabulary the daemon composes for its literals", () => {
    specimen.expect(domain.traits.literal.map((held) => held.name).sort()).toEqual(["ANNOTATED", "CONJUGATED", "EXEMPLIFIED", "RANKED", "RETAINED", "TRANSLATED", "VOCALIZED"]);
  });
});
