<script>
  import { onMount } from "svelte";
  import { look, size, under } from "../camera.js";
  import { painter } from "../paint.js";
  import { within } from "../../engine/tiles.js";

  // the valley on one canvas: the camera follows the learner's gliding step, the painter draws
  // each frame from the latest props, and a tap names the tile under it. the screen owns every key
  // inset: what covers the stage's head and foot — the hud, the pad — in css pixels
  const { world, state, memory, markers, fx, now, inset, onpoint } = $props();

  // a step glides this long: the screen's walking stride
  const GLIDE = 110;

  // a press that travels further than this is a swipe, never a tap
  const SLOP = 12;

  const STANDING = -Infinity;

  // no $state here: a prop is named state, and the rune would read as its store
  let host;
  let canvas;
  let view = null;
  let pressed = null;

  // a mover's step: from where it was drawn toward its cell, begun at a time
  const glide = (from, to, start) => ({ from, to, start });

  const along = (step, time) => {
    const done = Math.min(1, Math.max(0, (time - step.start) / GLIDE));
    return {
      x: step.from.x + (step.to.x - step.from.x) * done,
      y: step.from.y + (step.to.y - step.from.y) * done,
    };
  };

  // one step to a neighbouring cell glides from wherever the mover was drawn; anything further —
  // a door, a fall, a journey — is a jump, and lands at once
  const follow = (step, cell, time) => {
    if (step.to.x === cell.x && step.to.y === cell.y) return step;
    const far = Math.abs(cell.x - step.to.x) + Math.abs(cell.y - step.to.y) > 1;
    return far ? glide(cell, cell, STANDING) : glide(along(step, time), cell, time);
  };

  // a tap is a primary press that ends where it began: it names the map cell under it
  const down = (event) => {
    const primary = event.isPrimary && event.button === 0;
    pressed = primary ? { x: event.clientX, y: event.clientY } : null;
  };

  const up = (event) => {
    const moved =
      pressed === null
        ? Infinity
        : Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
    pressed = null;
    if (moved > SLOP || view === null) return;
    const box = canvas.getBoundingClientRect();
    const ratio = canvas.width / box.width;
    const cell = under(view, {
      x: (event.clientX - box.left) * ratio,
      y: (event.clientY - box.top) * ratio,
    });
    if (within(world.maps[state.run.pose.map], cell)) onpoint(cell);
  };

  onMount(() => {
    const pen = canvas.getContext("2d", { alpha: false });
    const paint = painter();
    const spirits = new Map();
    let pane = { width: host.clientWidth, height: host.clientHeight };
    let walk = null;
    let stride = 0;
    let arrived = 0;
    let anchor = { now, at: performance.now() };
    let last = 0;

    // the screen's clock, carried forward between its ticks so every frame moves
    const clock = () => {
      if (anchor.now !== now) anchor = { now, at: performance.now() };
      last = Math.max(last, anchor.now + performance.now() - anchor.at);
      return last;
    };

    const observer = new ResizeObserver(([entry]) => {
      pane = { width: entry.contentRect.width, height: entry.contentRect.height };
    });
    observer.observe(host);

    let frame = requestAnimationFrame(function draw() {
      frame = requestAnimationFrame(draw);
      if (pane.width === 0 || pane.height === 0) return;
      const time = clock();
      const pose = state.run.pose;
      const map = world.maps[pose.map];

      if (walk === null || walk.map !== pose.map) {
        walk = { map: pose.map, step: glide(pose, pose, STANDING) };
        spirits.clear();
        arrived = time;
      } else {
        const next = follow(walk.step, pose, time);
        if (next.start === STANDING && next !== walk.step) arrived = time;
        if (next.start !== STANDING && next !== walk.step) stride += 1;
        walk.step = next;
      }

      const glided = new Map();
      for (const walker of state.scene.spirits) {
        const seen = spirits.get(walker.word);
        const step =
          seen === undefined ? glide(walker, walker, STANDING) : follow(seen, walker, time);
        spirits.set(walker.word, step);
        glided.set(walker.word, along(step, time));
      }
      for (const word of spirits.keys()) if (!glided.has(word)) spirits.delete(word);

      const ratio = window.devicePixelRatio;
      const device = {
        width: Math.round(pane.width * ratio),
        height: Math.round(pane.height * ratio),
      };
      if (canvas.width !== device.width || canvas.height !== device.height) {
        canvas.width = device.width;
        canvas.height = device.height;
      }
      const tile = Math.round(size(pane, map) * ratio);
      const at = along(walk.step, time);
      const corner = look(device, map, tile, at, {
        top: inset.top * ratio,
        bottom: inset.bottom * ratio,
      });
      view = { x: Math.round(corner.x), y: Math.round(corner.y), tile, ...device };
      const striding = time - walk.step.start < GLIDE;
      paint(pen, {
        world,
        state,
        memory,
        markers,
        fx,
        time,
        view,
        learner: {
          ...at,
          step: striding ? { foot: stride % 2, progress: (time - walk.step.start) / GLIDE } : null,
        },
        spirits: glided,
        arrived,
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });
</script>

<div class="valley" bind:this={host}>
  <canvas
    bind:this={canvas}
    role="img"
    aria-label="the valley — tap a tile to walk there"
    onpointerdown={down}
    onpointerup={up}
    onpointercancel={() => (pressed = null)}></canvas>
</div>

<style>
  .valley {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--surface-sunk);
  }
  .valley canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
</style>
