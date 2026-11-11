<script>
  import { untrack } from "svelte";
  import { CLOCK, PAUSE, SWIFT, expected, graded, placement, typed } from "../../engine/duel.js";
  import { held } from "../../engine/run.js";

  const { duel, world, run, memory, now, language, tint, onaction, play } = $props();

  const ORDINALS = { first: "1st", second: "2nd", third: "3rd" };

  // a paradigm's cell named alike in every language, however the corpus spells its key:
  // firstSingular and first.singular are both the 1st singular
  const person = (key) => {
    const [ordinal, number] = key.split(/[^a-zA-Z]+|(?=[A-Z])/).map((part) => part.toLowerCase());
    return `${ORDINALS[ordinal]} ${number}`;
  };

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
  const lanterns = $derived(held(run, "lantern"));
  const charms = $derived(held(run, "charm"));
  const lightable = $derived(open && typed(question) && !("hint" in question) && lanterns > 0);
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

  const typing = (event) => {
    const target = event.composedPath()[0];
    return (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
    );
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

<div class="duel" style:--foe={tint}>
  <div class="head">
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
          class:right={!open && option === question.word}
          class:wrong={!open && option === verdict.value && option !== question.word}
          class:dim={!open && option !== question.word && option !== verdict.value}
          disabled={!open}
          onclick={() => answer(option)}>
          <kbd>{index + 1}</kbd>
          <span>{world.words[option][question.recall]}</span>
        </button>
      {/each}
    </div>
  {:else if question.format === "BUILD"}
    {@const tokens = world.words[question.sentence].tokens}
    {@const order = open ? built : (verdict.value ?? built)}
    {@const placed = !open && verdict.value !== null ? placement(tokens, verdict.value) : null}
    <div class="line" class:empty={order.length === 0} aria-label="your sentence">
      {#each order as index, position (index)}
        <button
          type="button"
          class="chip"
          class:right={placed !== null && placed[position]}
          class:wrong={placed !== null && !placed[position]}
          disabled={!open}
          onclick={() => (built = built.filter((other) => other !== index))}>
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
        class="send whole"
        disabled={built.length < tokens.length}
        onclick={() => answer(built)}>
        send
      </button>
    {:else}
      <p class="expected">{world.words[question.sentence].learning}</p>
    {/if}
  {:else if open}
    {#if "hint" in question}
      <p class="hint">it starts with <b>{question.hint}</b></p>
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
      <button type="submit" class="send" aria-label="answer">→</button>
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
    <p class="said {TONE[verdict.signal]}">{SAID[verdict.signal]}</p>
  {/if}

  <div class="satchel">
    <button
      type="button"
      class="item"
      disabled={!lightable}
      onclick={() => onaction({ type: "light" })}>
      lantern <b>{lanterns}</b>
    </button>
    <button
      type="button"
      class="item"
      aria-pressed={duel.charmed}
      disabled={!charmable}
      onclick={() => onaction({ type: "charm" })}>
      charm <b>{charms}</b>
    </button>
  </div>
</div>

<style>
  .duel {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.75rem;
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-light);
  }
  .foe {
    color: var(--foe);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .vigor {
    display: flex;
    gap: 0.25rem;
  }
  .vigor i {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--foe);
  }
  .standing {
    margin-left: auto;
    padding: 0.1rem 0.55rem;
    border: 1px solid var(--divider);
    border-radius: 999px;
  }
  .clock {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: var(--divider);
    overflow: hidden;
  }
  .sand {
    height: 100%;
    background: var(--signal-primary-ink);
    transition: width 100ms linear;
  }
  .clock.urgent .sand {
    background: var(--signal-negative-ink);
  }
  .swift {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--surface);
  }
  .ask {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
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
  .hear {
    align-self: center;
    width: 3.5rem;
    height: 3.5rem;
    border: 1px solid var(--foe);
    border-radius: 50%;
    background: color-mix(in srgb, var(--surface-lift) 70%, var(--surface-sunk));
    color: var(--foe);
    font-size: var(--font-size-lg);
  }
  .hear:active {
    transform: scale(0.96);
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .option {
    min-height: 3.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--boundary);
    border-radius: 6px;
    background: color-mix(in srgb, var(--surface-lift) 70%, var(--surface-sunk));
    color: var(--text-light);
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-md);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .option:active:not(:disabled) {
    transform: scale(0.98);
  }
  .option kbd {
    display: none;
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-light);
  }
  .option.right {
    border-color: var(--signal-positive-ink);
    background: color-mix(in srgb, var(--signal-positive-tint) 50%, transparent);
    color: var(--signal-positive-ink);
  }
  .option.wrong {
    border-color: var(--signal-negative-ink);
    background: color-mix(in srgb, var(--signal-negative-tint) 50%, transparent);
    color: var(--signal-negative-ink);
    text-decoration: line-through;
  }
  .option.dim {
    opacity: 0.4;
  }
  .line,
  .pool {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
  }
  .line {
    min-height: 3.25rem;
    align-items: center;
    padding: 0.25rem;
    border-bottom: 1px solid var(--boundary);
  }
  .chip {
    min-height: 2.75rem;
    min-width: 2.75rem;
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--boundary);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-lift) 70%, var(--surface-sunk));
    color: var(--text-strong);
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
  }
  .chip.right {
    border-color: var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .chip.wrong {
    border-color: var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  .write {
    display: flex;
    gap: 0.5rem;
  }
  .write input {
    flex: 1;
    min-width: 0;
    min-height: 3.25rem;
    box-sizing: border-box;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--boundary);
    border-radius: 6px;
    background: var(--surface-sunk);
    color: var(--text-strong);
    font-family: var(--font-family-sans-text);
    font-size: max(16px, var(--font-size-md));
    text-align: center;
  }
  .write input:focus {
    outline: none;
    border-color: var(--signal-primary-ink);
  }
  .send {
    min-width: 3.25rem;
    min-height: 3.25rem;
    border: 1px solid var(--signal-primary-ink);
    border-radius: 6px;
    background: color-mix(in srgb, var(--signal-primary-tint) 50%, transparent);
    color: var(--signal-primary-ink);
    font-family: var(--font-family-code);
    font-size: var(--font-size-md);
  }
  .send:disabled {
    opacity: 0.4;
  }
  .send.whole {
    align-self: center;
    padding: 0 1.6rem;
  }
  .hint {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
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
  .said {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .said.positive {
    color: var(--signal-positive-ink);
  }
  .said.caution {
    color: var(--signal-caution-ink);
  }
  .said.negative {
    color: var(--signal-negative-ink);
  }
  .satchel {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }
  .item {
    min-height: 2.75rem;
    padding: 0.3rem 0.9rem;
    border: 1px solid var(--divider);
    border-radius: 999px;
    background: transparent;
    color: var(--text-light);
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
  }
  .item b {
    color: var(--text-strong);
  }
  .item:disabled {
    opacity: 0.45;
  }
  .item[aria-pressed="true"] {
    border-color: var(--signal-positive-ink);
    color: var(--signal-positive-ink);
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
      border-color: var(--text-strong);
    }
  }
</style>
