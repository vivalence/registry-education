import { specimen } from "@vivalence/typology";
import * as world from "../world.js";
import * as dial from "../mando/dial.js";
import * as session from "../mando/session.js";
import { face, slugs } from "../mando/lexicon.js";
import { tiers } from "../tiers.js";

const { describe, it, expect } = specimen;

const tortilla = (done = 0, due = 9) => ({ id: "t", dish: world.DISHES[0], done, due });
const rail = (...tickets) => ({ ...world.create(), tickets });

describe("cocina world — turn-based, pure", () => {
  it("W-order: the step a ticket wants advances it and the cook hits; any other step cooks nothing", () => {
    const hit = world.order(rail(tortilla()), { prep: "cortar.imperative", ingredient: "cebolla.noun", count: 1 });
    expect(hit.tickets[0].done).toBe(1);
    expect(hit.cook).toEqual({ prep: "cortar.imperative", ingredient: "cebolla.noun", count: 1, hit: true });
    const miss = world.order(rail(tortilla()), { prep: "freír.imperative", ingredient: "huevo.noun", count: 1 });
    expect(miss.tickets[0].done).toBe(0);
    expect(miss.cook.hit).toBe(false);
  });

  it("W-step: a finished ticket is served, an overdue one is lost, one ticket spawns per beat up to ceil(tempo)", () => {
    const next = world.step(rail(tortilla(3), { ...tortilla(1, 0), id: "late" }), 1);
    expect(next.beat).toBe(1);
    expect(next.score).toBe(1);
    expect(next.lost).toBe(1);
    expect(next.tickets.length).toBe(1);
    expect(next.tickets[0].due).toBe(11);
    expect(world.step(world.step(world.step(world.create(), 2.5), 2.5), 2.5).tickets.length).toBe(3);
    expect(world.step(world.step(world.step(world.step(world.create(), 2.5), 2.5), 2.5), 2.5).tickets.length).toBe(3);
  });

  it("W-speak: a ticket's next step is spoken as prep + ingredient at tier 0; tier 1 may count; the utterance is the lexicon's face", () => {
    const spoken = world.speak(rail(tortilla(1)), 0);
    expect(spoken.command).toEqual({ prep: "freír.imperative", ingredient: "huevo.noun", count: 1 });
    expect(spoken.slugs).toEqual(["freír.imperative", "huevo.noun"]);
    expect(world.utterance(spoken)).toBe("fríe el huevo");
    expect(world.utterance({ command: { prep: "cortar.imperative", ingredient: "huevo.noun", count: 2 } })).toBe("corta dos huevos");
    expect(face("cortar.imperative")).toBe("corta");
  });

  it("W-tiers: every tier slug is a lexeme; tier 0 holds the four preps and five ingredients", () => {
    for (const slug of tiers.flat()) expect(slugs).toContain(slug);
    expect(tiers[0].length).toBe(9);
    expect(dial.tier(tiers, Object.fromEntries(tiers[0].map((slug) => [slug, "GRADUATED"])))).toBe(1);
  });

  it("W-rail: a ticket shows its progress, its next step in Spanish and the beats left; the screen names the cook's last step", () => {
    const held = world.order(rail(tortilla()), { prep: "cortar.imperative", ingredient: "cebolla.noun", count: 1 });
    expect(world.progress(held.tickets[0])).toBe("▮▯▯");
    expect(world.stepSaid(world.next(held.tickets[0]))).toBe("fríe el huevo");
    expect(world.remaining(held, held.tickets[0])).toBe(9);
    const data = session.begin({ tier: 0, lexicon: [], world: held });
    expect(session.screen(data, world.describe, "chef")).toContain("the cook last did: corta la cebolla — a ticket advanced");
  });
});
