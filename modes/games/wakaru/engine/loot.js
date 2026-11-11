import { seeded } from "./random.js";
import { HEARTS, count, flagged, has, out, raise, tally } from "./run.js";

// what the valley holds besides its words: the items a learner can carry, and the chests and pots
// that hold coins and items. held items are tallies — gained:<item> minus used:<item>.

// every item a learner can carry. a tool is never spent: one held does its work for good. a supply
// is spent by its use; a catch is sold to the vendor
export const ITEMS = {
  candle: { kind: "supply", does: "in a duel, shows a typed answer's first letter" },
  charm: { kind: "supply", does: "a duel's questions four seconds longer; a swarm ten" },
  tea: { kind: "supply", does: "mends one heart" },
  lantern: { kind: "tool", does: "lights the dark" },
  rod: { kind: "tool", does: "casts into any water" },
  compass: { kind: "tool", does: "travels from the atlas to any map you have walked" },
  fish: { kind: "catch", does: "the vendor buys it" },
};

// a pot holds a few coins
const POT = { fewest: 1, most: 4 };

// a loot is paid key by key — a chest's { coins } or { item }, a quest's reward: coins into the
// purse, an item into the satchel, a refill into the hearts, only while one is missing, so a
// learner already whole is not healed again
const PAYS = {
  coins: (run, amount) => ({
    run: tally(run, "coins+", amount),
    effects: [{ type: "coins", amount }],
  }),
  item: (run, item) => ({
    run: count(run, `gained:${item}`),
    effects: [{ type: "gained", item }],
  }),
  refill: (run) =>
    run.hearts < HEARTS
      ? { run: { ...run, hearts: HEARTS }, effects: [{ type: "heal", hearts: HEARTS }] }
      : { run, effects: [] },
};

export const pay = (run, loot) =>
  Object.entries(loot).reduce(
    (paid, [kind, value]) => {
      const next = PAYS[kind](paid.run, value);
      return { run: next.run, effects: [...paid.effects, ...next.effects] };
    },
    { run, effects: [] },
  );

// a chest opens once a run, its opened:<chest id> flag the receipt; opened, it is a box to bump.
// chest = { id, x, y, loot }
export const open = (state, chest) => {
  const flag = `opened:${chest.id}`;
  if (has(state.run, flag)) return out(state, [{ type: "bump" }]);
  const paid = pay(raise(state.run, flag), chest.loot);
  return out(
    { ...state, run: paid.run },
    [{ type: "chest", id: chest.id, loot: chest.loot }, ...paid.effects],
    flagged(state.run, flag),
  );
};

// a pot breaks once a run, its broke:<pot id> flag the receipt; its shards are a thing to bump.
// pot = { id, x, y }
export const smash = (state, pot) => {
  const flag = `broke:${pot.id}`;
  if (has(state.run, flag)) return out(state, [{ type: "bump" }]);
  const coins =
    POT.fewest + Math.floor(seeded(state.run.seed, pot.id)() * (POT.most - POT.fewest + 1));
  return out(
    { ...state, run: tally(raise(state.run, flag), "coins+", coins) },
    [{ type: "pot", id: pot.id, coins }],
    flagged(state.run, flag),
  );
};
