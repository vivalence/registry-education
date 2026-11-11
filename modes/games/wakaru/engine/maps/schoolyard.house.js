// the schoolroom: desks in their rows, a wall of books, the reading rug, and the teacher's
// bed in the corner
export const schoolyardHouse = {
  id: "schoolyard.house",
  name: "The Schoolhouse",
  kind: "indoor",
  place: "schoolyard",
  dark: false,
  rows: [
    "############",
    "#BBBBB_k__Z#",
    "#__________#",
    "#_t_t_t_t__#",
    "#__________#",
    "#_t_t_t_t__#",
    "#uuu_______#",
    "#uuu_______#",
    "#####D######",
  ],
  spawns: {
    schoolyard: { x: 5, y: 7, facing: "north" },
  },
  portals: [{ x: 5, y: 8, to: "schoolyard", spawn: "schoolyard.house" }],
  fixtures: [{ kind: "bed", x: 10, y: 2 }],
  chests: [{ x: 10, y: 6, loot: { item: "candle" } }],
  pots: [{ x: 10, y: 7 }],
};
