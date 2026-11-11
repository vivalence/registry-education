import { chart } from "../engine/world.js";

// the keeper's routes wait on the cortex, which takes far longer than a lookup
const CORTEX = 30000;

export const begin = (buffer) => buffer.mode.connection.call("/begin", { buffer: buffer.id });

export const keep = (buffer, run) =>
  buffer.mode.connection.call("/keep", { buffer: buffer.id, run });

export const language = (buffer) => buffer.mode.daemon.connection.call("/language", {});

// a place's spirits are its due words; a map in no place (the square, the shop) asks for null: the
// words due anywhere, the shrine's round
export const spirits = (buffer, place) => buffer.mode.connection.call("/spirits", { place });

// a place's due words, fetched again, replace what the screen held for that place; a fetch for no
// place spans every place, so it only adds. a due word no place holds has no stone in the valley:
// it can neither walk as a spirit nor be asked at the shrine, so it never enters
export const gather = (due, world, place, fetched) => {
  const own = Object.hasOwn(world.places, place) ? world.places[place].words : [];
  const placed = new Set(Object.values(world.places).flatMap((entry) => entry.words));
  const homed = fetched.filter((word) => placed.has(word));
  return [...new Set([...due.filter((word) => !own.includes(word)), ...homed])];
};

// everything the first beat reads: the world charted from the atlas, the memory over its words,
// the due words of the place the learner wakes in (else its spirits wait for the next arrival), and
// the language pair the panels label and voice their words with
export const load = async (buffer, run) => {
  const atlas = await buffer.mode.connection.call("/atlas", {});
  const world = chart(run.seed, atlas);
  const { place } = world.maps[run.pose.map];
  const [memory, fetched, pair] = await Promise.all([
    buffer.mode.connection.call("/memory", { literals: Object.keys(atlas.words) }),
    spirits(buffer, place),
    language(buffer),
  ]);
  return { world, memory, due: gather([], world, place, fetched), language: pair };
};

// the game keeps playing when a review is lost: the word's memory just stays as it was
export const review = (buffer, { literal, signal }) =>
  buffer.mode.daemon.connection
    .call("/review/literal", { signal, scope: { literal } })
    .then((note) => {
      if (note.status === "bounce") throw new Error(note.message);
      return note.trait.RETAINED.status;
    })
    .catch((error) => {
      console.warn("[wakaru] /review/literal failed", literal, signal, error);
      return null;
    });

// a streak counts the learner's own days, not the daemon's
export const daily = (buffer) =>
  buffer.mode.connection.call("/daily", { zone: Intl.DateTimeFormat().resolvedOptions().timeZone });

export const speak = (buffer, place) =>
  buffer.mode.connection.call("/speak", { buffer: buffer.id, place }, { timeout: CORTEX });

export const listen = (buffer, place) => buffer.mode.connection.call("/listen", { place });

export const ask = (buffer, place) =>
  buffer.mode.connection.call("/ask", { buffer: buffer.id, place }, { timeout: CORTEX });

export const judge = (buffer, { place, question, reply, target }) =>
  buffer.mode.connection.call(
    "/judge",
    { buffer: buffer.id, place, question, reply, target },
    { timeout: CORTEX },
  );

// a word's VOCALIZED path names one of the files its own daemon serves
export const fileOf = (files, buffer, path) =>
  files.find((file) => file.mode.daemon === buffer.mode.daemon && file.path === path);

// one element for every word: a phone plays sound only on an element a gesture once started,
// so the first tap unlocks it for the clocked duels that follow
export const voice = () => {
  const element = new Audio();
  return (file) => {
    element.src = file.url;
    element.play().catch((error) => console.warn("[wakaru] audio did not play", file.path, error));
  };
};
