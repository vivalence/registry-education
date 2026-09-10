import { strong } from "./dial.js";
import { commands, obeyed, speaker } from "./session.js";

export const PHASES = ["OBEY", "COMMAND"];

export const opened = (data) => data.world !== undefined;

export const dial = (data) => ({ phase: data.phase, tier: data.tier, tempo: data.tempo, obeyed: obeyed(data), commands: commands(data) });

export const dialed = (name, data) => `${name} · ${data.phase} · t${data.tier} · ×${data.tempo} · obeyed ${obeyed(data)} · commands ${commands(data)}`;

export const chips = (lexicon) => lexicon.map((entry) => ({ word: entry.surfaces[0], on: strong(entry.status), title: `${entry.slug} · ${entry.status}` }));

export const said = (data) => (data.said === "" ? "—" : `«${data.said}»`);

export const spoken = (data, world) => `${speaker(data, world)}  ${said(data)}`;

export const empty = (world) => `greet the ${world} — it opens on the first exchange`;
