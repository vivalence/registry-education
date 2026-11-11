// inside the clock tower: the weights' two shafts, shelves of gears, the keeper's cot under
// the works
export const clockhillHouse = {
  id: "clockhill.house",
  name: "The Clock Tower",
  kind: "indoor",
  place: "clockhill",
  dark: false,
  rows: [
    "##########",
    "#BB_kk_BZ#",
    "#________#",
    "#_I_uu_I_#",
    "#___uu___#",
    "#_t_uu_t_#",
    "#________#",
    "#________#",
    "####D#####",
  ],
  spawns: {
    clockhill: { x: 4, y: 7, facing: "north" },
  },
  portals: [{ x: 4, y: 8, to: "clockhill", spawn: "clockhill.house" }],
  fixtures: [{ kind: "bed", x: 8, y: 2 }],
  chests: [{ x: 1, y: 6, loot: { item: "candle" } }],
  pots: [{ x: 8, y: 6 }],
};
