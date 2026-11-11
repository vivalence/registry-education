// the stacks: shelves in long rows with aisles between, reading tables halfway down, a
// runner to the back where the warden keeps the oldest books
export const stacks = {
  id: "stacks",
  name: "The Stacks",
  kind: "indoor",
  place: "stacks",
  dark: false,
  rows: [
    "##########################",
    "#BBBBBBBB__uuuu__BBBBBBBB#",
    "#_________uuuuuu_________#",
    "#_BBBBBBB__uuuu__BBBBBBB_#",
    "#__________uuuu__________#",
    "#__________uuuu__________#",
    "#_BBBBBBB__uuuu__BBBBBBB_#",
    "#__________uuuu__________#",
    "#__________uuuu__________#",
    "#_BBBBBBB__uuuu__BBBBBBB_#",
    "#__________uuuu__________#",
    "#__________uuuu__________#",
    "#___t__t___uuuu___t__t___#",
    "#___t__t___uuuu___t__t___#",
    "#__________uuuu__________#",
    "#_BB_______uuuu_______BB_#",
    "#________________________#",
    "############D#############",
  ],
  spawns: {
    square: { x: 12, y: 16, facing: "north" },
  },
  portals: [{ x: 12, y: 17, to: "square", spawn: "stacks" }],
  fixtures: [{ kind: "warden", x: 12, y: 1, facing: "south" }],
  chests: [],
  pots: [
    { x: 1, y: 15 },
    { x: 24, y: 15 },
  ],
};
