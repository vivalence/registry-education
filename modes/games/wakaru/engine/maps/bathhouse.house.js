// inside the bathhouse: the hot bath between its benches, towels shelved, the attendant's
// bed by the stove
export const bathhouseHouse = {
  id: "bathhouse.house",
  name: "The Baths",
  kind: "indoor",
  place: "bathhouse",
  dark: false,
  rows: [
    "############",
    "#BB_k___B_Z#",
    "#__________#",
    "#_n~~~~n___#",
    "#_n~~~~n_t_#",
    "#________t_#",
    "#uuu_______#",
    "#uuu_______#",
    "#####D######",
  ],
  spawns: {
    bathhouse: { x: 5, y: 7, facing: "north" },
  },
  portals: [{ x: 5, y: 8, to: "bathhouse", spawn: "bathhouse.house" }],
  fixtures: [{ kind: "bed", x: 10, y: 2 }],
  chests: [{ x: 10, y: 6, loot: { item: "tea" } }],
  pots: [{ x: 8, y: 7 }],
};
