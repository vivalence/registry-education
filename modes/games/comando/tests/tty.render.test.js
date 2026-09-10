import { host } from "@vivalence/sheets";
import { testRender } from "@opentui/solid";
import { atom } from "nanostores";
import { mime, specimen } from "@vivalence/typology";
import { tokens } from "@vivalence/dapper";
import paladin from "@vivalence/paladin";
import * as session from "../mando/session.js";
import * as world from "../world.js";

const { describe, it, expect } = specimen;

const ENTRY = new URL("../buffer/comando.jsx", import.meta.url).pathname;
const STORE = Deno.makeTempDirSync({ prefix: "comando-tty-render-" });

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

describe("comando view — mounted in a tty", { sanitizeResources: false, sanitizeOps: false }, () => {
  it("T-render: a closed board says so; an open one draws the dial, the grid, the tally, the spoken, the lexicon, and follows the buffer", async () => {
    const { module } = await loaded();
    const buffer = { id: "B1", $data: atom({ tier: 0, tempo: 1, phase: "OBEY", history: [], reactions: [], spoken: null, said: "", lexicon: [] }) };
    Object.defineProperty(buffer, "data", { get: () => buffer.$data.get(), set: (value) => buffer.$data.set(value) });
    const bag = { terminal: {}, buffer, surface: { place: "frame" }, palette: tokens.camel("northsea", "2"), focused: () => true };
    const setup = await testRender(() => [], { width: 70, height: 40 });
    bag.renderer = setup.renderer;
    const handle = module.default(setup.renderer.root, bag);
    await settle(setup);
    let frame = setup.captureCharFrame();
    expect(frame).toContain("comando · closed · greet the commander");
    const lexicon = [{ slug: "arriba.adverb", tier: 0, surfaces: ["arriba"], status: "KNOWN" }, { slug: "abajo.adverb", tier: 0, surfaces: ["abajo"], status: "UNKNOWN" }];
    const held = { ...world.create({ units: 1 }), units: [{ id: 0, unit: "soldado.noun", color: "rojo.adjective", x: 2, y: 3 }] };
    buffer.data = session.heard(session.begin({ tier: 0, lexicon, world: held }), { command: {}, slugs: [] }, "arriba");
    await settle(setup);
    frame = setup.captureCharFrame();
    expect(frame).toContain("comando · OBEY · t0 · ×1 · obeyed 0/3 · commands 0/0");
    const board = frame.split("\n").filter((row) => /^(· |S |◆ |▒ ){8}/.test(row));
    expect(board.length).toBe(8);
    expect(board[3]).toContain("· · S · · · · ·");
    expect(frame).toContain("soldado rojo (2, 3) · beat 0 · score 0 · lost 0");
    expect(frame).toContain("commander  «arriba»");
    expect(frame).toContain("arriba  abajo");
    handle.destroy();
    setup.renderer.destroy();
    await Deno.remove(STORE, { recursive: true });
  });
});
