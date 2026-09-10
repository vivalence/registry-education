import { array } from "@vivalence/typology";
import * as fold from "../fold.js";
import * as types from "../types.js";

const pool = (axis, all) => (Array.isArray(axis) ? axis : axis ? [axis] : all);

const drawFrom = (options, index, random) =>
  random ? array.shuffle(options)[0] : options[index % options.length];

const TABLE = "CONJUGATE";
const CONTEXT = ["tense", "mood"];

export const recalls = (recall) => pool(recall, types.RECALLS);

export const gameplays = (gameplay, knowable) => {
  const wanted = pool(gameplay, types.GAMEPLAYS);
  const feasible = fold.table(knowable) ? wanted : wanted.filter((entry) => entry !== TABLE);
  return feasible.length ? feasible : [types.DEFAULTS.gameplay];
};

export const recallFor = (recall, index = 0, random = true) => drawFrom(recalls(recall), index, random);

export const gameplayFor = (gameplay, knowable, index = 0, random = true) =>
  drawFrom(gameplays(gameplay, knowable), index, random);

export const forms = (table) =>
  (table.tokens ?? []).map((token) => ({
    ontology: "word",
    known: token.gloss,
    learning: token.form,
    context: Object.fromEntries(
      [
        ["infinitive", table.learning],
        ...CONTEXT.map((key) => [key, table.context?.[key]]),
        ["person", token.person],
        ["number", token.number],
      ].filter(([, value]) => value),
    ),
    ...(token.literal && { literal: token.literal }),
    ...(token.asset && { asset: token.asset }),
    ...(token.signal && { signal: token.signal }),
  }));

const MISSES = ["FAILURE", "MISTAKE"];

const UNSEEN = ["UNTOUCHED", "UNKNOWN"];

export const previews = (preview, { first = false, missed = false, signal = null, status = null } = {}) => {
  if (!preview) return false;
  const when = preview.when ?? "ONCE";
  if (when === "ALWAYS") return true;
  if (when === "MISSED") return missed || (first && MISSES.includes(signal));
  if (when === "STATUS") return (preview.status ?? UNSEEN).includes(status ?? "UNTOUCHED");
  return first;
};

export const surface = (knowable, gameplay) => (fold.table(knowable) && gameplay !== TABLE ? forms(knowable) : [knowable]);

export const fileOf = (files, asset) => files.find((file) => file.path === asset?.path) ?? null;

const audible = (files, knowable) =>
  fold.table(knowable)
    ? knowable.tokens.every((token) => fileOf(files, token.asset) !== null)
    : fileOf(files, knowable.asset) !== null;

export const prompts = (files, prompt, knowable, greedy = false) => {
  const wanted = pool(prompt, types.PROMPTS);
  const feasible = wanted.filter((entry) => entry !== "AUDIO" || audible(files, knowable));
  if (greedy && !fold.table(knowable) && feasible.includes("AUDIO")) return ["AUDIO"];
  return feasible.length ? feasible : wanted;
};

export const promptFor = (files, prompt, knowable, greedy = false, index = 0, random = true) =>
  drawFrom(prompts(files, prompt, knowable, greedy), index, random);

export const DRESS = ["recall", "gameplay", "prompt"];

const same = (a, b) => DRESS.every((key) => a?.[key] === b?.[key]);

export const wardrobe = (files, axes, knowable) =>
  recalls(axes.recall).flatMap((recall) =>
    (fold.table(knowable) ? [TABLE] : gameplays(axes.gameplay, knowable)).flatMap((gameplay) =>
      prompts(files, axes.prompt, knowable, axes.greedy).map((prompt) => ({ recall, gameplay, prompt })),
    ),
  );

export const dressFor = (files, axes, knowable, { index = 0, random = true, worn = [] } = {}) => {
  if (!random)
    return {
      recall: recallFor(axes.recall, index, false),
      gameplay: fold.table(knowable) ? TABLE : gameplayFor(axes.gameplay, knowable, index, false),
      prompt: promptFor(files, axes.prompt, knowable, axes.greedy, index, false),
    };
  const all = wardrobe(files, axes, knowable);
  const unworn = all.filter((dress) => !worn.some((past) => same(past, dress)));
  const fresh = all.filter((dress) => !same(dress, worn.at(-1)));
  return array.shuffle(unworn.length ? unworn : fresh.length ? fresh : all)[0];
};

export const playable = (files, knowable, axes) =>
  fold.speakable(knowable) &&
  (!fold.table(knowable) || knowable.tokens?.length > 0) &&
  (!types.listening(axes.prompt) || audible(files, knowable));

export const carriers = (buffer) => [
  ...(buffer.literals ?? []).map(fold.fromLiteral),
  ...((buffer.data ?? {}).knowables ?? []),
];

export const order = (list, random) => (types.shuffling(random) ? array.shuffle(list) : list);

export const admit = (files, set, axes) => {
  const rejected = set.filter((knowable) => !playable(files, knowable, axes));
  if (rejected.length)
    console.warn(
      "[dojo] dropped unplayable knowables",
      rejected.map((entry) => entry.literal ?? entry.learning),
    );

  return set.filter((knowable) => playable(files, knowable, axes));
};

export const carried = (files, buffer) => admit(files, carriers(buffer), buffer.data ?? {});

export const refetch = async (buffer, { set = [], prompt, blacklist = [] } = {}) => {
  if (!set.length) return [];
  const resolved = await buffer.mode.connection.call("/resolve", { set, prompt, blacklist });
  return (resolved?.clauses ?? []).flatMap((entry) => [...entry.literals, ...entry.knowables]);
};
