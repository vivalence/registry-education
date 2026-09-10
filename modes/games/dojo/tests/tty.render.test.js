import { host } from "@vivalence/ghost/host";
import { testRender } from "@opentui/solid";
import { atom } from "nanostores";
import { mime, specimen } from "@vivalence/typology";
import { tokens } from "@vivalence/dapper";
import paladin from "@vivalence/paladin";

const { describe, it, expect } = specimen;

const ENTRY = new URL("../buffer/dojo.jsx", import.meta.url).pathname;
const STORE = Deno.makeTempDirSync({ prefix: "dojo-tty-render-" });

const settle = async (setup, passes = 6) => {
  for (let pass = 0; pass < passes; pass++) {
    await setup.renderOnce();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const literal = (id, known, learning) => ({ id, ontology: "word", trait: { TRANSLATED: { known, learning } }, notes: [] });

const loaded = async () => {
  const bundle = await paladin.bundler(STORE).bundle({ mime: mime.tty.solid, entry: ENTRY });
  const files = [];
  for await (const entry of Deno.readDir(`${STORE}/bundle`)) files.push(entry.name);
  const code = await Deno.readTextFile(`${STORE}/bundle/${files.find((name) => name.endsWith(".mjs"))}`);
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const module = await import(url);
  URL.revokeObjectURL(url);
  return { bundle, module };
};

describe("dojo view — mounted in a tty", { sanitizeResources: false, sanitizeOps: false }, () => {
  it("T-render: a declared set idles with its summary; s commissions and deals; typing the learning face lands a review; the session is kept on the door", async () => {
    const { module } = await loaded();
    const reviews = [];
    const kept = [];
    const buffer = { id: "B1", $data: atom({ set: [{ pick: "feed", limit: 2 }], gameplay: "TYPE", recall: "LEARNING", random: [] }) };
    Object.defineProperty(buffer, "data", { get: () => buffer.$data.get(), set: (value) => buffer.$data.set(value) });
    const routes = {
      "/commission": () => ({ id: "B1", literals: [literal("L1", "dog", "cane"), literal("L2", "cat", "gatto")], data: { knowables: [] } }),
      "/session": (input) => (kept.push(input), { session: Boolean(input.session) }),
    };
    buffer.mode = {
      connection: { call: (path, input) => Promise.resolve(routes[path](input)) },
      daemon: {
        connection: { call: (path, input) => (path === "/review/literal" ? (reviews.push(input), Promise.resolve({})) : Promise.resolve({ known: { name: "english" }, learning: { name: "italiano" } })) },
        statics: {},
      },
    };
    buffer.thread = { id: "T1" };
    const bag = {
      terminal: { dispatch: () => {}, client: { runtime: { entities: { file: { $entities: atom([]) } } } } },
      buffer,
      surface: { place: "frame" },
      palette: tokens.camel("northsea", "2"),
      focused: () => true,
    };
    const setup = await testRender(() => [], { width: 90, height: 24 });
    bag.renderer = setup.renderer;
    const handle = module.default(setup.renderer.root, bag);
    await settle(setup);
    let frame = setup.captureCharFrame();
    expect(frame).toContain("1 clause declared · TYPE · recall learning");
    expect(frame).toContain("p preset → meet");
    await setup.mockInput.typeText("s");
    await settle(setup);
    frame = setup.captureCharFrame();
    expect(frame).toContain("1/2 · word · type · TYPE · recall learning · esc stops");
    expect(frame).toContain("dog");
    expect(frame).toContain("italiano › ▌");
    await setup.mockInput.typeText("cane");
    setup.mockInput.pressEnter();
    await settle(setup);
    frame = setup.captureCharFrame();
    expect(frame).toContain("success · italiano: cane");
    expect(reviews).toEqual([{ signal: "SUCCESS", scope: { literal: "L1" } }]);
    setup.mockInput.pressEnter();
    await settle(setup);
    frame = setup.captureCharFrame();
    expect(frame).toContain("2/2 · word · type");
    expect(frame).toContain("cat");
    expect(kept.at(-1).session.phase).toBe("playing");
    expect(kept.at(-1).session.reps).toBe(1);
    handle.destroy();
    setup.renderer.destroy();
    await Deno.remove(STORE, { recursive: true });
  });
});
