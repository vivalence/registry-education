<script>
  import { remembered, share, unlocked } from "../../engine/atlas.js";
  import { coins, has } from "../../engine/run.js";
  import { ITEMS } from "../../engine/loot.js";

  // scroll: { kind: "restored", place } · { kind: "crowned" } · { kind: "found", item } — a tool
  // changes what the valley lets the learner do, so its find is told whole
  const { scroll, world, run, memory, language, onclose } = $props();

  const CHIPS = 18;

  const tongue = $derived(language.learning.slug);

  const counted = (id) => {
    const words = world.places[id].words;
    return `${Math.round(share(memory, words) * words.length)} of ${words.length} words held`;
  };

  // after a restoration the learner wants to know where the road goes next
  const awaits = $derived(
    scroll.kind === "restored"
      ? unlocked(world, run).find((id) => !has(run, `restored:${id}`))
      : undefined,
  );

  const held = $derived(
    scroll.kind === "crowned"
      ? Object.values(world.words).filter(
          (word) => word.ontology === "word" && remembered(memory[word.id]),
        )
      : [],
  );
</script>

{#if scroll.kind === "restored"}
  <article class="moment restored">
    <span class="label">restored</span>
    <span class="title">{world.places[scroll.place].name}</span>
    <span class="known">its warden rests · {counted(scroll.place)}</span>
    {#if awaits}
      <span class="next">{world.places[awaits].name} awaits — the atlas shows the way</span>
    {/if}
    <button type="button" class="onward" onclick={onclose}>walk on</button>
  </article>
{:else if scroll.kind === "crowned"}
  <article class="moment crowned">
    <span class="label">the summit is won</span>
    <span class="title">The valley is whole</span>
    <dl class="score">
      <div>
        <dt>words held</dt>
        <dd>{held.length}</dd>
      </div>
      <div>
        <dt>right</dt>
        <dd>{run.counters.right}</dd>
      </div>
      <div>
        <dt>missed</dt>
        <dd>{run.counters.wrong}</dd>
      </div>
      <div>
        <dt>falls</dt>
        <dd>{run.counters.falls}</dd>
      </div>
      <div>
        <dt>steps</dt>
        <dd>{run.counters.steps}</dd>
      </div>
      <div>
        <dt>coins</dt>
        <dd>{coins(run)}</dd>
      </div>
    </dl>
    {#if held.length}
      <ul class="heldwords" lang={tongue}>
        {#each held.slice(0, CHIPS) as word (word.id)}<li>{word.learning}</li>{/each}
        {#if held.length > CHIPS}<li class="beyond">+{held.length - CHIPS}</li>{/if}
      </ul>
    {/if}
    <button type="button" class="onward" onclick={onclose}>walk on</button>
  </article>
{:else}
  <article class="moment found">
    <span class="label">found</span>
    <span class="title">the {scroll.item}</span>
    <span class="known">it {ITEMS[scroll.item].does}</span>
    <button type="button" class="onward" onclick={onclose}>walk on</button>
  </article>
{/if}

<style>
  /* a moment is a card lifted on the page: --surface-lift, ringed by --boundary */
  .moment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: var(--size-space-md) var(--size-space-sm);
    border-radius: var(--shape-radius-card);
    background: var(--surface-lift);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    text-align: center;
  }
  .label {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
  }
  .restored .label {
    color: var(--signal-positive-ink);
  }
  .crowned .label,
  .found .label {
    color: var(--signal-caution-ink);
  }
  .title {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    color: var(--text-strong);
  }
  .known {
    max-width: 30rem;
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-md);
    color: var(--text-ink);
  }
  .next {
    font-family: var(--font-family-sans-text);
    font-size: var(--size-type-sm);
    color: var(--signal-primary-ink);
  }
  .score {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem 1.1rem;
    margin: 0.3rem 0 0;
  }
  .score div {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .score dt {
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
  .score dd {
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--size-type-lg);
    color: var(--text-strong);
  }
  .heldwords {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem;
    max-width: 34rem;
    margin: 0.2rem 0 0;
    padding: 0;
    list-style: none;
  }
  .heldwords li {
    padding: 0.1rem 0.5rem;
    border-radius: var(--shape-radius-pill);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-sm);
    color: var(--text-strong);
  }
  .heldwords li.beyond {
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary-strong);
    font-family: var(--font-family-code);
    color: var(--text-light);
  }
  /* walking on is the one call here: the primary fill and the ink tested on it */
  .onward {
    display: grid;
    place-items: center;
    min-height: 2.75rem;
    margin-top: 0.4rem;
    padding: 0.5rem 1.4rem;
    border: 0;
    border-radius: var(--shape-radius-key);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .onward:active {
    transform: translateY(var(--size-depth));
  }
  .onward:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
</style>
