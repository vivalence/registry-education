// how a word reads on the screen

const ORDINALS = { first: "1st", second: "2nd", third: "3rd" };

// a paradigm's cell named alike in every language, however the corpus spells its key:
// firstSingular and first.singular are both the 1st singular
export const person = (key) => {
  const [ordinal, number] = key.split(/[^a-zA-Z]+|(?=[A-Z])/).map((part) => part.toLowerCase());
  return `${ORDINALS[ordinal]} ${number}`;
};

// a word's two sides, as said and as meant. a paradigm reads on neither — its atlas entry is its
// forms — so it reads as its verb, meant in its tense
export const said = (world, id) => {
  const word = world.words[id];
  if (word.ontology !== "conjugation") return { learning: word.learning, known: word.known };
  const verb = world.words[word.infinitive];
  return { learning: verb.learning, known: `${verb.known} · ${word.tense.replaceAll(".", " ")}` };
};
