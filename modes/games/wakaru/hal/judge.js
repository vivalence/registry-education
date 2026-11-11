import { v } from "@vivalence/typology";

export const GRADES = ["MASTERY", "SUCCESS", "NEUTRAL", "MISTAKE", "FAILURE"];

// the verdict rules, shown in English so they hold for whichever language is being learned
const EXAMPLES = [
  `asked "Do you like bread?" · taught bread · replied "Yes, I like bread a lot" — natural and right → MASTERY`,
  `asked "Do you like bread?" · taught bread · replied "yes i like the bred" — understood, the word misspelt → SUCCESS`,
  `asked "Do you like bread?" · taught bread · replied "Yes, I like it" — answered, the taught word left out → NEUTRAL`,
  `asked "Do you like bread?" · taught bread · replied in the learner's own language — the meaning is there → NEUTRAL`,
  `asked "Do you like bread?" · taught bread · replied "I bread am" — the word misused, the meaning lost → MISTAKE`,
  `asked "Do you like bread?" · taught bread · replied "I don't know" or nothing — gave up → FAILURE`,
].join("\n");

const numbered = (words) =>
  words
    .map(
      (row, index) =>
        `  [${index}] ${row.trait.TRANSLATED.learning} — ${row.trait.TRANSLATED.known}`,
    )
    .join("\n");

export const judge = {
  output: v.object({
    grade: v.enum(GRADES).desc("The signal the whole reply earned.").example("SUCCESS"),
    feedback: v
      .string()
      .desc("One short, kind sentence in the learner's own language: what to keep, or what to fix.")
      .example("Nice — 'pan' is right; the article is 'el'."),
    correction: v
      .string()
      .desc(
        "The reply as a native speaker would put it, in the language being learned. Empty when it needs nothing.",
      )
      .example("Sí, me gusta el pan."),
    used: v
      .array(v.integer({ minimum: 0 }))
      .desc(
        "The numbers of the listed place words the reply uses correctly, the taught word aside.",
      )
      .example([2, 5]),
  }),

  rubric: (language, { question, reply, target, words }) =>
    `You are the silent, impartial judge of one reply in ${language.learning.name}, written by a learner whose own language is ${language.known.name}.

The keeper asked (${language.learning.name}): "${question}"
${target ? `The word the question taught: "${target.trait.TRANSLATED.learning}" (${target.trait.TRANSLATED.known})` : "The question taught no new word."}
The learner replied: "${reply}"

Grade the reply as a whole — does it answer the question in ${language.learning.name}, and does it use the taught word right?
Forgive capitals, punctuation and a missing accent. feedback is one short sentence in ${language.known.name}; correction is the reply as a native speaker would put it, empty when it needs nothing.
List in used the numbers of these place words that the reply uses correctly, the taught word aside:
${numbered(words)}

These examples fix the VERDICT rules:
${EXAMPLES}`,
};
