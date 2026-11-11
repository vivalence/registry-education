<script>
  import { typing } from "../keys.js";
  import { person, said } from "../words.js";
  import { untrack } from "svelte";
  import { placement } from "../../engine/duel.js";

  const { game, world, memory, onplay, onquit } = $props();

  const STANDING = {
    UNTOUCHED: "new",
    UNKNOWN: "unsure",
    LEARNING: "learning",
    KNOWN: "known",
    GRADUATED: "mastered",
  };

  const SAID = {
    MASTERY: "swift and sure",
    SUCCESS: "right",
    NEUTRAL: "nearly",
    MISTAKE: "not this one",
    FAILURE: "no answer",
  };

  const TONE = {
    MASTERY: "positive",
    SUCCESS: "positive",
    NEUTRAL: "caution",
    MISTAKE: "negative",
    FAILURE: "negative",
  };

  // a verdict is told by a mark and a word as well as its tone: no learner should need to tell
  // green from red
  const MARK = {
    MASTERY: "✦",
    SUCCESS: "✓",
    NEUTRAL: "≈",
    MISTAKE: "✗",
    FAILURE: "✗",
  };

  const ASKS = {
    PICK: "what does it mean?",
    BUILD: "put the words in order",
  };

  const phase = $derived(game.phase);
  const entry = $derived(world.words[game.word]);
  const question = $derived(game.question);
  const verdict = $derived(game.verdict);
  const settled = $derived(verdict !== null);
  // how the stone reads; a paradigm reads as its verb in its tense, its card the forms it takes
  const reads = $derived(said(world, game.word));
  const paradigm = $derived(entry.ontology === "conjugation");
  const voiced = $derived(entry.audio !== null);
  // the stone this trial lit: by its last answer, or by its card when it had nothing to ask
  const lit = $derived(game.fresh && game.checks.length === 0 && phase !== "asking");
  const onward = $derived(game.checks.length > 0 ? "on to the check" : "walk on");
  const title = $derived(
    phase === "card" ? (game.fresh ? "a new stone" : "a stone") : ASKS[question.format],
  );

  let sheet = $state(null);
  let built = $state([]);

  $effect(() => {
    sheet.focus({ preventScroll: true });
  });

  // a check opens with nothing placed
  $effect.pre(() => {
    if (phase !== "asking") return;
    untrack(() => (built = []));
  });

  const next = () => onplay({ next: true });
  const answer = (value) => onplay({ answer: value });
  const hear = () => onplay({ hear: true });

  // keys that only move focus, or only hold another key, leave nothing
  const INERT = ["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock"];

  // the tiles still to place, in the order shown
  const pool = $derived(
    question !== null && question.format === "BUILD"
      ? question.order.filter((index) => !built.includes(index))
      : [],
  );

  const send = () => {
    if (built.length === question.order.length) answer(built);
  };

  // Esc leaves. a stone read before leaves on any key; otherwise Enter or Space go on, 1–3 pick,
  // 1–9 place a tile, Backspace takes the last one back, Enter sends the sentence
  const KEYS = {
    card: (event) => {
      if (!game.fresh && !INERT.includes(event.key)) return next;
      if (event.key === "Enter" || event.key === " ") return next;
      return null;
    },
    asking: (event) => {
      const digit = Number(event.key) - 1;
      if (question.format === "PICK") {
        const option = question.options[digit];
        return option === undefined ? null : () => answer(option);
      }
      if (event.key === "Backspace" && built.length > 0) return () => (built = built.slice(0, -1));
      if (event.key === "Enter") return send;
      const tile = pool[digit];
      return tile === undefined ? null : () => (built = [...built, tile]);
    },
    answered: (event) => (event.key === "Enter" || event.key === " " ? next : null),
  };

  const key = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || typing(event)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onquit();
      return;
    }
    if (event.repeat) return;
    const act = KEYS[phase](event);
    if (act === null) return;
    event.preventDefault();
    act();
  };
</script>

<svelte:window onkeydown={key} />

<div class="layer">
  <section
    class="sheet"
    bind:this={sheet}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="a stone: {reads.learning}">
    <div class="crest">
      <span class="label">{title}</span>
      <span class="standing">{STANDING[memory[game.word] ?? "UNTOUCHED"]}</span>
      <button type="button" class="leave" aria-label="leave the stone" onclick={onquit}>✕</button>
    </div>

    {#if phase === "card"}
      {#if paradigm}
        <p class="face">{reads.learning}</p>
        <p class="meaning">{reads.known}</p>
        <dl class="forms">
          {#each Object.entries(entry.paradigm) as [cell, form] (cell)}
            <div class="form">
              <dt>{person(cell)}</dt>
              <dd>{world.words[form].learning}</dd>
            </div>
          {/each}
        </dl>
      {:else}
        <div class="said-aloud">
          <p class="face">{entry.learning}</p>
          {#if voiced}
            <button type="button" class="hear" aria-label="hear {entry.learning}" onclick={hear}>
              ▶
            </button>
          {/if}
        </div>
        <p class="meaning">{entry.known}</p>
        {#if entry.example !== null}
          <p class="example">
            <span class="example-learning">{entry.example.learning}</span>
            <span class="example-known">{entry.example.known}</span>
          </p>
        {/if}
      {/if}
      {#if lit}
        <p class="kindled">the stone is lit · +1 coin</p>
      {/if}
      <button type="button" class="go" onclick={next}>
        {onward}{#if !game.fresh}<kbd>any key</kbd>{:else}<kbd>enter</kbd>{/if}
      </button>
    {:else if question.format === "PICK"}
      <div class="said-aloud">
        <p class="face">{entry.learning}</p>
        {#if voiced}
          <button type="button" class="hear" aria-label="hear {entry.learning}" onclick={hear}>
            ▶
          </button>
        {/if}
      </div>
      <div class="options">
        {#each question.options as option, index (option)}
          {@const answered = settled && option === question.word}
          {@const taken = settled && option === verdict.value && option !== question.word}
          <button
            type="button"
            class="option"
            class:answered
            class:taken
            class:aside={settled && !answered && !taken}
            disabled={settled}
            onclick={() => answer(option)}>
            {#if answered}
              <b class="tick" aria-hidden="true">✓</b>
            {:else if taken}
              <b class="tick" aria-hidden="true">✗</b>
            {:else}
              <kbd>{index + 1}</kbd>
            {/if}
            <span>{world.words[option].known}</span>
          </button>
        {/each}
      </div>
    {:else}
      {@const sentence = world.words[question.sentence]}
      {@const order = settled ? verdict.value : built}
      {@const placed = settled ? placement(sentence.tokens, verdict.value) : null}
      <p class="cue">{sentence.known}</p>
      <div class="line" aria-label="your sentence">
        {#each order as index, position (index)}
          <button
            type="button"
            class="chip"
            class:answered={placed !== null && placed[position]}
            class:taken={placed !== null && !placed[position]}
            disabled={settled}
            onclick={() => (built = built.filter((other) => other !== index))}>
            {#if placed !== null}
              <b class="tick" aria-hidden="true">{placed[position] ? "✓" : "✗"}</b>
            {/if}
            {sentence.tokens[index].form}
          </button>
        {/each}
      </div>
      {#if settled}
        <p class="written">{sentence.learning}</p>
      {:else}
        <div class="pool">
          {#each pool as index, slot (index)}
            <button type="button" class="chip" onclick={() => (built = [...built, index])}>
              {#if slot < 9}<kbd>{slot + 1}</kbd>{/if}
              {sentence.tokens[index].form}
            </button>
          {/each}
        </div>
        <button type="button" class="go" disabled={pool.length > 0} onclick={send}>
          send<kbd>enter</kbd>
        </button>
      {/if}
    {/if}

    {#if phase === "answered"}
      <p class="said {TONE[verdict.signal]}" role="status">
        <b class="tick" aria-hidden="true">{MARK[verdict.signal]}</b>{SAID[verdict.signal]}
      </p>
      {#if lit}
        <p class="kindled">the stone is lit · +1 coin</p>
      {/if}
      <button type="button" class="go" onclick={next}>
        {game.checks.length > 0 ? "next check" : "walk on"}<kbd>enter</kbd>
      </button>
    {/if}
  </section>
</div>

<style>
  /* the sheet rises over the stage: a layer over the stage's frame, the world dimmed beneath it —
     on a phone a sheet from the bottom, never past 70% of the height; on a wide pane a card */
  .layer {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--scrim);
    container-type: size;
  }
  /* a card lifted on the page: --surface-lift ringed by --boundary — every ink in it reads that step */
  .sheet {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--size-space-sm);
    width: 100%;
    max-height: 70cqh;
    margin-top: auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--size-space-md) var(--size-space-md)
      calc(var(--size-space-md) + env(safe-area-inset-bottom, 0px));
    border-radius: var(--shape-radius-card) var(--shape-radius-card) 0 0;
    background: var(--surface-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      var(--shape-lift);
    color: var(--text-ink);
    animation: rise 160ms ease-out;
  }
  .sheet:focus {
    outline: none;
  }
  @container (min-width: 40rem) {
    .sheet {
      width: min(30rem, 100cqw - 2 * var(--size-space-lg));
      max-height: 90cqh;
      margin: auto;
      padding-bottom: var(--size-space-md);
      border-radius: var(--shape-radius-card);
    }
  }
  @keyframes rise {
    from {
      transform: translateY(1.5rem);
      opacity: 0;
    }
  }
  .crest {
    display: flex;
    align-items: center;
    gap: var(--size-space-sm);
  }
  .label {
    flex: 1;
    min-width: 0;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-light);
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .standing {
    padding: 0.1rem 0.55rem;
    border-radius: var(--shape-radius-pill);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
  button {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  /* the host sheet sets every button text-align: left · padding: 0 — a glyph button centres its glyph */
  .leave,
  .hear,
  .go {
    display: grid;
    place-items: center;
  }
  /* a touchable is the theme's key: --control-contrast, labelled --control-on, ringed by --boundary,
     standing --size-depth above the card; pressed, it sinks into --control-contrast-pressed */
  .leave,
  .option,
  .chip {
    border: 0;
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
  }
  .leave:active,
  .option:active:not(:disabled),
  .chip:active:not(:disabled) {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  .leave {
    width: 2.75rem;
    height: 2.75rem;
    flex: none;
    border-radius: var(--shape-radius-key);
    font-size: var(--size-type-md);
  }
  .said-aloud {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-space-sm);
  }
  .face {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-3xl);
    color: var(--text-strong);
    overflow-wrap: anywhere;
  }
  .meaning {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-lg);
    color: var(--text-ink);
  }
  .example {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    margin: 0;
    padding: var(--size-space-sm);
    border-radius: var(--shape-radius-field);
    background: var(--surface-sunk);
    text-align: center;
  }
  .example-learning {
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-md);
    color: var(--text-strong);
  }
  .example-known {
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-sm);
    color: var(--text-light);
  }
  .forms {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem var(--size-space-md);
    margin: 0;
  }
  .form {
    display: flex;
    justify-content: space-between;
    gap: var(--size-space-sm);
  }
  .form dt {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
  .form dd {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-md);
    color: var(--text-strong);
  }
  .kindled {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-strong);
  }
  /* the one call to act: the primary fill and the ink tested on it */
  .hear {
    width: 3rem;
    height: 3rem;
    flex: none;
    border: 0;
    border-radius: var(--shape-radius-disc);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-size: var(--size-type-lg);
  }
  /* the call to go on keeps to the sheet's foot, haloed in the card's own colour, so a thumb
     reaches it however long the sheet runs */
  .go {
    position: sticky;
    bottom: 0;
    grid-auto-flow: column;
    gap: var(--size-space-sm);
    min-height: 3.25rem;
    padding: 0 var(--size-space-lg);
    border: 0;
    border-radius: var(--shape-radius-key);
    background: var(--signal-primary);
    box-shadow: 0 0 0 var(--size-space-xs) var(--surface-lift);
    color: var(--signal-primary-on);
    font-family: var(--font-family-code);
    font-size: var(--size-type-md);
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .hear:active,
  .go:active:not(:disabled) {
    transform: translateY(var(--size-depth));
  }
  .go:disabled {
    opacity: var(--text-disabled);
  }
  .go kbd {
    color: var(--signal-primary-on);
  }
  kbd {
    display: none;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--control-on);
  }
  .options {
    display: grid;
    gap: var(--size-space-xs);
  }
  .option {
    min-height: 3.25rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.9rem;
    border-radius: var(--shape-radius-key);
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-md);
    text-align: left;
    overflow-wrap: anywhere;
  }
  .tick {
    font-weight: 700;
  }
  /* a reviewed answer: its tone's tint, the tone's ink, a 2px ring and a mark — ✓ the answer, ✗ the
     pick, struck. never the colour alone, never faded */
  .option.answered,
  .chip.answered {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 2px var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .option.taken,
  .chip.taken {
    background: var(--signal-negative-tint);
    box-shadow: inset 0 0 0 2px var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  .option.taken span {
    text-decoration: line-through;
  }
  .option.aside {
    background: transparent;
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--text-light);
  }
  .cue {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-lg);
    color: var(--text-strong);
  }
  .line,
  .pool {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--size-space-xs);
  }
  /* where a built sentence goes: a well cut into the card, its edge dashed in a tested ink */
  .line {
    min-height: 3.25rem;
    align-items: center;
    padding: 0.35rem;
    border-bottom: 2px dashed var(--text-muted);
    border-radius: var(--shape-radius-field) var(--shape-radius-field) 0 0;
    background: var(--surface-sunk);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.75rem;
    min-width: 2.75rem;
    padding: 0.4rem 0.8rem;
    border-radius: var(--shape-radius-pill);
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-md);
  }
  .written {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-md);
    color: var(--text-strong);
  }
  /* the verdict: a banner of its tone — the tint laid on the card, the tone's ink, a mark and the
     word at reading size */
  .said {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    margin: 0;
    padding: 0.4rem 0.8rem;
    border-radius: var(--shape-radius-card);
    font-family: var(--font-family-code);
    font-size: var(--size-type-md);
    font-weight: 600;
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .said.positive {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .said.caution {
    background: var(--signal-caution-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-caution-ink);
    color: var(--signal-caution-ink);
  }
  .said.negative {
    background: var(--signal-negative-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  @media (pointer: fine) {
    kbd {
      display: inline;
    }
    .option:hover:not(:disabled),
    .chip:hover:not(:disabled),
    .leave:hover {
      background: var(--control-contrast-hover);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sheet {
      animation: none;
    }
  }
</style>
