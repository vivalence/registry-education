<script>
  import { typing } from "../keys.js";
  import { person } from "../words.js";
  import { untrack } from "svelte";
  import { CLOCK, PAUSE, SWIFT, expected, graded, placement, typed } from "../../engine/duel.js";
  import { held } from "../../engine/run.js";

  const { duel, world, run, memory, now, language, onaction, play } = $props();

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

  // a verdict is told by a mark and a word as well as its tone: in datasette primary and negative
  // are one colour, and no learner should need to tell green from red
  const MARK = {
    MASTERY: "✦",
    SUCCESS: "✓",
    NEUTRAL: "≈",
    MISTAKE: "✗",
    FAILURE: "✗",
  };

  const FOES = {
    spirit: () => "a spirit",
    warden: (foe) => `the warden of ${world.places[foe.place].name}`,
    summit: () => "the summit",
    pilgrim: () => "the shrine's round",
  };

  const other = (side) => (side === "known" ? "learning" : "known");

  const ASKS = {
    PICK: (question) =>
      `${language[other(question.recall)].name} → ${language[question.recall].name}`,
    LISTEN: () => "what did you hear?",
    CLOZE: () => "fill the gap",
    TYPE: () => `write it in ${language.learning.name}`,
    BUILD: () => "put the words in order",
    CONJUGATE: () => "conjugate",
  };

  const question = $derived(duel.question);
  const verdict = $derived(duel.verdict);
  const open = $derived(verdict === null);
  const word = $derived(world.words[question.word]);
  const span = $derived(question.deadline - question.asked);
  // the clock stops where the answer stopped it
  const moment = $derived(open ? now : verdict.until - PAUSE);
  const left = $derived(Math.min(1, Math.max(0, (question.deadline - moment) / span)));
  // inside this mark a right answer is MASTERY
  const swift = $derived(1 - (CLOCK[question.format] * SWIFT) / span);
  const candles = $derived(held(run, "candle"));
  const charms = $derived(held(run, "charm"));
  const lightable = $derived(open && typed(question) && !("hint" in question) && candles > 0);
  const charmable = $derived(open && !duel.charmed && charms > 0);

  let text = $state("");
  let built = $state([]);
  let field = $state(null);

  // a question opens on an empty field and nothing placed
  $effect.pre(() => {
    if (!open) return;
    untrack(() => {
      text = "";
      built = [];
    });
  });

  $effect(() => {
    if (field === null) return;
    const input = field;
    input.focus({ preventScroll: true });
    // the phone keyboard rises over the page's foot: keep the question and the field above it
    requestAnimationFrame(() => input.scrollIntoView({ block: "end", behavior: "smooth" }));
  });

  const answer = (value) => onaction({ type: "answer", value });

  const send = (event) => {
    event.preventDefault();
    answer(text);
  };

  // on a keyboard, 1 to 4 pick
  const key = (event) => {
    if (!open || question.options === null) return;
    if (event.metaKey || event.ctrlKey || event.altKey || typing(event)) return;
    const option = question.options[Number(event.key) - 1];
    if (option === undefined) return;
    event.preventDefault();
    answer(option);
  };
</script>

<svelte:window onkeydown={key} />

<div class="duel">
  <div class="crest">
    <!-- the foe is named in words: its colour never leaves the canvas -->
    <span class="foe">{FOES[duel.foe.kind](duel.foe)}</span>
    <span class="vigor" aria-label="{duel.vigor} to go">
      {#each Array(Math.max(duel.vigor, 0)) as _}<i></i>{/each}
    </span>
    <span class="standing">{STANDING[memory[graded(question)] ?? "UNTOUCHED"]}</span>
  </div>

  <div class="clock" class:urgent={open && left < 0.3}>
    <div class="sand" style:width="{left * 100}%"></div>
    <i class="swift" style:left="{swift * 100}%"></i>
  </div>

  <p class="ask">{ASKS[question.format](question)}</p>

  {#if question.format === "PICK"}
    <p class="cue">{word[other(question.recall)]}</p>
  {:else if question.format === "LISTEN"}
    <button
      type="button"
      class="hear"
      aria-label="hear it again"
      onclick={() => play(question.word)}>
      ▶
    </button>
    {#if !open}<p class="cue">{word.learning}</p>{/if}
  {:else if question.format === "CLOZE"}
    {@const sentence = world.words[question.sentence]}
    <p class="sentence">
      {#each sentence.tokens as token, index}
        {#if index === question.blank}
          <span class="gap {open ? '' : TONE[verdict.signal]}">{open ? "" : token.form}</span>
        {:else}
          <span>{token.form}</span>
        {/if}
      {/each}
    </p>
    <p class="gloss">{sentence.known}</p>
  {:else if question.format === "TYPE"}
    <p class="cue">{word.known}</p>
  {:else if question.format === "BUILD"}
    <p class="cue meaning">{world.words[question.sentence].known}</p>
  {:else if question.format === "CONJUGATE"}
    {@const infinitive = world.words[word.infinitive]}
    <p class="cue">{infinitive.learning}</p>
    <p class="gloss">
      {infinitive.known} · {person(question.person)} · {word.tense.replaceAll(".", " ")}
    </p>
  {/if}

  {#if question.options !== null}
    <div class="options">
      {#each question.options as option, index (option)}
        <button
          type="button"
          class="option"
          class:correct={!open && option === question.word}
          class:missed={!open && option === verdict.value && option !== question.word}
          class:aside={!open && option !== question.word && option !== verdict.value}
          disabled={!open}
          onclick={() => answer(option)}>
          {#if !open && option === question.word}
            <b class="tick" aria-hidden="true">✓</b>
          {:else if !open && option === verdict.value}
            <b class="tick" aria-hidden="true">✗</b>
          {:else}
            <kbd>{index + 1}</kbd>
          {/if}
          <span>{world.words[option][question.recall]}</span>
        </button>
      {/each}
    </div>
  {:else if question.format === "BUILD"}
    {@const tokens = world.words[question.sentence].tokens}
    {@const order = open ? built : (verdict.value ?? built)}
    {@const placed = !open && verdict.value !== null ? placement(tokens, verdict.value) : null}
    <div class="line" aria-label="your sentence">
      {#each order as index, position (index)}
        <button
          type="button"
          class="chip"
          class:correct={placed !== null && placed[position]}
          class:missed={placed !== null && !placed[position]}
          disabled={!open}
          onclick={() => (built = built.filter((other) => other !== index))}>
          {#if placed !== null}
            <b class="tick" aria-hidden="true">{placed[position] ? "✓" : "✗"}</b>
          {/if}
          {tokens[index].form}
        </button>
      {/each}
    </div>
    {#if open}
      <div class="pool">
        {#each question.order.filter((index) => !built.includes(index)) as index (index)}
          <button type="button" class="chip" onclick={() => (built = [...built, index])}>
            {tokens[index].form}
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="go whole"
        disabled={built.length < tokens.length}
        onclick={() => answer(built)}>
        send
      </button>
    {:else}
      <p class="expected">{world.words[question.sentence].learning}</p>
    {/if}
  {:else if open}
    {#if "hint" in question}
      <p class="clue">it starts with <b>{question.hint}</b></p>
    {/if}
    <form class="write" onsubmit={send}>
      <input
        bind:this={field}
        bind:value={text}
        lang={language.learning.slug}
        aria-label="your answer"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        enterkeyhint="go"
        placeholder="type it, then go" />
      <button type="submit" class="go" aria-label="answer">→</button>
    </form>
  {:else}
    <div class="settled">
      <span class="expected">{expected(world, question)}</span>
      {#if verdict.value !== null && !verdict.right}
        <s class="typed">{verdict.value}</s>
      {:else if verdict.signal === "NEUTRAL"}
        <span class="typed">{verdict.value}</span>
      {/if}
    </div>
  {/if}

  {#if !open}
    <p class="said {TONE[verdict.signal]}" role="status">
      <b class="tick" aria-hidden="true">{MARK[verdict.signal]}</b>{SAID[verdict.signal]}
    </p>
  {/if}

  <div class="satchel">
    <button
      type="button"
      class="ware"
      disabled={!lightable}
      onclick={() => onaction({ type: "light" })}>
      candle <b>{candles}</b>
    </button>
    <button
      type="button"
      class="ware"
      aria-pressed={duel.charmed}
      disabled={!charmable}
      onclick={() => onaction({ type: "charm" })}>
      charm <b>{charms}</b>{#if duel.charmed}<span class="latched">&nbsp;· on</span>{/if}
    </button>
  </div>
</div>

<style>
  /* the duel is a block lifted on the page: --surface-lift, ringed by --boundary. Everything in it
     reads that step — an ink is only ever laid on --surface-lift, on its own tint over it, or on
     its own fill */
  .duel {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: var(--size-space-sm);
    border-radius: var(--shape-radius-card);
    background: var(--surface-lift);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  .crest {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.75rem;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
  .foe {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .vigor {
    display: flex;
    gap: 0.25rem;
  }
  .vigor i {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--shape-radius-disc);
    background: var(--text-light);
  }
  .standing {
    margin-left: auto;
    padding: 0.1rem 0.55rem;
    border-radius: var(--shape-radius-pill);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  .clock {
    position: relative;
    height: 6px;
    border-radius: var(--shape-radius-pill);
    background: var(--divider);
    overflow: hidden;
    transition: height 160ms;
  }
  .sand {
    height: 100%;
    background: var(--signal-primary-ink);
    transition: width 100ms linear;
  }
  /* hurry is told by more than a colour (datasette's primary is its negative): the bar thickens and
     stripes */
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
  .swift {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--surface-lift);
  }
  .ask {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-light);
  }
  .cue {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    color: var(--text-strong);
    overflow-wrap: anywhere;
  }
  .cue.meaning {
    font-size: var(--font-size-lg);
  }
  .gloss {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
  .sentence {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem 0.45rem;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    color: var(--text-strong);
  }
  .gap {
    min-width: 3.5rem;
    border-bottom: 2px solid var(--signal-primary-ink);
    text-align: center;
  }
  .gap.positive {
    color: var(--signal-positive-ink);
    border-color: var(--signal-positive-ink);
  }
  .gap.caution {
    color: var(--signal-caution-ink);
    border-color: var(--signal-caution-ink);
  }
  .gap.negative {
    color: var(--signal-negative-ink);
    border-color: var(--signal-negative-ink);
  }
  button {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
  }
  /* the host sheet (drapes parts.css:7) sets every button text-align: left · padding: 0 — a glyph
     button centres its glyph itself */
  .hear,
  .go {
    display: grid;
    place-items: center;
  }
  .ware {
    text-align: center;
  }
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  /* the one call to act: the primary fill and the ink tested on it */
  .hear {
    align-self: center;
    width: 3.5rem;
    height: 3.5rem;
    border: 0;
    border-radius: var(--shape-radius-disc);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-size: var(--font-size-lg);
  }
  .hear:active {
    transform: translateY(var(--size-depth));
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  /* a touchable is the theme's key: --control-contrast, labelled --control-on, ringed by --boundary
     and standing --size-depth above the panel; pressed, it sinks into --control-contrast-pressed */
  .option,
  .chip {
    border: 0;
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
  }
  .option:active:not(:disabled),
  .chip:active:not(:disabled) {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  .option {
    min-height: 3.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.7rem 0.8rem;
    border-radius: var(--shape-radius-key);
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-md);
    text-align: center;
    overflow-wrap: anywhere;
  }
  /* words on a key read --control-on: --control-on-muted is tested at 3:1 only (northsea 3.39), a
     glyph's floor, never small text */
  .option kbd {
    display: none;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--control-on);
  }
  .tick {
    font-weight: 700;
  }
  /* a reviewed answer: its tone's tint laid on the panel, the tone's ink, a 2px ring and a mark — ✓
     the answer, ✗ the pick, struck. Never the colour alone */
  .option.correct,
  .chip.correct {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 2px var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .option.missed,
  .chip.missed {
    background: var(--signal-negative-tint);
    box-shadow: inset 0 0 0 2px var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  .option.missed span {
    text-decoration: line-through;
  }
  /* the answers not chosen recede but stay legible: no key fill (the panel shows through), a ring,
     --text-light — tested on --surface-lift — never faded by opacity */
  .option.aside {
    background: transparent;
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--text-light);
  }
  .line,
  .pool {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
  }
  /* where a built sentence goes: a well cut into the panel, its edge dashed in a tested ink */
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
    font-size: var(--font-size-md);
  }
  .write {
    display: flex;
    gap: 0.5rem;
  }
  /* the field: --control-field, its placeholder and caret the theme's own, focus a 2px ring */
  .write input {
    flex: 1;
    min-width: 0;
    min-height: 3.25rem;
    box-sizing: border-box;
    padding: 0.7rem 0.8rem;
    border: 0;
    border-radius: var(--shape-radius-field);
    background: var(--control-field);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--text-strong);
    caret-color: var(--control-field-caret);
    font-family: var(--font-family-sans-text);
    font-size: max(16px, var(--size-type-md));
    text-align: center;
  }
  .write input::placeholder {
    color: var(--control-field-placeholder);
    opacity: 1;
  }
  .write input:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--control-focus);
  }
  .go {
    min-width: 3.25rem;
    min-height: 3.25rem;
    border: 0;
    border-radius: var(--shape-radius-key);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-family: var(--font-family-code);
    font-size: var(--font-size-md);
  }
  .go:active:not(:disabled) {
    transform: translateY(var(--size-depth));
  }
  .go:disabled {
    opacity: var(--text-disabled);
  }
  .go.whole {
    align-self: center;
    padding: 0 1.6rem;
  }
  .clue {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--signal-caution-ink);
  }
  .settled {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.5rem;
  }
  .expected {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-md);
    color: var(--text-strong);
  }
  .typed {
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
  s.typed {
    color: var(--signal-negative-ink);
  }
  /* the verdict: a banner of its tone — the tint laid on the panel, the tone's ink, a mark and the
     word, at reading size. dapper tests exactly this pair: an ink on its own tint over a depth step
     */
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
  .satchel {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }
  .ware {
    min-height: 2.75rem;
    padding: 0.3rem 0.9rem;
    border: 0;
    border-radius: var(--shape-radius-pill);
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
  }
  .ware b {
    font-weight: 700;
  }
  .ware:disabled {
    opacity: var(--text-disabled);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  /* a latched item is the pressed key: sunk, its pressed fill and ink, and "on" said in words */
  .ware[aria-pressed="true"] {
    opacity: 1;
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  .ware[aria-pressed="true"] b {
    color: var(--control-on-pressed);
  }
  @media (pointer: fine) {
    .option {
      justify-content: flex-start;
      text-align: left;
      font-size: var(--font-size-base);
    }
    .option kbd {
      display: inline;
    }
    .option:hover:not(:disabled),
    .chip:hover:not(:disabled) {
      background: var(--control-contrast-hover);
    }
  }
</style>
