import { Dataset, Datasink, writer } from "@vivalence/typology";

export const manifest = {
  type: "topography",
  slug: "english-to-spanish",
  name: "Castilian Spanish Vocabulary",
  version: "0.2.0",
  traits: ["DATASET", "FILESET", "DATASINK"],
};

export const fileset = { path: "freight/audio" };

// const attribution = {
//   audio: "Not owned by the project author — sourced agentically from third-party recordings.",
//   sentences: "Tatoeba, native-speaker recordings (CC-BY 2.0 FR)",
//   words: "Lingua Libre / Wikimedia Commons + Wiktionary pronunciations (CC)",
// };

export const dataset = new Dataset({
  symbol: "dataset/symbols",
  literal: "dataset/literals",
});

export const datasink = new Datasink({
  literal: [
    ["sentence", "dataset/literals/sentences.js"],
    ["word", writer.split("word.part-of-speech.%", "dataset/literals/words/%.js")],
  ],
});

export { statics } from "./statics/language.js";
