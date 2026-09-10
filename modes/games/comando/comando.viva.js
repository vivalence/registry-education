import { mime, v } from "@vivalence/typology";

export { harness } from "./harness.js";
export { tools } from "./tools/index.js";

export const manifest = {
  type: "game",
  slug: "comando",
  name: "Comando",
  description: "Language as the controller — a board of units, goals and hazards; the commander speaks Spanish, the learner obeys, then commands. The model converses, the tools move the board and grade the lexemes.",
  version: "0.2.0",
  traits: ["VIEWABLE", "HARNESSED", "TOOLING", "CONVERSATIONAL"],
};

const LEXEME = v.object({
  slug: v.string().desc('The lexeme. Example: "izquierda.noun"'),
  tier: v.integer({ minimum: 0 }).desc("Its tier. Example: 0"),
  surfaces: v.array(v.string()).desc('Its Spanish surfaces. Example: ["a la izquierda", "izquierda"]'),
  status: v.string().desc('Its retention status. Example: "KNOWN"'),
});

export const buffer = v
  .buffer({
    data: {
      tier: v.integer({ minimum: 0 }).default(0).desc("The open tier. Example: 1"),
      tempo: v.number().default(1).desc("The tempo dial. Example: 1.5"),
      phase: v.enum(["OBEY", "COMMAND"]).default("OBEY").desc('Who commands. Example: "OBEY"'),
      history: v.array(v.boolean()).default([]).desc("The learner's commands, hit or miss. Example: [true, false]"),
      reactions: v.array(v.boolean()).default([]).desc("The learner's reactions to orders. Example: [true, true, true]"),
      spoken: v.union([v.record(v.string(), v.any()), v.null()]).default(null).desc('The order awaiting a reaction. Example: { command: { kind: "move", direction: "arriba.adverb", count: 1 }, slugs: ["arriba.adverb"] }'),
      said: v.string().default("").desc('The last Spanish on the board. Example: "a la izquierda"'),
      lexicon: v.array(LEXEME).default([]).desc("The open tiers' lexemes with retention."),
      world: v.record(v.string(), v.any()).optional().desc("The board: units, goals, hazards, beat, score, lost."),
    },
  })
  .desc("Comando: a board driven by Spanish. OBEY until three clean reactions, then COMMAND; the model converses, the tools move and grade.");

export const views = [
  { slug: "comando", mount: "buffer/Comando.svelte", mime: mime.dom.svelte },
  { slug: "comando", mount: "buffer/comando.jsx", mime: mime.tty.solid },
];
