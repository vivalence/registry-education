import { array } from "@vivalence/typology";

export const begin = (knowables, streak, dress) => ({
  streak: streak ?? 0,
  attempts: 0,
  done: [],
  pending: knowables.map((knowable, index) => ({
    index,
    streak: 0,
    reps: 0,
    missed: false,
    ...(dress && { worn: [dress(index, [])] }),
  })),
});

export const worn = (entry) => entry?.worn ?? [];

export const wearing = (entry) => worn(entry).at(-1);

export const wear = (state, dress) => {
  const last = state.pending.at(-1);
  if (!last) return state;
  return {
    ...state,
    pending: [...state.pending.slice(0, -1), { ...last, worn: [...worn(last), dress(last.index, worn(last))] }],
  };
};

export const redress = (state, dress) => ({
  ...state,
  pending: state.pending.map((entry) => ({ ...entry, worn: [...worn(entry), dress(entry.index, worn(entry))] })),
});

export const current = (state) => state.pending[0] ?? null;

export const complete = (state) => state.pending.length === 0;

export const clean = (state, anhieb = 0) =>
  state.done.every((entry) => !entry.missed && entry.reps === Math.max(1, state.streak - anhieb));

export const first = (state) => (current(state)?.reps ?? 0) === 0;

export const record = (state, success, anhieb = 0) => {
  const [head, ...rest] = state.pending;
  if (!head) return state;
  const credit = head.reps === 0 && success ? 1 + anhieb : success ? head.streak + 1 : 0;
  const entry = { ...head, reps: head.reps + 1, streak: credit, missed: !success };
  const landed = entry.streak >= state.streak;
  return {
    ...state,
    attempts: state.attempts + 1,
    pending: landed ? rest : [...rest, entry],
    done: landed ? [...state.done, entry] : state.done,
  };
};

export const settle = (state) => {
  const [head, ...rest] = state.pending;
  if (!head) return state;
  return { ...state, attempts: state.attempts + 1, pending: rest, done: [...state.done, head] };
};

export const focus = (state, index) => {
  const at = state.pending.findIndex((entry) => entry.index === index);
  if (at <= 0) return state;
  const entry = state.pending[at];
  return { ...state, pending: [entry, ...state.pending.filter((candidate, position) => position !== at)] };
};

export const defer = (state) => {
  const [head, ...rest] = state.pending;
  if (!head || !rest.length) return state;
  return { ...state, pending: [...rest, head] };
};

export const scramble = (state) => {
  if (state.pending.length < 2) return state;
  const tail = state.pending.at(-1);
  const order = array.shuffle(state.pending.slice(0, -1));
  const at = 1 + Math.floor(Math.random() * order.length);
  return { ...state, pending: [...order.slice(0, at), tail, ...order.slice(at)] };
};
