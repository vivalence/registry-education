// the cottage the lane is named for: the wide hearth, the rug before it, and in the chest
// by the bed the rod that fishes every water in the valley
export const hearthHouse = {
  id: "hearth.house",
  name: "Hearth Cottage",
  kind: "indoor",
  place: "hearth",
  dark: false,
  rows: [
    "############",
    "#B_kkk__BBZ#",
    "#__uuu_____#",
    "#__uuu_____#",
    "#tt________#",
    "#tt________#",
    "#__________#",
    "#####D######",
  ],
  spawns: {
    hearth: { x: 5, y: 6, facing: "north" },
  },
  portals: [{ x: 5, y: 7, to: "hearth", spawn: "hearth.house" }],
  fixtures: [{ kind: "bed", x: 10, y: 2 }],
  chests: [{ x: 10, y: 4, loot: { item: "rod" } }],
  pots: [{ x: 9, y: 5 }],
};
