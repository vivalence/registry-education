import { DIRECTIONS, fixtures, key, lying, neighbour, same, terrain, within } from "./world.js";

// breadth first from the learner: the first time the goal turns up beside a tile, the way there is
// a shortest one. open says which tiles a walk may cross on its way
const search = (from, goal, open) => {
  const trail = new Map([[key(from), []]]);
  const queue = [from];
  for (const cell of queue)
    for (const direction of Object.keys(DIRECTIONS)) {
      const next = neighbour(cell, direction);
      const steps = [...trail.get(key(cell)), direction];
      if (same(next, goal)) return steps;
      if (trail.has(key(next)) || !open(next)) continue;
      trail.set(key(next), steps);
      queue.push(next);
    }
  return [];
};

// the shortest walk from the learner to a tile, as directions. only its last step meets anything —
// a stone, an item, a spirit, a fixture, an opening, a wall to bump — every step before it treads
// open floor, round the other stones and items whenever there is a way round
export const route = (world, state, goal) => {
  const room = world.rooms[state.run.pose.room];
  const from = state.run.pose;
  if (same(from, goal) || !within(goal)) return [];
  const standing = [...fixtures(room, state.run), ...state.scene.spirits];
  const open = (cell) =>
    terrain(world, room.id, cell) === "floor" && !standing.some((other) => same(other, cell));
  const strewn = [...room.stones, ...lying(room, state.run)].filter((thing) => !same(thing, goal));
  const round = search(
    from,
    goal,
    (cell) => open(cell) && !strewn.some((thing) => same(thing, cell)),
  );
  return round.length > 0 ? round : search(from, goal, open);
};
