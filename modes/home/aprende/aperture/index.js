import { Vector } from "@vivalence/typology";

import { board } from "./board.js";
import { statistics } from "./statistics.js";
import { literals } from "./literals.js";
import { message } from "./message.js";

// ── /assistant — the wakeup surfaces the tutor reads on each visit + the
// helpdesk's single-shot ask. All EXPOSED endpoints.
export const aperture = new Vector()
  .graft(board)
  .graft(statistics)
  .graft(literals)
  .graft(message);
