import { rank } from "./atlas.js";
import { draw, shuffle } from "./random.js";

export const CLOCK = {
  PICK: 7000,
  LISTEN: 9000,
  CLOZE: 10000,
  TYPE: 14000,
  BUILD: 18000,
  CONJUGATE: 14000,
};

// a charm lends the question up, and every later one of its duel, this much more time
export const CHARM = 4000;

// the verdict stays on screen this long before the next question
export const PAUSE = 1100;

// MASTERY is an exact answer given inside the first third of the format's clock: a charm buys
// time, never mastery
export const SWIFT = 1 / 3;

const OPTIONS = 4;

// a slipped letter is forgiven only in a word this long: in a shorter one it makes another word
const SHORTEST = 4;

// a slip is forgiven in a spelled word, never in a conjugation: there one letter is the person
const SLIPS = ["TYPE", "CLOZE"];

const RIGHT = ["MASTERY", "SUCCESS", "NEUTRAL"];

// the ladder is the memory model: a word's retention status decides what a duel may ask it as —
// recognise it, recall it among others, produce it
const RECOGNISE = [
  { format: "PICK", recall: "known" },
  { format: "LISTEN", recall: "known" },
];

const RECALL = [
  { format: "PICK", recall: "learning" },
  { format: "CLOZE", recall: "learning", pick: true },
  { format: "LISTEN", recall: "known" },
];

const PRODUCE = [
  { format: "TYPE", recall: "learning" },
  { format: "CLOZE", recall: "learning", pick: false },
  { format: "BUILD" },
];

const LADDER = {
  UNTOUCHED: RECOGNISE,
  UNKNOWN: RECOGNISE,
  LEARNING: RECALL,
  KNOWN: PRODUCE,
  GRADUATED: PRODUCE,
};

// what typing forgives: case, punctuation and spacing — never the accents
const tidy = (text) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// the accents as well: two answers that fold alike read as the same word
export const fold = (text) => tidy(text.normalize("NFD").replace(/\p{M}/gu, ""));

const uses = (sentence, word) => sentence.tokens.filter((token) => token.literal === word).length;

// the place's sentences that use the word through their tokens; one never annotated uses none
const using = (world, subject) =>
  world.places[subject.place].sentences
    .map((id) => world.words[id])
    .filter((sentence) => sentence.tokens !== null && uses(sentence, subject.word) > 0);

// a cloze blanks the word's one use, so the sentence never shows the answer elsewhere
const clozes = (world, subject) =>
  using(world, subject).filter((sentence) => uses(sentence, subject.word) === 1);

// a sentence of one word repeated has no order to find
const builds = (world, subject) =>
  using(world, subject).filter(
    (sentence) => new Set(sentence.tokens.map((token) => fold(token.form))).size > 1,
  );

const FITS = {
  PICK: () => true,
  LISTEN: (world, subject) => world.words[subject.word].audio !== null,
  CLOZE: (world, subject) => clozes(world, subject).length > 0,
  TYPE: () => true,
  BUILD: (world, subject) => builds(world, subject).length > 0,
};

// what a subject may be asked as: its status's rung, as far as the word's traits allow;
// a conjugation is always conjugated
export const formats = (world, subject) =>
  world.words[subject.word].ontology === "conjugation"
    ? [{ format: "CONJUGATE" }]
    : LADDER[subject.status].filter((rung) => FITS[rung.format](world, subject));

// the word among up to three others of its place, no two reading alike once folded, none blank
const options = (subject, recall, ctx) => {
  const text = (word) => fold(ctx.world.words[word][recall]);
  const shuffled = shuffle(ctx.world.places[subject.place].words, ctx.random);
  const others = new Map(shuffled.map((word) => [text(word), word]));
  others.delete(text(subject.word));
  others.delete("");
  return shuffle([subject.word, ...[...others.values()].slice(0, OPTIONS - 1)], ctx.random);
};

// where each token landed: true where the order reads the sentence's own word at that position
export const placement = (tokens, order) =>
  tokens.map((token, position) => fold(tokens[order[position]].form) === fold(token.form));

// the tokens out of order; a shuffle that reads as the sentence is turned once,
// which a sentence of two different words or more never survives
const scramble = (tokens, random) => {
  const order = shuffle([...tokens.keys()], random);
  return placement(tokens, order).every(Boolean) ? [...order.slice(1), order[0]] : order;
};

// how firmly the learner holds a literal, as the rank of its status: memory never holds a paradigm,
// only its forms, so a paradigm is held as its weakest form
export const grip = (ctx, id) => {
  const word = ctx.world.words[id];
  if (word.ontology !== "conjugation") return rank(ctx.memory[id]);
  return Math.min(...Object.values(word.paradigm).map((form) => rank(ctx.memory[form])));
};

const choose = (subject, rung, ctx) => ({
  recall: rung.recall,
  options: options(subject, rung.recall, ctx),
});

const QUESTIONS = {
  PICK: choose,
  LISTEN: choose,
  CLOZE: (subject, rung, ctx) => {
    const sentence = draw(clozes(ctx.world, subject), ctx.random);
    return {
      recall: rung.recall,
      sentence: sentence.id,
      blank: sentence.tokens.findIndex((token) => token.literal === subject.word),
      options: rung.pick ? options(subject, rung.recall, ctx) : null,
    };
  },
  TYPE: (subject, rung) => ({ recall: rung.recall, options: null }),
  BUILD: (subject, rung, ctx) => {
    const sentence = draw(builds(ctx.world, subject), ctx.random);
    return { sentence: sentence.id, order: scramble(sentence.tokens, ctx.random), options: null };
  },
  // the form the learner holds least is drilled; among forms held alike the dice choose
  CONJUGATE: (subject, rung, ctx) => {
    const paradigm = ctx.world.words[subject.word].paradigm;
    const least = grip(ctx, subject.word);
    const weakest = Object.keys(paradigm).filter(
      (person) => rank(ctx.memory[paradigm[person]]) === least,
    );
    const person = draw(weakest, ctx.random);
    return { person, form: paradigm[person], options: null };
  },
};

const EXPECTED = {
  PICK: (world, question) => world.words[question.word][question.recall],
  LISTEN: (world, question) => world.words[question.word][question.recall],
  CLOZE: (world, question) => world.words[question.sentence].tokens[question.blank].form,
  TYPE: (world, question) => world.words[question.word][question.recall],
  BUILD: (world, question) => world.words[question.sentence].learning,
  CONJUGATE: (world, question) => world.words[question.form].learning,
};

// the right answer, as written
export const expected = (world, question) => EXPECTED[question.format](world, question);

// the learner writes the answer: no options to pick, no tokens to order
export const typed = (question) => question.options === null && question.format !== "BUILD";

// the literal a question grades: a conjugation's form, a built sentence, else the asked word
export const graded = (question) => {
  if (question.format === "CONJUGATE") return question.form;
  if (question.format === "BUILD") return question.sentence;
  return question.word;
};

// subject = { word, place, status }: the word the foe asks, the place it is asked in, the status
// it is asked at. a question carries a hint only once a lantern lights it
export const ask = (subject, ctx) => {
  const rung = draw(formats(ctx.world, subject), ctx.random);
  return {
    format: rung.format,
    word: subject.word,
    ...QUESTIONS[rung.format](subject, rung, ctx),
    asked: ctx.now,
    deadline: ctx.now + CLOCK[rung.format],
  };
};

const swift = (question, ctx) => ctx.now - question.asked <= CLOCK[question.format] * SWIFT;

const common = (one, other) => {
  const at = one.findIndex((letter, index) => letter !== other[index]);
  return at === -1 ? one.length : at;
};

// one letter added, dropped or swapped for another: what is left between the shared head and tail
const slipped = (given, want) => {
  const one = [...given];
  const other = [...want];
  const shorter = Math.min(one.length, other.length);
  const longer = Math.max(one.length, other.length);
  if (other.length < SHORTEST || longer - shorter > 1) return false;
  const head = common(one, other);
  const tail = Math.min(common(one.toReversed(), other.toReversed()), shorter - head);
  return longer - head - tail <= 1;
};

// right but for the accents, or for one slipped letter, is the honest NEUTRAL;
// a word written "mesmo / mesma" is right as written or as either of its forms
const spelling = (question, value, ctx) => {
  const written = expected(ctx.world, question);
  const wants = [written, ...written.split("/")];
  if (wants.some((want) => tidy(value) === tidy(want)))
    return swift(question, ctx) ? "MASTERY" : "SUCCESS";
  if (wants.some((want) => fold(value) === fold(want))) return "NEUTRAL";
  const slips = SLIPS.includes(question.format);
  if (slips && wants.some((want) => slipped(fold(value), fold(want)))) return "NEUTRAL";
  return "MISTAKE";
};

const spelled = (question, value, ctx) => {
  const signal = spelling(question, value, ctx);
  return {
    right: RIGHT.includes(signal),
    signal,
    value,
    reviews: [{ literal: graded(question), signal }],
  };
};

// a wrong pick is a MISTAKE on both words: the one asked, and the one it was taken for
const picked = (question, value, ctx) => {
  if (value !== question.word)
    return {
      right: false,
      signal: "MISTAKE",
      value,
      reviews: [
        { literal: question.word, signal: "MISTAKE" },
        { literal: value, signal: "MISTAKE" },
      ],
    };
  const signal = swift(question, ctx) ? "MASTERY" : "SUCCESS";
  return { right: true, signal, value, reviews: [{ literal: question.word, signal }] };
};

// a built sentence grades the sentence, then each of its words the atlas knows by where it landed
const ordered = (question, value, ctx) => {
  const tokens = ctx.world.words[question.sentence].tokens;
  const placed = placement(tokens, value);
  const right = placed.every(Boolean);
  const signal = right ? (swift(question, ctx) ? "MASTERY" : "SUCCESS") : "MISTAKE";
  const literals = [...new Set(tokens.map((token) => token.literal))].filter(
    (literal) => literal !== null && literal in ctx.world.words,
  );
  const landed = (literal) =>
    tokens.every((token, position) => token.literal !== literal || placed[position]);
  const words = literals.map((literal) => ({
    literal,
    signal: landed(literal) ? "SUCCESS" : "MISTAKE",
  }));
  return { right, signal, value, reviews: [{ literal: question.sentence, signal }, ...words] };
};

const blank = (value) =>
  value === null || (Array.isArray(value) ? value.length === 0 : fold(value) === "");

const grade = (question, value, ctx) => {
  if (blank(value))
    return {
      right: false,
      signal: "FAILURE",
      value,
      reviews: [{ literal: graded(question), signal: "FAILURE" }],
    };
  if (question.format === "BUILD") return ordered(question, value, ctx);
  if (question.options !== null) return picked(question, value, ctx);
  return spelled(question, value, ctx);
};

// a question peeked at — lit by a lantern, or asked again after its answer was shown (seen) —
// reviews a right answer NEUTRAL, as the dojo softens a peek
const soften = (signal) => (RIGHT.includes(signal) ? "NEUTRAL" : signal);

// value: the picked word id, the typed text, the built token order — null when the clock ran out
export const judge = (question, value, ctx) => {
  const verdict = grade(question, value, ctx);
  if (!("hint" in question) && !question.seen) return verdict;
  return {
    ...verdict,
    signal: soften(verdict.signal),
    reviews: verdict.reviews.map((review) => ({ ...review, signal: soften(review.signal) })),
  };
};
