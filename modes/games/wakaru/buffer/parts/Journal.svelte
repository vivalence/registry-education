<script>
  import { WAKING, remembered, share } from "../../engine/atlas.js";
  import { coins } from "../../engine/run.js";
  import { progress, tracker } from "../../engine/quest.js";

  const { world, run, memory, ctx, onclose } = $props();

  // the quests are read off the run and the memory on every look; the journal keeps nothing
  const next = $derived(tracker(world, run, ctx));
  const journal = $derived(progress(world, run, ctx));

  // the place the tracker follows comes first, the rest in the order they opened
  const front = $derived(next === null ? null : next.place);
  const places = $derived(
    Object.keys(journal).toSorted((one, other) => Number(other === front) - Number(one === front)),
  );

  const promise = (reward) =>
    [
      reward.coins > 0 && `+${reward.coins} coins`,
      reward.refill && "hearts refilled",
      reward.item && `the ${reward.item}`,
    ]
      .filter(Boolean)
      .join(" · ");
</script>

<!-- how far a step stands: the count in words, and a meter beside it -->
{#snippet counted(reached)}
  <span class="count">
    <span
      class="bar"
      role="meter"
      aria-valuemin="0"
      aria-valuemax={reached.of}
      aria-valuenow={reached.done}
      aria-label="{reached.done} of {reached.of}">
      <span class="fill" style:width="{(reached.done / reached.of) * 100}%"></span>
    </span>
    <span class="tally">{reached.done} / {reached.of}</span>
  </span>
{/snippet}

<div class="diary">
  <div class="masthead">
    <h2>Journal</h2>
    <span class="purse"><b>{coins(run)}</b> coins</span>
    <button type="button" class="close" aria-label="close the journal" onclick={onclose}>×</button>
  </div>

  {#if next === null}
    <p class="whole">The valley stands whole. Only your words still need you.</p>
  {:else}
    <article class="next" aria-label="what to do next">
      <span class="label">next</span>
      <span class="title">{next.title}</span>
      <span class="hint">{next.hint}</span>
      {#if next.progress}{@render counted(next.progress)}{/if}
      {#if next.target}<span class="where">at {world.maps[next.target.map].name}</span>{/if}
    </article>
  {/if}

  {#each places as place (place)}
    {@const { name, words } = world.places[place]}
    {@const holding = words.filter((word) => remembered(memory[word])).length}
    <section class="place" aria-label={name}>
      <header>
        <h3>{name}</h3>
        <span class="held">{holding} of {words.length} words held</span>
      </header>

      <div
        class="bar"
        role="meter"
        aria-label="words of {name} held"
        aria-valuemin="0"
        aria-valuemax={words.length}
        aria-valuenow={holding}>
        <span class="fill" style:width="{share(memory, words) * 100}%"></span>
        <span class="waking" style:left="{WAKING * 100}%"></span>
      </div>
      <p class="wakes">its warden wakes at {Math.ceil(words.length * WAKING)} held</p>

      <ol class="quests">
        {#each journal[place] as entry (entry.quest.id)}
          <li class:done={entry.done}>
            <span class="seal" aria-hidden="true">{entry.done ? "✓" : "◇"}</span>
            <span class="quest">
              <span class="title">{entry.quest.title}</span>
              {#if entry.done}
                <span class="hint">done</span>
              {:else}
                <span class="hint">{entry.step.hint}</span>
                {#if entry.step.measure}{@render counted(entry.step.measure(run, ctx))}{/if}
                {#if entry.quest.steps.length > 1}
                  <span class="steps">
                    step {entry.quest.steps.indexOf(entry.step) + 1} of {entry.quest.steps.length}
                  </span>
                {/if}
              {/if}
            </span>
            <span class="reward">{promise(entry.quest.reward)}</span>
          </li>
        {/each}
      </ol>
    </section>
  {/each}
</div>

<style>
  /* .diary · .masthead · .seal: drapes' global parts.css owns .journal, .head and .mark — a view's
     class names must not collide with the host sheet. the journal is flow content in the screen's
     sheet: one column, centred on a wide pane */
  .diary {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 40rem;
    margin: 0 auto;
  }
  .masthead {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  h2 {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-strong);
  }
  .purse {
    margin-left: auto;
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    color: var(--text-ink);
  }
  .purse b {
    color: var(--signal-caution-ink);
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
  .close:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }

  .whole {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    color: var(--text-ink);
  }

  /* the step the tracker follows: a card ringed in the primary ink, read first */
  .next {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.7rem 0.8rem;
    border-radius: var(--shape-radius-card);
    background: var(--surface-lift);
    box-shadow: inset 0 0 0 2px var(--signal-primary-ink);
  }
  .label {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--signal-primary-ink);
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .next .title {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
  }
  .where {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }

  .place {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }
  h3 {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-md);
    font-weight: 400;
    color: var(--text-strong);
  }
  .held {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
    white-space: nowrap;
  }
  .wakes {
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }

  /* a meter: its track a well (--surface-sunk) edged by --boundary, its fill a tested ink; the count
     stays in words beside it */
  .bar {
    position: relative;
    display: block;
    height: 6px;
    border-radius: var(--shape-radius-pill);
    background: var(--surface-sunk);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: var(--shape-radius-pill);
    background: var(--signal-positive-ink);
    transition: width 300ms ease;
  }
  .waking {
    position: absolute;
    top: -3px;
    width: 2px;
    height: 12px;
    background: var(--signal-negative-ink);
  }
  .count {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .count .bar {
    flex: 1;
    max-width: 12rem;
  }
  .tally {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-strong);
    white-space: nowrap;
  }

  .quests {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  /* a quest is a block lifted on the sheet */
  li {
    min-height: 2.75rem;
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 0.6rem;
    padding: 0.45rem 0.6rem;
    border-radius: var(--shape-radius-card);
    background: var(--surface-lift);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  .seal {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    text-align: center;
  }
  .quest {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }
  .title {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    color: var(--text-strong);
  }
  .hint {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-ink);
  }
  .steps {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
  .reward {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--signal-caution-ink);
    text-align: right;
  }
  /* done: ✓ in the positive ink and the word done, a positive ring — the glyph changes, not only its colour */
  li.done {
    box-shadow: inset 0 0 0 var(--size-ring) var(--signal-positive-ink);
  }
  li.done .seal {
    color: var(--signal-positive-ink);
  }
  li.done .title,
  li.done .hint,
  li.done .reward {
    color: var(--text-light);
  }

  @media (max-width: 560px) {
    li {
      grid-template-columns: 1.25rem minmax(0, 1fr);
    }
    .reward {
      grid-column: 2;
      text-align: left;
    }
  }
</style>
