// the learner's level, read off their memory on every look and never stored: a word is worth what
// the learner holds of it, so the level falls as words slip and climbs again as they come back

const POINTS = { UNTOUCHED: 0, UNKNOWN: 0, LEARNING: 1, KNOWN: 2, GRADUATED: 3 };

// the points each level starts at; the last is the top
const FLOORS = [0, 10, 30, 70, 130, 220, 350, 520, 750];

// every word the valley's places hold counts once, however many places hold it — a sentence or a
// paradigm's single form is no stone, so it earns no point of its own
export const level = (world, memory) => {
  const words = new Set(Object.values(world.places).flatMap((place) => place.words));
  const points = [...words].reduce((sum, word) => sum + POINTS[memory[word] ?? "UNTOUCHED"], 0);
  const reached = FLOORS.findLastIndex((floor) => points >= floor);
  return {
    level: reached + 1,
    points,
    floor: FLOORS[reached],
    next: reached + 1 < FLOORS.length ? FLOORS[reached + 1] : null,
  };
};
