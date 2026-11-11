// the hall of forms: two colonnades, long rugs between them, and the dais at the far end
// where the warden keeps
export const forms = {
  id: "forms",
  name: "Hall of Forms",
  kind: "indoor",
  place: "forms",
  dark: false,
  rows: [
    "########################",
    "#B_B___++++++++++___B_B#",
    "#______++++++++++______#",
    "#______++++++++++______#",
    "#____I____uuuu____I____#",
    "#_uu______uuuu______uu_#",
    "#_uu______uuuu______uu_#",
    "#_uu_I____uuuu____I_uu_#",
    "#_uu______uuuu______uu_#",
    "#_uu______uuuu______uu_#",
    "#_uu_I____uuuu____I_uu_#",
    "#_uu______uuuu______uu_#",
    "#_uu______uuuu______uu_#",
    "#____I____uuuu____I____#",
    "#__________uu__________#",
    "#__t________________t__#",
    "#______________________#",
    "###########D############",
  ],
  spawns: {
    square: { x: 11, y: 16, facing: "north" },
  },
  portals: [{ x: 11, y: 17, to: "square", spawn: "forms" }],
  fixtures: [{ kind: "warden", x: 11, y: 2, facing: "south" }],
  chests: [],
  pots: [
    { x: 1, y: 15 },
    { x: 22, y: 15 },
  ],
};
