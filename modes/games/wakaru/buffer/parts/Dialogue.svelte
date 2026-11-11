<script>
  import { remembered } from "../../engine/atlas.js";
  import { coins, held } from "../../engine/run.js";
  import { strewn } from "../../engine/world.js";
  import { PASSING, WARES } from "../../engine/beats/talk.js";

  const { dialogue, world, run, memory, language, onaction, play } = $props();

  const LABELS = {
    listen: "Listen",
    talk: "Talk",
    errand: "Errand",
    question: "Question",
    leave: "Leave",
    back: "Back",
    begin: "Begin the round",
  };

  const MENU = {
    listen: "hear a sentence, find its meaning",
    talk: "let the keeper speak",
    errand: "the keeper needs something",
    question: "answer in your own words",
    leave: "walk on",
  };

  const USES = {
    lantern: "spent during a duel: the first letter of a typed answer",
    charm: "spent during a duel: four seconds more on every question after",
    tea: "mends one heart",
  };

  const page = $derived(dialogue.page);
  const lang = $derived(language.learning.slug);
  const speaker = $derived(
    dialogue.who.kind === "keeper"
      ? `the keeper of ${world.places[dialogue.who.place].name}`
      : `the ${dialogue.who.kind}`,
  );

  // the word-items the learner carries that this keeper's place strews: another place's item waits
  // in the satchel for its own keeper
  const satchel = $derived(
    dialogue.who.kind === "keeper"
      ? strewn(world, dialogue.who.place).filter((word) => held(run, `word:${word}`) > 0)
      : [],
  );

  // the reply field is re-made for every question, so it is read off the form, never kept
  const send = (event) => {
    event.preventDefault();
    const reply = new FormData(event.currentTarget).get("reply");
    onaction({ type: "choose", option: "reply", reply });
  };

  const choose = (option) => onaction({ type: "choose", option });
</script>

{#snippet waiting(text)}
  <p class="waiting" role="status">{text}</p>
{/snippet}

<!-- a line in the language being learned: its meaning shows on a tap -->
{#snippet said(line, gloss)}
  {#key line}
    <details class="said">
      <summary class="line" {lang}>{line}</summary>
      <p class="gloss">{gloss}</p>
    </details>
  {/key}
{/snippet}

{#snippet hear(word)}
  <button type="button" class="play" aria-label="hear it" onclick={() => play(word)}>▶</button>
{/snippet}

<div class="dialogue">
  <div class="speaker">{speaker}</div>

  {#if page.kind === "menu"}
    <div class="menu">
      {#each page.options as option (option)}
        <button type="button" class="choice" onclick={() => choose(option)}>
          <span class="name">{LABELS[option]}</span>
          <span class="what">{MENU[option]}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="page">
      {#if page.kind === "talk"}
        {#if page.awaits}
          {@render waiting("…")}
        {:else}
          {@render said(page.line, page.gloss)}
        {/if}
      {:else if page.kind === "listen"}
        {#if page.awaits}
          {@render waiting("…")}
        {:else if page.sentence === null}
          <p class="empty">The keeper has no sentence to read you here yet.</p>
        {:else}
          <div class="heard">
            {#if page.sentence.audio}{@render hear(page.sentence.id)}{/if}
            {#key page.sentence}
              <div class="tokens" {lang}>
                {#each page.sentence.tokens as token (token.index)}
                  <details class="token" class:held={remembered(memory[token.literal])}>
                    <summary>{token.form}</summary>
                    <span class="gloss">{token.gloss}</span>
                  </details>
                {/each}
              </div>
            {/key}
          </div>
          <p class="cue">what does it mean?</p>
          <div class="meanings">
            {#each page.meanings as meaning}
              <button
                type="button"
                class="choice"
                class:right={page.picked !== null && meaning === page.sentence.known}
                class:wrong={meaning === page.picked && meaning !== page.sentence.known}
                disabled={page.picked !== null}
                onclick={() => choose(meaning)}>{meaning}</button>
            {/each}
          </div>
        {/if}
      {:else if page.kind === "question"}
        {#if page.awaits === "asked"}
          {@render waiting("…")}
        {:else}
          {@render said(page.question, page.gloss)}
          {#if page.verdict}
            <div class="verdict" class:passed={PASSING.includes(page.verdict.grade)}>
              <span class="grade">{page.verdict.grade.toLowerCase()}</span>
              <p class="reply" {lang}>{page.reply}</p>
              {#if page.verdict.correction}
                <p class="correction" {lang}>{page.verdict.correction}</p>
              {/if}
              {#if page.verdict.feedback}<p class="feedback">{page.verdict.feedback}</p>{/if}
            </div>
          {:else if page.reply !== null}
            <p class="reply" {lang}>{page.reply}</p>
            {@render waiting("the keeper weighs your words…")}
          {:else}
            {#key page.question}
              <form class="write" onsubmit={send}>
                <input
                  name="reply"
                  {lang}
                  autocomplete="off"
                  autocorrect="off"
                  spellcheck="false"
                  enterkeyhint="send"
                  placeholder="answer in {language.learning.name}" />
                <button type="submit" class="send" aria-label="send the answer">→</button>
              </form>
            {/key}
          {/if}
        {/if}
      {:else if page.kind === "errand"}
        {@const asked = world.words[page.word]}
        <p class="cue">the keeper asks for</p>
        <div class="heard">
          {#if asked.audio}{@render hear(page.word)}{/if}
          {@render said(asked.learning, asked.known)}
        </div>
        {#if page.handed === page.word}
          <p class="thanks">The keeper takes it, and thanks you.</p>
        {:else}
          {#if page.handed}
            {@const handed = world.words[page.handed]}
            <p class="miss">
              Not the <span {lang}>{handed.learning}</span>, and the keeper keeps it.
            </p>
          {/if}
          {#if satchel.length > 0}
            <p class="cue">hand over</p>
            <div class="satchel">
              {#each satchel as word (word)}
                <button
                  type="button"
                  class="item"
                  {lang}
                  onclick={() => onaction({ type: "deliver", item: word })}>
                  {world.words[word].learning}
                </button>
              {/each}
            </div>
          {:else}
            <p class="empty">You carry nothing yet. What the keeper wants lies further in.</p>
          {/if}
        {/if}
      {:else if page.kind === "shop"}
        <p class="purse">{coins(run)} coins</p>
        <div class="wares">
          {#each WARES as ware (ware.item)}
            <button
              type="button"
              class="ware"
              disabled={coins(run) < ware.price}
              onclick={() => onaction({ type: "buy", item: ware.item })}>
              <span class="name">{ware.item}</span>
              <span class="what">
                {USES[ware.item]}
                {#if held(run, ware.item) > 0}· you carry {held(run, ware.item)}{/if}
              </span>
              <span class="price">{ware.price}</span>
            </button>
          {/each}
        </div>
        {#if page.bought}<p class="thanks">A {page.bought} — yours.</p>{/if}
      {:else if page.kind === "shrine"}
        {#if page.due > 0}
          <p class="due">
            <b>{page.due}</b> {page.due === 1 ? "word waits" : "words wait"} for you today
          </p>
          <p class="cue">one question each · no hearts to lose</p>
        {:else}
          <p class="due">Nothing is due. Come back tomorrow.</p>
        {/if}
      {:else if page.kind === "quiet"}
        <p class="empty" role="status">The keeper falls quiet. Go back and ask again.</p>
      {/if}
    </div>

    <div class="moves">
      {#each page.options.filter((option) => option !== "reply") as option (option)}
        <button
          type="button"
          class="move"
          class:primary={option === "begin"}
          onclick={() => choose(option)}>
          {option === page.kind ? "Another" : LABELS[option]}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dialogue { display: flex; flex-direction: column; gap: 0.7rem; }
  .speaker {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--boundary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .page { display: flex; flex-direction: column; gap: 0.6rem; }
  .cue { margin: 0; font-family: var(--font-family-code); font-size: var(--font-size-xs); color: var(--text-light); }
  .waiting {
    margin: 0;
    padding: 0.4rem 0;
    text-align: center;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    color: var(--boundary);
    animation: breathe 1.2s ease-in-out infinite;
  }
  @keyframes breathe { 50% { opacity: 0.3; } }

  button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; cursor: pointer; }
  button:disabled { cursor: default; }

  .menu, .meanings { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: 0.5rem; }
  .choice {
    min-height: 3.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--boundary);
    border-radius: 6px;
    background: color-mix(in srgb, var(--surface-lift) 70%, var(--surface-sunk));
    color: var(--text-light);
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    text-align: left;
  }
  .choice:active:not(:disabled) { transform: scale(0.98); }
  .choice .name { font-family: var(--font-family-serif-heading); font-size: var(--font-size-md); color: var(--text-strong); }
  .choice .what { font-size: var(--font-size-xs); color: var(--text-light); }
  .choice.right { border-color: var(--signal-positive-ink); background: color-mix(in srgb, var(--signal-positive-tint) 50%, transparent); color: var(--text-strong); }
  .choice.wrong { border-color: var(--signal-negative-ink); background: color-mix(in srgb, var(--signal-negative-tint) 50%, transparent); }

  .said summary { list-style: none; cursor: pointer; }
  .said summary::-webkit-details-marker { display: none; }
  .line {
    display: block;
    min-height: 2.75rem;
    padding: 0.3rem 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    font-style: italic;
    color: var(--text-strong);
    text-align: center;
  }
  .said:not([open]) .line::after { content: "  ·  tap for its meaning"; font-family: var(--font-family-code); font-size: var(--font-size-xs); font-style: normal; color: var(--boundary); }
  .gloss { margin: 0; text-align: center; font-family: var(--font-family-sans-text); font-size: var(--font-size-base); color: var(--text-light); }

  .heard { display: flex; align-items: center; justify-content: center; gap: 0.6rem; }
  .heard .said { flex: 1; min-width: 0; }
  .play {
    flex: 0 0 2.75rem;
    height: 2.75rem;
    border: 1px solid var(--signal-primary-ink);
    border-radius: 50%;
    background: color-mix(in srgb, var(--signal-primary-tint) 50%, transparent);
    color: var(--signal-primary-ink);
    font-size: var(--font-size-sm);
  }
  .tokens { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 0.3rem; }
  .token summary {
    list-style: none;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
    border-bottom: 1px dashed var(--boundary);
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    color: var(--text-light);
    cursor: pointer;
  }
  .token summary::-webkit-details-marker { display: none; }
  .token.held summary { color: var(--text-strong); border-bottom-style: solid; border-bottom-color: var(--signal-positive-ink); }
  .token .gloss { display: block; padding: 0.1rem 0.5rem; font-family: var(--font-family-code); font-size: var(--font-size-xs); }

  .write { display: flex; gap: 0.5rem; }
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
  }
  .write input:focus { outline: none; border-color: var(--signal-primary-ink); }
  .send, .move.primary {
    border: 1px solid var(--signal-primary-ink);
    background: color-mix(in srgb, var(--signal-primary-tint) 50%, transparent);
    color: var(--signal-primary-ink);
  }
  .send { flex: 0 0 3.25rem; border-radius: 6px; font-size: var(--font-size-md); }

  .reply { margin: 0; text-align: center; font-family: var(--font-family-sans-text); font-size: var(--font-size-md); color: var(--text-strong); }
  .verdict { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0.6rem; border: 1px solid var(--signal-negative-ink); border-radius: 6px; }
  .verdict.passed { border-color: var(--signal-positive-ink); }
  .grade { font-family: var(--font-family-code); font-size: var(--font-size-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--signal-negative-ink); }
  .verdict.passed .grade { color: var(--signal-positive-ink); }
  .correction { margin: 0; font-family: var(--font-family-serif-heading); font-size: var(--font-size-base); color: var(--signal-caution-ink); }
  .feedback { margin: 0; text-align: center; font-family: var(--font-family-sans-text); font-size: var(--font-size-sm); color: var(--text-light); }

  .satchel { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .item {
    min-height: 2.75rem;
    padding: 0.4rem 0.9rem;
    border: 1px solid var(--signal-caution-ink);
    border-radius: 999px;
    background: transparent;
    color: var(--text-strong);
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
  }
  .thanks { margin: 0; text-align: center; font-family: var(--font-family-sans-text); font-size: var(--font-size-base); color: var(--signal-positive-ink); }
  .miss { margin: 0; text-align: center; font-family: var(--font-family-sans-text); font-size: var(--font-size-sm); color: var(--signal-negative-ink); }
  .empty { margin: 0; text-align: center; font-family: var(--font-family-sans-text); font-size: var(--font-size-sm); color: var(--text-light); }

  .purse { margin: 0; text-align: right; font-family: var(--font-family-code); font-size: var(--font-size-sm); color: var(--signal-caution-ink); }
  .wares { display: flex; flex-direction: column; gap: 0.5rem; }
  .ware {
    min-height: 3.25rem;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: "name price" "what price";
    align-items: center;
    column-gap: 0.8rem;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--boundary);
    border-radius: 6px;
    background: color-mix(in srgb, var(--surface-lift) 70%, var(--surface-sunk));
    color: var(--text-light);
    text-align: left;
  }
  .ware:disabled { opacity: 0.45; }
  .ware .name { grid-area: name; font-family: var(--font-family-serif-heading); font-size: var(--font-size-md); color: var(--text-strong); }
  .ware .what { grid-area: what; font-family: var(--font-family-sans-text); font-size: var(--font-size-xs); }
  .ware .price { grid-area: price; font-family: var(--font-family-code); font-size: var(--font-size-base); color: var(--signal-caution-ink); }

  .due { margin: 0; text-align: center; font-family: var(--font-family-serif-heading); font-size: var(--font-size-lg); color: var(--text-strong); }
  .due b { color: var(--signal-primary-ink); }

  .moves { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .move {
    min-height: 2.75rem;
    min-width: 5.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--boundary);
    border-radius: 6px;
    background: transparent;
    color: var(--text-light);
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
  }
  .move.primary { flex: 1; }
</style>
