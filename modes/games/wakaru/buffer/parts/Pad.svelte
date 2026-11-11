<script>
  const { onhold, onlet } = $props();

  const ARROWS = [
    { direction: "north", label: "walk north", area: "n", glyph: "▲" },
    { direction: "west", label: "walk west", area: "w", glyph: "◀" },
    { direction: "east", label: "walk east", area: "e", glyph: "▶" },
    { direction: "south", label: "walk south", area: "s", glyph: "▼" },
  ];

  const press = (event, direction) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onhold(direction);
  };
</script>

<div class="pad" role="group" aria-label="walk">
  {#each ARROWS as arrow (arrow.direction)}
    <button
      type="button"
      class="arrow {arrow.area}"
      aria-label={arrow.label}
      onpointerdown={(event) => press(event, arrow.direction)}
      onpointerup={onlet}
      onpointercancel={onlet}
      onlostpointercapture={onlet}
      oncontextmenu={(event) => event.preventDefault()}
    >{arrow.glyph}</button>
  {/each}
  <span class="hub" aria-hidden="true"></span>
</div>

<style>
  .pad {
    display: grid;
    grid-template: ". n ." 1fr "w hub e" 1fr ". s ." 1fr / 1fr 1fr 1fr;
    width: 9.5rem;
    height: 9.5rem;
    gap: 0.25rem;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .arrow {
    display: grid;
    place-items: center;
    padding: 0;
    font-size: 1.05rem;
    border: 1px solid var(--boundary);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-lift) 80%, var(--surface-sunk));
    color: var(--text-light);
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
  .arrow:active { background: color-mix(in srgb, var(--signal-primary-tint) 60%, transparent); border-color: var(--signal-primary-ink); color: var(--signal-primary-ink); transform: scale(0.96); }
  .n { grid-area: n; }
  .w { grid-area: w; }
  .e { grid-area: e; }
  .s { grid-area: s; }
  .hub { grid-area: hub; align-self: center; justify-self: center; width: 0.6rem; height: 0.6rem; border-radius: 50%; background: var(--divider); }
</style>
