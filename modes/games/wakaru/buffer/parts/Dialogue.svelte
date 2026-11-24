<script>
  import { remembered } from "../../engine/atlas.js";
  import { HEARTS, coins, held } from "../../engine/run.js";
  import { ITEMS } from "../../engine/loot.js";
  import { strewn } from "../../engine/world.js";
  import { WANTS, WARES } from "../../engine/beats/talk.js";

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

  // the keeper's grade wears the duel's tones and marks: NEUTRAL, a near miss, is caution — never
  // the negative of a miss — and every grade is told by a mark and its word, not a colour alone
  const TONE = {
    MASTERY: "positive",
    SUCCESS: "positive",
    NEUTRAL: "caution",
    MISTAKE: "negative",
    FAILURE: "negative",
  };

  const MARK = {
    MASTERY: "✦",
    SUCCESS: "✓",
    NEUTRAL: "≈",
    MISTAKE: "✗",
    FAILURE: "✗",
  };

  const SPEAKERS = {
    keeper: (who) => `the keeper of ${world.places[who.place].name}`,
    vendor: () => "the vendor",
    shrine: () => "the shrine",
    bed: () => "a bed",
  };

  const page = $derived(dialogue.page);
  const lang = $derived(language.learning.slug);
  const speaker = $derived(SPEAKERS[dialogue.who.kind](dialogue.who));

  // a tool is bought once: one held does its work for good
  const owned = (item) => ITEMS[item].kind === "tool" && held(run, item) > 0;

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
          <p class="nothing">The keeper has no sentence to read you here yet.</p>
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
              {@const right = page.picked !== null && meaning === page.sentence.known}
              {@const wrong = meaning === page.picked && meaning !== page.sentence.known}
              <button
                type="button"
                class="choice"
                class:right
                class:wrong
                class:dim={page.picked !== null && !right && !wrong}
                disabled={page.picked !== null}
                onclick={() => choose(meaning)}>
                {#if right}
                  <b class="tick" aria-hidden="true">✓</b>
                {:else if wrong}
                  <b class="tick" aria-hidden="true">✗</b>
                {/if}
                <span>{meaning}</span>
              </button>
            {/each}
          </div>
        {/if}
      {:else if page.kind === "question"}
        {#if page.awaits === "asked"}
          {@render waiting("…")}
        {:else}
          {@render said(page.question, page.gloss)}
          {#if page.verdict}
            <div class="verdict">
              <p class="grade {TONE[page.verdict.grade]}" role="status">
                <b class="tick" aria-hidden="true">{MARK[page.verdict.grade]}</b>
                {page.verdict.grade.toLowerCase()}
              </p>
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
            <p class="nothing">You carry nothing yet. What the keeper wants lies further in.</p>
          {/if}
        {/if}
      {:else if page.kind === "shop"}
        <p class="purse">{coins(run)} coins</p>
        <div class="wares">
          {#each WARES as ware (ware.item)}
            <button
              type="button"
              class="ware"
              disabled={owned(ware.item) || coins(run) < ware.price}
              onclick={() => onaction({ type: "buy", item: ware.item })}>
              <span class="name">{ware.item}</span>
              <span class="what">
                {ITEMS[ware.item].does}
                {#if owned(ware.item)}· yours already
                {:else if held(run, ware.item) > 0}· you carry {held(run, ware.item)}{/if}
              </span>
              <span class="price">{owned(ware.item) ? "✓" : ware.price}</span>
            </button>
          {/each}
          {#each WANTS as want (want.item)}
            {#if held(run, want.item) > 0}
              <button
                type="button"
                class="ware"
                onclick={() => onaction({ type: "sell", item: want.item })}>
                <span class="name">sell a {want.item}</span>
                <span class="what">you carry {held(run, want.item)} · {want.price} coins each</span>
                <span class="price">+{want.price}</span>
              </button>
            {:else}
              <p class="cue">the vendor buys {want.item} at {want.price} coins each</p>
            {/if}
          {/each}
        </div>
        {#if page.bought}<p class="thanks" role="status">A {page.bought} — yours.</p>{/if}
        {#if page.sold}
          {@const paid = WANTS.find((want) => want.item === page.sold).price}
          <p class="thanks" role="status">The vendor takes the {page.sold}: +{paid} coins.</p>
        {/if}
      {:else if page.kind === "shrine"}
        {#if page.due > 0}
          <p class="due">
            <b>{page.due}</b>
            {page.due === 1 ? "word waits" : "words wait"} for you today
          </p>
          <p class="cue">one question each · no hearts to lose</p>
        {:else}
          <p class="due">Nothing is due. Come back tomorrow.</p>
        {/if}
      {:else if page.kind === "bed"}
        {#if run.hearts < HEARTS}
          <p class="due">A bed, made and waiting.</p>
          <p class="cue">
            {run.hearts} of {HEARTS} hearts · sleep, and wake with every heart mended
          </p>
          <button type="button" class="sleep" onclick={() => onaction({ type: "nap" })}>
            Sleep
          </button>
        {:else}
          <p class="due">You are rested: every heart is whole.</p>
        {/if}
      {:else if page.kind === "quiet"}
        <p class="nothing" role="status">The keeper falls quiet. Go back and ask again.</p>
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
  /* a talk is a block lifted on the page, as the duel is: --surface-lift, ringed by --boundary */
  .dialogue {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: var(--size-space-sm);
    border-radius: var(--shape-radius-card);
    background: var(--plane-lift);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  /* a hairline is never ink: who speaks is said in --text-light, cased and tracked by the theme */
  .speaker {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .cue {
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-light);
  }
  /* the keeper thinking: the dots breathe by moving, never by fading below their contrast */
  .waiting {
    margin: 0;
    padding: 0.4rem 0;
    text-align: center;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    color: var(--text-light);
    animation: breathe 1.2s ease-in-out infinite;
  }
  @keyframes breathe {
    50% {
      transform: translateY(-0.2rem);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .waiting {
      animation: none;
    }
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
  .play,
  .send {
    display: grid;
    place-items: center;
  }
  .move,
  .item {
    text-align: center;
  }
  button:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }

  .menu,
  .meanings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 0.5rem;
  }
  /* a touchable is the theme's key: --control-contrast, labelled --control-on, ringed and standing
     --size-depth above the panel; pressed, it sinks into --control-contrast-pressed */
  .choice,
  .ware,
  .item,
  .move {
    border: 0;
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
  }
  .choice:active:not(:disabled),
  .ware:active:not(:disabled),
  .item:active,
  .move:active {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  .choice {
    min-height: 3.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    padding: 0.6rem 0.8rem;
    border-radius: var(--shape-radius-key);
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    text-align: left;
  }
  .meanings .choice {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
  }
  .choice .name {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    color: var(--control-on);
  }
  /* words on a key read --control-on: --control-on-muted is tested at 3:1 only (northsea 3.39) */
  .choice .what {
    font-size: var(--size-type-xs);
    color: var(--control-on);
  }
  .tick {
    font-weight: 700;
  }
  /* a reviewed meaning: its tone's tint laid on the panel, the tone's ink, a 2px ring, ✓ or ✗ (struck) */
  .choice.right {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 2px var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .choice.wrong {
    background: var(--signal-negative-tint);
    box-shadow: inset 0 0 0 2px var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  .choice.wrong span {
    text-decoration: line-through;
  }
  .choice.dim {
    background: transparent;
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--text-light);
  }

  .said summary {
    list-style: none;
    cursor: pointer;
  }
  .said summary::-webkit-details-marker {
    display: none;
  }
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
  .said:not([open]) .line::after {
    content: "  ·  tap for its meaning";
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    font-style: normal;
    color: var(--text-light);
  }
  .gloss {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    color: var(--text-light);
  }

  .heard {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
  }
  .heard .said {
    flex: 1;
    min-width: 0;
  }
  /* hear it again: the primary fill and the ink tested on it */
  .play {
    flex: 0 0 2.75rem;
    height: 2.75rem;
    border: 0;
    border-radius: var(--shape-radius-disc);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-size: var(--font-size-sm);
  }
  .tokens {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 0.3rem;
  }
  /* a word of the sentence is a tap target: never narrower than a thumb, however short the word */
  .token summary {
    list-style: none;
    min-height: 2.75rem;
    min-width: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    border-bottom: 1px dashed var(--text-muted);
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    color: var(--text-light);
    cursor: pointer;
  }
  .token summary::-webkit-details-marker {
    display: none;
  }
  .token.held summary {
    color: var(--text-strong);
    border-bottom: 2px solid var(--signal-positive-ink);
  }
  .token .gloss {
    display: block;
    padding: 0.1rem 0.5rem;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
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
  }
  .write input::placeholder {
    color: var(--control-field-placeholder);
    opacity: 1;
  }
  .write input:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--control-focus);
  }
  .send,
  .move.primary,
  .sleep {
    border: 0;
    background: var(--signal-primary);
    box-shadow: none;
    color: var(--signal-primary-on);
  }
  .send {
    flex: 0 0 3.25rem;
    border-radius: var(--shape-radius-key);
    font-size: var(--font-size-md);
  }
  .send:active,
  .move.primary:active,
  .sleep:active {
    transform: translateY(var(--size-depth));
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    box-shadow: none;
  }

  .reply {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-md);
    color: var(--text-strong);
  }
  .verdict {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }
  /* the keeper's grade is the duel's verdict banner: the tone's tint on the panel, its ink, a mark, the word */
  .grade {
    align-self: stretch;
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
  .grade.positive {
    background: var(--signal-positive-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-positive-ink);
    color: var(--signal-positive-ink);
  }
  .grade.caution {
    background: var(--signal-caution-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-caution-ink);
    color: var(--signal-caution-ink);
  }
  .grade.negative {
    background: var(--signal-negative-tint);
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-negative-ink);
    color: var(--signal-negative-ink);
  }
  .correction {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-base);
    color: var(--signal-caution-ink);
  }
  .feedback {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }

  .satchel {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .item {
    min-height: 2.75rem;
    padding: 0.4rem 0.9rem;
    border-radius: var(--shape-radius-pill);
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
  }
  .thanks {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    color: var(--signal-positive-ink);
  }
  .miss {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--signal-negative-ink);
  }
  .nothing {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }

  .purse {
    margin: 0;
    text-align: right;
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    color: var(--signal-caution-ink);
  }
  .wares {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .ware {
    min-height: 3.25rem;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: "name price" "what price";
    align-items: center;
    column-gap: 0.8rem;
    padding: 0.5rem 0.8rem;
    border-radius: var(--shape-radius-key);
    text-align: left;
  }
  .ware:disabled {
    opacity: var(--text-disabled);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  .ware .name {
    grid-area: name;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    color: var(--control-on);
  }
  .ware .what {
    grid-area: what;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-xs);
    color: var(--control-on);
  }
  /* on a key the price reads the key's own ink: a signal ink is only tested on a depth step */
  .ware .price {
    grid-area: price;
    font-family: var(--font-family-code);
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--control-on);
  }

  .due {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    color: var(--text-strong);
  }
  .sleep {
    min-height: 2.75rem;
    border-radius: var(--shape-radius-key);
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    text-align: center;
  }
  .due b {
    color: var(--signal-primary-ink);
  }

  .moves {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .move {
    min-height: 2.75rem;
    min-width: 5.5rem;
    padding: 0.5rem 1rem;
    border-radius: var(--shape-radius-key);
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
  }
  .move.primary {
    flex: 1;
  }
</style>
