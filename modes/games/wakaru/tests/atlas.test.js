import { assertEquals } from "@std/assert";
import { fold } from "../engine/atlas.js";

// a forge's paradigm and its two forms, beside a plain word
const WORDS = Object.fromEntries(
  [
    { id: "w.pan", ontology: "word" },
    { id: "w.hablo", ontology: "word" },
    { id: "w.hablas", ontology: "word" },
    {
      id: "c.hablar",
      ontology: "conjugation",
      paradigm: { firstSingular: "w.hablo", secondSingular: "w.hablas" },
    },
  ].map((word) => [word.id, word]),
);

Deno.test("folded, a paradigm stands at its weakest form; plain words keep their own standing", () => {
  const memory = { "w.pan": "KNOWN", "w.hablo": "KNOWN", "w.hablas": "LEARNING" };
  assertEquals(fold(WORDS, memory), { ...memory, "c.hablar": "LEARNING" });
  assertEquals(memory, { "w.pan": "KNOWN", "w.hablo": "KNOWN", "w.hablas": "LEARNING" }, "untouched input");
});

Deno.test("an untouched form leaves its paradigm untouched — absent, as untouched words are", () => {
  assertEquals(fold(WORDS, { "w.hablo": "GRADUATED" }), { "w.hablo": "GRADUATED" });
  // a stale standing is folded away once a form is found untouched
  assertEquals(fold(WORDS, { "c.hablar": "KNOWN", "w.hablo": "KNOWN" }), { "w.hablo": "KNOWN" });
});

Deno.test("folding twice is folding once", () => {
  const memory = { "w.hablo": "UNKNOWN", "w.hablas": "KNOWN" };
  assertEquals(fold(WORDS, fold(WORDS, memory)), fold(WORDS, memory));
});
