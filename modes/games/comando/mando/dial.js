export const STRONG = ["KNOWN", "GRADUATED"];

const OPEN = 0.8;

export const strong = (status) => STRONG.includes(status);

export const tier = (tiers, frontier) =>
  tiers.reduce((open, slugs, index) => {
    if (index === 0) return 0;
    const previous = tiers[index - 1];
    const held = previous.filter((slug) => strong(frontier[slug])).length;
    return open === index - 1 && held / previous.length >= OPEN ? index : open;
  }, 0);

const clamp = (lo, hi, n) => Math.min(hi, Math.max(lo, n));

export const tempo = (previous, history) => {
  const recent = history.slice(-10);
  if (recent.length < 5) return previous;
  const ratio = recent.filter(Boolean).length / recent.length;
  return clamp(1, 5, previous + (ratio > 0.8 ? 0.5 : ratio < 0.5 ? -0.5 : 0));
};

export const phase = (reactions) => (reactions.length >= 3 && reactions.slice(-3).every(Boolean) ? "COMMAND" : "OBEY");
