// the barracks: bunks along the wall, racks of kit, a mess table by the stove
export const drillyardHouse = {
  id: "drillyard.house",
  name: "The Barracks",
  kind: "indoor",
  place: "drillyard",
  dark: false,
  rows: [
    "############",
    "#Z_Z_Z_kkBB#",
    "#________BB#",
    "#____uu____#",
    "#_tt_uu__xx#",
    "#_tt_uu___x#",
    "#__________#",
    "#####D######",
  ],
  spawns: {
    drillyard: { x: 5, y: 6, facing: "north" },
  },
  portals: [{ x: 5, y: 7, to: "drillyard", spawn: "drillyard.house" }],
  fixtures: [{ kind: "bed", x: 1, y: 2 }],
  chests: [{ x: 10, y: 6, loot: { item: "charm" } }],
  pots: [{ x: 1, y: 6 }],
};
