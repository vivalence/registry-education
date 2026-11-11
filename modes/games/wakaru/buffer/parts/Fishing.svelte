<script>
  import { typing } from "../keys.js";
  import { SWIFT } from "../../engine/duel.js";
  import { CATCH, HOOK } from "../../engine/games/fishing.js";

  const { game, world, now, onplay, onquit } = $props();

  const LABEL = {
    waiting: "fishing",
    biting: "a bite!",
    asking: "on the line",
    caught: "caught",
    lost: "it got away",
    spooked: "fishing",
    slipped: "fishing",
  };

  const ASKS = {
    LISTEN: "what did you hear?",
    PICK: "what does it mean?",
  };

  // what the line says of an answer
  const TOLD = {
    MASTERY: "a swift catch",
    SUCCESS: "caught",
    MISTAKE: "not this one",
    FAILURE: "too slow",
  };

  const TONE = {
    MASTERY: "positive",
    SUCCESS: "positive",
    MISTAKE: "negative",
    FAILURE: "negative",
  };

  // a verdict is told by a mark and a word as well as its tone
  const MARK = {
    MASTERY: "✦",
    SUCCESS: "✓",
    MISTAKE: "✗",
    FAILURE: "✗",
  };

  // lost unasked: nothing was graded, so nothing is toned
  const GONE = {
    spooked: "too soon — the fish spooked",
    slipped: "too late — it slipped off the hook",
  };

  const share = (part) => Math.min(1, Math.max(0, part));

  const phase = $derived(game.phase);
  const question = $derived(game.question);
  const verdict = $derived(game.verdict);
  const settled = $derived(verdict !== null);
  const entry = $derived(world.words[game.word]);
  const cast = $derived(phase === "waiting" || phase === "biting");
  // the bite's window, closing
  const hold = $derived(share((game.slip - now) / HOOK));
  // the catch's clock, and the mark inside which a right answer is MASTERY
  const left = $derived(question === null ? 0 : share((question.deadline - now) / CATCH));

  let sheet = $state(null);

  $effect(() => {
    sheet.focus({ preventScroll: true });
  });

  // a bite is felt as well as seen, where the device can
  $effect(() => {
    if (phase !== "biting" || !("vibrate" in navigator)) return;
    navigator.vibrate([90, 40, 90]);
  });

  const hook = () => onplay({ hook: true });
  const next = () => onplay({ next: true });
  const answer = (value) => onplay({ answer: value });
  const hear = () => onplay({ hear: true });

  const confirming = (event) => event.key === "Enter" || event.key === " ";

  // Esc leaves. Space or Enter hook while the line is out and go on once it is in; 1–3 answer
  const KEYS = {
    waiting: (event) => (confirming(event) ? hook : null),
    biting: (event) => (confirming(event) ? hook : null),
    asking: (event) => {
      const option = question.options[Number(event.key) - 1];
      return option === undefined ? null : () => answer(option);
    },
    caught: (event) => (confirming(event) ? next : null),
    lost: (event) => (confirming(event) ? next : null),
    spooked: (event) => (confirming(event) ? next : null),
    slipped: (event) => (confirming(event) ? next : null),
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
    aria-label="fishing">
    <div class="crest">
      <span class="label">{LABEL[phase]}</span>
      <button type="button" class="leave" aria-label="reel in and leave" onclick={onquit}>✕</button>
    </div>

    {#if cast || phase in GONE}
      <div class="water" class:biting={phase === "biting"} class:still={phase in GONE}>
        <i class="ripple" aria-hidden="true"></i>
        <i class="float" aria-hidden="true"></i>
        {#if phase === "biting"}<b class="alert" aria-hidden="true">!</b>{/if}
      </div>
    {/if}

    {#if cast}
      <p class="told" role="status">
        {phase === "biting" ? "a bite — hook it now" : "wait for the float to dip…"}
      </p>
      <div class="clock hurry" class:hidden-clock={phase !== "biting"} aria-hidden="true">
        <div class="sand" style:width="{(phase === 'biting' ? hold : 1) * 100}%"></div>
      </div>
      <button type="button" class="go hook" class:urgent={phase === "biting"} onclick={hook}>
        {phase === "biting" ? "hook it!" : "hook"}<kbd>space</kbd>
      </button>
    {:else if phase in GONE}
      <p class="told" role="status">{GONE[phase]}</p>
      <button type="button" class="go" onclick={next}>walk on<kbd>enter</kbd></button>
    {:else}
      {#if question.format === "LISTEN"}
        <div class="said-aloud">
          <button type="button" class="hear" aria-label="hear it again" onclick={hear}>▶</button>
          {#if settled}<p class="face">{entry.learning}</p>{/if}
        </div>
      {:else}
        <p class="face">{entry.learning}</p>
      {/if}
      {#if phase === "asking"}
        <p class="ask">{ASKS[question.format]}</p>
      {/if}

      {#if phase === "asking"}
        <div class="clock" class:urgent={left < 0.3}>
          <div class="sand" style:width="{left * 100}%"></div>
          <i class="swift" style:left="{(1 - SWIFT) * 100}%"></i>
        </div>
      {/if}

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

      {#if settled}
        <p class="said {TONE[verdict.signal]}" role="status">
          <b class="tick" aria-hidden="true">{MARK[verdict.signal]}</b>{TOLD[
            verdict.signal
          ]}{verdict.right ? " · +1 fish" : ""}
        </p>
        <button type="button" class="go" onclick={next}>walk on<kbd>enter</kbd></button>
      {/if}
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
    gap: var(--size-space-xs);
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
  .option {
    border: 0;
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
  }
  .leave:active,
  .option:active:not(:disabled) {
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
  /* the water: a well cut into the card, the float riding it; at a bite the float goes under, the
     water rings and a mark rises — the bite is seen by more than a colour */
  .water {
    position: relative;
    height: 6.5rem;
    overflow: hidden;
    border-radius: var(--shape-radius-field);
    background: repeating-linear-gradient(
        180deg,
        transparent 0 0.9rem,
        var(--divider) 0.9rem calc(0.9rem + 1px)
      ),
      var(--surface-sunk);
  }
  .water.biting {
    box-shadow: inset 0 0 0 2px var(--signal-caution-ink);
  }
  .float {
    position: absolute;
    left: calc(50% - 0.8rem);
    top: calc(50% - 0.8rem);
    width: 1.6rem;
    height: 1.6rem;
    border-radius: var(--shape-radius-disc);
    background: linear-gradient(var(--signal-primary) 50%, var(--surface-lift) 50%);
    box-shadow: inset 0 0 0 2px var(--text-strong);
    animation: bob 1.6s ease-in-out infinite;
  }
  .water.biting .float {
    animation: dip 260ms ease-in infinite alternate;
  }
  .water.still .float {
    animation: none;
    opacity: 0;
  }
  .ripple {
    position: absolute;
    left: calc(50% - 1.5rem);
    top: calc(50% - 0.75rem);
    width: 3rem;
    height: 1.5rem;
    border-radius: var(--shape-radius-disc);
    box-shadow: inset 0 0 0 2px var(--text-muted);
    opacity: 0;
  }
  .water.biting .ripple,
  .water.still .ripple {
    animation: ring 700ms ease-out infinite;
  }
  .alert {
    position: absolute;
    left: calc(50% + 1.2rem);
    top: 0.5rem;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--signal-caution-ink);
    animation: rise 160ms ease-out;
  }
  @keyframes bob {
    50% {
      transform: translateY(0.2rem);
    }
  }
  @keyframes dip {
    to {
      transform: translateY(0.9rem) scale(0.85);
    }
  }
  @keyframes ring {
    from {
      transform: scale(0.6);
      opacity: 1;
    }
    to {
      transform: scale(2.2);
      opacity: 0;
    }
  }
  .told {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-md);
    color: var(--text-ink);
  }
  /* a clock is a well, its sand the time left; hurry is told by more than a colour: the bar
     thickens and stripes */
  .clock {
    position: relative;
    height: 6px;
    border-radius: var(--shape-radius-pill);
    background: var(--surface-sunk);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    overflow: hidden;
    transition: height 160ms;
  }
  .clock.hidden-clock {
    visibility: hidden;
  }
  .sand {
    height: 100%;
    background: var(--signal-primary-ink);
    transition: width 100ms linear;
  }
  .clock.urgent,
  .clock.hurry {
    height: 10px;
  }
  .clock.urgent .sand,
  .clock.hurry .sand {
    background: repeating-linear-gradient(
      -45deg,
      var(--signal-negative-ink) 0 5px,
      var(--signal-negative-tint) 5px 10px
    );
  }
  .swift {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--surface-lift);
  }
  /* the one call to act: the primary fill and the ink tested on it. it keeps to the sheet's foot,
     haloed in the card's own colour, so a thumb reaches it however long the sheet runs */
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
  /* the hook is the whole bottom of the sheet: a thumb finds it without looking */
  .go.hook {
    min-height: 4.5rem;
    font-size: var(--size-type-lg);
  }
  .go.hook.urgent {
    box-shadow: 0 0 0 3px var(--signal-caution-ink);
    animation: throb 300ms ease-in-out infinite alternate;
  }
  @keyframes throb {
    to {
      transform: scale(1.02);
    }
  }
  .hear {
    width: 3.5rem;
    height: 3.5rem;
    flex: none;
    border: 0;
    border-radius: var(--shape-radius-disc);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-size: var(--size-type-lg);
  }
  .hear:active,
  .go:active {
    transform: translateY(var(--size-depth));
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
  .said-aloud {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-space-md);
  }
  .face {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-3xl);
    color: var(--text-strong);
    overflow-wrap: anywhere;
  }
  .ask {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-light);
  }
  .options {
    display: grid;
    gap: var(--size-space-xs);
  }
  .option {
    min-height: 3rem;
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
  .option.answered {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 2px var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .option.taken {
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
    .leave:hover {
      background: var(--control-contrast-hover);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sheet,
    .float,
    .water.biting .float,
    .ripple,
    .alert,
    .go.hook.urgent {
      animation: none;
    }
    .water.biting .float {
      transform: translateY(0.9rem) scale(0.85);
    }
  }
</style>
