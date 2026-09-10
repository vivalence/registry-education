import { mime } from "@vivalence/typology";

export { emitter } from "./emitter/index.js";
export { aperture } from "./aperture/index.js";
export { buckets } from "./course.js";

export const manifest = {
  type: "tactic",
  slug: "impara",
  version: "0.1.0",
  name: "Impara",
  description:
    "Italian course in three buckets: vocabolario, grammatica, frasi.",
  traits: ["VIEWABLE", "EMITTER", "EXPOSED"],
};

export const views = [
  { slug: "impara", mount: "buffer/Impara.svelte", mime: mime.dom.svelte },
];
