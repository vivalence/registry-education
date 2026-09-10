const lexeme = (slug, ...surfaces) => ({ slug, surfaces });

export const direction = [
  lexeme("arriba.adverb", "arriba", "hacia arriba"),
  lexeme("abajo.adverb", "abajo", "hacia abajo"),
  lexeme("izquierda.noun", "a la izquierda", "izquierda"),
  lexeme("derecha.noun", "a la derecha", "derecha"),
];

export const move = [
  lexeme("subir.imperative", "sube"),
  lexeme("bajar.imperative", "baja"),
  lexeme("ir.imperative", "ve"),
  lexeme("girar.imperative", "gira"),
];

export const stop = [lexeme("parar.imperative", "para", "alto", "quieto")];

export const numeral = [
  lexeme("uno.numeral", "un", "uno", "una"),
  lexeme("dos.numeral", "dos"),
  lexeme("tres.numeral", "tres"),
  lexeme("cuatro.numeral", "cuatro"),
  lexeme("cinco.numeral", "cinco"),
];

export const article = [lexeme("el.determiner", "el"), lexeme("la.determiner", "la")];

export const color = [
  lexeme("rojo.adjective", "rojo", "roja"),
  lexeme("azul.adjective", "azul"),
  lexeme("verde.adjective", "verde"),
];

export const unit = [
  lexeme("soldado.noun", "soldado"),
  lexeme("camión.noun", "camión"),
  lexeme("explorador.noun", "explorador"),
];

export const prep = [
  lexeme("cortar.imperative", "corta"),
  lexeme("poner.imperative", "pon"),
  lexeme("freír.imperative", "fríe"),
  lexeme("servir.imperative", "sirve"),
];

export const ingredient = [
  lexeme("cebolla.noun", "la cebolla", "cebolla"),
  lexeme("pan.noun", "el pan", "pan"),
  lexeme("huevo.noun", "el huevo", "huevo", "huevos"),
  lexeme("tomate.noun", "el tomate", "tomate"),
  lexeme("queso.noun", "el queso", "queso"),
];

export const quantity = [...numeral, lexeme("medio.adjective", "medio", "media")];

export const without = [lexeme("sin.adposition", "sin")];

export const negation = [lexeme("no.adverb", "no")];

export const all = [direction, move, stop, numeral, article, color, unit, prep, ingredient, quantity, without, negation].flat();

export const slugs = [...new Set(all.map((lexeme) => lexeme.slug))];

const BY_SLUG = Object.fromEntries(all.map((lexeme) => [lexeme.slug, lexeme]));

export const lexemeOf = (slug) => {
  if (!Object.hasOwn(BY_SLUG, slug)) throw new Error(`[mando] not a lexeme: ${slug} · ${slugs.join(" · ")}`);
  return BY_SLUG[slug];
};

export const face = (slug) => lexemeOf(slug).surfaces[0];
