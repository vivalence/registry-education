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
    "SURFACED",
    "HARNESS",
    "CONVERSATION",
    "EXPOSED",
    "EMITTER",
    "TOOLING",
  ],
};

export const surfaces = [
  { slug: "aprende", mount: "buffer/Aprende.svelte", mime: mime.dom.svelte },
];
