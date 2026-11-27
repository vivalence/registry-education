import { decodeBase64 } from "jsr:@std/encoding@1.0.10/base64";
import { Controller, Span } from "@vivalence/typology";

export const tts = ({ cortex }) => ({
  slug: "tts",

  resolve: async ({ text }) => ({
    source: "tts",
    synthesize: text,
    author: "elevenlabs",
    license: "synthetic",
  }),

  fetch: async (found) => {
    const said = await cortex.hallucinate.speech.render({
      controller: new Controller({ stdout: new Span("hallucination") }),
      turns: [{ role: "assistant", parts: [{ type: "text", text: found.synthesize }] }],
    });
    return decodeBase64(said.turns.at(-1).parts[0].data);
  },
});
