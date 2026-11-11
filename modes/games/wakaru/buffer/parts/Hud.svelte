<script>
  import { HEARTS, coins, has, held } from "../../engine/run.js";
  import { WARES } from "../../engine/beats/talk.js";

  const { world, run, duel, daily, hub, onaction } = $props();

  const room = $derived(world.rooms[run.pose.room]);
  const place = $derived(room.place === null ? null : world.places[room.place]);
  // a tea is drunk from beside the hearts it mends, only while one is missing and never in a duel
  const drinkable = $derived(held(run, "tea") > 0 && run.hearts < HEARTS && duel === null);
  const carried = $derived(
    WARES.map((ware) => ({ item: ware.item, count: held(run, ware.item) })).filter(
      (ware) => ware.count > 0 && !(ware.item === "tea" && drinkable),
    ),
  );
</script>

<header class="hud">
  <div class="life">
    <div class="hearts" role="img" aria-label="{run.hearts} of {HEARTS} hearts">
      {#each { length: HEARTS }, index}
        <span class="heart" class:spent={index >= run.hearts}>♥</span>
      {/each}
    </div>
    {#if drinkable}
      <button
        type="button"
        class="tea"
        aria-label="drink a tea to mend a heart — {held(run, 'tea')} carried"
        onclick={() => onaction({ type: "use", item: "tea" })}
      >
        +♥<span class="word"> tea</span><b>{held(run, "tea")}</b>
      </button>
    {/if}
  </div>

  <div class="where">
    <span class="name">{place ? place.name : hub}</span>
    {#if place}
      <span
        class="rooms"
        role="img"
        aria-label="room {place.rooms.indexOf(room.id) + 1} of {place.rooms.length}"
      >
        {#each place.rooms as id (id)}
          <i
            class:reached={has(run, `reached:${id}`)}
            class:here={id === room.id}
            class:lair={id === place.lair}
          ></i>
        {/each}
      </span>
    {/if}
  </div>

  {#if carried.length}
    <ul class="kit" aria-label="carried">
      {#each carried as ware (ware.item)}
        <li>{ware.item}<b>{ware.count}</b></li>
      {/each}
    </ul>
  {/if}

  <div class="purse">
    <span class="coins" title="coins"><i class="coin"></i>{coins(run)}</span>
    {#if daily}
      <span class="due" title="words due for review">{daily.due}<small> due</small></span>
      <span class="streak" class:lit={daily.today} title="days in a row with a review">
        {daily.streak}<small> day streak</small><b>✷</b>
      </span>
    {/if}
  </div>
</header>

<style>
  .hud {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    grid-template-rows: minmax(2.75rem, auto);
    grid-template-areas: "life where kit purse";
    align-items: center;
    gap: 0.4rem 1rem;
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  }
  .life { grid-area: life; display: flex; align-items: center; gap: 0.6rem; }
  .hearts { display: flex; gap: 0.15rem; font-size: var(--font-size-md); line-height: 1; }
  .tea {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.75rem;
    padding: 0 0.85rem;
    border: 1px solid var(--signal-negative-ink);
    border-radius: 999px;
    background: color-mix(in srgb, var(--signal-negative-tint) 45%, transparent);
    color: var(--signal-negative-ink);
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .tea:active { transform: scale(0.96); }
  .tea b { font-weight: 600; color: var(--text-strong); }
  .heart { color: var(--signal-negative-ink); transition: opacity 200ms, transform 200ms; }
  .heart.spent { opacity: 0.2; transform: scale(0.8); }

  .where {
    grid-area: where;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-base);
    color: var(--text-strong);
  }
  .rooms { display: flex; align-items: center; gap: 0.3rem; flex-shrink: 0; }
  .rooms i { width: 0.5rem; height: 0.5rem; border-radius: 50%; border: 1px solid var(--boundary); }
  .rooms i.reached {
    background: var(--signal-positive-ink);
    border-color: var(--signal-positive-ink);
  }
  .rooms i.lair { border-radius: 2px; transform: rotate(45deg) scale(0.9); }
  .rooms i.here {
    background: var(--signal-primary-ink);
    border-color: var(--signal-primary-ink);
    box-shadow: 0 0 0 3px var(--signal-primary-tint);
  }

  .kit { grid-area: kit; display: flex; gap: 0.35rem; margin: 0; padding: 0; list-style: none; }
  .kit li {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    padding: 0.05rem 0.45rem;
    border: 1px solid var(--divider);
    border-radius: 999px;
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }
  .kit b { font-weight: 600; color: var(--text-strong); }

  .purse {
    grid-area: purse;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.8rem;
    white-space: nowrap;
  }
  .coins { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--text-strong); }
  .coin {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--signal-caution-ink);
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--signal-caution-ink) 55%, var(--surface));
  }
  .due, .streak { display: inline-flex; align-items: baseline; }
  small { font-size: var(--font-size-xs); color: var(--text-light); }
  .streak b { margin-left: 0.25rem; font-weight: 400; color: var(--boundary); }
  .streak.lit b { color: var(--signal-caution-ink); }

  @media (max-width: 560px) {
    .hud {
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-rows: minmax(2.75rem, auto) auto;
      grid-template-areas: "life purse" "where kit";
      gap: 0.4rem 0.6rem;
      font-size: var(--font-size-xs);
    }
    .tea .word { display: none; }
    .where { justify-content: flex-start; }
    .kit { justify-content: flex-end; }
    .purse { gap: 0.65rem; }
    .streak small { display: none; }
  }
</style>
