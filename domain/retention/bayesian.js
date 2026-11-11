import * as ebisu from "ebisu-js";
import { time } from "@vivalence/typology";
import { PROFILE } from "../schematics.js";

const DECAY = 0.5;
const HALFLIFE_MIN = 0.01;
const HALFLIFE_MAX = 24 * 365 * 10;

const TAU = {
  MASTERY: 24,
  SUCCESS: 3.4,
  NEUTRAL: 1.0,
  MISTAKE: 0.15,
  FAILURE: 0.08,
};

const HOURS = [
  [0, 1 / 60],
  [10, 1],
  [50, 24 * 30],
  [100, 24 * 365],
];

const halflife = (percent) => {
  const upper = HOURS.findIndex(([at]) => percent <= at) || 1;
  const [from, low] = HOURS[upper - 1];
  const [to, high] = HOURS[upper];
  return low * (high / low) ** ((percent - from) / (to - from));
};

const percent = (hours) => {
  if (hours <= HOURS[0][1]) return 0;
  if (hours >= HOURS.at(-1)[1]) return 100;
  const upper = HOURS.findIndex(([, at]) => hours <= at);
  const [from, low] = HOURS[upper - 1];
  const [to, high] = HOURS[upper];
  return from + ((to - from) * Math.log(hours / low)) / Math.log(high / low);
};

const reached = (nextIn) => {
  const at = Math.round(percent(nextIn) * 100) / 100;
  const [status] = Object.entries(PROFILE).findLast(([, from]) => from <= at) ?? ["UNKNOWN"];
  return status;
};

const assess = ({ state }) => {
  const nextIn = ebisu.modelToPercentileDecay(state, DECAY);
  const nextAt = time.futureDatetime(nextIn);
  const status = !state ? "UNTOUCHED" : reached(nextIn);
  return { status, nextIn, nextAt };
};

const scale = (percent) => {
  const state = ebisu.defaultModel(halflife(percent), 4, 4);
  return { state, ...assess({ state }) };
};

const encode = (signal) => {
  let tau;
  if (signal.ratio) {
    const r = signal.ratio.success / signal.ratio.total;
    tau = r >= 1 ? 8 : r > 0.8 ? 2.4 : 0.26;
  } else if (signal.enum) {
    tau = TAU[signal.enum];
    if (tau == null) throw new Error(`Invalid signal enum: ${signal.enum}`);
  } else {
    throw new Error("No signal provided to encode retention");
  }
  const state = ebisu.defaultModel(tau, 4, 4);
  return { state, ...assess({ state }) };
};

const clamp = (state) => {
  const [a, b, t] = state;
  return [a, b, Math.max(HALFLIFE_MIN, Math.min(HALFLIFE_MAX, t))];
};

const evolve = (signal, retention) => {
  const elapsed = Math.max(time.hoursBetween(retention.lastAt), 0.001);
  let state = retention.state;

  if (signal.ratio) {
    state = ebisu.updateRecall(state, signal.ratio.success, signal.ratio.total, elapsed);
  } else if (signal.enum) {
    switch (signal.enum) {
      case "MASTERY":
        state = ebisu.updateRecall(state, 1, 1, elapsed);
        state = ebisu.rescaleHalflife(state, 3);
        break;
      case "SUCCESS":
        state = ebisu.updateRecall(state, 1, 1, elapsed);
        break;
      case "NEUTRAL":
        state = ebisu.updateRecall(state, 0.5, 1, elapsed);
        break;
      case "MISTAKE":
        state = ebisu.updateRecall(state, 0, 1, elapsed);
        break;
      case "FAILURE":
        state = ebisu.updateRecall(state, 0, 1, elapsed);
        state = ebisu.rescaleHalflife(state, 0.3);
        break;
      default:
        throw new Error(`Invalid signal enum: ${signal.enum}`);
    }
  } else {
    throw new Error("No signal provided to evolve retention");
  }

  state = clamp(state);
  return { state, ...assess({ state }) };
};

export default {
  type: "BAYESIAN",
  encode,
  evolve,
  scale,
  assess,
  strength: (held, now) => Math.exp(-(Math.max(now - held.lastAt, 0) / 3_600_000) / held.state[2]),
  sql: {
    strength: (at) =>
      `exp(-(julianday('now') - julianday(${at("lastAt")} / 1000.0, 'unixepoch')) * 24.0 / json_extract(${at("state")}, '$[2]'))`,
  },
};
