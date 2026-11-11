import { draw, mulberry, shuffle } from "./random.js";
import { PLACES, place } from "./atlas.js";
import { has, read } from "./run.js";

export const WIDTH = 13;
export const HEIGHT = 9;

export const DIRECTIONS = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

export const OPPOSITE = { north: "south", south: "north", west: "east", east: "west" };

const GROUND = { "#": "wall", ".": "floor", "~": "water", T: "tree", o: "rock", "=": "exit" };

// a room opens onto its neighbour through the middle of the edge they share
const DOORS = {
  north: { x: (WIDTH - 1) / 2, y: 0 },
  south: { x: (WIDTH - 1) / 2, y: HEIGHT - 1 },
  west: { x: 0, y: (HEIGHT - 1) / 2 },
  east: { x: WIDTH - 1, y: (HEIGHT - 1) / 2 },
};

// a district is two to six rooms of about six words each
const ROOMS = { fewest: 2, most: 6 };
const STONES = 6;

// the keeper's errand: two or three of a district's nouns lie about, one asked for, two decoys
const ITEMS = { fewest: 2, most: 3 };

// a room shows at most this many spirits at once; the rest of its haunting waits for a later entry
const SPAWNS = 6;

// a spirit smells the learner this many tiles off and hunts; farther off it drifts, now and then
export const SCENT = 3;
const RESTLESS = 0.4;

// floor a room keeps open beyond all that stands in it: a crowded room sheds obstacles first
const ROOMY = 12;

// what each biome strews over a room's floor before anyone stands there
const STREWN = {
  market: { pool: 0, grove: 1, rock: 5 },
  hearth: { pool: 0, grove: 3, rock: 2 },
  stone: { pool: 1, grove: 0, rock: 6 },
  brass: { pool: 0, grove: 1, rock: 5 },
  forest: { pool: 1, grove: 6, rock: 1 },
  water: { pool: 3, grove: 1, rock: 1 },
  chalk: { pool: 0, grove: 2, rock: 3 },
  sand: { pool: 0, grove: 0, rock: 4 },
  paper: { pool: 0, grove: 0, rock: 6 },
  ink: { pool: 3, grove: 0, rock: 2 },
  ember: { pool: 2, grove: 0, rock: 4 },
};

// an obstacle: the tile it marks and the shapes it takes, as offsets from where it is set down
const OBSTACLES = {
  pool: {
    mark: "~",
    shapes: [
      [
        [0, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 1],
      ],
    ],
  },
  grove: {
    mark: "T",
    shapes: [
      [[0, 0]],
      [
        [0, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [0, 1],
      ],
    ],
  },
  rock: { mark: "o", shapes: [[[0, 0]]] },
};

// the valley's heart, the same square every run: vendor, shrine, the sign to every district, summit
const HUB = {
  id: "hub",
  place: null,
  exits: {},
  tiles: [
    "#############",
    "#T.........T#",
    "#...........#",
    "#...........#",
    "#~~.......~~#",
    "#~~.......~~#",
    "#...........#",
    "#T.........T#",
    "#############",
  ],
  stones: [],
  items: [],
  keeper: null,
  warden: null,
  vendor: { x: 3, y: 3 },
  shrine: { x: 9, y: 3 },
  sign: { x: 8, y: 6 },
  summit: { x: 6, y: 1 },
  spawns: [],
  entry: { x: 6, y: 6 },
};

export const GRID = Array.from({ length: WIDTH * HEIGHT }, (_, index) => ({
  x: index % WIDTH,
  y: Math.floor(index / WIDTH),
}));

const inner = ({ x, y }) => x > 0 && y > 0 && x < WIDTH - 1 && y < HEIGHT - 1;

const INTERIOR = GRID.filter(inner);

export const within = ({ x, y }) => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;

export const same = (one, other) => one.x === other.x && one.y === other.y;

// tiles between two cells, walking along the grid
export const apart = (one, other) => Math.abs(one.x - other.x) + Math.abs(one.y - other.y);

export const key = ({ x, y }) => `${x}:${y}`;

const among = (cells, cell) => cells.some((other) => same(other, cell));

const spot = ({ x, y }) => ({ x, y });

export const neighbour = (cell, direction) => ({
  x: cell.x + DIRECTIONS[direction].x,
  y: cell.y + DIRECTIONS[direction].y,
});

// the tile just inside an edge's opening: where the learner lands coming through it
export const landing = (direction) => neighbour(DOORS[direction], OPPOSITE[direction]);

export const terrain = (world, room, cell) =>
  within(cell) ? GROUND[world.rooms[room].tiles[cell.y][cell.x]] : "wall";

// where the learner arrives — the entry and the landing of every opening — kept clear of everything
const arrivals = (room) => {
  const landings = Object.keys(room.exits)
    .filter((direction) => room.exits[direction])
    .map(landing);
  return [room.entry, ...landings.filter((cell) => !same(cell, room.entry))];
};

// each district and room throws its own dice, so one district's words never move another's walls
const stream = (seed, name) =>
  mulberry(
    [...name].reduce(
      (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619),
      seed ^ 2166136261,
    ),
  );

// bare walls round a floor, opened in the middle of each edge with a neighbour behind it
const frame = (exits) =>
  Array.from({ length: HEIGHT }, (_, y) =>
    Array.from({ length: WIDTH }, (_, x) => {
      if (
        Object.keys(exits).some((direction) => exits[direction] && same(DOORS[direction], { x, y }))
      )
        return "=";
      return inner({ x, y }) ? "." : "#";
    }).join(""),
  );

const mark = (tiles, cells, tile) =>
  tiles.map((row, y) => [...row].map((was, x) => (among(cells, { x, y }) ? tile : was)).join(""));

// the learner stands on floor and passes through an opening; anything else turns them back
const passable = (tiles, cell) => within(cell) && [".", "="].includes(tiles[cell.y][cell.x]);

// walking distance from one tile to every tile reachable from it
const reach = (tiles, from, blocked) => {
  const far = new Map([[key(from), 0]]);
  const queue = [from];
  for (const cell of queue)
    for (const direction of Object.keys(DIRECTIONS)) {
      const next = neighbour(cell, direction);
      if (far.has(key(next)) || !passable(tiles, next) || among(blocked, next)) continue;
      far.set(key(next), far.get(key(cell)) + 1);
      queue.push(next);
    }
  return far;
};

// whole: no tile the learner could stand on is walled off from the entry
const whole = (tiles, entry, blocked) => {
  const open = GRID.filter((cell) => passable(tiles, cell) && !among(blocked, cell));
  return reach(tiles, entry, blocked).size === open.length;
};

// the biome's obstacles, each set down only where it walls nothing off, while floor is to spare
const strew = (spec, keep, spare, random) =>
  Object.entries(STREWN[spec.biome])
    .flatMap(([kind, count]) => Array.from({ length: count }, () => OBSTACLES[kind]))
    .reduce(
      (grown, obstacle) => {
        const shape = draw(obstacle.shapes, random);
        if (shape.length > grown.spare) return grown;
        const free = (cell) =>
          inner(cell) && grown.tiles[cell.y][cell.x] === "." && !among(keep, cell);
        const cells = shuffle(INTERIOR, random)
          .map((anchor) => shape.map(([x, y]) => ({ x: anchor.x + x, y: anchor.y + y })))
          .find(
            (cells) =>
              cells.every(free) && whole(mark(grown.tiles, cells, obstacle.mark), spec.entry, []),
          );
        if (!cells) return grown;
        return {
          tiles: mark(grown.tiles, cells, obstacle.mark),
          spare: grown.spare - cells.length,
        };
      },
      { tiles: frame(spec.exits), spare },
    ).tiles;

// a fixture is posted as near as it can be to a wanted walk from the entry, never walling a tile off
const post = (site, blocked, want, random) => {
  const off = (cell) => Math.abs(site.far.get(key(cell)) - want);
  return spot(
    shuffle(INTERIOR, random)
      .filter((cell) => site.far.has(key(cell)) && !among([...site.keep, ...blocked], cell))
      .sort((one, other) => off(one) - off(other))
      .find((cell) => whole(site.tiles, site.entry, [...blocked, cell])),
  );
};

// one room: the biome's obstacles first, then the sign and keeper by the entry or the warden at the
// far end, then the stones, the items and the spawn points, each on a floor tile of its own
const furnish = (spec, random) => {
  const keep = arrivals(spec);
  const spawning = Math.min(SPAWNS, spec.words.length);
  const needs = spec.words.length + spec.items.length + spawning;
  const standing = (spec.first ? 2 : 0) + (spec.last ? 1 : 0);
  const tiles = strew(spec, keep, INTERIOR.length - keep.length - standing - needs - ROOMY, random);
  const far = reach(tiles, spec.entry, []);
  const site = { tiles, entry: spec.entry, far, keep };
  const sign = spec.first ? post(site, [], 1, random) : null;
  const keeper = spec.first ? post(site, [sign], 3, random) : null;
  const warden = spec.last ? post(site, [], Math.max(...far.values()), random) : null;
  const taken = [...keep, ...[sign, keeper, warden].filter(Boolean)];
  const free = shuffle(
    INTERIOR.filter((cell) => far.has(key(cell)) && !among(taken, cell)),
    random,
  );
  if (free.length < needs)
    throw new Error(`wakaru: ${spec.id} has floor for ${free.length} of its ${needs} things`);
  const rest = free.slice(spec.words.length + spec.items.length);
  const quiet = (cell) => keep.every((kept) => apart(kept, cell) > SCENT);
  return {
    id: spec.id,
    place: spec.place,
    exits: spec.exits,
    tiles,
    stones: spec.words.map((word, index) => ({ word, ...spot(free[index]) })),
    items: spec.items.map((word, index) => ({ word, ...spot(free[spec.words.length + index]) })),
    keeper,
    warden,
    vendor: null,
    shrine: null,
    sign,
    summit: null,
    spawns: [...rest.filter(quiet), ...rest.filter((cell) => !quiet(cell))]
      .slice(0, spawning)
      .map(spot),
    entry: spec.entry,
  };
};

// a district's rooms walk out over a grid, each beside the one before, never onto an earlier one;
// the walk's turns are the openings between them
const stroll = (count, random) => {
  const cells = [{ x: 0, y: 0 }];
  const turns = [];
  while (cells.length < count) {
    const last = cells.at(-1);
    const turn = draw(
      Object.keys(DIRECTIONS).filter((direction) => !among(cells, neighbour(last, direction))),
      random,
    );
    cells.push(neighbour(last, turn));
    turns.push(turn);
  }
  return turns;
};

// a room opens onto the room before it and the room after it, nowhere else
const doors = (ids, turns, index) =>
  Object.fromEntries(
    Object.keys(DIRECTIONS).map((direction) => {
      if (direction === turns[index]) return [direction, ids[index + 1]];
      if (direction === OPPOSITE[turns[index - 1]]) return [direction, ids[index - 1]];
      return [direction, null];
    }),
  );

// even runs of the words in syllabus order, the entry's first
const deal = (words, count) =>
  Array.from({ length: count }, (_, index) =>
    words.slice(
      Math.floor((index * words.length) / count),
      Math.floor(((index + 1) * words.length) / count),
    ),
  );

// a district: the words it homes dealt over its rooms, the most frequent in the entry beside the
// keeper, and two or three of its nouns strewn past the entry for the keeper's errand. a wing's
// keeper sends no errand, so a wing strews nothing
const district = (seed, authored, atlas, own) => {
  const random = stream(seed, authored.id);
  const count = Math.min(ROOMS.most, Math.max(ROOMS.fewest, Math.ceil(own.length / STONES)));
  const ids = Array.from({ length: count }, (_, index) => `${authored.id}.${index}`);
  const turns = stroll(count, random);
  const nouns = shuffle(
    own.filter((word) => atlas.words[word].slug.includes(".noun")),
    random,
  );
  const errand = authored.opens
    ? []
    : nouns.slice(0, ITEMS.fewest + Math.floor(random() * (ITEMS.most - ITEMS.fewest + 1)));
  const strewn = errand.map((word) => ({ word, room: 1 + Math.floor(random() * (count - 1)) }));
  const dealt = deal(own, count);
  return ids.map((id, index) =>
    furnish(
      {
        id,
        place: authored.id,
        biome: authored.biome,
        exits: doors(ids, turns, index),
        // the entry has no opening behind it: the learner arrives on the side away from the way on
        entry: landing(OPPOSITE[turns[Math.max(index - 1, 0)]]),
        words: dealt[index],
        items: strewn.filter((item) => item.room === index).map((item) => item.word),
        first: index === 0,
        last: index === count - 1,
      },
      stream(seed, id),
    ),
  );
};

// the world is never stored: one seed over one atlas, in any order, charts the same valley —
// the hub, then every place with words in the order they open. a word's stone stands in the first
// place that holds it
export const chart = (seed, atlas) => {
  const charted = PLACES.filter(({ id }) => atlas.places[id] && atlas.places[id].words.length > 0);
  const syllabus = (one, other) =>
    atlas.words[one].rank - atlas.words[other].rank || (one < other ? -1 : 1);
  const built = charted.reduce(
    (world, authored) => {
      const words = [...atlas.places[authored.id].words].sort(syllabus);
      const own = words.filter((word) => !Object.hasOwn(world.home, word));
      const rooms = district(seed, authored, atlas, own);
      const sited = {
        id: authored.id,
        name: authored.name,
        biome: authored.biome,
        words,
        sentences: [...atlas.places[authored.id].sentences].sort(),
        rooms: rooms.map((room) => room.id),
        entry: rooms[0].id,
        lair: rooms.at(-1).id,
      };
      const homes = rooms.flatMap((room) => room.stones.map((stone) => [stone.word, room.id]));
      return {
        places: { ...world.places, [authored.id]: sited },
        rooms: { ...world.rooms, ...Object.fromEntries(rooms.map((room) => [room.id, room])) },
        home: { ...world.home, ...Object.fromEntries(homes) },
      };
    },
    { places: {}, rooms: { hub: HUB }, home: {} },
  );
  return {
    order: charted.map(({ id }) => id),
    places: built.places,
    rooms: built.rooms,
    words: atlas.words,
    home: built.home,
  };
};

// who stands in a room and answers a bump: its fixed folk, and its warden until the district is
// restored
export const fixtures = (room, run) =>
  ["keeper", "vendor", "shrine", "sign", "summit", "warden"]
    .filter(
      (kind) => room[kind] !== null && !(kind === "warden" && has(run, `restored:${room.place}`)),
    )
    .map((kind) => ({ kind, x: room[kind].x, y: room[kind].y }));

// the items a place strews, in the order its rooms are walked: the first is the one its keeper asks for
export const strewn = (world, place) =>
  world.places[place].rooms.flatMap((room) => world.rooms[room].items.map((item) => item.word));

// the errand's items still where they were strewn; one picked up is gone for good
export const lying = (room, run) =>
  room.items.filter((item) => read(run, `gained:word:${item.word}`) === 0);

// the share of the districts standing restored; the summit wakes at all of them
export const restoration = (world, run) => {
  const districts = world.order.filter((id) => !place(id).opens);
  if (districts.length === 0) return 0;
  return districts.filter((id) => has(run, `restored:${id}`)).length / districts.length;
};

// the scene is the part of a room that moves, rebuilt on every entry: a spirit for each word homed
// here that is due, or read off its stone and never yet reviewed — each on a spawn point out of the
// learner's scent, so neither a room walked into nor a run reloaded mid-room opens on a duel
export const enter = (world, run, ctx) => {
  const room = world.rooms[run.pose.room];
  const spawns = room.spawns.filter((spawn) => apart(spawn, run.pose) > SCENT);
  const haunting = room.stones
    .map((stone) => stone.word)
    .filter((word) => {
      if (ctx.due.includes(word)) return true;
      return has(run, `met:${word}`) && (ctx.memory[word] ?? "UNTOUCHED") === "UNTOUCHED";
    });
  return {
    room: room.id,
    spirits: spawns
      .slice(0, haunting.length)
      .map((spawn, index) => ({ word: haunting[index], ...spot(spawn) })),
    duel: null,
    dialogue: null,
  };
};

// where a spirit would go: toward the learner once it smells them, else now and then any one way
const urge = (spirit, pose, random) => {
  const toward = { x: pose.x - spirit.x, y: pose.y - spirit.y };
  if (apart(spirit, pose) > SCENT) {
    return random() < RESTLESS ? [DIRECTIONS[draw(Object.keys(DIRECTIONS), random)]] : [];
  }
  const along = { x: Math.sign(toward.x), y: 0 };
  const across = { x: 0, y: Math.sign(toward.y) };
  const order = Math.abs(toward.x) >= Math.abs(toward.y) ? [along, across] : [across, along];
  return order.filter((delta) => delta.x !== 0 || delta.y !== 0);
};

// a spirit treads open floor clear of the doorways, fixtures, stones, items and other spirits —
// and the learner's own tile, which is the catch
const wander = (spirit, others, state, ctx) => {
  const pose = state.run.pose;
  const room = ctx.world.rooms[pose.room];
  const kept = [
    ...arrivals(room),
    ...fixtures(room, state.run),
    ...room.stones,
    ...lying(room, state.run),
  ];
  const free = (cell) => {
    if (among(others, cell)) return false;
    if (same(cell, pose)) return true;
    return terrain(ctx.world, room.id, cell) === "floor" && !among(kept, cell);
  };
  const delta = urge(spirit, pose, ctx.random).find((want) =>
    free({ x: spirit.x + want.x, y: spirit.y + want.y }),
  );
  return delta ? { ...spirit, x: spirit.x + delta.x, y: spirit.y + delta.y } : spirit;
};

// a tick outside a duel: each spirit moves a tile at most. the world holds still while the learner
// talks
export const roam = (state, ctx) => {
  if (state.scene.dialogue) return state;
  const spirits = state.scene.spirits.reduce(
    (moved, spirit, index) => [
      ...moved,
      wander(spirit, [...moved, ...state.scene.spirits.slice(index + 1)], state, ctx),
    ],
    [],
  );
  return { ...state, scene: { ...state.scene, spirits } };
};

// the spirit standing on the learner's tile: it reached them, and a duel is owed
export const caught = (state) => state.scene.spirits.find((spirit) => same(spirit, state.run.pose));

// a save names a room of the world it was charted in; once the atlas deals its place fewer rooms,
// the room is gone and the learner wakes at the hub's entry
export const stand = (world, run) =>
  world.rooms[run.pose.room] ? run : { ...run, pose: { room: HUB.id, ...HUB.entry } };
