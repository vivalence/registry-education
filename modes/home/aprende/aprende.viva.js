import { Vector, shape, mime } from "@vivalence/typology";
import { gather } from "./gather.js";

export { emitter } from "./emitter/index.js";
export { aperture } from "./aperture/index.js";
export { harness } from "./harness.js";
export { tools } from "./tools/index.js";

export const manifest = {
  type: "homepage",
  slug: "aprende",
  name: "Aprende",
  description: "Brazilian Portuguese course",
  traits: [
    "VIEWABLE",
    "HARNESSED",
    "CONVERSATIONAL",
    "EXPOSED",
    "EMITTER",
    "TOOLING",
  ],
};

export const views = [
  { slug: "aprende", mount: "buffer/Aprende.svelte", mime: mime.dom.svelte },
];
