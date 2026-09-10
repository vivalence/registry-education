import { Aperture, Path, sleep } from "@vivalence/typology";
import { lifecycle, UserEntity } from "@vivalence/runtime";
import { lighthouse } from "@vivalence/runtime/scenarios";
import * as domain from "../../domain.viva.js";

export async function world(slugs = ["italian"]) {
  const scenario = await lighthouse.create();
  const daemons = {};
  for (const slug of slugs) {
    await scenario.seedDaemon(slug);
    const die = { runtime: scenario.runtime, daemon: { slug, reference: new Path(`/daemon/${slug}`), domain, aperture: new Aperture() }, register: { modes: [] } };
    await lifecycle.daemon.population.datamap(die, async () => {});
    daemons[slug] = die.daemon;
  }
  let within;
  await scenario.datamap.shard.scope(async () => {
    within = scenario.datamap.shard.carry();
  });
  const em = scenario.datamap.entities.em;
  const user = await within(async () => {
    const created = em.create(UserEntity, { slug: "beef" });
    await em.flush();
    em.setFilterParams("user", { user: created.id });
    return created;
  });
  return { scenario, daemons, user, em, within, settle: () => sleep.ms(40), close: () => scenario.close() };
}
