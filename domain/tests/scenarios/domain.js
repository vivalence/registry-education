import { contexts, shape, shard, steer } from "@vivalence/typology";
import { daemon as scenarios } from "@vivalence/runtime/scenarios";
import * as domain from "../../domain.viva.js";

export async function mount() {
  const scenario = await scenarios.create({ domain });
  const tools = shape.proxy(domain.tools, steer.strategy.direct);
  const invoke = (path, input, extra = {}) =>
    scenario.scoped(() => tools[path]({ input, ...shard.context.lift(contexts.host, scenario.daemon), user: scenario.fixtures.user, mode: null, thread: null, ...extra }));
  return { ...scenario, domain, tools, invoke };
}
