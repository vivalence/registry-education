import { Controller, Span } from "@vivalence/typology";

export const tts = ({ cortex }) => ({
  slug: "tts",

  resolve: async ({ text }) => ({
    source: "tts",
    synthesize: text,
    author: "elevenlabs",
    license: "synthetic",
  }),

  fetch: async (found) =>
    await cortex.hallucinate.speech.render({ controller: new Controller({ stdout: new Span("hallucination") }), source: found.synthesize }),
});
