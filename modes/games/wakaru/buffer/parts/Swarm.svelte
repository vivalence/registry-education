<script>
  import { typing } from "../keys.js";

  const { game, world, now, onplay, onquit } = $props();

  // what each word was reviewed as, told in words, a mark and its tone
  const TOLD = {
    SUCCESS: "rests",
    MISTAKE: "after a slip",
    FAILURE: "unpaired",
  };

  const MARK = {
    SUCCESS: "✓",
    MISTAKE: "✗",
    FAILURE: "✗",
  };

  const TONE = {
    SUCCESS: "positive",
    MISTAKE: "negative",
    FAILURE: "negative",
  };

  const SIDES = [
    { side: "left", recall: "learning", name: "words" },
    { side: "right", recall: "known", name: "meanings" },
  ];

  const phase = $derived(game.phase);
  const playing = $derived(phase === "playing");
  // a word left unpaired was reviewed too: only a pair made rests
  const resting = $derived(
    Object.values(game.reviewed).filter((signal) => signal !== "FAILURE").length,
  );
  const remaining = $derived(
    Math.min(1, Math.max(0, (game.until - now) / (game.until - game.since))),
  );
  // number keys take a word first, then its meaning
  const keyed = $derived(game.chosen.left === null ? "left" : "right");

  let sheet = $state(null);

  $effect(() => {
    sheet.focus({ preventScroll: true });
  });

  const take = (side, word) => onplay({ [side]: word });

  // Esc leaves. while the spirits wait 1–5 take a word, then 1–5 its meaning; once the haunt is
  // settled Enter or Space go on
  const key = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || typing(event)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onquit();
      return;
    }
    if (event.repeat) return;
    if (!playing && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onplay({ next: true });
      return;
    }
    const word = playing ? game[keyed][Number(event.key) - 1] : undefined;
    if (word === undefined) return;
    event.preventDefault();
    take(keyed, word);
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
    aria-label="the haunt: pair each word with its meaning">
    <div class="crest">
      <span class="label">the haunt · {resting} of {game.left.length} at rest</span>
      {#if playing && (game.charms > 0 || game.charmed)}
        <button
          type="button"
          class="charm"
          aria-pressed={game.charmed}
          aria-label={game.charmed
            ? "a charm holds them ten seconds more"
            : "spend a charm: ten seconds more"}
          disabled={game.charmed}
          onclick={() => onplay({ charm: true })}>
          charm <b>{game.charmed ? "on" : `×${game.charms}`}</b>
        </button>
      {/if}
      <button type="button" class="leave" aria-label="leave the haunt" onclick={onquit}>✕</button>
    </div>

    {#if playing}
      <div class="clock" class:urgent={remaining < 0.3} aria-hidden="true">
        <div class="sand" style:width="{remaining * 100}%"></div>
      </div>

      <div class="columns">
        {#each SIDES as { side, recall, name } (side)}
          <div class="column {side}-side" role="group" aria-label={name}>
            {#each game[side] as word, row (word)}
              {@const rests = word in game.reviewed}
              {@const slipped = game.miss !== null && game.miss[side] === word}
              <button
                type="button"
                class="tile"
                class:rests
                class:slipped
                aria-pressed={game.chosen[side] === word}
                disabled={rests}
                onclick={() => take(side, word)}>
                {#if rests}
                  <b class="tick" aria-hidden="true">✓</b>
                {:else if slipped}
                  <b class="tick" aria-hidden="true">✗</b>
                {:else if side === keyed}
                  <kbd>{row + 1}</kbd>
                {/if}
                <span>{world.words[word][recall]}</span>
              </button>
            {/each}
          </div>
        {/each}
      </div>

      <p class="told" role="status">
        {#if game.miss !== null}
          <b class="tick" aria-hidden="true">✗</b>
          {world.words[game.miss.left].learning} is not {world.words[game.miss.right].known}
        {:else if game.chosen.left !== null}
          now its meaning
        {:else if game.chosen.right !== null}
          now its word
        {/if}
      </p>
    {:else}
      <p class="said {phase === 'cleared' ? 'positive' : 'negative'}" role="status">
        <b class="tick" aria-hidden="true">{phase === "cleared" ? "✓" : "✗"}</b>
        {phase === "cleared" ? "every spirit rests" : "time ran out"}
      </p>
      <ul class="reckoning">
        {#each game.left as word (word)}
          {@const signal = game.reviewed[word]}
          <li class="reckoned {TONE[signal]}">
            <b class="tick" aria-hidden="true">{MARK[signal]}</b>
            <span class="pair-learning">{world.words[word].learning}</span>
            <span class="pair-known">{world.words[word].known}</span>
            <span class="verdict-word">{TOLD[signal]}</span>
          </li>
        {/each}
      </ul>
      <button type="button" class="go" onclick={() => onplay({ next: true })}>
        walk on<kbd>enter</kbd>
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
      width: min(34rem, 100cqw - 2 * var(--size-space-lg));
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
  .go,
  .charm {
    display: grid;
    place-items: center;
  }
  /* a touchable is the theme's key: --control-contrast, labelled --control-on, ringed by --boundary,
     standing --size-depth above the card; pressed, it sinks into --control-contrast-pressed */
  .leave,
  .tile,
  .charm {
    border: 0;
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
  }
  .leave:active,
  .tile:active:not(:disabled),
  .charm:active:not(:disabled) {
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
  .sand {
    height: 100%;
    background: var(--signal-primary-ink);
    transition: width 100ms linear;
  }
  .clock.urgent {
    height: 10px;
  }
  .clock.urgent .sand {
    background: repeating-linear-gradient(
      -45deg,
      var(--signal-negative-ink) 0 5px,
      var(--signal-negative-tint) 5px 10px
    );
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-space-sm);
  }
  .column {
    display: flex;
    flex-direction: column;
    gap: var(--size-space-xs);
  }
  .tile {
    min-height: 2.75rem;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.6rem;
    border-radius: var(--shape-radius-key);
    text-align: left;
    overflow-wrap: anywhere;
  }
  .left-side .tile {
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-md);
  }
  .right-side .tile {
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-sm);
  }
  /* a tile taken is the pressed key, held down until its pair is tried, and ringed for focus */
  .tile[aria-pressed="true"] {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 2px var(--control-focus);
    color: var(--control-on-pressed);
  }
  /* a pair made: its tint, its ink, a 2px ring and ✓; a pair that was none: the same in the
     negative, ✗, shaken once */
  .tile.rests {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 2px var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .tile.slipped {
    background: var(--signal-negative-tint);
    box-shadow: inset 0 0 0 2px var(--signal-negative-ink);
    color: var(--signal-negative-ink);
    animation: shake 240ms ease-in-out;
  }
  @keyframes shake {
    25% {
      transform: translateX(-4px);
    }
    75% {
      transform: translateX(4px);
    }
  }
  .tick {
    font-weight: 700;
  }
  kbd {
    display: none;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--control-on);
  }
  .told {
    min-height: 1.25rem;
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-sm);
    color: var(--text-ink);
  }
  .told .tick {
    color: var(--signal-negative-ink);
  }
  .charm {
    flex: none;
    grid-auto-flow: column;
    gap: 0.3rem;
    min-height: 2.75rem;
    padding: 0.3rem 0.75rem;
    border-radius: var(--shape-radius-pill);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
  }
  .charm b {
    font-weight: 700;
  }
  /* a charm spent is the latched key: sunk, its pressed fill and ink, and said in words */
  .charm[aria-pressed="true"] {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
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
  .said.positive,
  .reckoned.positive {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .said.negative,
  .reckoned.negative {
    background: var(--signal-negative-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  .reckoned.positive {
    box-shadow: inset 0 0 0 2px var(--signal-positive-ink);
  }
  .reckoned.negative {
    box-shadow: inset 0 0 0 2px var(--signal-negative-ink);
  }
  /* each word as it was reviewed: on its tone's full tint, with its mark and its verdict in words */
  .reckoning {
    display: flex;
    flex-direction: column;
    gap: var(--size-space-xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .reckoned {
    display: grid;
    grid-template-columns: auto 1fr 1fr auto;
    align-items: baseline;
    gap: 0.6rem;
    padding: 0.45rem 0.7rem;
    border-radius: var(--shape-radius-key);
    overflow-wrap: anywhere;
  }
  .pair-learning {
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-md);
  }
  .pair-known {
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-sm);
  }
  .verdict-word {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
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
  .go:active {
    transform: translateY(var(--size-depth));
  }
  .go kbd {
    color: var(--signal-primary-on);
  }
  @media (pointer: fine) {
    kbd {
      display: inline;
    }
    .tile:hover:not(:disabled):not([aria-pressed="true"]),
    .charm:hover:not(:disabled),
    .leave:hover {
      background: var(--control-contrast-hover);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sheet,
    .tile.slipped {
      animation: none;
    }
  }
</style>
