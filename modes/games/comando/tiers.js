import * as es from "./mando/lexicon.js";

export const tiers = [
  [...es.direction, ...es.move, ...es.stop].map((lexeme) => lexeme.slug),
  es.numeral.slice(0, 3).map((lexeme) => lexeme.slug),
  [...es.article, ...es.unit, ...es.color].map((lexeme) => lexeme.slug),
];
