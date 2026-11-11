// the woodcutter's cabin: logs stacked by the hearth, a hide rug, a bed in the corner
export const wildwoodHouse = {
  id: "wildwood.house",
  name: "The Woodcutter's Cabin",
  kind: "indoor",
  place: "wildwood",
  dark: false,
  rows: [
    "###########",
    "#xx_kk_B_Z#",
    "#x________#",
    "#__uuu____#",
    "#__uuu_tt_#",
    "#_________#",
    "#_________#",
    "#####D#####",
  ],
  spawns: {
    wildwood: { x: 5, y: 6, facing: "north" },
  },
  portals: [{ x: 5, y: 7, to: "wildwood", spawn: "wildwood.house" }],
  fixtures: [{ kind: "bed", x: 9, y: 2 }],
  chests: [{ x: 9, y: 5, loot: { coins: 25 } }],
  pots: [{ x: 1, y: 5 }],
};
