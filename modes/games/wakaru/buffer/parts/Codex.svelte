<script>
  import { said } from "../words.js";
  import { STATUS, remembered } from "../../engine/atlas.js";

  // due: the words fallen due, as the screen keeps them — the codex shows what is slipping
  const { world, memory, due, level, onplay, onclose } = $props();

  // a word's standing in the learner's memory, a glyph and a word: the moon fills as it is held
  const MARKS = {
    UNTOUCHED: { glyph: "○", word: "new" },
    UNKNOWN: { glyph: "◔", word: "met" },
    LEARNING: { glyph: "◑", word: "held" },
    KNOWN: { glyph: "◕", word: "known" },
    GRADUATED: { glyph: "●", word: "rooted" },
  };

  // absent from memory is untouched
  const status = (word) => memory[word] ?? "UNTOUCHED";

  // every word of the valley once, however many places hold it
  const words = $derived([...new Set(world.order.flatMap((place) => world.places[place].words))]);
  const counts = $derived(
    Object.fromEntries(
      STATUS.map((name) => [name, words.filter((word) => status(word) === name).length]),
    ),
  );
  const slipping = $derived(words.filter((word) => due.includes(word)));

  const reach = $derived(
    level.next === null ? 1 : (level.points - level.floor) / (level.next - level.floor),
  );

  // the word opened to its example; tapping a voiced word also plays it
  let opened = $state(null);

  const look = (word) => {
    opened = opened === word ? null : word;
    if (world.words[word].audio) onplay(word);
  };
</script>

{#snippet entry(word)}
  {@const reads = said(world, word)}
  {@const example = world.words[word].example}
  {@const mark = MARKS[status(word)]}
  {@const falling = due.includes(word)}
  <li>
    <button
      type="button"
      class="word"
      class:falling
      aria-expanded={opened === word}
      onclick={() => look(word)}>
      <span class="standing">
        <b aria-hidden="true">{mark.glyph}</b>{mark.word}
        {#if falling}<span class="due"><b aria-hidden="true">↻</b>due</span>{/if}
      </span>
      <span class="learning">{reads.learning}</span>
      <span class="known">{reads.known}</span>
    </button>
    {#if opened === word}
      <div class="example">
        {#if example}
          <p class="learning">{example.learning}</p>
          <p class="known">{example.known}</p>
        {:else}
          <p class="known">no example yet</p>
        {/if}
      </div>
    {/if}
  </li>
{/snippet}

<div class="codex">
  <div class="masthead">
    <h2>Codex</h2>
    <button type="button" class="close" aria-label="close the codex" onclick={onclose}>×</button>
  </div>

  <section class="rank" aria-label="your level">
    <div class="line">
      <span class="level">Level {level.level}</span>
      <span class="points">{level.points} points</span>
    </div>
    <span
      class="bar"
      role="meter"
      aria-label="points toward the next level"
      aria-valuemin={level.floor}
      aria-valuemax={level.next === null ? level.points : level.next}
      aria-valuenow={level.points}>
      <span class="fill" style:width="{reach * 100}%"></span>
    </span>
    <span class="aside">
      {level.next === null
        ? "the top level"
        : `${level.next - level.points} points to level ${level.level + 1}`}
      · a word held is worth 1, known 2, rooted 3, and a word that slips takes its points with it
    </span>
  </section>

  <ul class="counts" aria-label="your words by how well you hold them">
    {#each STATUS as name (name)}
      <li><b aria-hidden="true">{MARKS[name].glyph}</b>{counts[name]} {MARKS[name].word}</li>
    {/each}
    <li class="due"><b aria-hidden="true">↻</b>{slipping.length} due</li>
  </ul>

  {#if slipping.length > 0}
    <section class="group" aria-label="slipping">
      <h3>Slipping</h3>
      <p class="aside">due again: their spirits walk until you answer them</p>
      <ul class="lexicon">
        {#each slipping as word (word)}{@render entry(word)}{/each}
      </ul>
    </section>
  {/if}

  {#each world.order as place (place)}
    {@const { name, words: own } = world.places[place]}
    {@const holding = own.filter((word) => remembered(memory[word])).length}
    {@const falling = own.filter((word) => due.includes(word)).length}
    <details class="group" open={falling > 0}>
      <summary>
        <span class="title">{name}</span>
        <span class="aside">
          {holding} of {own.length} held{#if falling > 0}{" "}· {falling} due{/if}
        </span>
      </summary>
      <ul class="lexicon">
        {#each own as word (word)}{@render entry(word)}{/each}
      </ul>
    </details>
  {/each}
</div>

<style>
  /* the codex is flow content in the screen's sheet: one column, centred on a wide pane */
  .codex {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    max-width: 40rem;
    margin: 0 auto;
  }
  .masthead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  h2 {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-strong);
  }
  h3 {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    font-weight: 400;
    color: var(--text-strong);
  }
  .close {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 0;
    border-radius: var(--shape-radius-key);
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
    font-size: var(--font-size-md);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
  .close:active {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  .close:focus-visible,
  .word:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .aside {
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }

  /* the level: a card, its meter a well with a tested ink, the count in words */
  .rank {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.7rem 0.8rem;
    border-radius: var(--shape-radius-card);
    background: var(--plane-lift);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .level {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    color: var(--text-strong);
  }
  .points {
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    color: var(--text-ink);
  }
  .bar {
    display: block;
    height: 8px;
    border-radius: var(--shape-radius-pill);
    background: var(--plane-sunk);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: var(--shape-radius-pill);
    background: var(--signal-positive-ink);
  }

  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .counts li {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-ink);
  }
  .counts b,
  .standing b {
    font-weight: 400;
    color: var(--text-strong);
  }
  .counts .due b,
  .due {
    color: var(--signal-caution-ink);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  summary {
    min-height: 2.75rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.2rem 0.75rem;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::before {
    content: "▸";
    color: var(--text-muted);
  }
  details[open] summary::before {
    content: "▾";
  }
  summary .title {
    flex: 1;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    color: var(--text-strong);
  }

  .lexicon {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* a word is a lifted card to tap: its standing in a glyph and a word, the word, its meaning */
  .word {
    width: 100%;
    min-height: 2.75rem;
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    grid-template-areas: "standing learning" "standing known";
    align-items: center;
    column-gap: 0.6rem;
    padding: 0.4rem 0.7rem;
    border: 0;
    border-radius: var(--shape-radius-card);
    background: var(--plane-lift);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--text-ink);
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .word:active {
    transform: translateY(var(--size-depth));
  }
  .word.falling {
    box-shadow: inset 0 0 0 2px var(--signal-caution-ink);
  }
  /* the standing spans both rows of its card: the glyph and its word, and under them, when the
     word is slipping, its due mark as one unit (inline, "known · due" broke between its words) */
  .standing {
    grid-area: standing;
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.15rem 0.3rem;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-ink);
  }
  .standing .due {
    flex-basis: 100%;
    display: inline-flex;
    gap: 0.3rem;
    white-space: nowrap;
  }
  .word .learning {
    grid-area: learning;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    color: var(--text-strong);
  }
  .word .known {
    grid-area: known;
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
  .example {
    margin: 0.25rem 0 0.35rem 1rem;
    padding: 0.5rem 0.7rem;
    border-radius: var(--shape-radius-card);
    background: var(--plane-sunk);
  }
  .example p {
    margin: 0;
  }
  .example .learning {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-base);
    font-style: italic;
    color: var(--text-strong);
  }
  .example .known {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
</style>
