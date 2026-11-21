// Procedural WebAudio: no sound files, everything is synthesised.
// One job: footsteps that tell you where a guard is, a chime for the seal,
// and the alarm pulse. Silent until the player first interacts.

let audioCtx = null;
let master = null;
let noiseBuffer = null;
let muted = false;
let lastPlayerStep = -1;

export function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  master = audioCtx.createGain();
  master.gain.value = 0.5;
  master.connect(audioCtx.destination);
  // One shared second of white noise, reused by every footstep.
  noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

function footstep(pan, gain, lowpass) {
  if (!audioCtx || muted) return;
  const now = audioCtx.currentTime;
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const amp = audioCtx.createGain();
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  const panner = audioCtx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  source.connect(filter);
  filter.connect(amp);
  amp.connect(panner);
  panner.connect(master);
  source.start(now, Math.random() * 0.5, 0.1);
  source.stop(now + 0.12);
}

function tone(frequency, startAt, duration, gainValue, type) {
  if (!audioCtx || muted) return;
  const now = audioCtx.currentTime + startAt;
  const osc = audioCtx.createOscillator();
  osc.type = type || 'sine';
  osc.frequency.value = frequency;
  const amp = audioCtx.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

/** Called every frame: guard steps get louder and pan toward the player. */
export function updateAudio(world) {
  if (!audioCtx || muted) return;
  const player = world.player;
  for (const guard of world.guards) {
    const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
    if (guard.moving && guard.stepPhase !== guard._lastHeardStep) {
      guard._lastHeardStep = guard.stepPhase;
      if (dist < 430) {
        const pan = (guard.x - player.x) / 380;
        const gain = 0.22 * (1 - dist / 430);
        footstep(pan, gain, 420);
      }
    }
  }
  if (player.moving && player.stepPhase !== lastPlayerStep) {
    lastPlayerStep = player.stepPhase;
    footstep(0, player.sneaking ? 0.03 : 0.07, 300);
  }
}

export function playChime() {
  tone(659.25, 0, 0.5, 0.16); // E5
  tone(987.77, 0.09, 0.6, 0.14); // B5
}

export function playAlarmPulse() {
  tone(110, 0, 0.22, 0.2, 'square');
  tone(110, 0.24, 0.22, 0.2, 'square');
}

export function playCaught() {
  tone(220, 0, 0.3, 0.18, 'sawtooth');
  tone(174.61, 0.22, 0.5, 0.18, 'sawtooth');
}

export function playWin() {
  tone(523.25, 0, 0.4, 0.14);
  tone(659.25, 0.12, 0.4, 0.14);
  tone(783.99, 0.24, 0.7, 0.16);
}

export function playNoticed() {
  tone(330, 0, 0.12, 0.1, 'triangle');
}
