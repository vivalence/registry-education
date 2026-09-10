import * as es from "./mando/lexicon.js";

export const tiers = [
  [...es.prep, ...es.ingredient].map((lexeme) => lexeme.slug),
  es.quantity.slice(0, 2).map((lexeme) => lexeme.slug),
  [...es.without, ...es.negation].map((lexeme) => lexeme.slug),
];
