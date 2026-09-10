import { specimen } from "@vivalence/typology";
import * as world from "../world.js";
import * as dial from "../mando/dial.js";
import * as session from "../mando/session.js";
import { face, lexemeOf, slugs } from "../mando/lexicon.js";
import { tiers } from "../tiers.js";

const { describe, it, expect } = specimen;

const board = () => ({ ...world.create({ w: 8, h: 8, units: 1 }), units: [{ id: 0, unit: "soldado.noun", color: "rojo.adjective", x: 4, y: 4 }], hazards: [{ x: 0, y: 0 }], goals: [] });

describe("comando world — turn-based, pure", () => {
  it("W-order: a move shifts the addressee by delta × count, clamped to the board; stop moves nothing", () => {
    const moved = world.order(board(), { kind: "move", direction: "arriba.adverb", count: 2, unit: null, color: null });
    expect([moved.units[0].x, moved.units[0].y]).toEqual([4, 2]);
    const clamped = world.order(board(), { kind: "move", direction: "derecha.noun", count: 3, unit: null, color: null });
    expect(clamped.units[0].x).toBe(7);
    expect(world.order(board(), { kind: "stop", direction: null, count: 1, unit: null, color: null })).toEqual(board());
  });

  it("W-step: a goal under a unit scores, an overdue goal is lost, one goal spawns per beat up to ceil(tempo)", () => {
    const held = { ...board(), goals: [{ id: "a", x: 4, y: 4, due: 9 }, { id: "b", x: 1, y: 1, due: 0 }] };
    const next = world.step(held, 1);
    expect(next.beat).toBe(1);
    expect(next.score).toBe(1);
    expect(next.lost).toBe(1);
    expect(next.goals.length).toBe(1);
    expect(world.step(world.step(world.step(held, 2.5), 2.5), 2.5).goals.length).toBe(3);
    expect(world.step(world.step(world.step(world.step(held, 2.5), 2.5), 2.5), 2.5).goals.length).toBe(3);
  });

  it("W-speak: tier 0 speaks one direction; tier 1 adds a numeral when count > 1; the utterance is the lexicon's face", () => {
    const spoken = world.speak(board(), 0);
    expect(spoken.slugs).toEqual([spoken.command.direction]);
    expect(world.DIRECTIONS).toContain(spoken.command.direction);
    expect(world.utterance(spoken)).toBe(face(spoken.command.direction));
    const loud = world.speak(board(), 2);
    expect(loud.slugs).toContain("soldado.noun");
    expect(loud.slugs).toContain("rojo.adjective");
    expect(world.utterance(loud).startsWith("soldado rojo")).toBe(true);
  });

  it("W-tiers: every tier slug is a lexeme; tier 0 holds the nine controller words", () => {
    for (const slug of tiers.flat()) expect(slugs).toContain(slug);
    expect(tiers[0].length).toBe(9);
    expect(lexemeOf("izquierda.noun").surfaces[0]).toBe("a la izquierda");
  });

  it("D-dial: tier 1 opens at 80 % strong on tier 0; three clean reactions open COMMAND; tempo moves after five", () => {
    const strong = Object.fromEntries(tiers[0].map((slug) => [slug, "KNOWN"]));
    expect(dial.tier(tiers, strong)).toBe(1);
    expect(dial.tier(tiers, { ...strong, "parar.imperative": "LEARNING", "girar.imperative": "UNKNOWN" })).toBe(0);
    expect(dial.phase([true, true])).toBe("OBEY");
    expect(dial.phase([false, true, true, true])).toBe("COMMAND");
    expect(dial.tempo(1, [true, true, true, true])).toBe(1);
    expect(dial.tempo(1, [true, true, true, true, true])).toBe(1.5);
  });

  it("W-grid: the board is h rows of w cells, each unit · goal · hazard · empty with its glyph and a title", () => {
    const held = { ...board(), goals: [{ id: "g", x: 1, y: 1, due: 9 }] };
    const cells = world.grid(held);
    expect(cells.length).toBe(8);
    expect(cells[0].length).toBe(8);
    expect(cells[4][4]).toEqual({ x: 4, y: 4, kind: "unit", glyph: "S", title: "soldado rojo (4, 4)" });
    expect(cells[1][1]).toEqual({ x: 1, y: 1, kind: "goal", glyph: "◆", title: "goal (1, 1) · due 9" });
    expect(cells[0][0]).toEqual({ x: 0, y: 0, kind: "hazard", glyph: "▒", title: "hazard (0, 0)" });
    expect(cells[2][2]).toEqual({ x: 2, y: 2, kind: "empty", glyph: "·", title: "(2, 2)" });
  });

  it("S-screen: the model's screen names phase, tier, tempo, the spoken order and the board", () => {
    const data = session.heard(session.begin({ tier: 0, lexicon: [], world: board() }), { command: { kind: "move", direction: "arriba.adverb", count: 1, unit: null, color: null }, slugs: ["arriba.adverb"], expect: {} }, "arriba");
    const text = session.screen(data, world.describe, "commander");
    expect(text.split("\n")[0]).toBe("phase OBEY · tier 0 · tempo ×1 · obeyed 0/3 · commands 0/0");
    expect(text).toContain("awaiting the learner's reaction: «arriba»");
    expect(text).toContain("soldado rojo at (4, 4)");
    expect(session.screen(null, world.describe, "commander")).toBe("No commander is open on this thread — call begin.");
  });
});
