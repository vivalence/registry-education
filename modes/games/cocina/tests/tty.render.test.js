import { host } from "@vivalence/sheets";
import { testRender } from "@opentui/solid";
import { atom } from "nanostores";
import { mime, specimen } from "@vivalence/typology";
import { tokens } from "@vivalence/dapper";
import paladin from "@vivalence/paladin";
import * as session from "../mando/session.js";
import * as world from "../world.js";

const { describe, it, expect } = specimen;

const ENTRY = new URL("../buffer/cocina.jsx", import.meta.url).pathname;
const STORE = Deno.makeTempDirSync({ prefix: "cocina-tty-render-" });

const settle = async (setup, passes = 6) => {
  for (let pass = 0; pass < passes; pass++) {
    await setup.renderOnce();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

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

describe("cocina view — mounted in a tty", { sanitizeResources: false, sanitizeOps: false }, () => {
  it("T-render: a closed kitchen says so; an open one draws the dial, the rail, the cook, the spoken, the lexicon, and follows the buffer", async () => {
    const { module } = await loaded();
    const buffer = { id: "B1", $data: atom({ tier: 0, tempo: 1, phase: "OBEY", history: [], reactions: [], spoken: null, said: "", lexicon: [] }) };
    Object.defineProperty(buffer, "data", { get: () => buffer.$data.get(), set: (value) => buffer.$data.set(value) });
    const bag = { terminal: {}, buffer, surface: { place: "frame" }, palette: tokens.camel("northsea", "2"), focused: () => true };
    const setup = await testRender(() => [], { width: 70, height: 40 });
    bag.renderer = setup.renderer;
    const handle = module.default(setup.renderer.root, bag);
    await settle(setup);
    let frame = setup.captureCharFrame();
    expect(frame).toContain("cocina · closed · greet the chef");
    const lexicon = [{ slug: "cortar.imperative", tier: 0, surfaces: ["corta"], status: "KNOWN" }, { slug: "cebolla.noun", tier: 0, surfaces: ["la cebolla", "cebolla"], status: "UNKNOWN" }];
    const held = { ...world.create(), tickets: [{ id: "t", dish: world.DISHES[0], done: 1, due: 9 }] };
    buffer.data = session.heard(session.begin({ tier: 0, lexicon, world: held }), { command: {}, slugs: [] }, "fríe el huevo");
    await settle(setup);
    frame = setup.captureCharFrame();
    expect(frame).toContain("cocina · OBEY · t0 · ×1 · obeyed 0/3 · commands 0/0");
    expect(frame).toContain("▮▯▯ tortilla   fríe el huevo  ⏱ 9");
    expect(frame).toContain("cook · idle · beat 0 · served 0 · lost 0");
    expect(frame).toContain("chef  «fríe el huevo»");
    expect(frame).toContain("corta  la cebolla");
    handle.destroy();
    setup.renderer.destroy();
    await Deno.remove(STORE, { recursive: true });
  });
});
