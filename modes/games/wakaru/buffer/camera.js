// how the stage looks at a map: how large a tile is drawn, and where the view's top-left lies over
// the map. plain arithmetic in whatever unit the caller counts in — css or device pixels alike.

// never smaller than a thumb can aim at, never so large the valley shrinks to a room
export const TILE = { least: 28, most: 56 };

// a phone reads the valley best at 40px tiles: the pane shows 9 tiles across at the least and 20 at
// the most before the tile shrinks or grows to hold that, and never fewer than 9 rows
const READABLE = 40;
const ACROSS = { least: 9, most: 20 };
const DOWN = 9;

const clamp = (value, least, most) => Math.min(Math.max(value, least), most);

export const columns = (map) => map.rows[0].length;

// an open map follows the learner at a readable tile; a room is seen whole, with half a tile of
// air on every side, so stepping indoors feels like stepping into one place
const FITS = {
  open: (pane) =>
    Math.min(
      clamp(READABLE, pane.width / ACROSS.most, pane.width / ACROSS.least),
      pane.height / DOWN,
    ),
  room: (pane, map) =>
    Math.min(pane.width / (columns(map) + 1), pane.height / (map.rows.length + 1)),
};

// the tile's size for a pane and a map, whole pixels so tile edges never blur
export const size = (pane, map) =>
  Math.floor(
    clamp(FITS[map.kind === "indoor" ? "room" : "open"](pane, map), TILE.least, TILE.most),
  );

// one axis of the view: centred on the focus within the band the overlays leave clear — before and
// after are what covers the pane's two ends — and held inside the map's edges, or past them by just
// what covers them, so the learner is never drawn under the hud or the pad; when the map is no
// longer than that band, the map centred in it and still. with nothing covering, the band is the pane
const axis = (span, pane, focus, before = 0, after = 0) => {
  const clear = pane - before - after;
  return span <= clear
    ? (span - clear) / 2 - before
    : clamp(focus - before - clear / 2, -before, span - pane + after);
};

// the view's top-left over the map; `at` is the learner's glided cell, fractional mid-step; `inset`
// is what covers the pane's head and foot — the hud, the pad — in the pane's own unit
export const look = (pane, map, tile, at, inset = { top: 0, bottom: 0 }) => ({
  x: axis(columns(map) * tile, pane.width, (at.x + 0.5) * tile),
  y: axis(map.rows.length * tile, pane.height, (at.y + 0.5) * tile, inset.top, inset.bottom),
});

// the cell under a point of the pane; view = { x, y, tile } as the stage drew it
export const under = (view, point) => ({
  x: Math.floor((point.x + view.x) / view.tile),
  y: Math.floor((point.y + view.y) / view.tile),
});
