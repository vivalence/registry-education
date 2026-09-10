import { RETAINED as retained } from "./note/retained.js";
import { TRACED } from "./note/traced.js";
import { RETAINED } from "./literal/retained.js";
import { ANNOTATED } from "./literal/annotated.js";
import { RANKED } from "./literal/ranked.js";
import { TRANSLATED, EXEMPLIFIED, VOCALIZED, CONJUGATED } from "./literal/claims.js";

export const literal = [RETAINED, ANNOTATED, RANKED, TRANSLATED, EXEMPLIFIED, VOCALIZED, CONJUGATED];
export const symbol = [];
export const note = [retained, TRACED];
