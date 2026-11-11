// the general store on the square: the vendor behind the counter, stock on every wall
export const shop = {
  id: "shop",
  name: "The General Store",
  kind: "indoor",
  place: null,
  dark: false,
  rows: [
    "############",
    "#BBBBBBBBBB#",
    "#xxBB_BBxxB#",
    "#CCCCCCCCCC#",
    "#__________#",
    "#_BB_uu_BB_#",
    "#_BB_uu_BB_#",
    "#x________x#",
    "#####D######",
  ],
  spawns: {
    square: { x: 5, y: 7, facing: "north" },
  },
  portals: [{ x: 5, y: 8, to: "square", spawn: "shop" }],
  fixtures: [{ kind: "vendor", x: 5, y: 2, facing: "south" }],
  chests: [],
  pots: [],
};
