// the game's few sounds are made, not played: a blip is a run of notes on one oscillator each, so
// the mode ships no audio file, and a phone's silent switch mutes them along with the page
const SOUNDS = {
  door: {
    wave: "triangle",
    loud: 0.16,
    notes: [
      [330, 0.07],
      [247, 0.12],
    ],
  },
  area: {
    wave: "sine",
    loud: 0.14,
    notes: [
      [523, 0.08],
      [659, 0.13],
    ],
  },
  chest: {
    wave: "triangle",
    loud: 0.14,
    notes: [
      [523, 0.07],
      [659, 0.07],
      [784, 0.07],
      [1047, 0.16],
    ],
  },
  coin: {
    wave: "square",
    loud: 0.05,
    notes: [
      [988, 0.05],
      [1319, 0.14],
    ],
  },
  smash: {
    wave: "sawtooth",
    loud: 0.06,
    notes: [
      [180, 0.04],
      [120, 0.08],
    ],
  },
  spotted: {
    wave: "square",
    loud: 0.06,
    notes: [
      [880, 0.05],
      [1175, 0.09],
    ],
  },
  strike: {
    wave: "sawtooth",
    loud: 0.07,
    notes: [
      [660, 0.04],
      [440, 0.05],
      [220, 0.08],
    ],
  },
  hurt: {
    wave: "sawtooth",
    loud: 0.08,
    notes: [
      [196, 0.09],
      [147, 0.16],
    ],
  },
  heal: {
    wave: "sine",
    loud: 0.14,
    notes: [
      [523, 0.07],
      [784, 0.07],
      [1047, 0.15],
    ],
  },
  pick: {
    wave: "triangle",
    loud: 0.12,
    notes: [
      [784, 0.05],
      [1047, 0.1],
    ],
  },
  deny: {
    wave: "square",
    loud: 0.04,
    notes: [
      [220, 0.07],
      [196, 0.11],
    ],
  },
  fanfare: {
    wave: "triangle",
    loud: 0.14,
    notes: [
      [523, 0.1],
      [659, 0.1],
      [784, 0.1],
      [1047, 0.32],
    ],
  },
};

// each note swells in fast and dies away, so no blip clicks at its edges
const ATTACK = 0.008;
const SILENCE = 0.0001;

export const sfx = () => {
  let context = null;

  // a browser opens audio only inside a gesture: the learner's first touch or key wakes it
  const wake = () => {
    if (context === null) context = new AudioContext();
    if (context.state === "suspended") context.resume();
  };

  // before that first gesture the game is silent rather than refused
  const play = (name) => {
    if (context === null || context.state !== "running") return;
    const sound = SOUNDS[name];
    let at = context.currentTime;
    for (const [frequency, length] of sound.notes) {
      const tone = context.createOscillator();
      const swell = context.createGain();
      tone.type = sound.wave;
      tone.frequency.value = frequency;
      swell.gain.setValueAtTime(SILENCE, at);
      swell.gain.exponentialRampToValueAtTime(sound.loud, at + ATTACK);
      swell.gain.exponentialRampToValueAtTime(SILENCE, at + length);
      tone.connect(swell).connect(context.destination);
      tone.start(at);
      tone.stop(at + length + ATTACK);
      at += length;
    }
  };

  // the view gone, its audio goes with it
  const close = () => {
    if (context !== null) context.close();
    context = null;
  };

  return { wake, play, close };
};
