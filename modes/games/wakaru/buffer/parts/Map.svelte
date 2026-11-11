<script>
  import { WAKING, place, share, unlocked } from "../../engine/atlas.js";
  import { has } from "../../engine/run.js";

  const { world, run, memory, hub, ontravel, onclose } = $props();

  // the valley, drawn by hand on a 100 × 150 field: the road zigzags up from the hub through the
  // districts in the order they open, the wings stand off its right flank between their rows —
  // spaced so no ring and no name touch another from a 288px field up
  const WIDE = 100;
  const TALL = 150;
  const SPOTS = {
    hub: { x: 46, y: 134 },
    market: { x: 22, y: 120 },
    stacks: { x: 86, y: 126 },
    hearth: { x: 58, y: 104 },
    crossroads: { x: 22, y: 88 },
    forms: { x: 86, y: 94 },
    clockhill: { x: 58, y: 72 },
    wildwood: { x: 22, y: 56 },
    forge: { x: 86, y: 60 },
    bathhouse: { x: 58, y: 40 },
    schoolyard: { x: 22, y: 24 },
    drillyard: { x: 58, y: 9 },
  };
  const TREES = [
    { x: 8, y: 50, r: 2 },
    { x: 10, y: 62, r: 1.6 },
    { x: 36, y: 50, r: 1.8 },
    { x: 40, y: 61, r: 1.4 },
    { x: 95, y: 80, r: 1.6 },
    { x: 93, y: 110, r: 1.8 },
    { x: 6, y: 104, r: 1.5 },
    { x: 44, y: 30, r: 1.4 },
    { x: 76, y: 30, r: 1.7 },
    { x: 72, y: 18, r: 1.3 },
    { x: 8, y: 134, r: 1.6 },
    { x: 74, y: 142, r: 1.3 },
  ];
  const RIDGE = "M0 30 L9 15 L17 22 L28 6 L39 19 L50 3 L61 17 L73 5 L85 20 L100 9 L100 0 L0 0 Z";
  const HILLS = "M0 44 C14 34 26 40 36 33 C50 24 62 36 74 28 C86 21 94 30 100 26 L100 0 L0 0 Z";
  const RIVER = "M7 0 C14 22 3 44 11 66 C18 86 4 104 12 124 C16 136 13 144 15 150";

  // a smooth road through its stops: each bend's handles follow the line from the stop before
  // to the stop after
  const curve = (stops) =>
    stops
      .map((stop, index) => {
        if (index === 0) return `M ${stop.x} ${stop.y}`;
        const from = stops[index - 1];
        const before = stops[index - 2] ?? from;
        const after = stops[index + 1] ?? stop;
        const lead = { x: from.x + (stop.x - before.x) / 6, y: from.y + (stop.y - before.y) / 6 };
        const tail = { x: stop.x - (after.x - from.x) / 6, y: stop.y - (after.y - from.y) / 6 };
        return `C ${lead.x} ${lead.y} ${tail.x} ${tail.y} ${stop.x} ${stop.y}`;
      })
      .join(" ");

  const distance = (one, other) => Math.hypot(one.x - other.x, one.y - other.y);

  const here = $derived(world.rooms[run.pose.room].place ?? "hub");
  const open = $derived(unlocked(world, run));
  const districts = $derived(world.order.filter((id) => !place(id).opens));
  const stops = $derived([SPOTS.hub, ...districts.map((id) => SPOTS[id])]);
  const road = $derived(curve(stops));

  // a wing hangs off the nearest stop of the road, by a footpath
  const paths = $derived(
    world.order
      .filter((id) => place(id).opens)
      .map((id) => {
        const nearest = stops.reduce((best, stop) =>
          distance(stop, SPOTS[id]) < distance(best, SPOTS[id]) ? stop : best,
        );
        return `M ${nearest.x} ${nearest.y} L ${SPOTS[id].x} ${SPOTS[id].y}`;
      }),
  );

  const nodes = $derived(
    world.order.map((id) => {
      const held = share(memory, world.places[id].words);
      return {
        id,
        name: world.places[id].name,
        spot: SPOTS[id],
        held,
        count: Math.round(held * world.places[id].words.length),
        total: world.places[id].words.length,
        open: open.includes(id),
        restored: has(run, `restored:${id}`),
      };
    }),
  );

  // what opens a locked place: the district before it, or enough districts restored for a wing
  const opener = (id) => {
    const wanted = place(id).opens;
    if (wanted) return `restore ${wanted} ${wanted === 1 ? "district" : "districts"} to open it`;
    return `restore ${world.places[districts[districts.indexOf(id) - 1]].name} to open it`;
  };

  const label = (node) =>
    [
      node.name,
      `${node.count} of ${node.total} words held`,
      node.restored ? "restored" : null,
      node.open ? null : opener(node.id),
      node.id === here ? "you are here" : null,
    ]
      .filter(Boolean)
      .join(" — ");

  const at = (spot) => ({ left: `${(spot.x / WIDE) * 100}%`, top: `${(spot.y / TALL) * 100}%` });
</script>

<section class="map" aria-label="the valley">
  <header>
    <h2>The valley</h2>
    <button type="button" class="close" aria-label="close the map" onclick={onclose}>×</button>
  </header>

  <div class="valley">
    <div class="land">
      <svg viewBox="0 0 {WIDE} {TALL}" preserveAspectRatio="none" aria-hidden="true">
        <path class="ridge" d={RIDGE} />
        <path class="hills" d={HILLS} />
        <path class="river" d={RIVER} />
        {#each TREES as tree}
          <circle class="tree" cx={tree.x} cy={tree.y} r={tree.r} />
        {/each}
        {#each paths as path}
          <path class="path" d={path} />
        {/each}
        <path class="road" d={road} />
      </svg>
    </div>

    <button
      type="button"
      class="node hub"
      class:here={here === "hub"}
      style:left={at(SPOTS.hub).left}
      style:top={at(SPOTS.hub).top}
      aria-label={here === "hub" ? `${hub} — you are here` : hub}
      onclick={() => ontravel("hub")}
    >
      <span class="mark"><span class="home">⌂</span></span>
      <span class="name">{hub}</span>
    </button>

    {#each nodes as node (node.id)}
      <button
        type="button"
        class="node"
        class:here={here === node.id}
        class:restored={node.restored}
        disabled={!node.open}
        style:left={at(node.spot).left}
        style:top={at(node.spot).top}
        aria-label={label(node)}
        onclick={() => ontravel(node.id)}
      >
        <span class="mark">
          <svg class="ring" viewBox="0 0 48 48" aria-hidden="true">
            <circle class="track" cx="24" cy="24" r="20" />
            {#if node.held > 0}
              <circle
                class="held"
                cx="24"
                cy="24"
                r="20"
                pathLength="100"
                stroke-dasharray="{node.held * 100} 100"
              />
            {/if}
          </svg>
          {#if node.open}
            <span class="share">{Math.round(node.held * 100)}%</span>
          {:else}
            <svg class="lock" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" />
            </svg>
          {/if}
          {#if node.restored}<span class="crest" aria-hidden="true">✦</span>{/if}
        </span>
        <span class="name">{node.name}</span>
      </button>
    {/each}
  </div>

  <p class="legend">
    <span><i class="swatch"></i>words held</span>
    <span>a warden wakes at {Math.round(WAKING * 100)}%</span>
    <span><b>✦</b> restored</span>
  </p>
</section>

<style>
  .map { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; width: 100%; }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: min(100%, 27rem);
  }
  h2 {
    margin: 0;
    font-family: var(--font-family-serif-heading);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-strong);
  }
  .close {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 1px solid var(--boundary);
    border-radius: 50%;
    background: transparent;
    color: var(--text-light);
    font-size: var(--font-size-lg);
    line-height: 1;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .valley {
    position: relative;
    width: min(100%, 27rem, calc((100cqh - 8.5rem) * 2 / 3));
    min-width: min(100%, 18rem);
    aspect-ratio: 100 / 150;
  }
  /* the land is clipped to its rounded field; the places stand over it, so a name at the edge
     may lean past it */
  .land {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 14px;
    box-shadow: inset 0 0 0 1px var(--boundary);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-sunk) 75%, var(--signal-primary-tint)) 0%,
      var(--surface-sunk) 38%,
      color-mix(in srgb, var(--surface-sunk) 82%, var(--signal-positive-tint)) 100%
    );
  }
  .land svg { display: block; width: 100%; height: 100%; }
  .ridge { fill: var(--divider); opacity: 0.55; }
  .hills { fill: var(--surface-lift); opacity: 0.6; }
  .river {
    fill: none;
    stroke: color-mix(in srgb, var(--signal-primary-tint) 70%, var(--signal-primary-ink));
    stroke-width: 7;
    stroke-linecap: round;
    opacity: 0.55;
    vector-effect: non-scaling-stroke;
  }
  .tree { fill: var(--signal-positive-ink); opacity: 0.22; }
  .road, .path {
    fill: none;
    stroke: var(--boundary);
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .road { stroke-width: 3.5; stroke-dasharray: 1 7; }
  .path { stroke-width: 2; stroke-dasharray: 1 6; opacity: 0.8; }

  .node {
    position: absolute;
    transform: translate(-50%, -1.5rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .node:focus-visible { outline: none; }
  .node:focus-visible .mark { outline: 2px solid var(--signal-primary-ink); outline-offset: 3px; }
  .mark {
    position: relative;
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--surface);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--text-strong) 14%, transparent);
    transition: transform 120ms, box-shadow 200ms;
  }
  .node:not(:disabled):active .mark { transform: scale(0.93); }
  .ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
  .track, .held { fill: none; stroke-width: 4; }
  .track { stroke: var(--divider); }
  .held { stroke: var(--signal-positive-ink); stroke-linecap: round; }
  .restored .held { stroke: var(--signal-caution-ink); }
  .share {
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-strong);
  }
  .lock { width: 1rem; height: 1rem; }
  .lock rect { fill: var(--text-light); }
  .lock path { fill: none; stroke: var(--text-light); stroke-width: 1.6; }
  .crest {
    position: absolute;
    top: -0.3rem;
    right: -0.3rem;
    display: grid;
    place-items: center;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 50%;
    background: var(--surface);
    color: var(--signal-caution-ink);
    font-size: 0.75rem;
  }
  .name {
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 82%, transparent);
    font-family: var(--font-family-sans-text);
    font-size: var(--font-size-xs);
    color: var(--text-strong);
    white-space: nowrap;
  }
  .node:disabled { cursor: default; }
  .node:disabled .mark { background: var(--surface-sunk); box-shadow: none; opacity: 0.7; }
  .node:disabled .name { color: var(--text-light); background: transparent; }

  .hub .mark { border-radius: 30%; background: var(--signal-primary-tint); }
  .home { font-size: var(--font-size-lg); line-height: 1; color: var(--signal-primary-ink); }

  .here .mark {
    box-shadow:
      0 0 0 3px var(--signal-primary-ink),
      0 0 0 7px color-mix(in srgb, var(--signal-primary-tint) 80%, transparent);
    animation: beckon 2.4s ease-in-out infinite;
  }
  .here .name { background: var(--signal-primary-ink); color: var(--surface); }
  @keyframes beckon { 50% { transform: scale(1.06); } }
  @media (prefers-reduced-motion: reduce) { .here .mark { animation: none; } }

  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem 1rem;
    margin: 0;
    font-family: var(--font-family-code);
    font-size: var(--font-size-xs);
    color: var(--text-light);
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .swatch {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    border: 2px solid var(--signal-positive-ink);
  }
  .legend b { font-weight: 400; color: var(--signal-caution-ink); }
</style>
