import { phase as nextPhase, tempo as nextTempo } from "./dial.js";

export const begin = ({ tier, lexicon, world }) => ({ tier, tempo: 1, phase: "OBEY", history: [], reactions: [], spoken: null, said: "", lexicon, world });

export const heard = (data, spoken, said) => ({ ...data, spoken, said });

export const reacted = (data, ok, world) => {
  const reactions = [...data.reactions, ok];
  return { ...data, reactions, phase: nextPhase(reactions), spoken: null, world };
};

export const commanded = (data, ok, said, world) => {
  const history = [...data.history, ok];
  return { ...data, history, tempo: nextTempo(data.tempo, history), said, world };
};

const hits = (list) => list.filter(Boolean).length;

export const streak = (data) => data.reactions.slice(-3);
export const recent = (data) => data.history.slice(-10);
export const obeyed = (data) => `${hits(streak(data))}/3`;
export const commands = (data) => `${hits(recent(data))}/${recent(data).length}`;

export const speaker = (data, world) => (data.phase === "OBEY" ? world : "you");

export const screen = (data, describe, world) =>
  data === null || data.world === undefined
    ? `No ${world} is open on this thread — call begin.`
    : [
        `phase ${data.phase} · tier ${data.tier} · tempo ×${data.tempo} · obeyed ${obeyed(data)} · commands ${commands(data)}`,
        data.spoken === null ? `last said by ${speaker(data, world)}: ${data.said === "" ? "nothing yet" : `«${data.said}»`}` : `spoken, awaiting the learner's reaction: «${data.said}» — judge their answer, then call react`,
        ...describe(data.world),
      ].join("\n");

export const glossed = (lexicon) => lexicon.map((entry) => `${entry.slug} (tier ${entry.tier}) — ${entry.surfaces.join(" · ")} · ${entry.status}`).join("\n");
