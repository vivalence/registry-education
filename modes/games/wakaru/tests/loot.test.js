import { assert, assertEquals, assertNotEquals, assertStrictEquals } from "@std/assert";
import { ITEMS, open, pay, smash } from "../engine/loot.js";
import { HEARTS, coins, count, fresh, has, held, read } from "../engine/run.js";
import { MAPS } from "../engine/maps/index.js";

// the learner somewhere on the square, nothing open: chests and pots never read where they stand
const at = (run = fresh(7)) => ({
  run,
  scene: { spirits: [], duel: null, dialogue: null, game: null },
});

const CHEST = { id: "market.chest.0", x: 3, y: 4, loot: { coins: 30 } };

const ROD = { id: "hearth.house.chest.0", x: 2, y: 1, loot: { item: "rod" } };

const pot = (index) => ({ id: `square.pot.${index}`, x: index, y: 5 });

// the coins a pot gives on a run of this seed, broken first thing
const yields = (seed, which) => coins(smash(at(fresh(seed)), which).state.run);

const POTS = Array.from({ length: 200 }, (_, index) => pot(index));

Deno.test(
  "the lantern, the rod and the compass are tools; candle, charm and tea are spent; fish is sold",
  () => {
    const kinds = Object.fromEntries(
      Object.entries(ITEMS).map(([item, entry]) => [item, entry.kind]),
    );
    assertEquals(kinds, {
      candle: "supply",
      charm: "supply",
      tea: "supply",
      lantern: "tool",
      rod: "tool",
      compass: "tool",
      fish: "catch",
    });
    assert(Object.values(ITEMS).every((entry) => entry.does.length > 0));
  },
);

Deno.test("a chest pays its coins once: the receipt, the purse and what the screen is told", () => {
  const opened = open(at(), CHEST);
  assertEquals(opened.effects, [
    { type: "chest", id: "market.chest.0", loot: { coins: 30 } },
    { type: "coins", amount: 30 },
  ]);
  assertEquals(opened.events, [{ type: "flag", flag: "opened:market.chest.0" }]);
  assertEquals(coins(opened.state.run), 30);
  // opened, it is a box to bump: nothing more comes out of it
  const again = open(opened.state, CHEST);
  assertStrictEquals(again.state, opened.state);
  assertEquals([again.effects, again.events], [[{ type: "bump" }], []]);
});

Deno.test("a chest's item lands in the satchel once", () => {
  const opened = open(at(), ROD);
  assertEquals(opened.effects, [
    { type: "chest", id: "hearth.house.chest.0", loot: { item: "rod" } },
    { type: "gained", item: "rod" },
  ]);
  assertEquals([held(opened.state.run, "rod"), coins(opened.state.run)], [1, 0]);
  assert(has(opened.state.run, "opened:hearth.house.chest.0"));
  assertEquals(held(open(opened.state, ROD).state.run, "rod"), 1);
});

Deno.test("a pot breaks once for one to four coins", () => {
  const broken = smash(at(), pot(0));
  const amount = coins(broken.state.run);
  assert(amount >= 1 && amount <= 4);
  assertEquals(broken.effects, [{ type: "pot", id: "square.pot.0", coins: amount }]);
  assertEquals(broken.events, [{ type: "flag", flag: "broke:square.pot.0" }]);
  const again = smash(broken.state, pot(0));
  assertStrictEquals(again.state, broken.state);
  assertEquals([again.effects, again.events], [[{ type: "bump" }], []]);
});

Deno.test(
  "a pot's coins are its seed's and id's alone: stable on reload, unmoved by another pot",
  () => {
    const drawn = POTS.map((which) => yields(7, which));
    assertEquals(
      POTS.map((which) => yields(7, which)),
      drawn,
    );
    assertEquals([...new Set(drawn)].sort(), [1, 2, 3, 4]);
    assertNotEquals(
      POTS.map((which) => yields(8, which)),
      drawn,
    );
    // breaking one pot first leaves what the next one holds as it was
    const first = smash(at(), pot(1)).state;
    const second = smash(first, pot(2));
    assertEquals(second.effects, [{ type: "pot", id: "square.pot.2", coins: yields(7, pot(2)) }]);
    assertEquals(coins(second.state.run), yields(7, pot(1)) + yields(7, pot(2)));
  },
);

Deno.test("a loot is paid key by key; a refill heals only a learner missing a heart", () => {
  const hurt = { ...fresh(7), hearts: 2 };
  const reward = pay(hurt, { coins: 30, refill: true });
  assertEquals(reward.effects, [
    { type: "coins", amount: 30 },
    { type: "heal", hearts: HEARTS },
  ]);
  assertEquals([coins(reward.run), reward.run.hearts], [30, HEARTS]);
  assertEquals(pay(fresh(7), { coins: 30, refill: true }).effects, [{ type: "coins", amount: 30 }]);
  const nothing = pay(hurt, {});
  assertStrictEquals(nothing.run, hurt);
  assertEquals(nothing.effects, []);
});

Deno.test("every item held is what came in less what went out", () => {
  const candles = [
    { id: "a.chest.0", x: 0, y: 0, loot: { item: "candle" } },
    { id: "a.chest.1", x: 1, y: 0, loot: { item: "candle" } },
  ];
  const opened = candles.reduce((state, chest) => open(state, chest).state, at());
  const rewarded = pay(opened.run, { item: "candle" }).run;
  const lit = count(count(rewarded, "used:candle"), "used:candle");
  const run = open(at(lit), ROD).state.run;
  for (const item of Object.keys(ITEMS))
    assertEquals(held(run, item), read(run, `gained:${item}`) - read(run, `used:${item}`));
  assertEquals([held(run, "candle"), held(run, "rod"), held(run, "tea")], [1, 1, 0]);
});

Deno.test("opening and smashing leave the state they were handed untouched", () => {
  const before = at();
  const copy = structuredClone(before);
  open(before, CHEST);
  open(before, ROD);
  smash(before, pot(3));
  assertEquals(before, copy);
});

Deno.test("every authored chest holds coins or a known item; the rod lies in hearth.house", () => {
  const chests = Object.values(MAPS).flatMap((map) => map.chests);
  for (const { loot } of chests) {
    const [[kind, value], ...more] = Object.entries(loot);
    assertEquals(more, []);
    if (kind === "coins") assert(Number.isInteger(value) && value > 0, `coins ${value}`);
    else assertEquals([kind, Object.hasOwn(ITEMS, value)], ["item", true]);
  }
  assert(MAPS["hearth.house"].chests.some((chest) => chest.loot.item === "rod"));
});
