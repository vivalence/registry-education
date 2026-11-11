const VOLUME = 0.6;
const REVERB = 0.22;
const PEAK = 0.3;
const LEAD = 0.02;
const STEP = 0.12;
const SILENT = 0.0001;

const hertz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function impulse(context, seconds) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < length; index++) {
      samples[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 3;
    }
  }
  return buffer;
}

function wire() {
  const context = new AudioContext();
  const bus = context.createGain();
  const master = context.createGain();
  const wet = context.createGain();
  const convolver = context.createConvolver();
  const compressor = context.createDynamicsCompressor();
  master.gain.value = VOLUME;
  wet.gain.value = REVERB;
  convolver.buffer = impulse(context, 1.4);
  bus.connect(master);
  bus.connect(convolver);
  convolver.connect(wet);
  wet.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);
  return { context, bus };
}

let wired = null;

function envelope(context, at, duration, peak, attack) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(SILENT, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(SILENT, at + duration);
  return gain;
}

function sine(context, frequency, at, duration) {
  const oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.05);
  return oscillator;
}

function blend(glide, tine, cutoff) {
  return ({ context, bus }, frequency, at, duration, peak) => {
    const landing = at + Math.min(0.07, duration * 0.4);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const body = envelope(context, at, duration, peak * 0.55, 0.014);
    for (const cents of [-6, 6]) {
      const carrier = sine(context, frequency * glide, at, duration);
      const modulator = sine(context, frequency * glide, at, duration);
      const depth = context.createGain();
      carrier.frequency.exponentialRampToValueAtTime(frequency, landing);
      modulator.frequency.exponentialRampToValueAtTime(frequency, landing);
      carrier.detune.value = cents;
      modulator.detune.value = cents;
      depth.gain.setValueAtTime(frequency * 1.3, at);
      depth.gain.exponentialRampToValueAtTime(frequency * 0.03, at + duration * 0.7);
      modulator.connect(depth);
      depth.connect(carrier.frequency);
      carrier.connect(filter);
    }
    filter.connect(body);
    body.connect(bus);
    if (!tine) return;
    const ping = envelope(context, landing, 0.06, peak * tine, 0.002);
    sine(context, frequency * 14, landing, 0.06).connect(ping);
    ping.connect(bus);
  };
}

const full = blend(0.7, 0.07, 2600);
const soft = blend(0.85, 0, 1800);

const LADDER = [
  [0, 0],
  [2, 2],
  [4, 4],
  [5, 5],
  [7, 7],
  [9, 9],
  [11, 12],
];

const rise = ([low, high], index) => [
  [72 + low, index * STEP, 0.3, 1],
  [79 + high, index * STEP + 0.015, 0.3, 1],
];

const START = [
  [60, 0, 0.5, 1],
  [67, 0.02, 0.5, 1],
  [74, 0.14, 0.6, 1],
];

const REP = [
  [76, 0, 0.12, 1],
  [79, 0.06, 0.12, 1],
  [84, 0.12, 0.4, 1],
];

const MISTAKE = [
  [64, 0, 0.14, 1],
  [63, 0.1, 0.32, 1],
];

const SET = [
  [65, 0, 0.4, 1],
  [69, 0.02, 0.4, 1],
  [72, 0.04, 0.4, 1],
  [67, 0.28, 0.4, 1],
  [71, 0.3, 0.4, 1],
  [74, 0.32, 0.4, 1],
  [72, 0.58, 1.2, 1],
  [76, 0.6, 1.2, 1],
  [79, 0.62, 1.2, 1],
  [83, 0.64, 1.2, 1],
  [88, 0.78, 1.1, 1],
];

const CLEAN = [
  ...LADDER.flatMap(rise),
  [84, 0.84, 0.75, 1],
  [91, 0.855, 0.75, 1],
  [88, 0.98, 0.16, 0.5],
  [91, 1.04, 0.16, 0.5],
  [96, 1.1, 0.7, 0.6],
];

const CHIMES = {
  start: [full, START],
  rep: [full, REP],
  mistake: [soft, MISTAKE],
  set: [full, SET],
  clean: [soft, CLEAN],
};

export function chime(name) {
  const [voice, notes] = CHIMES[name];
  wired ??= wire();
  if (wired.context.state === "suspended") wired.context.resume();
  const at = wired.context.currentTime + LEAD;
  for (const [midi, offset, duration, level] of notes) {
    voice(wired, hertz(midi), at + offset, duration, PEAK * level);
  }
}
