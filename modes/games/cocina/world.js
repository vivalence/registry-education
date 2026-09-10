import { face, lexemeOf } from "./mando/lexicon.js";

export const PREPS = ["cortar.imperative", "poner.imperative", "freír.imperative", "servir.imperative"];
export const INGREDIENTS = ["cebolla.noun", "pan.noun", "huevo.noun", "tomate.noun", "queso.noun"];
export const NUMERALS = ["uno.numeral", "dos.numeral"];

export const DISHES = [
  { name: "tortilla", steps: [["cortar.imperative", "cebolla.noun"], ["freír.imperative", "huevo.noun"], ["servir.imperative", "huevo.noun"]] },
  { name: "tostada", steps: [["cortar.imperative", "pan.noun"], ["poner.imperative", "tomate.noun"], ["servir.imperative", "pan.noun"]] },
  { name: "bocadillo", steps: [["cortar.imperative", "pan.noun"], ["poner.imperative", "queso.noun"], ["servir.imperative", "pan.noun"]] },
];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (list) => list[rand(list.length)];

export const create = () => ({ beat: 0, score: 0, lost: 0, tickets: [], cook: null });

export const next = (ticket) => ticket.dish.steps[ticket.done];

const wanted = (ticket, command) => {
  const [prep, ingredient] = next(ticket);
  return prep === command.prep && ingredient === command.ingredient;
};

export const order = (world, command) => {
  const ticket = world.tickets.find((held) => wanted(held, command)) ?? null;
  return {
    ...world,
    cook: { prep: command.prep, ingredient: command.ingredient, count: command.count, hit: ticket !== null },
    tickets: world.tickets.map((held) => (held === ticket ? { ...held, done: held.done + 1 } : held)),
  };
};

const spawn = (world, tempo) =>
  world.tickets.length >= Math.ceil(tempo)
    ? world
    : { ...world, tickets: [...world.tickets, { id: crypto.randomUUID(), dish: pick(DISHES), done: 0, due: world.beat + Math.max(4, Math.round(10 / tempo)) }] };

export const step = (world, tempo) => {
  const beat = world.beat + 1;
  const served = (ticket) => ticket.done >= ticket.dish.steps.length;
  const overdue = (ticket) => beat > ticket.due;
  const score = world.score + world.tickets.filter(served).length;
  const lost = world.lost + world.tickets.filter((ticket) => !served(ticket) && overdue(ticket)).length;
  return spawn({ ...world, beat, score, lost, tickets: world.tickets.filter((ticket) => !served(ticket) && !overdue(ticket)) }, tempo);
};

export const speak = (world, tier) => {
  const ticket = pick(world.tickets);
  const [prep, ingredient] = next(ticket);
  const count = tier >= 1 ? 1 + rand(2) : 1;
  const command = { prep, ingredient, count };
  return { command, slugs: [prep, ingredient, ...(tier >= 1 ? [NUMERALS[count - 1]] : [])], expect: { ticket: ticket.id, prep, ingredient } };
};

export const utterance = (spoken) =>
  spoken.command.count > 1
    ? `${face(spoken.command.prep)} ${face(NUMERALS[spoken.command.count - 1])} ${lexemeOf(spoken.command.ingredient).surfaces.at(-1)}`
    : `${face(spoken.command.prep)} ${face(spoken.command.ingredient)}`;

export const progress = (ticket) => "▮".repeat(ticket.done) + "▯".repeat(ticket.dish.steps.length - ticket.done);

export const stepSaid = ([prep, ingredient]) => `${face(prep)} ${face(ingredient)}`;

export const describe = (world) => [
  `kitchen · beat ${world.beat} · served ${world.score} · lost ${world.lost}`,
  world.tickets.length === 0 ? "no ticket on the rail" : `tickets: ${world.tickets.map((ticket) => `${ticket.dish.name} ${ticket.done}/${ticket.dish.steps.length} (next: ${stepSaid(next(ticket))}) due beat ${ticket.due}`).join(" · ")}`,
  world.cook === null ? "the cook is idle" : `the cook last did: ${face(world.cook.prep)} ${face(world.cook.ingredient)} — ${world.cook.hit ? "a ticket advanced" : "no ticket wanted that"}`,
];

export const remaining = (world, ticket) => ticket.due - world.beat;
