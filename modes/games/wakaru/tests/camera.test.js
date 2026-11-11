import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { TILE, columns, look, size, under } from "../buffer/camera.js";
import { MAPS } from "../engine/maps/index.js";

// a map of any size: only its rows' extent and its kind matter to the camera
const blank = (width, height, kind = "outdoor") => ({
  kind,
  rows: Array.from({ length: height }, () => ".".repeat(width)),
});

const PANES = [];
for (let width = 280; width <= 1600; width += 20) {
  for (let height = 300; height <= 1100; height += 50) PANES.push({ width, height });
}

const OPEN = blank(30, 22);

Deno.test("a phone pane shows 9 to 10 tiles across, a wide one about 20", () => {
  for (const width of [360, 375, 390]) {
    const across = width / size({ width, height: 600 }, OPEN);
    assert(across >= 9 && across <= 10, `${width}px shows ${across} across`);
  }
  for (const width of [800, 1000, 1120]) {
    const across = width / size({ width, height: 800 }, OPEN);
    assert(across >= 19.5 && across <= 21, `${width}px shows ${across} across`);
  }
});

Deno.test(
  "an open map's tile stays in its bounds, and holds 9–20 across and 9 down unless clamped",
  () => {
    for (const pane of PANES) {
      const tile = size(pane, OPEN);
      assert(Number.isInteger(tile), `${pane.width}×${pane.height} → ${tile}`);
      assert(tile >= TILE.least && tile <= TILE.most, `${pane.width}×${pane.height} → ${tile}`);
      if (tile > TILE.least) {
        assert(pane.width / tile >= 9, `${pane.width}×${pane.height} shows too few across`);
        assert(pane.height / tile >= 9, `${pane.width}×${pane.height} shows too few down`);
      }
      // a short pane keeps its 9 rows and so shows more across; else at most 20, and flooring to
      // whole pixels adds less than one tile
      const rowsHold = pane.height / tile < 10;
      if (tile < TILE.most && !rowsHold) {
        assert(pane.width / tile < 21, `${pane.width}×${pane.height} too many across`);
      }
    }
  },
);

Deno.test("a room is seen whole, with air on every side, wherever the least tile allows it", () => {
  for (const [width, height] of [
    [8, 6],
    [12, 10],
    [16, 12],
    [10, 16],
  ]) {
    const room = blank(width, height, "indoor");
    for (const pane of PANES) {
      const tile = size(pane, room);
      assert(tile >= TILE.least && tile <= TILE.most);
      if (tile === TILE.least) continue;
      assert(
        width * tile <= pane.width - tile / 2,
        `${width}×${height} in ${pane.width}×${pane.height}`,
      );
      assert(
        height * tile <= pane.height - tile / 2,
        `${width}×${height} in ${pane.width}×${pane.height}`,
      );
    }
  }
});

// every cell of a map as a focus, and halfway between two cells as a glide passes
const focuses = (map) =>
  map.rows.flatMap((row, y) =>
    [...row].flatMap((_, x) => [
      { x, y },
      { x: x + 0.5, y },
      { x, y: y + 0.5 },
    ]),
  );

Deno.test("the view follows the learner, never shows past an edge, and keeps them in sight", () => {
  for (const pane of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
    { width: 600, height: 400 },
  ]) {
    const tile = size(pane, OPEN);
    const span = { width: columns(OPEN) * tile, height: OPEN.rows.length * tile };
    for (const at of focuses(OPEN)) {
      const view = look(pane, OPEN, tile, at);
      for (const [axis, extent] of [
        ["x", "width"],
        ["y", "height"],
      ]) {
        if (span[extent] <= pane[extent]) continue;
        assert(
          view[axis] >= 0 && view[axis] <= span[extent] - pane[extent],
          `${axis} past an edge`,
        );
        const drawn = (at[axis] + 0.5) * tile - view[axis];
        assert(drawn >= 0 && drawn <= pane[extent], `learner out of sight on ${axis}`);
        const held = view[axis] === 0 || view[axis] === span[extent] - pane[extent];
        if (!held)
          assertAlmostEquals(drawn, pane[extent] / 2, 1e-9, `learner off centre on ${axis}`);
      }
    }
  }
});

Deno.test("a map smaller than the pane is centred and still, whatever the learner does", () => {
  const room = blank(10, 8, "indoor");
  const pane = { width: 1280, height: 800 };
  const tile = size(pane, room);
  const views = focuses(room).map((at) => look(pane, room, tile, at));
  for (const view of views) assertEquals(view, views[0]);
  assertEquals(-views[0].x * 2, pane.width - 10 * tile);
  assertEquals(-views[0].y * 2, pane.height - 8 * tile);
});

Deno.test("each axis is its own: a long, low map follows across and stays centred down", () => {
  const strip = blank(40, 6);
  const pane = { width: 390, height: 844 };
  const tile = size(pane, strip);
  const west = look(pane, strip, tile, { x: 2, y: 1 });
  const east = look(pane, strip, tile, { x: 37, y: 4 });
  assert(east.x > west.x);
  assertEquals(west.y, east.y);
  assertEquals(-west.y * 2, pane.height - 6 * tile);
});

Deno.test("mid-glide, the view lies between the views of the two cells", () => {
  const pane = { width: 390, height: 844 };
  const tile = size(pane, OPEN);
  for (const step of [0.25, 0.5, 0.75]) {
    const from = look(pane, OPEN, tile, { x: 12, y: 9 });
    const to = look(pane, OPEN, tile, { x: 13, y: 9 });
    const between = look(pane, OPEN, tile, { x: 12 + step, y: 9 });
    assertAlmostEquals(between.x, from.x + (to.x - from.x) * step, 1e-9);
  }
});

Deno.test(
  "with the hud over its head and the pad over its foot, the learner is never under them",
  () => {
    for (const [pane, inset] of [
      [
        { width: 390, height: 640 },
        { top: 80, bottom: 180 },
      ],
      [
        { width: 1280, height: 800 },
        { top: 48, bottom: 56 },
      ],
    ]) {
      const clear = pane.height - inset.top - inset.bottom;
      for (const map of [OPEN, blank(40, 6), ...Object.values(MAPS)]) {
        const tile = size(pane, map);
        const span = map.rows.length * tile;
        // a glide runs between two cells of the map, never half a step past its last row
        for (const at of focuses(map).filter(({ y }) => y <= map.rows.length - 1)) {
          const view = look(pane, map, tile, at, inset);
          const top = at.y * tile - view.y;
          assert(
            top >= inset.top && top + tile <= pane.height - inset.bottom,
            `${map.id ?? "blank"} at ${at.x},${at.y}: drawn ${top}–${top + tile} in ${pane.height}`,
          );
          if (span > clear)
            assert(
              view.y >= -inset.top && view.y <= span - pane.height + inset.bottom,
              "past an edge",
            );
          else
            assertAlmostEquals(
              span / 2 - view.y,
              inset.top + clear / 2,
              1e-9,
              "off the band's middle",
            );
        }
      }
    }
  },
);

Deno.test("the cell under a tapped point is the cell drawn there, edges included", () => {
  for (const map of [OPEN, blank(10, 8, "indoor"), ...Object.values(MAPS)]) {
    const pane = { width: 390, height: 844 };
    const tile = size(pane, map);
    for (const at of [
      { x: 0, y: 0 },
      { x: 7.5, y: 3 },
      { x: columns(map) - 1, y: map.rows.length - 1 },
    ]) {
      const corner = look(pane, map, tile, at);
      const view = { ...corner, tile };
      map.rows.forEach((row, y) =>
        [...row].forEach((_, x) => {
          const left = x * tile - view.x;
          const top = y * tile - view.y;
          assertEquals(under(view, { x: left + tile / 2, y: top + tile / 2 }), { x, y });
          assertEquals(under(view, { x: left, y: top }), { x, y });
          assertEquals(under(view, { x: left - 0.5, y: top - 0.5 }), { x: x - 1, y: y - 1 });
        }),
      );
    }
  }
});
