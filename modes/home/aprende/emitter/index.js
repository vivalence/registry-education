import { Vector } from "@vivalence/typology";

import { deck } from "./deck.js";
import { nyan } from "./nyan.js";
import { riddle } from "./riddle.js";

export const emitter = new Vector().graft(deck).graft(nyan).graft(riddle);
