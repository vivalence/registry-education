// the forge: the great hearth across the back wall, anvils about the floor, crates of iron
// in the corners; the warden keeps the fire
export const forge = {
  id: "forge",
  name: "The Forge",
  kind: "indoor",
  place: "forge",
  dark: false,
  rows: [
    "######################",
    "#xxB___kkkkkkkk___Bxx#",
    "#x_____kkkkkkkk_____x#",
    "#____________________#",
    "#____________________#",
    "#__A______++______A__#",
    "#_________++_________#",
    "#____t____++____t____#",
    "#__A______++______A__#",
    "#_________++_________#",
    "#xx_______++_______xx#",
    "#x________++________x#",
    "#____________________#",
    "#__I______________I__#",
    "#____________________#",
    "##########D###########",
  ],
  spawns: {
    square: { x: 10, y: 14, facing: "north" },
  },
  portals: [{ x: 10, y: 15, to: "square", spawn: "forge" }],
  fixtures: [{ kind: "warden", x: 11, y: 3, facing: "south" }],
  chests: [],
  pots: [
    { x: 9, y: 13 },
    { x: 12, y: 13 },
  ],
};
