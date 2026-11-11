<script>
  import { DISTRICTS, WAKING, WINGS, share } from "../../engine/atlas.js";
  import { LAYOUT } from "../../engine/maps/index.js";
  import { has, held } from "../../engine/run.js";
  import { TILES } from "../../engine/tiles.js";
  import { restoration, sealed } from "../../engine/world.js";

  const { world, run, memory, ontravel, onclose } = $props();

  // the atlas's palette, one colour a tile kind: a thumbnail is a small painting of the world, and
  // its colours never leave it
  const PALETTE = {
    grass: "#7fae5b",
    flowers: "#93b964",
    tallgrass: "#5d8f45",
    path: "#d9c49a",
    dirt: "#b99668",
    plaza: "#cdbfa6",
    sand: "#e3d3a1",
    bridge: "#a7814f",
    floor: "#c8b28c",
    rug: "#a35b4a",
    cave: "#4a4552",
    door: "#6b4a2f",
    mouth: "#2d2a33",
    upstairs: "#8d8478",
    downstairs: "#6f675d",
    water: "#4f8fbf",
    tree: "#3f6f37",
    pine: "#2f5a35",
    hedge: "#4b7a3c",
    cliff: "#8c8273",
    rock: "#9a948a",
    fence: "#8a6a45",
    roof: "#b0563f",
    wall: "#e3d6bf",
    window: "#7fb2cf",
    stall: "#c9843d",
    well: "#7b8b97",
    fountain: "#6fa8cf",
    lamp: "#e0c35a",
    bench: "#8a6a45",
    crate: "#9c7a4e",
    inner: "#6b5d4f",
    shelf: "#7a5a3c",
    counter: "#8a6a45",
    table: "#9c7a4e",
    anvil: "#55595f",
    column: "#bdb5a6",
    hearth: "#d06a33",
    bed: "#a35b4a",
    rockwall: "#5b5560",
    crystal: "#9fd3e0",
  };

  // the valley's plane: the corner every LAYOUT entry is placed from
  const corner = {
    column: Math.min(...Object.values(LAYOUT).map(([column]) => column)),
    row: Math.min(...Object.values(LAYOUT).map(([, row]) => row)),
  };

  const compass = $derived(held(run, "compass") > 0);
  const districts = $derived(
    world.order.filter((id) => DISTRICTS.some((entry) => entry.id === id)),
  );

  // a map is walked once its visited flag is up; the one the learner stands on is walked already
  const walked = (id) => has(run, `visited:${id}`) || run.pose.map === id;

  // the compass goes where the walk's travel goes: an outdoor map visited and open
  const reachable = (id) =>
    compass &&
    has(run, `visited:${id}`) &&
    world.maps[id].kind === "outdoor" &&
    sealed(world, run, id) === null;

  // where the learner is drawn: where they stand, or indoors, at the door that leads in
  const here = $derived.by(() => {
    const { map, x, y } = run.pose;
    if (Object.hasOwn(LAYOUT, map)) return { map, x, y };
    const outside = Object.keys(LAYOUT).find((id) =>
      world.maps[id].portals.some((portal) => portal.to === map),
    );
    const door = world.maps[outside].portals.find((portal) => portal.to === map);
    return { map: outside, x: door.x, y: door.y };
  });

  // the share of a place's words held, as a whole percent
  const percent = (place) => Math.round(share(memory, world.places[place].words) * 100);

  // what opens a sealed place: the district before it, or enough districts restored for a wing
  const opener = (id) => {
    const wing = WINGS.find((entry) => entry.id === id);
    if (wing)
      return `opens with ${wing.opens} ${wing.opens === 1 ? "district" : "districts"} restored`;
    return `restore ${world.places[districts[districts.indexOf(id) - 1]].name} first`;
  };

  // what a map's card says of it, first match wins: { glyph, word, note? }
  const condition = (id) => {
    const { place } = world.maps[id];
    if (id === "summit") {
      if (has(run, "crowned")) return { glyph: "✦", word: "crowned" };
      if (restoration(world, run) === 1) return { glyph: "!", word: "awake" };
      return { glyph: "⊘", word: "sealed", note: "every district restored first" };
    }
    if (place === null) return { glyph: "⌂", word: "the valley's heart" };
    const reason = sealed(world, run, id);
    if (reason === "fallow") return { glyph: "·", word: "fallow" };
    if (reason === "locked") return { glyph: "⊘", word: "sealed", note: opener(place) };
    if (has(run, `restored:${place}`)) return { glyph: "✦", word: "restored" };
    if (share(memory, world.places[place].words) >= WAKING)
      return { glyph: "?", word: "warden awake" };
    return { glyph: "○", word: "open" };
  };

  // a charted place open to the learner wears the ring of its held share
  const ringed = (id) =>
    Object.hasOwn(world.places, world.maps[id].place) && sealed(world, run, id) === null
      ? world.maps[id].place
      : null;

  const cells = $derived(
    Object.entries(LAYOUT).map(([id, [column, row]]) => ({
      id,
      map: world.maps[id],
      column: column - corner.column + 1,
      row: row - corner.row + 1,
      walked: walked(id),
      named: walked(id) || Object.hasOwn(world.places, world.maps[id].place),
      reachable: reachable(id),
      condition: condition(id),
      ring: ringed(id),
    })),
  );

  const wings = $derived(
    WINGS.map((wing) => ({
      id: wing.id,
      name: wing.name,
      condition: condition(wing.id),
      ring: ringed(wing.id),
    })),
  );

  // a thumbnail is drawn once, a pixel a tile; CSS scales it up crisp
  const paint = (map) => (canvas) => {
    const pen = canvas.getContext("2d");
    map.rows.forEach((row, y) =>
      [...row].forEach((char, x) => {
        pen.fillStyle = PALETTE[TILES[char].kind];
        pen.fillRect(x, y, 1, 1);
      }),
    );
  };
</script>

{#snippet ring(place)}
  {@const portion = percent(place)}
  <span
    class="share"
    role="meter"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={portion}
    aria-label="{portion}% of {world.places[place].name}'s words held">
    <svg class="dial" viewBox="0 0 20 20" aria-hidden="true">
      <circle class="track" cx="10" cy="10" r="8" />
      {#if portion > 0}
        <circle
          class="arc"
          cx="10"
          cy="10"
          r="8"
          pathLength="100"
          stroke-dasharray="{portion} 100" />
      {/if}
    </svg>
    <span>{portion}%</span>
  </span>
{/snippet}

{#snippet face(cell)}
  {#if cell.walked && cell.map.kind === "outdoor"}
    <span class="picture">
      <canvas
        width={cell.map.rows[0].length}
        height={cell.map.rows.length}
        aria-hidden="true"
        {@attach paint(cell.map)}></canvas>
      {#if here.map === cell.id}
        <span
          class="you"
          style:left="{((here.x + 0.5) / cell.map.rows[0].length) * 100}%"
          style:top="{((here.y + 0.5) / cell.map.rows.length) * 100}%"
          aria-hidden="true"></span>
      {/if}
    </span>
  {:else}
    <span class="picture fog">
      <span class="unknown" aria-hidden="true">{cell.walked ? "▲" : "?"}</span>
      {#if here.map === cell.id}<span class="you middle" aria-hidden="true"></span>{/if}
    </span>
  {/if}
  <span class="name">{cell.named ? cell.map.name : "unexplored"}</span>
  <span class="state">
    {#if cell.ring}{@render ring(cell.ring)}{/if}
    <span class="word">
      <b aria-hidden="true">{cell.condition.glyph}</b>{cell.condition.word}
    </span>
  </span>
  {#if cell.condition.note}<span class="note">{cell.condition.note}</span>{/if}
  {#if here.map === cell.id}<span class="note">you are here</span>{/if}
{/snippet}

<div class="atlas">
  <div class="masthead">
    <h2>Atlas</h2>
    <button type="button" class="close" aria-label="close the atlas" onclick={onclose}>×</button>
  </div>

  <p class="hint">
    {#if compass}
      Tap a map you have walked to travel there.
    {:else}
      The compass travels from here. The Crossroads' warden keeps it.
    {/if}
  </p>

  <ol class="valley">
    {#each cells as cell (cell.id)}
      <li style:grid-column={cell.column} style:grid-row={cell.row}>
        {#if cell.reachable}
          <button
            type="button"
            class="card travel"
            class:here={here.map === cell.id}
            aria-label="{cell.map.name}: travel there"
            onclick={() => ontravel(cell.id)}>
            {@render face(cell)}
            <span class="go">travel →</span>
          </button>
        {:else}
          <div class="card" class:here={here.map === cell.id} class:unwalked={!cell.walked}>
            {@render face(cell)}
          </div>
        {/if}
      </li>
    {/each}
  </ol>

  <section class="wings" aria-label="the wings on the square">
    <h3>The wings</h3>
    <ul>
      {#each wings as wing (wing.id)}
        <li class="card">
          <span class="name">{wing.name}</span>
          <span class="state">
            {#if wing.ring}{@render ring(wing.ring)}{/if}
            <span class="word">
              <b aria-hidden="true">{wing.condition.glyph}</b>{wing.condition.word}
            </span>
          </span>
          {#if wing.condition.note}<span class="note">{wing.condition.note}</span>{/if}
        </li>
      {/each}
    </ul>
  </section>

  <p class="legend">
    <span>ring · the share of a place's words you hold</span>
    <span>? the warden wakes at {Math.round(WAKING * 100)}%</span>
    <span>✦ restored</span>
    <span>⊘ sealed</span>
    <span>· fallow: none of your words live there yet</span>
  </p>
</div>

<style>
  /* the atlas is flow content inside the screen's sheet: one column, centred on a wide pane */
  .atlas { display: flex; flex-direction: column; gap: 0.8rem; max-width: 40rem; margin: 0 auto; }
  .masthead { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  h2 {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-strong);
  }
  h3 {
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    font-weight: 400;
    color: var(--text-light);
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
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
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary), 0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
    font-size: var(--font-size-md);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .close:active {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow: var(--shape-sunk), inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  .close:focus-visible, .travel:focus-visible { outline: 2px solid var(--control-focus); outline-offset: 2px; }
  .hint { margin: 0; font-family: var(--font-family-sans-text); font-size: var(--font-size-sm); color: var(--text-ink); }

  .valley, .wings ul { margin: 0; padding: 0; list-style: none; }
  .valley { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
  .valley li { display: flex; min-width: 0; }

  /* a map's card: lifted, ringed; the learner's card wears the primary ring. a card the compass
     reaches is one button, its whole face the touch target */
  .card {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
    padding: 0.4rem;
    border: 0;
    border-radius: var(--shape-radius-card);
    background: var(--surface-lift);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--text-ink);
    font: inherit;
    text-align: left;
  }
  .card.here { box-shadow: inset 0 0 0 2px var(--signal-primary-ink); }
  .card.unwalked { background: var(--surface); }
  .travel { cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  .travel:active { transform: translateY(var(--size-depth)); }
  .go {
    align-self: stretch;
    display: grid;
    place-items: center;
    padding: 0.3rem;
    border-radius: var(--shape-radius-key);
    background: var(--signal-primary);
    color: var(--signal-primary-on);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
  }

  /* the thumbnail sits in a sunk well; its pixels are scaled up, never smoothed */
  .picture {
    position: relative;
    display: block;
    padding: 2px;
    border-radius: var(--shape-radius-sm);
    background: var(--surface-sunk);
    box-shadow: inset 0 0 0 var(--size-ring) var(--boundary);
  }
  canvas { display: block; width: 100%; height: auto; image-rendering: pixelated; border-radius: var(--shape-radius-xs); }
  .fog { display: grid; place-items: center; aspect-ratio: 3 / 2; }
  .unknown { font-family: var(--font-family-serif-heading); font-size: var(--font-size-xl); color: var(--text-muted); }

  /* where the learner stands: a dot with a halo that breathes by its size, never by fading */
  .you {
    position: absolute;
    width: 0.6rem;
    height: 0.6rem;
    margin: -0.3rem 0 0 -0.3rem;
    border-radius: var(--shape-radius-disc);
    background: var(--signal-primary);
    box-shadow: 0 0 0 2px var(--surface);
    animation: pulse 1.6s ease-in-out infinite;
  }
  .you.middle { left: 50%; top: 50%; }
  @keyframes pulse { 50% { transform: scale(1.6); } }
  @media (prefers-reduced-motion: reduce) { .you { animation: none; } }

  .name {
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-sm);
    color: var(--text-strong);
    overflow-wrap: anywhere;
  }
  .unwalked .name { color: var(--text-light); }
  .state { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.5rem; }
  .word, .share {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-ink);
  }
  .word b { font-weight: 400; color: var(--text-strong); }
  .note { font-family: var(--font-family-sans-text); font-size: var(--size-type-xs); color: var(--text-light); }

  /* a place's held share: a ring on a sunk track, the percent beside it in words */
  .dial { width: 1.1rem; height: 1.1rem; transform: rotate(-90deg); }
  .track, .arc { fill: none; stroke-width: 3; }
  .track { stroke: var(--surface-sunk); }
  .arc { stroke: var(--signal-positive-ink); stroke-linecap: round; }

  .wings { display: flex; flex-direction: column; gap: 0.4rem; }
  .wings ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.5rem; }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--size-type-xs);
    color: var(--text-light);
  }
</style>
