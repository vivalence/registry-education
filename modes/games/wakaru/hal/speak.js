import { v } from "@vivalence/typology";

export const speak = {
  output: v.object({
    line: v
      .string()
      .desc(
        "What the keeper says, in the language being learned: one sentence, twelve words at most.",
      )
      .example("Mira, el agua ya canta en la fuente."),
    gloss: v
      .string()
      .desc("The same sentence in the learner's own language.")
      .example("Look, the water sings in the fountain again."),
  }),

  task: (language, { target }) =>
    `Say ONE short line in ${language.learning.name}, twelve words at most, in your own voice.
${target ? `Use the new word exactly once, so its meaning can be guessed from the rest.` : "Speak only of what they already hold."}
Then give the same line in ${language.known.name} as the gloss. No quotation marks, no stage directions.`,
};
