import { traits } from "@vivalence/typology";
import { v } from "@vivalence/typology";

export const ANNOTATED = traits.define("ANNOTATED", { schematic: v.object({}, { additionalProperties: true }) });
