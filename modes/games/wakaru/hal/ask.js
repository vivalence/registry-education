import { v } from "@vivalence/typology";

export const ask = {
  output: v.object({
    question: v
      .string()
      .desc("The keeper's question, in the language being learned: twelve words at most.")
      .example("¿Te gusta el pan de la mañana?"),
    gloss: v
      .string()
      .desc("The same question in the learner's own language.")
      .example("Do you like the morning bread?"),
  }),

  task: (language, { target }) =>
    `Ask the traveller ONE short question in ${language.learning.name}, twelve words at most, that they can answer with the words they hold.
${target ? "Use the new word in the question, so that a natural answer uses it again." : "Ask about something this place's words can answer."}
Then give the same question in ${language.known.name} as the gloss. No quotation marks, no stage directions.`,
};
