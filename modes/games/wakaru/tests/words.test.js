import { assertEquals } from "@std/assert";
import { person, said } from "../buffer/words.js";

const WORLD = {
  words: {
    pan: { id: "pan", ontology: "word", learning: "pan", known: "bread" },
    hablar: { id: "hablar", ontology: "word", learning: "hablar", known: "to speak" },
    "hablar.present": {
      id: "hablar.present",
      ontology: "conjugation",
      learning: "",
      known: "",
      infinitive: "hablar",
      tense: "present.indicative",
      paradigm: { firstSingular: "hablo" },
    },
  },
};

Deno.test("a word reads as itself; a paradigm, empty on both sides, as its verb in its tense", () => {
  assertEquals(said(WORLD, "pan"), { learning: "pan", known: "bread" });
  assertEquals(said(WORLD, "hablar.present"), {
    learning: "hablar",
    known: "to speak · present indicative",
  });
});

Deno.test("a paradigm's cell is named alike however the corpus spells its key", () => {
  assertEquals(["firstSingular", "first.singular", "thirdPlural"].map(person), [
    "1st singular",
    "1st singular",
    "3rd plural",
  ]);
});
