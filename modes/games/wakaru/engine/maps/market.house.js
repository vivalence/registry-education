// the merchant's house: stock crated by the bed, a counting table, the rug where the day's
// coins are sorted
export const marketHouse = {
  id: "market.house",
  name: "The Merchant's House",
  kind: "indoor",
  place: "market",
  dark: false,
  rows: [
    "############",
    "#BBB_k__xxZ#",
    "#_______x__#",
    "#_tt_uuuu__#",
    "#_tt_uuuu__#",
    "#__________#",
    "#__________#",
    "#####D######",
  ],
  spawns: {
    market: { x: 5, y: 6, facing: "north" },
  },
  portals: [{ x: 5, y: 7, to: "market", spawn: "market.house" }],
  fixtures: [{ kind: "bed", x: 10, y: 2 }],
  chests: [{ x: 10, y: 5, loot: { coins: 30 } }],
  pots: [{ x: 1, y: 5 }],
};
