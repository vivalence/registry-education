import { Vector } from "@vivalence/typology";

import { vocabolario } from "./vocabolario.js";
import { grammatica } from "./grammatica.js";
import { frasi } from "./frasi.js";

export const emitter = new Vector().graft(vocabolario).graft(grammatica).graft(
  frasi,
);
