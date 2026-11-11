<script>
  import { fly } from "svelte/transition";
  import { rank, remembered, share, unlocked } from "../../engine/atlas.js";
  import { coins, has } from "../../engine/run.js";

  const { scroll, toasts, world, run, memory, language, audible, onplay, onclose } = $props();

  // the badge reads the word's retention: untouched is new, touched is learning,
  // LEARNING and up is held
  const BADGE = ["new", "learning", "held", "held", "held"];
  const PERSONS = [
    "firstSingular",
    "firstPlural",
    "secondSingular",
    "secondPlural",
    "thirdSingular",
    "thirdPlural",
  ];
  const CHIPS = 18;

  const tongue = $derived(language.learning.slug);
  const entry = $derived(scroll?.kind === "card" ? world.words[scroll.word] : null);
  const badge = $derived(entry ? BADGE[rank(memory[scroll.word])] : null);

  const counted = (id) => {
    const words = world.places[id].words;
    return `${Math.round(share(memory, words) * words.length)} of ${words.length} words held`;
  };

  // after a restoration the learner wants to know where the road goes next
  const awaits = $derived(
    scroll?.kind === "restored"
      ? unlocked(world, run).find((id) => !has(run, `restored:${id}`))
      : undefined,
  );

  const held = $derived(
    scroll?.kind === "crowned"
      ? Object.values(world.words).filter(
          (word) => word.ontology === "word" && remembered(memory[word.id]),
        )
      : [],
  );
</script>

<div class="scroll">
  {#if toasts.length}
    <ul class="toasts" aria-live="polite">
      {#each toasts as toast (toast.id)}
        <li class="toast {toast.tone}" in:fly={{ y: 6, duration: 160 }}>{toast.text}</li>
      {/each}
    </ul>
  {/if}

  {#if entry}
    <article class="card">
      <header>
        <span class="label">{scroll.fresh ? "a new stone" : "a stone"}</span>
        <span class="badge {badge}">{badge}</span>
      </header>

      {#if entry.ontology === "conjugation"}
        <div class="face">
          <span class="learning" lang={tongue}>{world.words[entry.infinitive].learning}</span>
        </div>
        <span class="known">{world.words[entry.infinitive].known} · {entry.tense}</span>
        <div class="paradigm" lang={tongue}>
          {#each PERSONS as person (person)}
            <span>
              {entry.paradigm[person] ? world.words[entry.paradigm[person]].learning : "—"}
            </span>
          {/each}
        </div>
      {:else}
        <div class="face">
          <span class="learning" class:sentence={entry.ontology === "sentence"} lang={tongue}>
            {entry.learning}
          </span>
          {#if audible}
            <button
              type="button"
              class="play"
              aria-label="hear {entry.learning}"
              onclick={() => onplay(scroll.word)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
            </button>
          {/if}
        </div>
        <span class="known">{entry.known}</span>
        {#if entry.example}
          <p class="example">
            <span class="said" lang={tongue}>{entry.example.learning}</span>
            <span class="meant">{entry.example.known}</span>
          </p>
        {/if}
      {/if}
    </article>
  {:else if scroll?.kind === "restored"}
    <article class="moment restored">
      <span class="label">restored</span>
      <span class="title">{world.places[scroll.place].name}</span>
      <span class="known">its warden rests · {counted(scroll.place)}</span>
      {#if awaits}
        <span class="next">
          {world.places[awaits].name} awaits — the valley map shows the way
        </span>
      {/if}
      <button type="button" class="onward" onclick={onclose}>walk on</button>
    </article>
  {:else if scroll?.kind === "crowned"}
    <article class="moment crowned">
      <span class="label">the summit is won</span>
      <span class="title">The valley is whole</span>
      <dl class="tally">
        <div><dt>words held</dt><dd>{held.length}</dd></div>
        <div><dt>right</dt><dd>{run.counters.right}</dd></div>
        <div><dt>missed</dt><dd>{run.counters.wrong}</dd></div>
        <div><dt>falls</dt><dd>{run.counters.falls}</dd></div>
        <div><dt>steps</dt><dd>{run.counters.steps}</dd></div>
        <div><dt>coins</dt><dd>{coins(run)}</dd></div>
      </dl>
      {#if held.length}
        <ul class="chips" lang={tongue}>
          {#each held.slice(0, CHIPS) as word (word.id)}<li>{word.learning}</li>{/each}
          {#if held.length > CHIPS}<li class="more">+{held.length - CHIPS}</li>{/if}
        </ul>
      {/if}
      <button type="button" class="onward" onclick={onclose}>walk on</button>
    </article>
  {/if}
</div>

<style>
  .scroll { display: flex; flex-direction: column; gap: 0.6rem; min-width: 0; }

  .toasts {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .toast {
    max-width: 100%;
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--boundary);
    border-radius: 999px;
    background: var(--surface-lift);
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-strong);
    text-align: center;
  }
  .toast.coins { border-color: var(--signal-caution-ink); color: var(--signal-caution-ink); }
  .toast.rested { border-color: var(--signal-positive-ink); color: var(--signal-positive-ink); }
  .toast.quest { border-color: var(--signal-primary-ink); color: var(--signal-primary-ink); }
  .toast.fallen { border-color: var(--signal-negative-ink); color: var(--signal-negative-ink); }

  .card, .moment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    text-align: center;
  }
  .card header { display: flex; align-items: center; gap: 0.5rem; }
  .label {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-light);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .badge {
    padding: 0.05rem 0.45rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
  }
  .badge.new { color: var(--text-light); }
  .badge.learning { color: var(--signal-primary-ink); }
  .badge.held { color: var(--signal-caution-ink); }

  .face {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    max-width: 100%;
  }
  .learning {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    color: var(--text-strong);
    overflow-wrap: anywhere;
  }
  .learning.sentence { font-size: var(--font-size-lg); }
  .play {
    display: grid;
    place-items: center;
    flex: 0 0 2.75rem;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 1px solid var(--boundary);
    border-radius: 50%;
    background: var(--surface-sunk);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .play svg { width: 1.1rem; height: 1.1rem; fill: var(--text-strong); }
  .play:active { transform: scale(0.94); border-color: var(--signal-primary-ink); }
  .known {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-base);
    color: var(--text-light);
  }
  .example {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    max-width: 32rem;
    margin: 0.25rem 0 0;
  }
  .said {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-base);
    font-style: italic;
    color: var(--text-strong);
  }
  .meant {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
  .paradigm {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, auto));
    gap: 0.15rem 1.4rem;
    margin-top: 0.2rem;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-base);
    color: var(--text-strong);
  }

  .title {
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-xl);
    color: var(--text-strong);
  }
  .restored .label { color: var(--signal-positive-ink); }
  .crowned .label { color: var(--signal-caution-ink); }
  .next {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--signal-primary-ink);
  }
  .tally {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem 1.1rem;
    margin: 0.3rem 0 0;
  }
  .tally div { display: flex; flex-direction: column; align-items: center; }
  .tally dt {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-light);
  }
  .tally dd {
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--font-size-md);
    color: var(--text-strong);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem;
    max-width: 34rem;
    margin: 0.2rem 0 0;
    padding: 0;
    list-style: none;
  }
  .chips li {
    padding: 0.1rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--signal-caution-ink) 45%, var(--boundary));
    border-radius: 999px;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-sm);
    color: var(--text-strong);
  }
  .chips li.more {
    border-style: dashed;
    font-family: var(--font-family-code);
    color: var(--text-light);
  }
  .onward {
    min-height: 2.75rem;
    margin-top: 0.4rem;
    padding: 0.5rem 1.4rem;
    border: 1px solid var(--signal-primary-ink);
    border-radius: 6px;
    background: color-mix(in srgb, var(--signal-primary-tint) 50%, transparent);
    color: var(--signal-primary-ink);
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    cursor: pointer;
    touch-action: manipulation;
  }
</style>
