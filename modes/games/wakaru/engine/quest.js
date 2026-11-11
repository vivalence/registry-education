import { DISTRICTS, WAKING, remembered, share, unlocked } from "./atlas.js";
import { apart } from "./tiles.js";
import { flagged, has, out, raise, read } from "./run.js";
import { pay } from "./loot.js";
import { restoration, standing, strewn } from "./world.js";

// a place's story is never stored: every quest is a list of steps, and a step is done while the
// fact it reads holds in the run's flags and counters or in the learner's memory. a step may say
// how far along it stands (measure → { done, of }) and where it points (target → { map, x, y })

// the keeper asks for the place's first item; the others lie about as decoys
export const wanted = (world, place) => strewn(world, place)[0];

// where one of a kind is posted on a place's home map, as a target. a wing's home is a hall with a
// warden and no keeper or haunt
const post = (world, place, kind) => {
  const { home } = world.places[place];
  const found = world.maps[home].fixtures.find((fixture) => fixture.kind === kind);
  return found === undefined ? null : { map: home, x: found.x, y: found.y };
};

// the stones of a place's home map not read yet: met:<word> rises as a stone's trial is passed
const unread = (world, place, run) =>
  world.maps[world.places[place].home].stones.filter((stone) => !has(run, `met:${stone.word}`));

// the stone to walk to: the unread one nearest the learner on its map; from elsewhere, the first
// unread — stones are laid nearest the entry first, the most frequent word first. all read, none
const reading = (world, place) => (run) => {
  const { home } = world.places[place];
  const left = unread(world, place, run);
  if (left.length === 0) return null;
  const next =
    run.pose.map === home
      ? left.reduce((near, stone) =>
          apart(stone, run.pose) < apart(near, run.pose) ? stone : near,
        )
      : left[0];
  return { map: home, x: next.x, y: next.y };
};

// every stone of the place's home map read
const stones = (world, place) => {
  const { home, name } = world.places[place];
  const laid = world.maps[home].stones.length;
  return {
    id: `${place}.stones`,
    place,
    title: "Read the stones",
    steps: [
      {
        done: (run) => unread(world, place, run).length === 0,
        hint: `Read every stone of ${name}`,
        measure: (run) => ({ done: laid - unread(world, place, run).length, of: laid }),
        target: reading(world, place),
      },
    ],
    reward: { coins: 20 },
  };
};

// a place's spirits are its words fallen due; they gather at the haunt in its tall grass
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
        measure: (run) => ({ done: Math.min(read(run, `rested:${place}`), need), of: need }),
        target: () => post(world, place, "haunt"),
      },
    ],
    reward: { coins: 20 },
  };
};

const errand = (world, place) => {
  const word = wanted(world, place);
  if (word === undefined) return null;
  const keeper = () => post(world, place, "keeper");
  return {
    id: `${place}.errand`,
    place,
    title: "The keeper's errand",
    steps: [
      {
        done: (run) => read(run, `gained:word:${word}`) > 0,
        hint: "Ask the keeper what they need, and find it",
        target: keeper,
      },
      {
        done: (run) => has(run, `errand:${place}`),
        hint: "Bring it to the keeper",
        target: keeper,
      },
    ],
    reward: { coins: 30, refill: true },
  };
};

const question = (world, place) => ({
  id: `${place}.question`,
  place,
  title: "The keeper's question",
  steps: [
    {
      done: (run) => has(run, `asked:${place}`),
      hint: "Answer the keeper's question",
      target: () => post(world, place, "keeper"),
    },
  ],
  reward: { coins: 30 },
});

// the warden wakes on memory and nothing else: its first step points at a stone still unread, where
// a word is first met, and nowhere once all are read — words come to be held over days of answers.
// restoring the crossroads hands over the compass, and the atlas travels
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
        measure: (run, ctx) => ({
          done: Math.min(words.filter((word) => remembered(ctx.memory[word])).length, need),
          of: need,
        }),
        target: reading(world, place),
      },
      {
        done: restored,
        hint: "Face the warden in its lair",
        target: () => post(world, place, "warden"),
      },
    ],
    reward: place === "crossroads" ? { item: "compass" } : {},
  };
};

// a district tells all five, but an errand only where it strews an item to fetch. a wing has no
// keeper and strews nothing, so it tells its spirits and its warden
export const quests = (world, place) =>
  (DISTRICTS.some((district) => district.id === place)
    ? [
        stones(world, place),
        spirits(world, place),
        errand(world, place),
        question(world, place),
        warden(world, place),
      ]
    : [spirits(world, place), warden(world, place)]
  ).filter(Boolean);

// a quest stands at its first unmet step; a complete one at none
const current = (quest, run, ctx) => quest.steps.find((step) => !step.done(run, ctx));

export const complete = (quest, run, ctx) => current(quest, run, ctx) === undefined;

// per open place, each quest at its first unmet step
export const progress = (world, run, ctx) =>
  Object.fromEntries(
    unlocked(world, run).map((place) => [
      place,
      quests(world, place).map((quest) => {
        const step = current(quest, run, ctx);
        return { quest, step, done: step === undefined };
      }),
    ]),
  );

const grant = (settled, quest) => {
  const receipt = `rewarded:${quest.id}`;
  const paid = pay(raise(settled.state.run, receipt), quest.reward);
  return out(
    { ...settled.state, run: paid.run },
    [...settled.effects, { type: "quest", quest: quest.id, done: true }, ...paid.effects],
    [...settled.events, ...flagged(settled.state.run, receipt)],
  );
};

// every complete quest of an open place is rewarded once: its rewarded flag is the receipt,
// so settling a settled state grants nothing
export const settle = (state, ctx) =>
  unlocked(ctx.world, state.run)
    .flatMap((place) => quests(ctx.world, place))
    .filter((quest) => !has(state.run, `rewarded:${quest.id}`) && complete(quest, state.run, ctx))
    .reduce(grant, out(state));

// the tracker's answer for a quest's step: what it says, how far along it is, where it points
const follow = (quest, step, run, ctx) => ({
  place: quest.place,
  title: quest.title,
  hint: step.hint,
  progress: step.measure ? step.measure(run, ctx) : null,
  target: step.target ? step.target(run, ctx) : null,
});

// a place's words fallen due are its memory slipping: their spirits walk its map until laid to rest
const restless = (world, place, due) => {
  const { name } = world.places[place];
  return {
    place,
    title: "Restless spirits",
    hint:
      due.length === 1
        ? `A word of ${name} is due: lay its spirit to rest`
        : `${due.length} words of ${name} are due: lay their spirits to rest`,
    progress: null,
    target: post(world, place, "haunt"),
  };
};

// every place restored, the summit is the last climb; crowned, nothing is left to follow
const summit = (world, run) => {
  if (has(run, "crowned") || restoration(world, run) < 1) return null;
  const peak = world.maps.summit.fixtures.find((fixture) => fixture.kind === "summit");
  return {
    place: null,
    title: "The summit",
    hint: "Climb to the summit and face what waits there",
    progress: null,
    target: { map: "summit", x: peak.x, y: peak.y },
  };
};

// the one step the learner is pointed at, in the first place still unrestored: its woken warden,
// the way on; else its due words; else its first open quest — but never resting spirits for its own
// sake, which waits on words falling due. it reads one place's words, so the screen may ask often
export const tracker = (world, run, ctx) => {
  const place = world.order.find((id) => !has(run, `restored:${id}`));
  if (place === undefined) return summit(world, run);
  const open = quests(world, place)
    .map((quest) => ({ quest, step: current(quest, run, ctx) }))
    .filter(({ step }) => step !== undefined);
  const awake = open.find(
    ({ quest, step }) => quest.id === `${place}.warden` && step === quest.steps[1],
  );
  if (awake) return follow(awake.quest, awake.step, run, ctx);
  const due = world.places[place].words.filter((word) => ctx.due.includes(word));
  if (due.length > 0) return restless(world, place, due);
  const next = open.find(({ quest }) => quest.id !== `${place}.spirits`);
  return follow(next.quest, next.step, run, ctx);
};

// what hangs over who stands on a map: "!" over a keeper whose errand or question is open, "?" over
// a warden its place's memory has woken. the square and a fallow map tell no story
export const markers = (world, run, ctx, map) => {
  const { place } = world.maps[map];
  if (!Object.hasOwn(world.places, place)) return [];
  const told = quests(world, place);
  const quest = (kind) => told.find((entry) => entry.id === `${place}.${kind}`);
  const asking = [quest("errand"), quest("question")].some(
    (entry) => entry !== undefined && !complete(entry, run, ctx),
  );
  const lair = quest("warden");
  const marks = {
    keeper: asking ? "quest" : null,
    warden: current(lair, run, ctx) === lair.steps[1] ? "awake" : null,
  };
  return standing(world, map, run)
    .filter((fixture) => marks[fixture.kind])
    .map((fixture) => ({ x: fixture.x, y: fixture.y, kind: marks[fixture.kind] }));
};
