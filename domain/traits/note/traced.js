import { traits } from "@vivalence/typology";
import { v } from "@vivalence/typology";

export const TRACED = traits.define("TRACED", {
  schematic: v.object({ signal: v.any(), snapshot: v.any().default({}) }),
});
