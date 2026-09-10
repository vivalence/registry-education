import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { _render, createComponent, RendererContext } from "@opentui/solid";
import { array, object } from "@vivalence/typology";
import * as types from "../types.js";
import * as knowables from "./knowables.js";
import * as streak from "./streak.js";
import * as judge from "./judge.js";

const PRESETS = ["meet", "recognize", "write", "drill", "mixed"];
const FEED = 8;
const PICK_OPTIONS = 3;
const POSITIVE = ["MASTERY", "SUCCESS", "NEUTRAL"];
const GRADES = { 1: "FAILURE", 2: "MISTAKE", 3: "SUCCESS", 4: "MASTERY" };
const LIVE = ["playing", "drawing", "done"];
const SUBMITS = ["return", "linefeed", "enter"];
const PRINTABLE = /^[^\p{C}]+$/u;
const TONE = { MASTERY: "signalPositive", SUCCESS: "signalPositive", NEUTRAL: "signalCaution", MISTAKE: "signalCaution", FAILURE: "signalNegative" };

const tty = (axes) => ({ ...axes, prompt: "TEXT", gameplay: [].concat(axes.gameplay ?? types.DEFAULTS.gameplay).filter((entry) => entry !== "CONJUGATE") });

export function Dojo(props) {
  const { palette, buffer, terminal } = props;
  const review = (signal, literal) => {
    if (!literal || !signal) return;
    buffer.mode.daemon.connection.call("/review/literal", { signal, scope: { literal } }).catch((error) => setFault(`review · ${error.message}`));
  };

  const [language, setLanguage] = createSignal(buffer.mode.daemon.statics.language ?? {});
  const [axes, setAxes] = createSignal(tty({ ...types.DEFAULTS, ...object.pluck(buffer.data, types.AXIS_KEYS) }));
  const [set, setSet] = createSignal(buffer.data.set ?? []);
  const [preset, setPreset] = createSignal(0);
  const [queue, setQueue] = createSignal([]);
  const [session, setSession] = createSignal(streak.begin([], 0));
  const [phase, setPhase] = createSignal("idle");
  const [step, setStep] = createSignal("recall");
  const [typed, setTyped] = createSignal("");
  const [result, setResult] = createSignal(null);
  const [options, setOptions] = createSignal([]);
  const [reps, setReps] = createSignal(0);
  const [outcome, setOutcome] = createSignal(null);
  const [busy, setBusy] = createSignal(false);
  const [fault, setFault] = createSignal(null);

  const drawn = () => types.drawing(axes().random);
  const files = () => terminal.client.runtime.entities.file.$entities.get().filter((file) => file.mode.daemon === buffer.mode.daemon);
  const dresser = (list) => (index, worn) => knowables.dressFor(files(), axes(), list[index], { index, random: drawn(), worn });
  const prepare = (list) =>
    knowables.order(list.flatMap((knowable, index) => knowables.surface(knowable, knowables.gameplayFor(axes().gameplay, knowable, index, drawn()))), axes().random);

  const entry = () => streak.current(session());
  const knowable = () => (entry() === null ? null : { ...queue()[entry().index], ...streak.wearing(entry()) });
  const satisfied = () => queue().length - session().pending.length;
  const face = () => judge.shown(knowable(), knowable().recall);
  const answer = () => judge.expected(knowable(), knowable().recall);
  const labels = () => ({ known: language().known?.name ?? "known", learning: language().learning?.name ?? "learning" });
  const asked = () => (knowable().recall === "KNOWN" ? labels().known : labels().learning);

  const pick = () => {
    const held = knowable();
    const seen = new Set([held.known, held.learning]);
    const distractors = queue()
      .filter((candidate) => {
        if (candidate === queue()[entry().index] || seen.has(candidate.known) || seen.has(candidate.learning)) return false;
        seen.add(candidate.known);
        seen.add(candidate.learning);
        return true;
      })
      .slice(0, PICK_OPTIONS);
    setOptions(array.shuffle([queue()[entry().index], ...distractors]));
  };

  const land = (held) => {
    setResult(held);
    setStep("feedback");
    review(held.signal, held.literal ?? knowable().literal);
    for (const token of held.tokens ?? []) review(token.signal, token.literal);
    if (held.picked && held.signal !== "SUCCESS") review("MISTAKE", held.picked.literal);
  };

  const keep = () =>
    buffer.mode.connection
      .call("/session", { buffer: buffer.id, ...(LIVE.includes(phase()) ? { session: { queue: queue(), session: session(), phase: phase(), reps: reps(), sets: 1, elapsed: 0, played: [], outcome: outcome(), reviews: 0 } } : {}) })
      .catch((error) => setFault(`session · ${error.message}`));

  const finish = (kind) => {
    setOutcome(kind);
    setPhase("done");
    keep();
  };

  const open = () => {
    setStep("recall");
    setTyped("");
    setResult(null);
    if (knowable() !== null && knowable().gameplay === "PICK") pick();
  };

  const advance = (success) => {
    const recorded = streak.record(session(), success, axes().anhieb ?? 0);
    const requeued = recorded.pending.length === session().pending.length;
    const dressed = requeued && success && drawn() ? streak.wear(recorded, dresser(queue())) : recorded;
    setSession(types.shuffling(axes().random) ? streak.scramble(dressed) : dressed);
    setReps(reps() + 1);
    if (axes().limit?.reps && reps() >= axes().limit.reps) return finish("limit");
    if (streak.complete(session())) return finish("complete");
    keep();
    open();
  };

  const board = (list) => {
    setQueue(list);
    setSession(streak.begin(list, axes().streak, dresser(list)));
    setReps(0);
    setOutcome(null);
    setPhase("playing");
    open();
  };

  const guard = async (label, work) => {
    setBusy(true);
    try {
      const out = await work();
      setFault(null);
      return out;
    } catch (error) {
      setFault(`${label} · ${error.message}`);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const materialize = () =>
    guard("commission", async () => {
      const raw = await buffer.mode.connection.call("/commission", { buffer: buffer.id });
      const admitted = prepare(knowables.admit(files(), knowables.carriers(raw), axes()));
      if (!admitted.length) return setFault("the set resolved to nothing playable — p picks another preset");
      board(admitted);
    });

  const begin = () => {
    if (busy()) return;
    if (!set().length) return setFault("no set yet — p picks a preset, or let the agent commission one");
    materialize();
  };

  const choose = () =>
    guard("setup", async () => {
      const name = PRESETS[preset()];
      const held = types.PRESETS[name];
      const clauses = set().length ? set() : [{ pick: "feed", ...(held.where && { where: held.where }), limit: held.count ?? FEED }];
      const next = tty({ ...types.DEFAULTS, ...held.axes });
      await buffer.mode.connection.call("/setup", { buffer: buffer.id, set: clauses, ...object.pluck(next, types.SETUP) });
      setSet(clauses);
      setAxes(next);
      setPreset((preset() + 1) % PRESETS.length);
    });

  const stop = () => {
    setPhase("idle");
    setOutcome(null);
    keep();
  };

  const judged = async () => {
    const held = knowable();
    const text = typed();
    if (held.judge === "LLM") {
      const verdict = await guard("judge", () => buffer.mode.connection.call("/judge", { typed: text, knowable: held, recall: held.recall }));
      if (verdict === null) return;
      return land({ signal: verdict.overall?.grade ?? "MISTAKE", tokens: verdict.tokens?.map((token) => ({ ...token, signal: token.grade })) ?? null });
    }
    land(judge.evaluate({ typed: text, knowable: held, recall: held.recall, forgiving: axes().forgiving, language: language() }));
  };

  const RECALL = {
    TYPE: (key) => {
      if (SUBMITS.includes(key.name)) return (judged(), true);
      if (key.name === "backspace") return (setTyped(typed().slice(0, -1)), true);
      if (key.ctrl || key.meta || !PRINTABLE.test(key.sequence)) return false;
      setTyped(typed() + key.sequence);
      return true;
    },
    FLIP: (key) => {
      if (SUBMITS.includes(key.name)) return (setStep("revealed"), true);
      return false;
    },
    PICK: (key) => {
      const chosen = options()[Number(key.sequence) - 1];
      if (chosen === undefined) return false;
      land({ signal: chosen === queue()[entry().index] ? "SUCCESS" : "MISTAKE", picked: chosen, tokens: null });
      return true;
    },
  };

  const STEPS = {
    recall: (key) => RECALL[knowable().gameplay](key),
    revealed: (key) => {
      if (!Object.hasOwn(GRADES, key.sequence)) return false;
      land({ signal: GRADES[key.sequence], tokens: null });
      advance(POSITIVE.includes(GRADES[key.sequence]));
      return true;
    },
    feedback: (key) => {
      if (!SUBMITS.includes(key.name)) return false;
      advance(POSITIVE.includes(result().signal));
      return true;
    },
  };

  const PHASES = {
    idle: (key) => (key.sequence === "p" ? (choose(), true) : key.sequence === "s" || SUBMITS.includes(key.name) ? (begin(), true) : false),
    done: (key) => (key.sequence === "p" ? (choose(), true) : key.sequence === "s" || SUBMITS.includes(key.name) ? (begin(), true) : false),
    playing: (key) => (key.name === "escape" ? (stop(), true) : busy() || knowable() === null ? false : STEPS[step()](key)),
  };

  const keys = (key) => {
    if (!props.focused() || key.defaultPrevented) return;
    if (!PHASES[phase()](key)) return;
    key.preventDefault();
    key.stopPropagation();
  };

  onMount(() => {
    props.renderer.keyInput.prependListener("keypress", keys);
    buffer.mode.daemon.connection.call("/language", {}).then(setLanguage, (error) => setFault(`language · ${error.message}`));
    const kept = buffer.data.session;
    if (kept !== undefined && LIVE.includes(kept.phase) && kept.queue.length) {
      setQueue(kept.queue);
      setSession(kept.session);
      setReps(kept.reps);
      setOutcome(kept.outcome);
      setPhase(kept.phase === "drawing" ? "playing" : kept.phase);
      open();
    }
  });
  onCleanup(() => props.renderer.keyInput.off("keypress", keys));

  const summary = () => `${[].concat(axes().gameplay).join("/")}${axes().streak ? ` ×${axes().streak}` : ""} · recall ${[].concat(axes().recall ?? types.RECALLS).join("/").toLowerCase()}`;
  const feedbackLine = () => `${result().signal.toLowerCase()} · ${asked()}: ${answer()}${knowable().example ? ` — ${knowable().example.learning} / ${knowable().example.known}` : ""}`;

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, gap: 1 }}>
      <Show when={fault() !== null}>
        <text fg={palette.signalNegative}>{`✕ ${fault()}`}</text>
      </Show>
      <Show
        when={phase() === "playing" && knowable() !== null}
        fallback={
          <box style={{ flexDirection: "column", gap: 1 }}>
            <text fg={palette.textStrong}>{phase() === "done" ? `session ${outcome()} · ${reps()} reps` : "dojo"}</text>
            <text fg={palette.textMuted}>{set().length ? `${set().length} clause${set().length === 1 ? "" : "s"} declared · ${summary()}` : "no set declared"}</text>
            <text fg={palette.textMuted}>{`p preset → ${PRESETS[preset()]} (${types.PRESETS[PRESETS[preset()]].note})`}</text>
            <text fg={palette.textInk}>{busy() ? "resolving…" : "s starts · ⇥ dock"}</text>
          </box>
        }
      >
        <text fg={palette.textMuted}>{`${satisfied() + 1}/${queue().length} · ${knowable().ontology} · ${knowable().gameplay.toLowerCase()} · ${summary()} · esc stops`}</text>
        <Show when={knowable().context !== undefined}>
          <text fg={palette.textMuted}>{Object.entries(knowable().context).map(([key, value]) => `${key} ${value}`).join(" · ")}</text>
        </Show>
        <text fg={palette.textStrong}>{face()}</text>
        <Show when={step() === "recall" && knowable().gameplay === "TYPE"}>
          <text>
            <span style={{ fg: palette.signalPrimary }}>{`${asked()} › `}</span>
            <span style={{ fg: palette.textStrong }}>{typed()}</span>
            <span style={{ fg: palette.signalPrimary }}>▌</span>
          </text>
        </Show>
        <Show when={step() === "recall" && knowable().gameplay === "FLIP"}>
          <text fg={palette.textMuted}>{`enter reveals the ${asked()}`}</text>
        </Show>
        <Show when={step() === "recall" && knowable().gameplay === "PICK"}>
          <For each={options()}>{(candidate, index) => <text fg={palette.textInk}>{`${index() + 1} ${judge.expected(candidate, knowable().recall)}`}</text>}</For>
        </Show>
        <Show when={step() === "revealed"}>
          <text fg={palette.textInk}>{answer()}</text>
          <text fg={palette.textMuted}>{Object.entries(GRADES).map(([key, signal]) => `${key} ${signal.toLowerCase()}`).join(" · ")}</text>
        </Show>
        <Show when={step() === "feedback"}>
          <text fg={palette[TONE[result().signal]]}>{feedbackLine()}</text>
          <text fg={palette.textMuted}>enter continues</text>
        </Show>
      </Show>
    </box>
  );
}

export default (element, { terminal, buffer, surface, renderer, palette, focused }) => {
  const dispose = _render(
    () =>
      createComponent(RendererContext.Provider, {
        value: renderer,
        get children() {
          return createComponent(Dojo, { terminal, buffer, surface, renderer, palette, focused });
        },
      }),
    element,
  );
  return {
    destroy: () => {
      dispose();
      for (const child of element.getChildren()) child.destroyRecursively();
    },
  };
};
