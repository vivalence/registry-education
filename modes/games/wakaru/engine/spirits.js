import { draw } from "./random.js";
import { out } from "./run.js";
import { DIRECTIONS, among, apart, key, neighbour, same, tile } from "./tiles.js";
import { CALM, SIGHT, blocking, distances, lying, near } from "./world.js";

// the spirits are the learner's due words, and they hunt: each roams its patch of tall grass, sees
// the learner along its gaze, freezes on the sight, gives chase, and gives up to walk home again

// how a spirit keeps time, in ms: roaming, it steps every 700–1100; spotting the learner, it
// freezes 600, then hunts a step every 320; walking home, a step every 480
const PACE = { roam: 700, sway: 400, alert: 600, chase: 320, home: 480 };

// a hunt that has gained no ground for this long is given up
const PATIENCE = 3000;

// how far from home, in tiles: roaming, a spirit keeps within WANDER; hunting, within LEASH
export const WANDER = 4;
export const LEASH = 8;

// the tiles a straight line crosses between two cells, its ends left out
const between = (from, to) => {
  const span = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  return Array.from({ length: Math.max(span - 1, 0) }, (_, index) => ({
    x: Math.round(from.x + ((to.x - from.x) * (index + 1)) / span),
    y: Math.round(from.y + ((to.y - from.y) * (index + 1)) / span),
  }));
};

// a spirit sees the learner beside it, or within SIGHT inside the 120° it faces — at most 60°
// off its facing, a cosine of a half or more — along a line nothing tall breaks: the eye passes
// over open ground and water, never through a wall, a tree, a hedge or a roof
export const sees = (map, spirit, learner) => {
  if (apart(spirit, learner) <= 1) return true;
  const dx = learner.x - spirit.x;
  const dy = learner.y - spirit.y;
  const ahead = dx * DIRECTIONS[spirit.facing].x + dy * DIRECTIONS[spirit.facing].y;
  return (
    ahead > 0 &&
    4 * ahead * ahead >= dx * dx + dy * dy &&
    near(spirit, learner, SIGHT) &&
    between(spirit, learner).every((cell) => tile(map, cell).walk || tile(map, cell).fish)
  );
};

// the way to turn to face a cell: along the longer stretch between them
const toward = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "east" : "west";
  return dy > 0 ? "south" : "north";
};

// the ground spirits tread this tick: walkable, no portal, nothing standing or lying on it
const ground = (state, ctx) => {
  const map = ctx.world.maps[state.run.pose.map];
  const taken = new Set(
    [...blocking(ctx.world, map.id, state.run), ...lying(ctx.world, map.id, state.run)].map(key),
  );
  return {
    map,
    learner: state.run.pose,
    calm: state.scene.calm,
    open: (cell) => tile(map, cell).walk && !taken.has(key(cell)),
  };
};

// the ways that bring a spirit a tile nearer along a field of walking distances
const nearer = (spirit, field) =>
  Object.keys(DIRECTIONS).filter(
    (way) => field.get(key(neighbour(spirit, way))) === field.get(key(spirit)) - 1,
  );

// a spirit that is not hunting carries no hunt
const calm = (spirit, mode, next) => ({
  word: spirit.word,
  x: spirit.x,
  y: spirit.y,
  facing: spirit.facing,
  home: spirit.home,
  mode,
  next,
});

// what a spirit does when its time comes, by mode
const MODES = {
  // a random step, kept within WANDER of home; a way that is shut only turns it, sweeping its gaze
  roam: (spirit, others, here, ctx) => {
    const facing = draw(Object.keys(DIRECTIONS), ctx.random);
    const to = neighbour(spirit, facing);
    const free = here.open(to) && !among(others, to) && apart(to, spirit.home) <= WANDER;
    const at = free ? to : spirit;
    const next = ctx.now + PACE.roam + Math.floor(ctx.random() * PACE.sway);
    return { ...spirit, x: at.x, y: at.y, facing, next };
  },

  // the freeze is over: the hunt begins with its first step
  alert: (spirit, others, here, ctx) =>
    MODES.chase({ ...spirit, mode: "chase", closest: Infinity, since: ctx.now }, others, here, ctx),

  // a step along a shortest walk to the learner. the hunt keeps the closest it has come and when;
  // with no ground gained for PATIENCE, or every nearer step past the LEASH, it is given up
  chase: (spirit, others, here, ctx) => {
    const field = distances([here.learner], here.open);
    const far = field.has(key(spirit)) ? field.get(key(spirit)) : Infinity;
    const since = far < spirit.closest ? ctx.now : spirit.since;
    const ways = nearer(spirit, field);
    const leashed = ways.filter((way) => apart(neighbour(spirit, way), spirit.home) <= LEASH);
    const tethered = ways.length > 0 && leashed.length === 0;
    if (tethered || ctx.now - since >= PATIENCE) return calm(spirit, "return", ctx.now + PACE.home);
    const way = leashed.find((each) => !among(others, neighbour(spirit, each)));
    const at = way === undefined ? spirit : neighbour(spirit, way);
    return {
      ...spirit,
      x: at.x,
      y: at.y,
      facing: way === undefined ? toward(spirit, here.learner) : way,
      closest: Math.min(far, spirit.closest),
      since,
      next: ctx.now + PACE.chase,
    };
  },

  // a step along a shortest walk home, blind to the learner until it is there; home, it roams
  return: (spirit, others, here, ctx) => {
    const field = distances([spirit.home], here.open);
    const way = nearer(spirit, field).find((each) => !among(others, neighbour(spirit, each)));
    const at = way === undefined ? spirit : neighbour(spirit, way);
    const facing = way === undefined ? spirit.facing : way;
    const walked = { ...spirit, x: at.x, y: at.y, facing, next: ctx.now + PACE.home };
    if (!same(at, spirit.home)) return walked;
    return calm(walked, "roam", ctx.now + PACE.roam);
  },
};

// a roaming spirit keeps watch every tick, the calm once past, and freezes the moment it sees the
// learner, turned to them; otherwise a spirit acts only once its time has come
const move = (spirit, others, here, ctx) => {
  if (spirit.mode === "roam" && ctx.now >= here.calm && sees(here.map, spirit, here.learner))
    return {
      ...spirit,
      mode: "alert",
      facing: toward(spirit, here.learner),
      next: ctx.now + PACE.alert,
    };
  if (spirit.next > ctx.now) return spirit;
  return MODES[spirit.mode](spirit, others, here, ctx);
};

// a tick outside a duel, a dialogue or a game: every spirit in turn keeps watch and moves a tile at
// most, seeing where the ones before it now stand; one that spots the learner says so
export const roam = (state, ctx) => {
  const here = ground(state, ctx);
  const before = state.scene.spirits;
  const spirits = before.reduce(
    (moved, spirit, index) => [
      ...moved,
      move(spirit, [...moved, ...before.slice(index + 1)], here, ctx),
    ],
    [],
  );
  if (spirits.every((spirit, index) => spirit === before[index])) return out(state);
  const spotted = spirits.filter(
    (spirit, index) => spirit.mode === "alert" && before[index].mode === "roam",
  );
  return out(
    { ...state, scene: { ...state.scene, spirits } },
    spotted.map((spirit) => ({ type: "spotted", word: spirit.word })),
  );
};

// the learner comes free — a duel over, a game closed, a talk ended: every spirit on the hunt
// gives it up and walks home, and none keeps watch until the calm has passed
export const breathe = (scene, now) => ({
  ...scene,
  calm: now + CALM,
  spirits: scene.spirits.map((spirit) =>
    spirit.mode === "alert" || spirit.mode === "chase"
      ? calm(spirit, "return", now + PACE.home)
      : spirit,
  ),
});

// the spirit standing on the learner's tile: it reached them, and a duel is owed
export const caught = (state) => state.scene.spirits.find((spirit) => same(spirit, state.run.pose));
