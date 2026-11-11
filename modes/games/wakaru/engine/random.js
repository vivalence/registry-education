export const mulberry = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffle = (items, random) => {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [out[index], out[other]] = [out[other], out[index]];
  }
  return out;
};

export const draw = (items, random) => items[Math.floor(random() * items.length)];

// dice of their own, thrown from a seed and a name: the same pair always rolls the same, so one
// map's stones or one pot's coins never move because another was dealt first
export const seeded = (seed, name) =>
  mulberry(
    [...name].reduce(
      (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619),
      seed ^ 2166136261,
    ),
  );
