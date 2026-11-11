import { DIRECTIONS, key, neighbour, same, tile, within } from "./tiles.js";
import { blocking, lit, lying, standing } from "./world.js";

// the steps that first reached a tile, read back to where the search began
const retrace = (reached, cell, steps) => {
  const step = reached.get(key(cell));
  return step === null ? steps : retrace(reached, step.from, [step.direction, ...steps]);
};

// breadth first from the learner: the first time a step from a reached tile meets the goal, the
// way there is a shortest one. each tile keeps the step that first reached it; open says which
// tiles a walk may cross on its way
const search = (from, meets, open) => {
  const reached = new Map([[key(from), null]]);
  const queue = [from];
  for (const cell of queue)
    for (const direction of Object.keys(DIRECTIONS)) {
      if (meets(cell, direction)) return retrace(reached, cell, [direction]);
      const next = neighbour(cell, direction);
      if (reached.has(key(next)) || !open(next)) continue;
      reached.set(key(next), { from: cell, direction });
      queue.push(next);
    }
  return [];
};

// the shortest walk from the learner to a tapped tile of their map, as directions. only its last
// step meets anything — a stone, a spirit, someone standing there or across a counter, a chest, a
// pot, a portal, water, a wall to bump — and every step before it treads open, lit ground, round
// the errand's items whenever there is a way round
export const route = (world, state, goal) => {
  const { run } = state;
  const map = world.maps[run.pose.map];
  if (same(run.pose, goal) || !within(map, goal)) return [];
  const hard = new Set([...blocking(world, map.id, run), ...state.scene.spirits].map(key));
  const items = new Set(lying(world, map.id, run).map(key));
  const someone = standing(world, map.id, run).some((fixture) => same(fixture, goal));
  const meets = (cell, direction) => {
    const next = neighbour(cell, direction);
    if (same(next, goal)) return true;
    return someone && tile(map, next).kind === "counter" && same(neighbour(next, direction), goal);
  };
  const open = (cell) => tile(map, cell).walk && !hard.has(key(cell)) && lit(world, run, cell);
  const round = search(run.pose, meets, (cell) => open(cell) && !items.has(key(cell)));
  return round.length > 0 ? round : search(run.pose, meets, open);
};
