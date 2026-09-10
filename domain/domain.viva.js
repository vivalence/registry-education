export * as traits from "./traits/index.js";
export * as schematics from "./schematics.js";
export { twitch } from "./twitch.js";
export * from "./aperture/index.js";
export { tools } from "./tools/index.js";

export const manifest = {
  type: "domain",
  slug: "language-learning",
  name: "Language Learning",
  description: "Domain for learning with literals symbols ebisu and annotations",
  version: "0.0.5",
  traits: ["EXPOSED", "TOOLING"],
};
