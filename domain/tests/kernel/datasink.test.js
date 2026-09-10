import { specimen, sleep } from "@vivalence/typology";
import { traits } from "@vivalence/runtime";
import { world } from "../scenarios/italian.js";
import { datasink } from "../../../topographies/english-to-italian/italian.viva.js";

const { DATASINK } = traits.mode;
const DEBOUNCE = 1500;

specimen.describe("the italian topography's DATASINK drains on /after/literal/update, through italian's branch only", { sanitizeResources: false, sanitizeOps: false }, () => {
  let rig;
  let directory;
  let mode;

  const written = async () => {
    const files = [];
    try {
      for await (const entry of Deno.readDir(`${directory}/dataset/literals`)) files.push(entry.name);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    return files.sort();
  };

  specimen.beforeAll(async () => {
    rig = await world(["italian", "spanish"]);
    directory = await Deno.makeTempDir();
    await rig.within(async () => {
      for (const slug of ["italian", "spanish"]) {
        const { entities } = rig.daemons[slug];
        const topography = entities.mode.create({ type: "topography", slug: "english-to-italian" });
        const sentence = entities.symbol.create({ slug: "sentence", mode: topography, traits: ["TOPOGRAPHICAL"] });
        const row = entities.literal.create({ slug: "la-casa-e-grande", mode: topography, trait: { TRANSLATED: { known: "the house is big", learning: "la casa è grande" } }, traits: ["TRANSLATED"] });
        row.symbols.add(sentence);
      }
      await rig.em.flush();
      await rig.settle();
    });
    mode = { manifest: { type: "topography", slug: "english-to-italian", traits: ["DATASINK"] }, module: { datasink, source: { dirname: directory } } };
    await DATASINK(mode, rig.daemons.italian).finalize();
  });

  specimen.afterAll(async () => {
    await rig.close();
    await Deno.remove(directory, { recursive: true });
  });

  specimen.it("an update to italian's row drains the sink after its debounce", () =>
    rig.within(async () => {
      const row = await rig.daemons.italian.entities.literal.findOne({ slug: "la-casa-e-grande" });
      row.assign({ trait: { ...row.trait, TRANSLATED: { known: "the house is large", learning: "la casa è grande" } } });
      await rig.em.flush();
      specimen.expect(await written()).toEqual([]);
      await sleep.ms(DEBOUNCE + 400);
      specimen.expect(await written()).toEqual(["sentences.js"]);
      const text = await Deno.readTextFile(`${directory}/dataset/literals/sentences.js`);
      specimen.expect(text).toContain("the house is large");
    }));

  specimen.it("an update to spanish's row of the same slug never reaches italian's sink", () =>
    rig.within(async () => {
      await Deno.remove(`${directory}/dataset`, { recursive: true }).catch(() => {});
      // findOne, never findOneOrFail: the mint scopes six verbs only — findOneOrFail returns italian's row (m1 mint-scope-holes)
      const row = await rig.daemons.spanish.entities.literal.findOne({ slug: "la-casa-e-grande" });
      row.assign({ trait: { ...row.trait, TRANSLATED: { known: "la casa es grande", learning: "la casa è grande" } } });
      await rig.em.flush();
      await sleep.ms(DEBOUNCE + 400);
      specimen.expect(await written()).toEqual([]);
    }));
});
