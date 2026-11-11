// the waystation where the roads cross: tables for travellers, a bed for the night
export const crossroadsHouse = {
  id: "crossroads.house",
  name: "The Waystation",
  kind: "indoor",
  place: "crossroads",
  dark: false,
  rows: [
    "############",
    "#BBB_kk_B_Z#",
    "#__________#",
    "#_tt___tt__#",
    "#_tt___tt__#",
    "#____uu____#",
    "#____uu____#",
    "#__________#",
    "#####D######",
  ],
  spawns: {
    crossroads: { x: 5, y: 7, facing: "north" },
  },
  portals: [{ x: 5, y: 8, to: "crossroads", spawn: "crossroads.house" }],
  fixtures: [{ kind: "bed", x: 10, y: 2 }],
  chests: [{ x: 10, y: 6, loot: { item: "tea" } }],
  pots: [{ x: 1, y: 6 }],
};
