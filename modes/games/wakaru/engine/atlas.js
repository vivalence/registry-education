// the authored layer of the world: which symbol sets make which district, in what order they open.
// every word inside a district is read from the domain (/atlas); nothing here names a word.

export const STATUS = ["UNTOUCHED", "UNKNOWN", "LEARNING", "KNOWN", "GRADUATED"];

const RANK = Object.fromEntries(STATUS.map((status, index) => [status, index]));

// a word the learner holds: its retention reached LEARNING (recall above half for six hours or more)
export const remembered = (status) => RANK[status ?? "UNTOUCHED"] >= RANK.LEARNING;

export const rank = (status) => RANK[status ?? "UNTOUCHED"];

// the share of a set the learner holds, 0..1 — what blooms a district and wakes its warden
export const share = (memory, ids) =>
  ids.length === 0 ? 0 : ids.filter((id) => remembered(memory[id])).length / ids.length;

// memory never holds a paradigm, only its forms: folded, a paradigm stands at its weakest form (an
// untouched form leaves it untouched, absent as untouched words are), so every reader of memory —
// stones, spirits, wardens, quests, the harness — holds a forge as its forms are held
export const fold = (words, memory) => {
  const folded = { ...memory };
  for (const word of Object.values(words)) {
    const forms = word.ontology === "conjugation" ? Object.values(word.paradigm) : [];
    if (forms.length === 0) continue;
    const weakest = STATUS[Math.min(...forms.map((form) => rank(memory[form])))];
    if (weakest === "UNTOUCHED") delete folded[word.id];
    else folded[word.id] = weakest;
  }
  return folded;
};

// the warden only shows once the district is mostly held
export const WAKING = 0.6;

// the districts, in the order they open: each restored district opens the next
export const DISTRICTS = [
  {
    id: "market",
    name: "Market Row",
    biome: "market",
    sets: ["domain.food", "domain.money", "domain.clothing"],
  },
  {
    id: "hearth",
    name: "Hearth Lane",
    biome: "hearth",
    sets: ["domain.family", "domain.home", "domain.relationship", "domain.social"],
  },
  {
    id: "crossroads",
    name: "The Crossroads",
    biome: "stone",
    sets: ["domain.city", "domain.transport", "domain.travel", "domain.space"],
  },
  {
    id: "clockhill",
    name: "Clock Hill",
    biome: "brass",
    sets: ["domain.time", "domain.weekday", "domain.month", "functional.time", "functional.number"],
  },
  {
    id: "wildwood",
    name: "Wildwood",
    biome: "forest",
    sets: ["domain.nature", "domain.animals", "domain.weather"],
  },
  {
    id: "bathhouse",
    name: "The Bathhouse",
    biome: "water",
    sets: ["domain.body", "domain.health", "domain.mind", "domain.state"],
  },
  {
    id: "schoolyard",
    name: "Schoolyard",
    biome: "chalk",
    sets: ["domain.education", "domain.work", "domain.entertainment"],
  },
  { id: "drillyard", name: "Drill Yard", biome: "sand", sets: ["domain.mando"] },
];

// the wings: not a district's topic but a kind of knowing, opened by how many districts stand restored
export const WINGS = [
  { id: "stacks", name: "The Stacks", biome: "paper", draw: "common", opens: 1 },
  {
    id: "forms",
    name: "Hall of Forms",
    biome: "ink",
    sets: [
      "functional.pronoun",
      "functional.question",
      "functional.negation",
      "functional.connector",
      "functional.degree",
      "functional.intensifier",
      "functional.politeness",
      "functional.discourse",
      "functional.aspect",
      "functional.grammar",
    ],
    opens: 2,
  },
  { id: "forge", name: "The Forge", biome: "ember", draw: "conjugation", opens: 3 },
];

export const PLACES = [...DISTRICTS, ...WINGS];

export const place = (id) => PLACES.find((entry) => entry.id === id);

// open = travel allowed: the hub always, the first district always, each next district once the one before
// it is restored, a wing once enough districts are; read off the flags, never stored
export const unlocked = (world, run) => {
  const restored = (id) => run.flags.includes(`restored:${id}`);
  const districts = world.order.filter((id) => !place(id).opens);
  const standing = districts.filter(restored).length;
  return world.order.filter((id) => {
    const entry = place(id);
    if (entry.opens) return standing >= entry.opens;
    const index = districts.indexOf(id);
    return index === 0 || restored(districts[index - 1]);
  });
};
