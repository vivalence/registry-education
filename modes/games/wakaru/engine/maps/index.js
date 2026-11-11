import { square } from "./square.js";
import { market } from "./market.js";
import { hearth } from "./hearth.js";
import { crossroads } from "./crossroads.js";
import { clockhill } from "./clockhill.js";
import { wildwood } from "./wildwood.js";
import { bathhouse } from "./bathhouse.js";
import { schoolyard } from "./schoolyard.js";
import { drillyard } from "./drillyard.js";
import { marketHouse } from "./market.house.js";
import { hearthHouse } from "./hearth.house.js";
import { crossroadsHouse } from "./crossroads.house.js";
import { clockhillHouse } from "./clockhill.house.js";
import { wildwoodHouse } from "./wildwood.house.js";
import { bathhouseHouse } from "./bathhouse.house.js";
import { schoolyardHouse } from "./schoolyard.house.js";
import { drillyardHouse } from "./drillyard.house.js";
import { shop } from "./shop.js";
import { stacks } from "./stacks.js";
import { forms } from "./forms.js";
import { forge } from "./forge.js";
import { summit } from "./summit.js";

// every authored map by id. a district's outdoor map shares its place's id; an interior is named for
// what it is (shop · stacks · forms · forge · summit) or for the district it stands in (<place>.house)
export const MAPS = {
  square,
  market,
  hearth,
  crossroads,
  clockhill,
  wildwood,
  bathhouse,
  schoolyard,
  drillyard,
  "market.house": marketHouse,
  "hearth.house": hearthHouse,
  "crossroads.house": crossroadsHouse,
  "clockhill.house": clockhillHouse,
  "wildwood.house": wildwoodHouse,
  "bathhouse.house": bathhouseHouse,
  "schoolyard.house": schoolyardHouse,
  "drillyard.house": drillyardHouse,
  shop,
  stacks,
  forms,
  forge,
  summit,
};

// where each outdoor map lies on the valley's plane, as [column, row]: the atlas draws them there.
// the summit's cave lies above the clock hill, whose north cliff it is entered by
export const LAYOUT = {
  summit: [1, -1],
  wildwood: [0, 0],
  clockhill: [1, 0],
  schoolyard: [2, 0],
  hearth: [0, 1],
  square: [1, 1],
  market: [2, 1],
  bathhouse: [0, 2],
  crossroads: [1, 2],
  drillyard: [2, 2],
};
