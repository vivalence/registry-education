import { mime, v } from "@vivalence/typology";

export { harness } from "./harness.js";
export { tools } from "./tools/index.js";

export const manifest = {
  type: "game",
  slug: "cocina",
  name: "Cocina",
  description: "Language as the controller — a rail of tickets; the chef calls the steps in Spanish, the learner obeys, then runs the pass. The model converses, the tools cook and grade the lexemes.",
  version: "0.2.0",
  traits: ["VIEWABLE", "HARNESSED", "TOOLING", "CONVERSATIONAL"],
};

const LEXEME = v.object({
  slug: v.string().desc('The lexeme. Example: "cebolla.noun"'),
  tier: v.integer({ minimum: 0 }).desc("Its tier. Example: 0"),
  surfaces: v.array(v.string()).desc('Its Spanish surfaces. Example: ["la cebolla", "cebolla"]'),
  status: v.string().desc('Its retention status. Example: "KNOWN"'),
});

export const buffer = v
  .buffer({
    data: {
      tier: v.integer({ minimum: 0 }).default(0).desc("The open tier. Example: 1"),
      tempo: v.number().default(1).desc("The tempo dial. Example: 1.5"),
      phase: v.enum(["OBEY", "COMMAND"]).default("OBEY").desc('Who calls the steps. Example: "OBEY"'),
      history: v.array(v.boolean()).default([]).desc("The learner's commands, hit or miss. Example: [true, false]"),
      reactions: v.array(v.boolean()).default([]).desc("The learner's reactions to called steps. Example: [true, true, true]"),
      spoken: v.union([v.record(v.string(), v.any()), v.null()]).default(null).desc('The step awaiting a reaction. Example: { command: { prep: "cortar.imperative", ingredient: "cebolla.noun", count: 1 }, slugs: ["cortar.imperative", "cebolla.noun"] }'),
      said: v.string().default("").desc('The last Spanish on the rail. Example: "corta la cebolla"'),
      lexicon: v.array(LEXEME).default([]).desc("The open tiers' lexemes with retention."),
      world: v.record(v.string(), v.any()).optional().desc("The kitchen: tickets, cook, beat, served, lost."),
    },
  })
  .desc("Cocina: a kitchen driven by Spanish. OBEY until three clean reactions, then COMMAND; the model converses, the tools cook and grade.");

export const views = [
  { slug: "cocina", mount: "buffer/Cocina.svelte", mime: mime.dom.svelte },
  { slug: "cocina", mount: "buffer/cocina.jsx", mime: mime.tty.solid },
];
