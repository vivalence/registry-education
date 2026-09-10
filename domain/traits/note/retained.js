import { raw } from "@mikro-orm/core";
import { traits } from "@vivalence/typology";
import { v } from "@vivalence/typology";
import * as retention from "../../retention/index.js";
import { STATUS } from "../../schematics.js";

const at = (field, alias = "n0") => `json_extract(${alias}.trait, '$.RETAINED.${field}')`;
export const formula = (alias) =>
  `CASE ${at("driver", alias)} ${Object.entries(retention.drivers).map(([name, driver]) => `WHEN '${name}' THEN ${driver.sql.strength((field) => at(field, alias))}`).join(" ")} END`;
export const strength = (alias) => raw(formula(alias));
const DUE = raw(at("due"));
const STRENGTH = strength("n0");

const virgin = (held) => !held.status || held.status === "UNTOUCHED";

const schematic = v.object({
  driver: v.enum(Object.keys(retention.drivers)).default("BAYESIAN"),
  status: v.enum(STATUS).default("UNKNOWN"),
  type: v.enum(["INDIVIDUAL", "COLLECTIVE"]).default("INDIVIDUAL"),
  lastSignal: v.string().optional(),
  lastAt: v.number().optional(),
  due: v.string().optional(),
  state: v.any().default({}),
});

export const RETAINED = traits.define("RETAINED", {
  schematic,
  repository: {
    retention(row) {
      return this.findOne({ literal: row, traits: "RETAINED" });
    },
    evolve(note, signal) {
      const held = this.claim(note, "RETAINED");
      const driver = retention.drivers[held.driver];
      const given = typeof signal === "string" ? { enum: signal } : signal;
      const result = held.lastAt == null ? driver.encode(given) : driver.evolve(given, held);
      note.trait = {
        ...note.trait,
        RETAINED: { ...held, ...result, due: new Date(result.nextAt).toISOString(), lastAt: Date.now(), lastSignal: given.enum },
      };
      return note;
    },
    due(where = {}, opts) {
      return this.find({ ...where, traits: "RETAINED", [DUE]: { $lte: new Date().toISOString() } }, { ...opts, orderBy: { [DUE]: "asc" } });
    },
    byStrength(where = {}, opts) {
      return this.find({ ...where, traits: "RETAINED" }, { ...opts, orderBy: { [STRENGTH]: "asc" } });
    },
  },
  entity: {
    assess(now = Date.now()) {
      const held = traits.claim(this, "RETAINED", { RETAINED: schematic });
      const strength = held.lastAt == null ? 0 : retention.drivers[held.driver].strength(held, now);
      return {
        status: held.status,
        lastSignal: held.lastSignal ?? null,
        due: held.due ?? null,
        strength,
        is: {
          virgin: virgin(held),
          weak: held.status === "UNKNOWN" || held.status === "LEARNING",
          familiar: held.status === "LEARNING" || held.status === "KNOWN",
          strong: held.status === "KNOWN" || held.status === "GRADUATED",
          succeeded: held.lastSignal === "SUCCESS" || held.lastSignal === "MASTERY",
          failed: held.lastSignal === "FAILURE" || held.lastSignal === "MISTAKE",
        },
      };
    },
  },
});
