import { WAKING, share } from "../atlas.js";
import { GAMES } from "../games/index.js";
import { open, smash } from "../loot.js";
import { count, flagged, has, held, out, raise } from "../run.js";
import { neighbour, same, tile } from "../tiles.js";
import { busy, enter, lit, lying, restoration, sealed, standing } from "../world.js";
import { engage } from "./duel.js";
import { converse } from "./talk.js";

// the place of the map the learner stands on
const here = (state, ctx) => ctx.world.maps[state.run.pose.map].place;

const moved = (run, to) => count({ ...run, pose: { ...run.pose, x: to.x, y: to.y } }, "steps");

// the learner arrives on a map: its scene is raised afresh there, and the map is visited for good
const arrive = (state, pose, effects, ctx) => {
  const flag = `visited:${pose.map}`;
  const run = raise({ ...state.run, pose }, flag);
  return out(
    { run, scene: enter(ctx.world, run, ctx) },
    [{ type: "entered", map: pose.map, from: state.run.pose.map }, ...effects],
    flagged(state.run, flag),
  );
};

// through a portal onto the spawn it names on the far map, unless that map is sealed
const cross = (state, ahead, ctx) => {
  const { to, spawn } = ahead.portal;
  const reason = sealed(ctx.world, state.run, to);
  if (reason !== null)
    return out(state, [{ type: "sealed", place: ctx.world.maps[to].place, reason }]);
  const pose = { map: to, ...ctx.world.maps[to].spawns[spawn] };
  return arrive({ ...state, run: count(state.run, "steps") }, pose, [], ctx);
};

const talk = (state, fixture, ctx) =>
  converse(state, { kind: fixture.kind, place: here(state, ctx) }, ctx);

// someone standing ahead answers a bump, and the learner stays where they stood
const BUMPS = {
  keeper: talk,
  vendor: talk,
  shrine: talk,
  bed: talk,
  // a warden sleeps until the learner holds most of its place's words
  warden: (state, fixture, ctx) => {
    const place = here(state, ctx);
    const known = share(ctx.memory, ctx.world.places[place].words);
    if (known < WAKING)
      return out(state, [{ type: "sealed", place, share: known, reason: "asleep" }]);
    return engage(state, { kind: "warden", place }, ctx);
  },
  // the summit's peak wakes once every district stands restored
  summit: (state, fixture, ctx) => {
    const restored = restoration(ctx.world, state.run);
    if (restored < 1)
      return out(state, [
        { type: "sealed", place: here(state, ctx), share: restored, reason: "unrestored" },
      ]);
    return engage(state, { kind: "summit" }, ctx);
  },
  // the square's sign opens the atlas; a district's names its place
  sign: (state, fixture, ctx) => {
    const place = here(state, ctx);
    return out(state, [place === null ? { type: "atlas" } : { type: "sign", place }]);
  },
  // spirits gather at a haunt: with two or more on the map, the swarm begins
  haunt: (state, fixture, ctx) =>
    state.scene.spirits.length >= 2
      ? GAMES.swarm.start(state, { haunt: fixture }, ctx)
      : out(state, [{ type: "quiet" }]),
};

const fight = (state, ahead, ctx) =>
  engage(state, { kind: "spirit", word: ahead.spirit.word }, ctx);

const greet = (state, ahead, ctx) => BUMPS[ahead.fixture.kind](state, ahead.fixture, ctx);

const unlatch = (state, ahead) => open(state, ahead.chest);

const shatter = (state, ahead) => smash(state, ahead.pot);

// an unread stone is read by its trial; a read one shows its card again
const trial = (state, ahead, ctx) => GAMES.trial.start(state, { word: ahead.stone.word }, ctx);

// someone beyond a counter is spoken to across it
const hail = (state, ahead, ctx) => BUMPS[ahead.across.kind](state, ahead.across, ctx);

// water ahead: with a rod in hand a line goes in, else the water only turns the learner back
const fish = (state, ahead, ctx) =>
  held(state.run, "rod") > 0
    ? GAMES.fishing.start(state, { spot: { x: ahead.x, y: ahead.y } }, ctx)
    : bump(state);

const bump = (state) => out(state, [{ type: "bump" }]);

// without the lantern the learner keeps to the light
const dark = (state) => out(state, [{ type: "dark" }]);

// an item is picked up by walking onto it, and is gone from its map for good
const pick = (state, ahead) =>
  out({ ...state, run: count(moved(state.run, ahead), `gained:word:${ahead.item.word}`) }, [
    { type: "item", word: ahead.item.word },
  ]);

const stride = (state, ahead) =>
  out({ ...state, run: moved(state.run, ahead) }, [{ type: "step" }]);

// an act never moves: what would carry the learner onto the tile ahead does nothing then
const still = (state) => out(state);

// the tile ahead answers, first match wins: [is it this, what a step does, what an act does]
const MEETS = [
  [(ahead) => ahead.portal, cross, still],
  [(ahead) => ahead.spirit, fight, fight],
  [(ahead) => ahead.fixture, greet, greet],
  [(ahead) => ahead.chest, unlatch, unlatch],
  [(ahead) => ahead.pot, shatter, shatter],
  [(ahead) => ahead.stone, trial, trial],
  [(ahead) => ahead.across, hail, hail],
  [(ahead) => ahead.ground.fish, fish, fish],
  [(ahead) => !ahead.ground.walk, bump, bump],
  [(ahead) => !ahead.lit, dark, still],
  [(ahead) => ahead.item, pick, still],
  [() => true, stride, still],
];

// everything on the tile the learner faces — the walk meets it, the screen names it on the act button
export const survey = (state, ctx) => {
  const { world } = ctx;
  const { pose } = state.run;
  const map = world.maps[pose.map];
  const cell = neighbour(pose, pose.facing);
  const at = (things) => things.find((thing) => same(thing, cell));
  const people = standing(world, map.id, state.run);
  const ground = tile(map, cell);
  return {
    x: cell.x,
    y: cell.y,
    ground,
    portal: at(map.portals),
    spirit: at(state.scene.spirits),
    fixture: at(people),
    chest: at(map.chests),
    pot: at(map.pots),
    stone: at(map.stones),
    across:
      ground.kind === "counter"
        ? people.find((fixture) => same(fixture, neighbour(cell, pose.facing)))
        : undefined,
    lit: lit(world, state.run, cell),
    item: at(lying(world, map.id, state.run)),
  };
};

// the learner turns to the way they press, then the tile ahead answers
const step = (state, action, ctx) => {
  if (busy(state.scene)) return out(state);
  const turned = {
    ...state,
    run: { ...state.run, pose: { ...state.run.pose, facing: action.direction } },
  };
  const ahead = survey(turned, ctx);
  const [, meets] = MEETS.find(([answers]) => answers(ahead));
  return meets(turned, ahead, ctx);
};

// the learner meets the tile they face without moving: a bump, a word, a line cast with a rod
const act = (state, action, ctx) => {
  if (busy(state.scene)) return out(state);
  const ahead = survey(state, ctx);
  const [, , meets] = MEETS.find(([answers]) => answers(ahead));
  return meets(state, ahead, ctx);
};

// the compass carries the learner to any outdoor map they have walked to, unless it is sealed,
// landing on its entry
const travel = (state, action, ctx) => {
  if (busy(state.scene)) return out(state);
  const map = ctx.world.maps[action.map];
  const allowed =
    held(state.run, "compass") > 0 &&
    has(state.run, `visited:${map.id}`) &&
    map.kind === "outdoor" &&
    sealed(ctx.world, state.run, map.id) === null;
  if (!allowed) return out(state);
  const pose = { map: map.id, ...map.spawns.entry };
  return arrive(state, pose, [{ type: "travelled", map: map.id }], ctx);
};

export const walk = { step, act, travel };
