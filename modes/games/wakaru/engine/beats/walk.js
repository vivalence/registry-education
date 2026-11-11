import { WAKING, share, unlocked } from "../atlas.js";
import { count, flagged, has, out, raise } from "../run.js";
import {
  OPPOSITE,
  enter,
  fixtures,
  landing,
  lying,
  neighbour,
  restoration,
  same,
  terrain,
} from "../world.js";
import { engage } from "./duel.js";
import { converse } from "./talk.js";

// the learner arrives in a room: its scene is rebuilt there, and the room is reached for good
const arrive = (run, room, at, ctx) => {
  const flag = `reached:${room.id}`;
  const next = raise({ ...run, pose: { room: room.id, x: at.x, y: at.y } }, flag);
  return out(
    { run: next, scene: enter(ctx.world, next, ctx) },
    [{ type: "entered", room: room.id, place: room.place }],
    flagged(run, flag),
  );
};

const moved = (run, to) => count({ ...run, pose: { ...run.pose, x: to.x, y: to.y } }, "steps");

// through an opening into the neighbour, landing just inside the edge the learner comes in by
const cross = (state, ahead, ctx) =>
  arrive(
    count(state.run, "steps"),
    ctx.world.rooms[ahead.room.exits[ahead.direction]],
    landing(OPPOSITE[ahead.direction]),
    ctx,
  );

// a stone shows its word every time it is read and is met the first time; a voiced word is heard
const meet = (state, ahead, ctx) => {
  const { word } = ahead.stone;
  const flag = `met:${word}`;
  const voiced = ctx.world.words[word].audio ? [{ type: "audio", word }] : [];
  return out(
    { ...state, run: raise(moved(state.run, ahead), flag) },
    [{ type: "card", word, fresh: !has(state.run, flag) }, ...voiced],
    flagged(state.run, flag),
  );
};

// an item is picked up by walking onto it, and is gone from the room for good
const pick = (state, ahead) => {
  const { word } = ahead.item;
  return out({ ...state, run: count(moved(state.run, ahead), `gained:word:${word}`) }, [
    { type: "item", word },
  ]);
};

const stride = (state, ahead) =>
  out({ ...state, run: moved(state.run, ahead) }, [{ type: "step" }]);

// a fixture answers a bump, and the learner stays where they stood
const BUMPS = {
  keeper: (state, room, ctx) => converse(state, { kind: "keeper", place: room.place }, ctx),
  vendor: (state, room, ctx) => converse(state, { kind: "vendor" }, ctx),
  shrine: (state, room, ctx) => converse(state, { kind: "shrine" }, ctx),
  sign: (state) => out(state, [{ type: "map" }]),
  // the summit's warden wakes once every district stands restored
  summit: (state, room, ctx) => {
    const standing = restoration(ctx.world, state.run);
    if (standing < 1) return out(state, [{ type: "sealed", share: standing }]);
    return engage(state, { kind: "summit" }, ctx);
  },
  // a lair's warden sleeps until the learner holds most of its district's words
  warden: (state, room, ctx) => {
    const held = share(ctx.memory, ctx.world.places[room.place].words);
    if (held < WAKING) return out(state, [{ type: "sealed", share: held }]);
    return engage(state, { kind: "warden", place: room.place }, ctx);
  },
};

// what the learner meets on the tile ahead, asked in order: the first that answers moves the game
const MEETS = [
  [(ahead) => ahead.ground === "exit", cross],
  [(ahead) => ahead.ground !== "floor", (state) => out(state, [{ type: "bump" }])],
  [
    (ahead) => ahead.fixture,
    (state, ahead, ctx) => BUMPS[ahead.fixture.kind](state, ahead.room, ctx),
  ],
  [
    (ahead) => ahead.spirit,
    (state, ahead, ctx) => engage(state, { kind: "spirit", word: ahead.spirit.word }, ctx),
  ],
  [(ahead) => ahead.item, pick],
  [(ahead) => ahead.stone, meet],
  [() => true, stride],
];

// one tile; nothing moves while a duel or a dialogue holds the learner
const step = (state, action, ctx) => {
  if (state.scene.duel || state.scene.dialogue) return out(state);
  const room = ctx.world.rooms[state.run.pose.room];
  const to = neighbour(state.run.pose, action.direction);
  const ahead = {
    ...to,
    direction: action.direction,
    room,
    ground: terrain(ctx.world, room.id, to),
    fixture: fixtures(room, state.run).find((fixture) => same(fixture, to)),
    spirit: state.scene.spirits.find((spirit) => same(spirit, to)),
    item: lying(room, state.run).find((item) => same(item, to)),
    stone: room.stones.find((stone) => same(stone, to)),
  };
  const [, meets] = MEETS.find(([answers]) => answers(ahead));
  return meets(state, ahead, ctx);
};

// the map's one act: to the hub, or to a place that stands open, landing on its entry
const travel = (state, action, ctx) => {
  if (state.scene.duel || state.scene.dialogue) return out(state);
  if (!["hub", ...unlocked(ctx.world, state.run)].includes(action.place)) return out(state);
  const room =
    ctx.world.rooms[action.place === "hub" ? "hub" : ctx.world.places[action.place].entry];
  return arrive(state.run, room, room.entry, ctx);
};

export const walk = { step, travel };
