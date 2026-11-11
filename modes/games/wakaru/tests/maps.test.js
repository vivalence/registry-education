import { assert, assertEquals, equal } from "@std/assert";
import { DISTRICTS, PLACES, WINGS } from "../engine/atlas.js";
import { LAYOUT, MAPS } from "../engine/maps/index.js";
import { DIRECTIONS, TILES, apart, key, neighbour, same, tile } from "../engine/tiles.js";

// the authored valley, checked whole: every map is a picture the engine can walk, every way out
// has a way back, every district holds what its story needs. each check gathers its faults over
// every map, so a failure names them all at once

const maps = Object.values(MAPS);

const DISTRICT = DISTRICTS.map((district) => district.id);
const WING = WINGS.map((wing) => wing.id);

// the map a district is first walked into from: the square, or the district whose restoring
// opens it
const OPENER = {
  market: "square",
  hearth: "square",
  crossroads: "square",
  clockhill: "square",
  wildwood: "clockhill",
  bathhouse: "hearth",
  schoolyard: "clockhill",
  drillyard: "market",
};

const ROLES = [
  [(map) => map.id === "square", "square"],
  [(map) => DISTRICT.includes(map.id), "district"],
  [(map) => WING.includes(map.id), "wing"],
  [(map) => map.id.endsWith(".house"), "house"],
  [(map) => map.id === "shop", "shop"],
  [(map) => map.id === "summit", "summit"],
];

const role = (map) => ROLES.find(([is]) => is(map))[1];

// each role's kind of map and the place it belongs to
const KIND = {
  square: "outdoor",
  district: "outdoor",
  wing: "indoor",
  house: "indoor",
  shop: "indoor",
  summit: "cave",
};

const PLACE = {
  square: () => null,
  district: (map) => map.id,
  wing: (map) => map.id,
  house: (map) => map.id.replace(".house", ""),
  shop: () => null,
  summit: () => null,
};

// who stands on each role's map, and how many of each
const CAST = {
  square: { shrine: 1, sign: 1 },
  district: { sign: 1, keeper: 1, haunt: 1, warden: 1 },
  wing: { warden: 1 },
  house: { bed: 1 },
  shop: { vendor: 1 },
  summit: { summit: 1 },
};

// open ground a place's home keeps for the stones its words lay (48 · 30 · 48 · 24 dealt) and a
// district's errand, with room to spare so stones stand apart and wall nothing off
const ROOM = { district: 90, stacks: 60, forms: 60, forge: 40 };

// what a district's chest may hold, when not 20 to 60 coins
const LOOT = ["candle", "charm", "tea"];

const faults = (check) => maps.flatMap((map) => check(map).map((fault) => `${map.id}: ${fault}`));

const at = ({ x, y }) => `(${x},${y})`;

const cells = (map) => map.rows.flatMap((row, y) => [...row].map((_, x) => ({ x, y })));

const sides = (cell) => Object.keys(DIRECTIONS).map((direction) => neighbour(cell, direction));

// what stands on a map, each with the name a fault calls it by
const standing = (map) => [
  ...map.fixtures.map((fixture) => [fixture.kind, fixture]),
  ...map.chests.map((chest) => ["chest", chest]),
  ...map.pots.map((pot) => ["pot", pot]),
];

const portal = (map, cell) => map.portals.find((one) => same(one, cell));

// off the map is cliff, so walkable ground is always inside it
const walkable = (map, cell) => tile(map, cell).walk;

// open ground: walkable, and nothing stands on it
const open = (map, cell) =>
  walkable(map, cell) && !standing(map).some(([, thing]) => same(thing, cell));

// where a map is entered: an interior by its one door, any other map at its named entry
const arrival = (map) => (map.kind === "indoor" ? Object.values(map.spawns)[0] : map.spawns.entry);

// walking distance from the arrival to every tile a walk reaches: round all that stands there,
// and never on through a portal, which carries the learner away
const reach = (map) => {
  const start = arrival(map);
  const far = new Map([[key(start), 0]]);
  const queue = [start];
  for (const cell of queue) {
    if (portal(map, cell) && !same(cell, start)) continue;
    for (const next of sides(cell))
      if (!far.has(key(next)) && open(map, next)) {
        far.set(key(next), far.get(key(cell)) + 1);
        queue.push(next);
      }
  }
  return far;
};

// where a stone may lie: open ground, not tall grass, not a portal, more than two tiles from every
// portal, spawn and thing standing there
const eligible = (map) => {
  const anchors = [
    ...map.portals,
    ...Object.values(map.spawns),
    ...standing(map).map(([, thing]) => thing),
  ];
  return cells(map).filter(
    (cell) =>
      open(map, cell) &&
      !tile(map, cell).wild &&
      !portal(map, cell) &&
      anchors.every((anchor) => apart(anchor, cell) > 2),
  );
};

// the sizes of a tile kind's 4-connected fields
const fields = (map, kind) => {
  const left = new Set(
    cells(map)
      .filter((cell) => tile(map, cell).kind === kind)
      .map(key),
  );
  return cells(map)
    .filter((cell) => left.has(key(cell)))
    .flatMap((start) => {
      if (!left.has(key(start))) return [];
      left.delete(key(start));
      const field = [start];
      for (const cell of field)
        for (const next of sides(cell))
          if (left.has(key(next))) {
            left.delete(key(next));
            field.push(next);
          }
      return [field.length];
    });
};

// the LAYOUT map next to an outdoor map on one side, if any
const beside = (id, direction) => {
  const [column, row] = LAYOUT[id];
  const step = DIRECTIONS[direction];
  return Object.keys(LAYOUT).find(
    (other) => LAYOUT[other][0] === column + step.x && LAYOUT[other][1] === row + step.y,
  );
};

// the cells of a map's edge on one side
const EDGES = {
  north: (map) => [...map.rows[0]].map((_, x) => ({ x, y: 0 })),
  south: (map) => [...map.rows[0]].map((_, x) => ({ x, y: map.rows.length - 1 })),
  west: (map) => map.rows.map((_, y) => ({ x: 0, y })),
  east: (map) => map.rows.map((_, y) => ({ x: map.rows[0].length - 1, y })),
};

const cast = (map) =>
  Object.fromEntries(
    Object.entries(Object.groupBy(map.fixtures, (fixture) => fixture.kind)).map(([kind, all]) => [
      kind,
      all.length,
    ]),
  );

const one = (map, kind) => map.fixtures.find((fixture) => fixture.kind === kind);

const between = (count, fewest, most) => count >= fewest && count <= most;

Deno.test("MAPS: the square, the districts, their houses, the shop, the wings, the summit", () => {
  assertEquals(
    Object.keys(MAPS).toSorted(),
    [
      "square",
      ...DISTRICT,
      ...DISTRICT.map((id) => `${id}.house`),
      "shop",
      ...WING,
      "summit",
    ].toSorted(),
  );
  assertEquals(
    faults((map) => (MAPS[map.id] === map ? [] : ["filed under another id"])),
    [],
  );
  assertEquals(LAYOUT, {
    summit: [1, -1],
    wildwood: [0, 0],
    clockhill: [1, 0],
    schoolyard: [2, 0],
    hearth: [0, 1],
    square: [1, 1],
    market: [2, 1],
    bathhouse: [0, 2],
    crossroads: [1, 2],
    drillyard: [2, 2],
  });
});

Deno.test("every map is a rectangle of known tiles", () => {
  assertEquals(
    faults((map) => [
      ...(map.rows.length > 0 ? [] : ["no rows"]),
      ...map.rows
        .filter((row) => row.length !== map.rows[0].length)
        .map((row) => `a row ${row.length} wide, the first ${map.rows[0].length}`),
      ...cells(map)
        .filter((cell) => !Object.hasOwn(TILES, map.rows[cell.y][cell.x]))
        .map((cell) => `${JSON.stringify(map.rows[cell.y][cell.x])} at ${at(cell)} is no tile`),
    ]),
    [],
  );
});

Deno.test("a map's kind and place fit its role; districts and wings bear the atlas's names", () => {
  assertEquals(
    faults((map) => {
      const named = PLACES.find((entry) => entry.id === map.id);
      return [
        ...(map.kind === KIND[role(map)] ? [] : [`kind ${map.kind}`]),
        ...(map.place === PLACE[role(map)](map) ? [] : [`place ${map.place}`]),
        ...(map.dark === (map.kind === "cave") ? [] : [`dark ${map.dark}`]),
        ...(named === undefined || map.name === named.name ? [] : [`named ${map.name}`]),
        ...(map.name.length > 0 ? [] : ["no name"]),
      ];
    }),
    [],
  );
});

Deno.test("spawns, portals on walkable ground; an arrival faces open ground, no portal", () => {
  const ahead = (spawn) => neighbour(spawn, spawn.facing);
  assertEquals(
    faults((map) => [
      ...Object.entries(map.spawns).flatMap(([name, spawn]) => [
        ...(open(map, spawn) ? [] : [`spawn ${name} ${at(spawn)} is not open ground`]),
        ...(portal(map, spawn) ? [`spawn ${name} ${at(spawn)} is on a portal`] : []),
        ...(Object.hasOwn(DIRECTIONS, spawn.facing) &&
        open(map, ahead(spawn)) &&
        !portal(map, ahead(spawn))
          ? []
          : [`spawn ${name} ${at(spawn)} faces ${spawn.facing}, no open ground`]),
      ]),
      ...map.portals
        .filter((one) => !walkable(map, one))
        .map((one) => `portal ${at(one)} is not walkable ground`),
    ]),
    [],
  );
});

Deno.test("fixtures, chests and pots stand one to a tile on walkable ground, off portals", () => {
  assertEquals(
    faults((map) => [
      ...standing(map).flatMap(([name, thing]) => [
        ...(walkable(map, thing) ? [] : [`${name} at ${at(thing)} is not on walkable ground`]),
        ...(portal(map, thing) ? [`${name} at ${at(thing)} is on a portal`] : []),
      ]),
      ...(new Set(standing(map).map(([, thing]) => key(thing))).size === standing(map).length
        ? []
        : ["two things share a tile"]),
    ]),
    [],
  );
});

Deno.test("every door and cave mouth is a portal", () => {
  const WAYS = ["door", "mouth"];
  assertEquals(
    faults((map) =>
      cells(map)
        .filter((cell) => WAYS.includes(tile(map, cell).kind) && !portal(map, cell))
        .map((cell) => `the ${tile(map, cell).kind} at ${at(cell)} leads nowhere`),
    ),
    [],
  );
});

Deno.test("every portal lands on a spawn there, beside a portal back", () => {
  assertEquals(
    faults((map) =>
      map.portals.flatMap((way) => {
        const there = MAPS[way.to];
        if (there === undefined) return [`portal ${at(way)} leads to no map ${way.to}`];
        const landing = there.spawns[way.spawn];
        if (landing === undefined) return [`portal ${at(way)} lands on no ${way.to}.${way.spawn}`];
        const back = there.portals.some((home) => home.to === map.id && apart(home, landing) === 1);
        return back ? [] : [`${way.to}.${way.spawn} has no portal back beside it`];
      }),
    ),
    [],
  );
});

Deno.test("every spawn but an entry is where a portal from the map it is named for lands", () => {
  const ARRIVALS = ["entry", "start"];
  const landed = (map, name) =>
    Object.hasOwn(MAPS, name) &&
    MAPS[name].portals.some((way) => way.to === map.id && way.spawn === name);
  assertEquals(
    faults((map) =>
      Object.keys(map.spawns)
        .filter((name) => !ARRIVALS.includes(name) && !landed(map, name))
        .map((name) => `spawn ${name} is no portal's landing`),
    ),
    [],
  );
});

Deno.test("an outdoor map or the cave names its entry; an interior has one door in", () => {
  assertEquals(
    faults((map) => {
      const names = Object.keys(map.spawns);
      if (map.kind !== "indoor") return names.includes("entry") ? [] : ["no entry"];
      return names.length === 1 && map.portals.length === 1 ? [] : [`${names.length} ways in`];
    }),
    [],
  );
  assert(MAPS.square.spawns.start, "a fresh run stands on the square's start");
});

Deno.test("every walkable tile is reached from the arrival, round all that stands there", () => {
  assertEquals(
    faults((map) => {
      const reached = reach(map);
      return cells(map)
        .filter((cell) => open(map, cell) && !reached.has(key(cell)))
        .map((cell) => `${at(cell)} is cut off`);
    }),
    [],
  );
});

Deno.test("LAYOUT neighbours share a two-tile gap on their edge; no other way out", () => {
  const gap = (map, direction, to) =>
    EDGES[direction](map).filter((cell) =>
      map.portals.some((way) => same(way, cell) && way.to === to),
    );
  assertEquals(
    faults((map) =>
      Object.hasOwn(LAYOUT, map.id)
        ? Object.keys(DIRECTIONS).flatMap((direction) => {
            const edge = EDGES[direction](map).filter((cell) => walkable(map, cell));
            const other = beside(map.id, direction);
            if (other === undefined) return edge.length === 0 ? [] : [`a way out ${direction}`];
            const out = gap(map, direction, other);
            return [
              ...(out.length === 2 && apart(out[0], out[1]) === 1 ? [] : [`no gap ${direction}`]),
              ...(edge.length === out.length ? [] : [`a ${direction} edge tile leads nowhere`]),
            ];
          })
        : [],
    ),
    [],
  );
});

Deno.test("each kind of map holds its own cast", () => {
  assertEquals(
    faults((map) =>
      equal(cast(map), CAST[role(map)]) ? [] : [`cast ${JSON.stringify(cast(map))}`],
    ),
    [],
  );
});

Deno.test("a district opens from the square or an earlier district, entered on that side", () => {
  assertEquals(
    DISTRICT.flatMap((id, index) => {
      const map = MAPS[id];
      const from = OPENER[id];
      const earlier = from === "square" || DISTRICT.indexOf(from) < index;
      const near = Object.keys(DIRECTIONS).some((direction) => beside(id, direction) === from);
      const entered = apart(map.spawns.entry, map.spawns[from]) <= 3;
      return [
        ...(earlier ? [] : [`${id}: ${from} opens later`]),
        ...(near ? [] : [`${id}: ${from} is no neighbour`]),
        ...(entered ? [] : [`${id}: entry far from ${from}`]),
      ];
    }),
    [],
  );
});

Deno.test("a district's sign at its entry, keeper near, warden far, haunt in tall grass", () => {
  // the far third: of the map's width or height, across from the edge the learner comes in by
  const FAR = {
    west: (map, cell) => cell.x >= (2 * map.rows[0].length) / 3,
    east: (map, cell) => cell.x < map.rows[0].length / 3,
    north: (map, cell) => cell.y >= (2 * map.rows.length) / 3,
    south: (map, cell) => cell.y < map.rows.length / 3,
  };
  assertEquals(
    DISTRICT.flatMap((id) => {
      const map = MAPS[id];
      const side = Object.keys(DIRECTIONS).find((way) => beside(id, way) === OPENER[id]);
      const grass = sides(one(map, "haunt")).filter((cell) => tile(map, cell).wild).length;
      return [
        ...(apart(one(map, "sign"), map.spawns.entry) <= 2 ? [] : [`${id}: sign off the entry`]),
        ...(apart(one(map, "keeper"), map.spawns.entry) <= 6 ? [] : [`${id}: keeper far off`]),
        ...(FAR[side](map, one(map, "warden")) ? [] : [`${id}: warden short of the far third`]),
        ...(grass >= 3 ? [] : [`${id}: haunt with tall grass on ${grass} sides`]),
      ];
    }),
    [],
  );
});

Deno.test("a district grows two to four fields of tall grass, forty tiles or more", () => {
  assertEquals(
    DISTRICT.flatMap((id) => {
      const grown = fields(MAPS[id], "tallgrass");
      const total = grown.reduce((sum, size) => sum + size, 0);
      return between(grown.length, 2, 4) && total >= 40 ? [] : [`${id}: fields ${grown}`];
    }),
    [],
  );
});

Deno.test("a district keeps a house, one or two chests in nooks, three to five pots", () => {
  const prize = (loot) =>
    Object.hasOwn(loot, "coins") ? between(loot.coins, 20, 60) : LOOT.includes(loot.item);
  assertEquals(
    DISTRICT.flatMap((id) => {
      const map = MAPS[id];
      const doors = map.portals.filter((way) => way.to === `${id}.house`);
      const housed = doors.length === 1 && tile(map, doors[0]).kind === "door";
      return [
        ...(housed ? [] : [`${id}: no one door to its house`]),
        ...(between(map.chests.length, 1, 2) ? [] : [`${id}: ${map.chests.length} chests`]),
        ...map.chests.flatMap((chest) => {
          const ways = sides(chest).filter((cell) => open(map, cell)).length;
          return [
            ...(prize(chest.loot) ? [] : [`${id}: chest ${at(chest)} holds too much or little`]),
            ...(ways <= 2 ? [] : [`${id}: chest ${at(chest)} open on ${ways} sides, no nook`]),
          ];
        }),
        ...(between(map.pots.length, 3, 5) ? [] : [`${id}: ${map.pots.length} pots`]),
      ];
    }),
    [],
  );
});

Deno.test("each place's home keeps open ground for all its stones", () => {
  const homes = [...DISTRICT.map((id) => [id, ROOM.district]), ...WING.map((id) => [id, ROOM[id]])];
  assertEquals(
    homes.flatMap(([id, room]) => {
      const count = eligible(MAPS[id]).length;
      return count >= room ? [] : [`${id}: ${count} tiles for stones, wants ${room}`];
    }),
    [],
  );
});

Deno.test("five districts or more have water to fish from the bank", () => {
  const fishing = DISTRICT.filter((id) => {
    const map = MAPS[id];
    const reached = reach(map);
    return cells(map).some(
      (cell) => tile(map, cell).fish && sides(cell).some((bank) => reached.has(key(bank))),
    );
  });
  assert(fishing.length >= 5, `only ${fishing} have water to fish`);
});

Deno.test("a wing's warden keeps the back of the hall; its one door opens on the square", () => {
  assertEquals(
    WING.flatMap((id) => {
      const map = MAPS[id];
      const warden = one(map, "warden");
      const door = map.portals[0];
      const squared = door.to === "square" && door.spawn === id;
      return [
        ...(warden.y < map.rows.length / 3 ? [] : [`${id}: warden ${at(warden)} not at the back`]),
        ...(squared ? [] : [`${id}: its door is not the square's`]),
      ];
    }),
    [],
  );
});

Deno.test("a house is a furnished room: a bed and its fixture, a chest, pots, a door below", () => {
  const FURNISHED = ["inner", "rug", "table", "shelf", "hearth", "bed"];
  assertEquals(
    DISTRICT.map((id) => MAPS[`${id}.house`]).flatMap((map) => {
      const has = new Set(cells(map).map((cell) => tile(map, cell).kind));
      const below = map.portals[0].y === map.rows.length - 1;
      const made = sides(one(map, "bed")).some((cell) => tile(map, cell).kind === "bed");
      return [
        ...FURNISHED.filter((kind) => !has.has(kind)).map((kind) => `${map.id}: no ${kind}`),
        ...(made ? [] : [`${map.id}: its bed fixture is beside no bed`]),
        ...(map.chests.length === 1 ? [] : [`${map.id}: ${map.chests.length} chests`]),
        ...(between(map.pots.length, 1, 2) ? [] : [`${map.id}: ${map.pots.length} pots`]),
        ...(below ? [] : [`${map.id}: its door is not in the bottom wall`]),
      ];
    }),
    [],
  );
  assertEquals(MAPS["hearth.house"].chests[0].loot, { item: "rod" });
});

Deno.test("the shop's vendor stands behind its counter, spoken to across it", () => {
  const shop = MAPS.shop;
  const counter = neighbour(one(shop, "vendor"), "south");
  assertEquals(tile(shop, counter).kind, "counter");
  assert(open(shop, neighbour(counter, "south")), "the learner stands before the counter");
  assert(
    cells(shop).some((cell) => tile(shop, cell).kind === "shelf"),
    "the shop has shelves",
  );
  assertEquals(
    shop.portals.map(({ to, spawn }) => ({ to, spawn })),
    [{ to: "square", spawn: "shop" }],
  );
});

Deno.test("the summit is a dark cave, its peak atop a winding way, a chest of 80 off it", () => {
  const summit = MAPS.summit;
  const peak = one(summit, "summit");
  const reached = reach(summit);
  const climb = Math.min(
    ...sides(peak)
      .filter((cell) => reached.has(key(cell)))
      .map((cell) => reached.get(key(cell))),
  );
  const farthest = Math.max(...reached.values());
  assert(peak.y < summit.rows.length / 5, `the peak ${at(peak)} is not at the top`);
  assert(climb >= 0.8 * farthest, `the peak is ${climb} steps up a way ${farthest} long`);
  // winding: the way up is far longer than the straight climb
  assert(climb >= 2 * apart(peak, summit.spawns.entry), `a way up of ${climb} steps runs straight`);
  assertEquals(
    summit.chests.map((chest) => chest.loot),
    [{ coins: 80 }],
  );
  // entered by a mouth in Clock Hill's north cliff, left by its own mouth below
  const mouths = (map, to) => map.portals.filter((way) => way.to === to);
  assertEquals(
    [...mouths(summit, "clockhill"), ...mouths(MAPS.clockhill, "summit")].map(
      (way) => tile(way.to === "summit" ? MAPS.clockhill : summit, way).kind,
    ),
    ["mouth", "mouth", "mouth", "mouth"],
  );
});
