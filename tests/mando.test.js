import { specimen } from "@vivalence/typology";

const { describe, it, expect } = specimen;

const ROOT = new URL("../modes/games/", import.meta.url).pathname;
const KIT = ["lexicon.js", "dial.js", "review.js", "session.js", "hud.js"];

const carriers = async () => {
  const found = [];
  for await (const slug of Deno.readDir(ROOT)) {
    if (!slug.isDirectory) continue;
    try {
      await Deno.stat(`${ROOT}${slug.name}/mando`);
      found.push(`${ROOT}${slug.name}`);
    } catch {}
  }
  return found.sort();
};

describe("the mando kit — one copy per game, pinned equal", () => {
  it("P-mando-equal: every game that carries mando/ carries the same lexicon · dial · review · session · hud", async () => {
    const games = await carriers();
    expect(games.map((game) => game.slice(ROOT.length))).toEqual(["cocina", "comando"]);
    const [reference, ...others] = games;
    for (const file of KIT) {
      const canon = await Deno.readTextFile(`${reference}/mando/${file}`);
      for (const game of others) {
        const copy = await Deno.readTextFile(`${game}/mando/${file}`);
        expect(copy === canon, `${game.slice(ROOT.length)}/mando/${file} drifted from ${reference.slice(ROOT.length)}`).toBe(true);
      }
    }
  });
});
