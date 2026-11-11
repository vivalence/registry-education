import { DISTRICTS, WAKING, share, unlocked } from "./atlas.js";
import { HEARTS, flagged, has, out, raise, read, tally } from "./run.js";
import { strewn } from "./world.js";

// a place's story is never stored: every quest is a list of steps, and a step is done while the
// fact it reads holds in the run's flags and counters or in the learner's memory

// the keeper asks for the place's first item; the others lie about as decoys
export const wanted = (world, place) => strewn(world, place)[0];

const light = (world, place) => {
  const { stones } = world.rooms[world.places[place].entry];
  if (stones.length === 0) return null;
  return {
    id: `${place}.light`,
    place,
    title: "First light",
    steps: [
      {
        done: (run) => stones.every((stone) => has(run, `met:${stone.word}`)),
        hint: "Read every stone in the first room",
      },
    ],
    reward: { coins: 20 },
  };
};

const spirits = (world, place) => {
  const need = Math.min(3, world.places[place].words.length);
  return {
    id: `${place}.spirits`,
    place,
    title: "Rest the spirits",
    steps: [
      {
        done: (run) => read(run, `rested:${place}`) >= need,
        hint: `Lay ${need} of its spirits to rest`,
      },
    ],
    reward: { coins: 20 },
  };
};

const errand = (world, place) => {
  const word = wanted(world, place);
  if (!word) return null;
  return {
    id: `${place}.errand`,
    place,
    title: "The keeper's errand",
    steps: [
      {
        done: (run) => read(run, `gained:word:${word}`) > 0,
        hint: "Ask the keeper what they need, and find it",
      },
      {
        done: (run) => has(run, `errand:${place}`),
        hint: "Bring it to the keeper",
      },
    ],
    reward: { coins: 30, refill: true },
  };
};

const question = (place) => ({
  id: `${place}.question`,
  place,
  title: "The keeper's question",
  steps: [
    {
      done: (run) => has(run, `asked:${place}`),
      hint: "Answer the keeper's question",
    },
  ],
  reward: { coins: 30 },
});

const warden = (world, place) => {
  const { words } = world.places[place];
  const need = Math.ceil(words.length * WAKING);
  const restored = (run) => has(run, `restored:${place}`);
  return {
    id: `${place}.warden`,
    place,
    title: "The warden",
    steps: [
      {
        // memory can slip back under the mark; a restored place stays woken
        done: (run, ctx) => restored(run) || share(ctx.memory, words) >= WAKING,
        hint:
          words.length === 1
            ? "Hold its one word to wake the warden"
            : `Hold ${need} of its ${words.length} words to wake the warden`,
      },
      {
        done: restored,
        hint: "Face the warden in its lair",
      },
    ],
    reward: { coins: 0 },
  };
};

// a district tells all five; a wing only asks for its spirits and its warden.
// a quest the place cannot hold — no stone by the keeper, no item to fetch — is not told
export const quests = (world, place) =>
  DISTRICTS.some((district) => district.id === place)
    ? [
        light(world, place),
        spirits(world, place),
        errand(world, place),
        question(place),
        warden(world, place),
      ].filter(Boolean)
    : [spirits(world, place), warden(world, place)];

export const complete = (quest, run, ctx) => quest.steps.every((step) => step.done(run, ctx));

// per open place, each quest at its first unmet step
export const progress = (world, run, ctx) =>
  Object.fromEntries(
    unlocked(world, run).map((place) => [
      place,
      quests(world, place).map((quest) => {
        const current = quest.steps.find((step) => !step.done(run, ctx));
        return { quest, step: current, done: current === undefined };
      }),
    ]),
  );

const grant = (settled, quest) => {
  const { run } = settled.state;
  const { coins, refill } = quest.reward;
  const receipt = `rewarded:${quest.id}`;
  const mends = refill && run.hearts < HEARTS;
  const paid = coins > 0 ? tally(raise(run, receipt), "coins+", coins) : raise(run, receipt);
  return out(
    { ...settled.state, run: mends ? { ...paid, hearts: HEARTS } : paid },
    [
      ...settled.effects,
      { type: "quest", quest: quest.id, done: true },
      ...(coins > 0 ? [{ type: "coins", amount: coins }] : []),
      ...(mends ? [{ type: "heal", hearts: HEARTS }] : []),
    ],
    [...settled.events, ...flagged(run, receipt)],
  );
};

// every complete quest of an open place is rewarded once: its rewarded flag is the receipt,
// so settling a settled state grants nothing
export const settle = (state, ctx) =>
  unlocked(ctx.world, state.run)
    .flatMap((place) => quests(ctx.world, place))
    .filter((quest) => !has(state.run, `rewarded:${quest.id}`) && complete(quest, state.run, ctx))
    .reduce(grant, out(state));
