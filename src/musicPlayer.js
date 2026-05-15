const SOUND_STORAGE_KEY = 'snake.sound.enabled.v1';

const PLAYLIST = [
  {
    bpm: 104,
    wave: 'square',
    notes: [392, null, 392, 523, 587, null, 523, 392, 330, null, 330, 392, 440, null, 392, 330],
    bass: [98, null, 98, null, 130, null, 130, null]
  },
  {
    bpm: 112,
    wave: 'triangle',
    notes: [330, 392, null, 440, 494, null, 440, 392, 330, null, 392, 494, 523, null, 494, 392],
    bass: [82, null, 110, null, 98, null, 123, null]
  },
  {
    bpm: 96,
    wave: 'sawtooth',
    notes: [262, null, 330, 392, null, 330, 262, null, 294, null, 349, 440, null, 349, 294, null],
    bass: [65, null, 65, null, 87, null, 87, null]
  },
  {
    bpm: 118,
    wave: 'square',
    notes: [494, null, 587, 659, 587, null, 494, 392, 440, null, 523, 587, 523, null, 440, 392],
    bass: [123, null, 147, null, 110, null, 98, null]
  }
];

function getStoredEnabled(storage) {
  if (!storage) {
    return true;
  }

  try {
    const value = storage.getItem(SOUND_STORAGE_KEY);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

function storeEnabled(storage, enabled) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Some private browser modes can reject localStorage writes.
  }
}

export function createMusicPlayer({ storage = globalThis.localStorage } = {}) {
  let audioContext = null;
  let masterGain = null;
  let timerId = null;
  let enabled = getStoredEnabled(storage);
  let started = false;
  let step = 0;
  let trackIndex = 0;
  let trackLoops = 0;

  function ensureAudioContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) {
      enabled = false;
      return null;
    }

    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.08;
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  function playTone(frequency, duration, wave, volume = 0.55) {
    const context = ensureAudioContext();
    if (!context || !masterGain) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function advanceTrackIfNeeded(track) {
    if (step % track.notes.length !== 0) {
      return;
    }

    trackLoops += 1;
    if (trackLoops < 4) {
      return;
    }

    trackLoops = 0;
    trackIndex = (trackIndex + 1) % PLAYLIST.length;
  }

  function scheduleNextStep() {
    if (!started || !enabled) {
      timerId = null;
      return;
    }

    const context = ensureAudioContext();
    if (!context) {
      timerId = null;
      return;
    }

    if (context.state === 'suspended') {
      context.resume();
    }

    const track = PLAYLIST[trackIndex];
    const stepDuration = (60 / track.bpm) / 2;
    const note = track.notes[step % track.notes.length];
    const bass = track.bass[step % track.bass.length];

    if (note) {
      playTone(note, stepDuration * 0.75, track.wave, 0.5);
    }

    if (bass && step % 2 === 0) {
      playTone(bass, stepDuration * 1.4, 'triangle', 0.35);
    }

    step += 1;
    advanceTrackIfNeeded(track);
    timerId = window.setTimeout(scheduleNextStep, stepDuration * 1000);
  }

  function start() {
    if (!enabled || started) {
      return;
    }

    started = true;
    scheduleNextStep();
  }

  function stop() {
    started = false;
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    storeEnabled(storage, enabled);

    if (!enabled) {
      stop();
    }
  }

  return {
    get enabled() {
      return enabled;
    },
    get isPlaying() {
      return started;
    },
    start,
    stop,
    setEnabled,
    toggle() {
      setEnabled(!enabled);
      return enabled;
    }
  };
}
