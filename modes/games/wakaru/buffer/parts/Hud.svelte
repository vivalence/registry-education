<script>
  import { HEARTS, coins, held } from "../../engine/run.js";
  import { ITEMS } from "../../engine/loot.js";

  // step: the tracker's next step, null once nothing is left to follow — its place null on the
  // summit's climb; busy: a duel, a talk or a game is up, and the panels wait for it to end
  // tall: the hud's height, so the stage keeps the learner out from under it
  let {
    world,
    run,
    daily,
    level,
    step,
    busy,
    onatlas,
    onjournal,
    oncodex,
    onaction,
    tall = $bindable(0),
  } = $props();

  const map = $derived(world.maps[run.pose.map]);
  // a tea is drunk from beside the hearts it mends, only while one is missing and nothing is up
  const drinkable = $derived(held(run, "tea") > 0 && run.hearts < HEARTS && !busy);
  const carried = $derived(
    Object.keys(ITEMS)
      .map((item) => ({ item, count: held(run, item) }))
      .filter((ware) => ware.count > 0 && !(ware.item === "tea" && drinkable)),
  );
  // the share of the way from this level's floor to the next; the top level is full
  const climbed = $derived(
    level.next === null ? 1 : (level.points - level.floor) / (level.next - level.floor),
  );
</script>

<header class="hud" bind:clientHeight={tall}>
  <div class="rows">
    <div class="line">
      <button
        type="button"
        class="where"
        disabled={busy}
        aria-label="{map.name} — open the atlas"
        onclick={onatlas}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20" />
        </svg>
        <span class="label">{map.name}</span>
      </button>

      <div class="stats">
        <span class="lives" role="img" aria-label="{run.hearts} of {HEARTS} hearts">
          {#each { length: HEARTS }, index}
            <span class="heart" class:spent={index >= run.hearts}>
              {index >= run.hearts ? "♡" : "♥"}
            </span>
          {/each}
        </span>
        {#if drinkable}
          <button
            type="button"
            class="tea"
            aria-label="drink a tea to mend a heart — {held(run, 'tea')} carried"
            onclick={() => onaction({ type: "use", item: "tea" })}
          >
            +♥<b>{held(run, "tea")}</b>
          </button>
        {/if}
        <span class="purse" title="coins"><i class="coin" aria-hidden="true"></i>{coins(run)}</span>
      </div>
    </div>

    <div class="line">
      {#if step}
        <button
          type="button"
          class="trail"
          disabled={busy}
          aria-label="{step.title}: {step.hint} — open the journal"
          onclick={onjournal}
        >
          <span class="label">
            {step.place === null ? step.title : world.places[step.place].name}
          </span>
          <span class="clue">{step.hint}</span>
          {#if step.progress}
            <b class="steps">{step.progress.done}/{step.progress.of}</b>
          {/if}
          <span class="chevron" aria-hidden="true">›</span>
        </button>
      {/if}

      <button
        type="button"
        class="level"
        disabled={busy}
        aria-label="level {level.level} — open the codex"
        onclick={oncodex}
      >
        <span>Lv {level.level}</span>
        <span class="beads" aria-hidden="true"><i style:width="{climbed * 100}%"></i></span>
      </button>
    </div>

    {#if daily || carried.length}
      <div class="aside">
        {#each carried as ware (ware.item)}
          <span class="ware">{ware.item}<b>{ware.count}</b></span>
        {/each}
        {#if daily}
          <span class="ware" title="words due for review">{daily.due}{" "}<small>due</small></span>
          <span class="ware" class:kindled={daily.today} title="days in a row with a review">
            {daily.streak}{" "}<small>day streak</small><b>{daily.today ? "✷" : "✧"}</b>
          </span>
        {/if}
      </div>
    {/if}
  </div>
</header>

<style>
  /* the hud floats over the stage's head: on a phone two rows, the place and the purse over the
     next step and the level; a wide pane holds it in one. the hud is the container its rows are
     laid out by */
  .hud {
    container-type: inline-size;
    pointer-events: none;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem max(0.5rem, env(safe-area-inset-right)) 0
      max(0.5rem, env(safe-area-inset-left));
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    color: var(--text-ink);
  }
  .line {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  @container (min-width: 46rem) {
    .rows {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      grid-template-areas:
        "where trail stats level"
        "aside aside aside aside";
      align-items: center;
    }
    .line {
      display: contents;
    }
  }
  .line > *,
  .aside {
    pointer-events: auto;
  }
  .where {
    grid-area: where;
    flex: 0 1 auto;
  }
  .stats {
    grid-area: stats;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
  }
  .trail {
    grid-area: trail;
    flex: 1 1 auto;
  }
  .level {
    grid-area: level;
    margin-left: auto;
  }
  .aside {
    grid-area: aside;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    justify-content: flex-end;
  }
  @container (max-width: 30rem) {
    .aside {
      display: none;
    }
  }

  /* a touchable is the theme's key: --control-contrast labelled --control-on, ringed, standing
     --size-depth above the stage — and lifted off the world by --shape-lift */
  button {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    border: 0;
    border-radius: var(--shape-radius-key);
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary),
      var(--shape-lift);
    color: var(--control-on);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  button:active:not(:disabled) {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow: var(--shape-sunk), inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  button:disabled {
    opacity: var(--text-disabled);
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .where {
    max-width: 100%;
    min-width: 0;
  }
  .where svg {
    flex: none;
    width: 1.1rem;
    height: 1.1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-family-serif-heading);
    font-size: var(--size-type-md);
    color: var(--control-on);
  }

  /* what the learner holds is shown, not touched: a chip floating over the world */
  .lives,
  .purse,
  .ware {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 2.75rem;
    padding: 0 0.6rem;
    border-radius: var(--shape-radius-key);
    background: var(--surface-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      var(--shape-lift);
    white-space: nowrap;
  }
  .lives {
    gap: 0.1rem;
    font-size: var(--size-type-md);
    line-height: 1;
  }
  .heart {
    color: var(--signal-negative-ink);
    transition: transform 200ms;
  }
  /* a lost heart is ♡ in --text-muted: the shape says it, the tone stays above 3:1 */
  .heart.spent {
    color: var(--text-muted);
    transform: scale(0.85);
  }
  /* a tint is see-through: it is laid over the lift, never straight over the world */
  .tea {
    gap: 0.25rem;
    background: linear-gradient(var(--signal-negative-tint), var(--signal-negative-tint)),
      var(--surface-lift);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--signal-negative-ink),
      var(--shape-lift);
    color: var(--signal-negative-ink);
  }
  .tea b {
    font-weight: 700;
  }
  .purse {
    color: var(--text-strong);
  }
  .coin {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: var(--shape-radius-disc);
    background: var(--signal-caution);
    box-shadow: inset 0 0 0 2px var(--signal-caution-ink);
  }
  .level {
    flex-direction: column;
    justify-content: center;
    gap: 0.2rem;
    padding: 0 0.6rem;
    font-weight: 600;
  }
  .beads {
    display: block;
    width: 2.4rem;
    height: 4px;
    border-radius: var(--shape-radius-pill);
    background: var(--surface-sunk);
    overflow: hidden;
  }
  .beads i {
    display: block;
    height: 100%;
    background: var(--signal-primary);
  }
  .trail {
    min-width: 0;
  }
  .trail .label {
    flex: none;
    font-size: var(--size-type-sm);
  }
  .clue {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-family-sans-text);
    color: var(--control-on);
  }
  .steps {
    font-weight: 700;
  }
  .chevron {
    font-size: var(--size-type-md);
  }
  @container (max-width: 30rem) {
    .trail .label {
      display: none;
    }
  }
  .ware {
    min-height: 2rem;
    gap: 0.25rem;
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
  .ware b {
    font-weight: 700;
    color: var(--text-strong);
  }
  .ware small {
    font-size: var(--size-type-xs);
  }
  .ware.kindled b {
    color: var(--signal-caution-ink);
  }
</style>
