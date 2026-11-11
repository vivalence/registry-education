import { DISTRICTS, PLACES, place, rank, unlocked } from "./atlas.js";
import { MAPS } from "./maps/index.js";
import { draw, seeded, shuffle } from "./random.js";
import { has, held, read } from "./run.js";
import { DIRECTIONS, among, apart, key, neighbour, same, tile } from "./tiles.js";

// the valley as one run sees it: the authored maps, the learner's words laid over them as stones,
// a keeper's errand strewn as items, the tall grass where spirits rise. never stored — one seed
// over one atlas charts the same world every time

// how far a spirit sees, in tiles as the crow flies; so a map's spirits rise farther off than that
export const SIGHT = 5;

// without the lantern a dark map is lit this far round where it is entered, and no farther
export const LIGHT = 2.5;

// a map shows at most this many spirits at once; the rest of its haunting waits for a later entry
const HAUNTING = 8;

// a map's spirits take their first steps one after another, this many ms apart
const STAGGER = 150;

// the keeper's errand: two or three of a district's nouns lie about, one asked for, the rest decoys
const ERRAND = { fewest: 2, most: 3 };

const cells = (map) => map.rows.flatMap((row, y) => [...row].map((_, x) => ({ x, y })));

// within so many tiles as the crow flies: how far a spirit sees, how far a light reaches
export const near = (one, other, tiles) =>
  (one.x - other.x) ** 2 + (one.y - other.y) ** 2 <= tiles ** 2;

// walking distance from the given tiles to every tile a walk reaches over open ground, by key
export const distances = (from, open) => {
  const far = new Map(from.map((cell) => [key(cell), 0]));
  const queue = [...from];
  for (const cell of queue)
    for (const direction of Object.keys(DIRECTIONS)) {
      const next = neighbour(cell, direction);
      if (far.has(key(next)) || !open(next)) continue;
      far.set(key(next), far.get(key(cell)) + 1);
      queue.push(next);
    }
  return far;
};

// where a map is entered: an outdoor map names its entry; an interior has one way in, the spawn its
// door lands on
export const entry = (map) => map.spawns.entry ?? Object.values(map.spawns)[0];

// every tile a learner walks to from a map's arrivals, round what stands there and what is laid
const reach = (map, laid) => {
  const blocked = new Set([...map.fixtures, ...map.chests, ...map.pots, ...laid].map(key));
  return distances(
    Object.values(map.spawns),
    (cell) => tile(map, cell).walk && !blocked.has(key(cell)),
  );
};

// slots for a map's stones and items, nearest its entry first: open ground that is not tall grass,
// two tiles or more from every arrival, portal and thing standing there, spaced so no two touch
// while there is room, each laid only where it walls no tile off. a map too small fails loudly
const lay = (map, count, random) => {
  const bare = reach(map, []);
  const kept = [
    ...map.fixtures,
    ...map.chests,
    ...map.pots,
    ...map.portals,
    ...Object.values(map.spawns),
  ];
  const open = shuffle(
    cells(map).filter(
      (cell) =>
        bare.has(key(cell)) &&
        !tile(map, cell).wild &&
        kept.every((thing) => apart(thing, cell) >= 2),
    ),
    random,
  );
  const fill = (spaced) => (laid, cell) => {
    if (laid.length === count || among(laid, cell)) return laid;
    if (spaced && laid.some((other) => apart(other, cell) < 2)) return laid;
    const more = [...laid, cell];
    return reach(map, more).size === bare.size - more.length ? more : laid;
  };
  const laid = open.reduce(fill(false), open.reduce(fill(true), []));
  if (laid.length < count)
    throw new Error(
      `wakaru: ${map.id} has room for ${laid.length} of its ${count} stones and items`,
    );
  const walk = distances([entry(map)], (cell) => bare.has(key(cell)));
  return laid.toSorted((one, other) => walk.get(key(one)) - walk.get(key(other)));
};

// the keeper's errand: two or three of the district's own nouns, the first the one the keeper
// wants — never a noun another place holds too, whose item, picked up in one, would be gone from both
const strew = (homed, atlas, random) => {
  const elsewhere = new Set(
    Object.entries(atlas.places)
      .filter(([id]) => id !== homed.id)
      .flatMap(([, held]) => held.words),
  );
  const nouns = homed.words.filter(
    (word) => atlas.words[word].slug.includes(".noun") && !elsewhere.has(word),
  );
  const count = ERRAND.fewest + Math.floor(random() * (ERRAND.most - ERRAND.fewest + 1));
  return shuffle(nouns, random).slice(0, count);
};

// where a spirit may rise: tall grass out of doors; indoors, where a place houses its words, any
// floor — only ground the learner can walk to, never a portal, never where anything stands or
// lies
const rising = (map, laid) => {
  const reached = reach(map, laid);
  const housed = map.kind === "indoor" && map.place !== null;
  return cells(map).filter(
    (cell) =>
      reached.has(key(cell)) && (tile(map, cell).wild || housed) && !among(map.portals, cell),
  );
};

// a map as the run sees it: its chests and pots named, and where it is a place's home, the place's
// words laid as stones nearest the entry and a district's errand strewn as items past them
const furnish = (seed, map, homed, atlas) => {
  const random = seeded(seed, map.id);
  const words = homed ? homed.words : [];
  const errand = homed && !place(homed.id).opens ? strew(homed, atlas, random) : [];
  const slots = lay(map, words.length + errand.length, random);
  const stones = words.map((word, index) => ({ ...slots[index], word }));
  const items = errand.map((word, index) => ({ ...slots[words.length + index], word }));
  return {
    ...map,
    chests: map.chests.map((chest, index) => ({ id: `${map.id}.chest.${index}`, ...chest })),
    pots: map.pots.map((pot, index) => ({ id: `${map.id}.pot.${index}`, ...pot })),
    stones,
    items,
    spawnPoints: rising(map, [...stones, ...items]),
  };
};

// the world: every map, and every place with words in the order they open. a place's home is the
// map that shares its id — a district's outdoor map, a wing's interior; its signature is its most
// frequent word. a place with no words is absent and its maps stay fallow
export const chart = (seed, atlas, maps = MAPS) => {
  const syllabus = (one, other) =>
    atlas.words[one].rank - atlas.words[other].rank || (one < other ? -1 : 1);
  const charted = PLACES.filter(({ id }) => atlas.places[id] && atlas.places[id].words.length > 0);
  const places = Object.fromEntries(
    charted.map((authored) => {
      if (!maps[authored.id]) throw new Error(`wakaru: ${authored.id} has words but no map`);
      const words = [...atlas.places[authored.id].words].sort(syllabus);
      return [
        authored.id,
        {
          id: authored.id,
          name: authored.name,
          biome: authored.biome,
          words,
          sentences: [...atlas.places[authored.id].sentences].sort(),
          maps: Object.values(maps)
            .filter((map) => map.place === authored.id)
            .map((map) => map.id),
          home: authored.id,
          signature: words[0],
        },
      ];
    }),
  );
  return {
    seed,
    maps: Object.fromEntries(
      Object.values(maps).map((map) => [map.id, furnish(seed, map, places[map.id], atlas)]),
    ),
    places,
    words: atlas.words,
    order: charted.map(({ id }) => id),
  };
};

// a fixture leaves once its fall is flagged: a warden at its place's restoring, the peak at the
// crown
const FALLEN = {
  warden: (map) => `restored:${map.place}`,
  summit: () => "crowned",
};

// who stands on a map now
export const standing = (world, id, run) => {
  const map = world.maps[id];
  return map.fixtures.filter(
    (fixture) => !(fixture.kind in FALLEN && has(run, FALLEN[fixture.kind](map))),
  );
};

// the errand's items still where they were strewn; one picked up is gone for good
export const lying = (world, id, run) =>
  world.maps[id].items.filter((item) => read(run, `gained:word:${item.word}`) === 0);

// what a walk cannot cross on a map now: a portal leaves the map, and a stone, someone standing, a
// chest or a pot answers a step instead of letting it through
export const blocking = (world, id, run) => {
  const map = world.maps[id];
  return [...map.portals, ...map.stones, ...standing(world, id, run), ...map.chests, ...map.pots];
};

// the items a place strews, the one its keeper wants first; a wing strews none
export const strewn = (world, place) =>
  world.maps[world.places[place].home].items.map((item) => item.word);

// why a map is shut to the learner, or null when it is open: a place with no words lies fallow, a
// place not yet opened is locked; a map of no place — the square, the shop, the summit — is open
export const sealed = (world, run, id) => {
  const { place: own } = world.maps[id];
  if (own === null) return null;
  if (!Object.hasOwn(world.places, own)) return "fallow";
  return unlocked(world, run).includes(own) ? null : "locked";
};

// a dark map shows the learner only the ground round where it is entered, unless they hold the
// lantern
export const lit = (world, run, cell) => {
  const map = world.maps[run.pose.map];
  return !map.dark || held(run, "lantern") > 0 || near(cell, entry(map), LIGHT);
};

// the share of the districts standing restored; the summit wakes at all of them
export const restoration = (world, run) => {
  const districts = world.order.filter((id) => !place(id).opens);
  if (districts.length === 0) return 0;
  return districts.filter((id) => has(run, `restored:${id}`)).length / districts.length;
};

// a fallen learner wakes where the way back is short: in a district or a house of it, at the
// district's entry; on the summit, at the clock hill's; anywhere else at the square's start
export const respawn = (world, run) => {
  const map = world.maps[run.pose.map];
  const foot = map.id === "summit" ? "clockhill" : map.place;
  if (DISTRICTS.some((district) => district.id === foot))
    return { map: foot, ...world.maps[foot].spawns.entry };
  return { map: "square", ...world.maps.square.spawns.start };
};

// the spirits a map raises: each word homed on it that is due, or read off its stone and never yet
// reviewed — at most HAUNTING, each on a spawn point beyond the learner's sight, so neither a map
// walked into nor a run reloaded opens on a duel
const rise = (world, run, ctx) => {
  const map = world.maps[run.pose.map];
  const haunting = map.stones
    .map((stone) => stone.word)
    .filter(
      (word) => ctx.due.includes(word) || (has(run, `met:${word}`) && rank(ctx.memory[word]) === 0),
    )
    .slice(0, HAUNTING);
  const points = shuffle(
    map.spawnPoints.filter((point) => !near(point, run.pose, SIGHT)),
    ctx.random,
  );
  return haunting.slice(0, points.length).map((word, index) => ({
    word,
    x: points[index].x,
    y: points[index].y,
    facing: draw(Object.keys(DIRECTIONS), ctx.random),
    home: { x: points[index].x, y: points[index].y },
    mode: "roam",
    next: ctx.now + (index + 1) * STAGGER,
  }));
};

// a learner who arrives, or comes free of a duel, a game or a talk, has this long, in ms, before a
// spirit may spot them: the valley lets them look about first
export const CALM = 4000;

// the scene is the part of a map that moves, raised afresh on every entry, opening on the calm
export const enter = (world, run, ctx) => ({
  spirits: rise(world, run, ctx),
  duel: null,
  dialogue: null,
  game: null,
  calm: ctx.now + CALM,
});

// a duel, a game or a talk holds the learner: the walk waits on it, and so do the spirits
export const busy = (scene) =>
  scene.duel !== null || scene.dialogue !== null || scene.game !== null;
