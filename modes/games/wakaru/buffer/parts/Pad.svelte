<script>
  // tall: the pad's height (none where a keyboard walks), so the stage keeps the learner above it
  let { verb, onhold, onlet, onact, tall = $bindable(0) } = $props();

  const ARROWS = [
    { direction: "north", label: "walk north", sign: "▲" },
    { direction: "west", label: "walk west", sign: "◀" },
    { direction: "east", label: "walk east", sign: "▶" },
    { direction: "south", label: "walk south", sign: "▼" },
  ];

  // the middle of the cross, as a share of its width, names no way: a thumb resting there keeps the
  // way it last pressed
  const MIDDLE = 0.2;

  let cross = $state(null);
  let leading = $state(null);
  let pressing = null;

  // the arrow pressed first captures the touch, so a thumb rolls on to another arrow without
  // lifting
  const press = (event, direction) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressing = event.pointerId;
    leading = direction;
    onhold(direction);
  };

  // where the thumb has rolled from the cross's middle names the way it walks now
  const roll = (event) => {
    if (event.pointerId !== pressing) return;
    const box = cross.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    if (Math.hypot(dx, dy) < box.width * MIDDLE) return;
    const across = Math.abs(dx) > Math.abs(dy);
    const direction = across ? (dx > 0 ? "east" : "west") : dy > 0 ? "south" : "north";
    if (direction === leading) return;
    leading = direction;
    onhold(direction);
  };

  // a lifted thumb lets go once: pointerup and the lost capture after it are one release
  const release = (event) => {
    if (event.pointerId !== pressing) return;
    pressing = null;
    leading = null;
    onlet();
  };
</script>

<div class="pad" bind:clientHeight={tall}>
  <div class="cross" bind:this={cross} role="group" aria-label="walk">
    {#each ARROWS as arrow (arrow.direction)}
      <button
        type="button"
        class="arrow {arrow.direction}"
        class:pressed={leading === arrow.direction}
        aria-label={arrow.label}
        onpointerdown={(event) => press(event, arrow.direction)}
        onpointermove={roll}
        onpointerup={release}
        onpointercancel={release}
        onlostpointercapture={release}
        oncontextmenu={(event) => event.preventDefault()}>
        <span aria-hidden="true">{arrow.sign}</span>
      </button>
    {/each}
    <span class="hub" aria-hidden="true"></span>
  </div>

  <button type="button" class="act" aria-label="{verb} — the tile ahead" onclick={onact}>
    {verb}
  </button>
</div>

<style>
  /* the pad rides the stage's foot on a touch screen only; a keyboard walks with the arrows */
  .pad {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: none;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 max(0.9rem, env(safe-area-inset-right)) max(0.9rem, env(safe-area-inset-bottom))
      max(0.9rem, env(safe-area-inset-left));
    pointer-events: none;
  }
  @media (pointer: coarse) {
    .pad {
      display: flex;
    }
  }
  .cross {
    display: grid;
    grid-template:
      ". north ." 3.25rem
      "west hub east" 3.25rem
      ". south ." 3.25rem / 3.25rem 3.25rem 3.25rem;
    gap: 0.25rem;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  /* each arrow is the theme's key: --control-contrast, its sign --control-on, ringed and standing
     --size-depth above the stage; held, it sinks into --control-contrast-pressed */
  .arrow {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--shape-radius-key);
    background: var(--control-contrast);
    box-shadow:
      inset 0 0 0 var(--size-ring) var(--boundary),
      0 var(--size-depth) 0 var(--boundary);
    color: var(--control-on);
    font-size: var(--size-type-md);
    text-align: center;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
  .arrow.pressed {
    transform: translateY(var(--size-depth));
    background: var(--control-contrast-pressed);
    box-shadow:
      var(--shape-sunk),
      inset 0 0 0 var(--size-ring) var(--boundary);
    color: var(--control-on-pressed);
  }
  .north {
    grid-area: north;
  }
  .west {
    grid-area: west;
  }
  .east {
    grid-area: east;
  }
  .south {
    grid-area: south;
  }
  .hub {
    grid-area: hub;
    align-self: center;
    justify-self: center;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: var(--shape-radius-disc);
    background: var(--boundary);
  }
  /* the one call to act: the primary fill, its label the verb for the tile ahead */
  .act {
    display: grid;
    place-items: center;
    width: 4.75rem;
    height: 4.75rem;
    margin-bottom: 2.25rem;
    padding: 0;
    border: 0;
    border-radius: var(--shape-radius-disc);
    background: var(--signal-primary);
    box-shadow:
      0 var(--size-depth) 0 var(--boundary),
      var(--shape-lift);
    color: var(--signal-primary-on);
    font-family: var(--font-family-code);
    font-size: var(--size-type-sm);
    font-weight: 600;
    text-align: center;
    text-transform: var(--shape-label-case);
    letter-spacing: var(--shape-label-track);
    pointer-events: auto;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
  .act:active {
    transform: translateY(var(--size-depth));
    box-shadow: var(--shape-sunk);
  }
  .arrow:focus-visible,
  .act:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
</style>
