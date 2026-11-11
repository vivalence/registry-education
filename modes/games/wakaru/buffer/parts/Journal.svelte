<script>
  import { WAKING, remembered, share } from "../../engine/atlas.js";
  import { coins } from "../../engine/run.js";
  import { progress } from "../../engine/quest.js";

  const { world, run, memory, onclose } = $props();

  // the quests are read off the run and the memory on every look; the journal keeps nothing
  const journal = $derived(progress(world, run, { world, memory }));

  const promise = (reward) =>
    [reward.coins > 0 && `+${reward.coins} coins`, reward.refill && "hearts refilled"]
      .filter(Boolean)
      .join(" · ");
</script>

<section class="journal" aria-label="journal">
  <div class="head">
    <span class="title">journal</span>
    <span class="purse">{coins(run)} coins</span>
    <button type="button" class="close" aria-label="close the journal" onclick={onclose}>×</button>
  </div>

  {#each Object.entries(journal) as [place, entries] (place)}
    {@const words = world.places[place].words}
    {@const holding = words.filter((word) => remembered(memory[word])).length}
    <article class="place">
      <header>
        <h3>{world.places[place].name}</h3>
        <span class="held">{holding} of {words.length} words held</span>
      </header>

      <div
        class="bar"
        role="meter"
        aria-label="words of {world.places[place].name} held"
        aria-valuemin="0"
        aria-valuemax={words.length}
        aria-valuenow={holding}>
        <div class="fill" style:width="{share(memory, words) * 100}%"></div>
        <div class="waking" style:left="{WAKING * 100}%" title="the warden wakes here"></div>
      </div>

      <ol class="quests">
        {#each entries as entry (entry.quest.id)}
          <li class:done={entry.done}>
            <span class="mark" aria-label={entry.done ? "done" : "open"}>
              {entry.done ? "✓" : "◇"}
            </span>
            <span class="quest">
              <span class="name">{entry.quest.title}</span>
              {#if !entry.done}<span class="hint">{entry.step.hint}</span>{/if}
            </span>
            <span class="reward">{promise(entry.quest.reward)}</span>
          </li>
        {/each}
      </ol>
    </article>
  {/each}
</section>

<style>
  .journal { display: flex; flex-direction: column; gap: 1rem; }
  .head { display: flex; align-items: center; gap: 0.75rem; }
  .title {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--boundary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .purse { margin-left: auto; font-family: var(--font-family-code); font-size: var(--font-size-sm); color: var(--signal-caution-ink); }
  .close {
    width: 2.75rem;
    height: 2.75rem;
    border: 1px solid var(--boundary);
    border-radius: 6px;
    background: transparent;
    color: var(--text-light);
    font-size: var(--font-size-md);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }

  .place { display: flex; flex-direction: column; gap: 0.45rem; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
  h3 { margin: 0; font-family: var(--font-family-serif-heading); font-size: var(--font-size-md); font-weight: 400; color: var(--text-strong); }
  .held { font-family: var(--font-family-code); font-size: var(--font-size-xs); color: var(--text-light); white-space: nowrap; }

  .bar { position: relative; height: 6px; border-radius: 3px; background: var(--divider); }
  .fill { height: 100%; border-radius: 3px; background: var(--signal-positive-ink); transition: width 300ms ease; }
  .waking { position: absolute; top: -3px; width: 2px; height: 12px; background: var(--signal-negative-ink); }

  .quests { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.35rem; }
  li {
    min-height: 2.75rem;
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 0.6rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--divider);
    border-radius: 6px;
    background: color-mix(in srgb, var(--surface-lift) 60%, var(--surface-sunk));
  }
  .mark { font-size: var(--font-size-sm); color: var(--boundary); text-align: center; }
  .quest { display: flex; flex-direction: column; min-width: 0; }
  .name { font-family: var(--font-family-sans-text); font-size: var(--font-size-base); color: var(--text-strong); }
  .hint { font-family: var(--font-family-sans-text); font-size: var(--font-size-sm); color: var(--text-light); }
  .reward { font-family: var(--font-family-code); font-size: var(--font-size-xs); color: var(--signal-caution-ink); text-align: right; }
  li.done { border-color: color-mix(in srgb, var(--signal-positive-ink) 40%, transparent); }
  li.done .mark { color: var(--signal-positive-ink); }
  li.done .name { color: var(--text-light); }
  li.done .reward { color: var(--boundary); }

  @media (max-width: 560px) {
    li { grid-template-columns: 1.25rem minmax(0, 1fr); }
    .reward { grid-column: 2; text-align: left; }
  }
</style>
