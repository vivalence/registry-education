export { tools } from "./tools/index.js";
export { harness, primer } from "./harness.js";

export const manifest = {
  type: "tactic",
  slug: "harvest",
  name: "Harvest",
  version: "0.1.0",
  description:
    "Operator mode that closes the katabolic loop: survey what has no voice, resolve recordings " +
    "from web sources or synthesize via TTS, receive them into the topography's fileset, stamp " +
    "VOCALIZED with attribution, and let the datasink write the mode content back to disk.",
  traits: ["CONVERSATIONAL", "HARNESSED", "TOOLING", "PRIMER"],
};
