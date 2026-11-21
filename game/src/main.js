// The Quiet Wing — bootstrap, game loop and screen flow. One job: own the
// canvas, run the loop, and move between title, intro, play, pause, caught,
// level clear and win, handing events to the audio engine as they happen.

import { VIEW_W, VIEW_H, STEP } from './config.js';
import { createWorld, stepWorld, STATUS_TITLE, STATUS_INTRO, STATUS_PLAY, STATUS_PAUSED, STATUS_CAUGHT, STATUS_LEVEL_CLEAR, STATUS_WON } from './world.js';
import { drawWorld } from './render.js';
import { makeInput, readMovement, takeClicks, takeAnyKey, takePauseKey } from './input.js';
import {
  drawHud, drawHints, dimScreen,
  drawTitle, drawIntro, drawPaused, drawCaught, drawLevelClear, drawWon,
} from './ui.js';
import {
  ensureAudio, updateAudio, setMuted, isMuted,
  playChime, playAlarmPulse, playCaught, playWin, playNoticed,
} from './audio.js';
import { stageShot, shotLevelIndex } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const input = makeInput(canvas);

let world = createWorld(0, seed);
let screen = STATUS_TITLE;
let shotMode = !!shotName;
let shotTime = 6.0; // frozen clock for deterministic screenshots
let lastTime = performance.now();
let accumulator = 0;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

/** Mirror the live state into the canvas element's dataset, so automated
 * checks (and screen readers, via #status) can read it without reaching
 * into page-script globals, which some browsers isolate. */
function mirrorState() {
  canvas.dataset.screen = screen;
  canvas.dataset.status = world.status;
  canvas.dataset.detection = world.detection.toFixed(2);
  canvas.dataset.alarm = String(world.alarm);
  canvas.dataset.artifact = String(world.artifact.taken);
  canvas.dataset.level = String(world.levelIndex);
  canvas.dataset.player = `${Math.round(world.player.x)},${Math.round(world.player.y)}`;
}

function startLevel(index, carry) {
  const next = createWorld(index, seed);
  if (carry) {
    next.time = carry.time;
    next.spottedCount = carry.spottedCount;
  }
  world = next;
  screen = STATUS_INTRO;
  setStatus(`${world.level.name}. ${world.level.subtitle}`);
}

function beginPlay() {
  ensureAudio();
  world.status = STATUS_PLAY;
  screen = STATUS_PLAY;
  setStatus(`Playing ${world.level.name}. Find ${world.level.artifactName}, then reach the service door.`);
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'pickup') playChime();
    else if (event.type === 'near-miss') playAlarmPulse();
    else if (event.type === 'alarm') playAlarmPulse();
    else if (event.type === 'noticed') playNoticed();
    else if (event.type === 'caught') playCaught();
    else if (event.type === 'exit') playWin();
  }
}

function syncScreenFromWorld() {
  if (world.status === STATUS_CAUGHT) screen = STATUS_CAUGHT;
  else if (world.status === STATUS_LEVEL_CLEAR) screen = STATUS_LEVEL_CLEAR;
  else if (world.status === STATUS_WON) screen = STATUS_WON;
}

function frame(now) {
  requestAnimationFrame(frame);
  const clicks = takeClicks(input);
  const mouse = { x: input.mouseX, y: input.mouseY };

  if (shotMode) {
    // A staged scene: render the same frozen frame every time.
    drawWorld(ctx, world, shotTime);
    drawHud(ctx, world);
    drawHints(ctx, world);
    if (screen === STATUS_TITLE) {
      dimScreen(ctx);
      drawTitle(ctx, mouse, [], () => {});
    }
    mirrorState();
    return;
  }

  let dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (takePauseKey(input) && (screen === STATUS_PLAY || screen === STATUS_PAUSED)) {
    if (screen === STATUS_PLAY) {
      world.status = STATUS_PAUSED;
      screen = STATUS_PAUSED;
    } else {
      world.status = STATUS_PLAY;
      screen = STATUS_PLAY;
    }
  }

  if (screen === STATUS_TITLE) {
    // The title plays over a live gallery: guards patrol behind the dim.
    // Step with the status briefly PLAY so the rules run; the player stands
    // at the spawn, far from every patrol, so nothing can spot them here.
    world.status = STATUS_PLAY;
    accumulator += dt;
    while (accumulator >= STEP) {
      stepWorld(world, STEP, { x: 0, y: 0, sneak: false });
      accumulator -= STEP;
    }
    world.status = STATUS_TITLE;
    drawWorld(ctx, world, world.time);
    dimScreen(ctx);
    drawTitle(ctx, mouse, clicks, () => startLevel(0, null));
    if (takeAnyKey(input)) startLevel(0, null);
  } else if (screen === STATUS_INTRO) {
    drawWorld(ctx, world, world.time);
    dimScreen(ctx);
    drawIntro(ctx, world, mouse, clicks, beginPlay);
    if (takeAnyKey(input)) beginPlay();
  } else if (screen === STATUS_PLAY) {
    accumulator += dt;
    while (accumulator >= STEP) {
      const events = stepWorld(world, STEP, readMovement(input));
      handleEvents(events);
      accumulator -= STEP;
    }
    updateAudio(world);
    syncScreenFromWorld();
    drawWorld(ctx, world, world.time);
    drawHud(ctx, world);
    drawHints(ctx, world);
  } else if (screen === STATUS_PAUSED) {
    drawWorld(ctx, world, world.time);
    drawHud(ctx, world);
    dimScreen(ctx);
    drawPaused(ctx, mouse, clicks,
      () => { world.status = STATUS_PLAY; screen = STATUS_PLAY; },
      () => { world = createWorld(0, seed); screen = STATUS_TITLE; world.status = STATUS_TITLE; });
  } else if (screen === STATUS_CAUGHT) {
    drawWorld(ctx, world, world.time);
    drawHud(ctx, world);
    dimScreen(ctx);
    drawCaught(ctx, world, mouse, clicks,
      () => startLevel(world.levelIndex, { time: 0, spottedCount: world.spottedCount }),
      () => { world = createWorld(0, seed); screen = STATUS_TITLE; world.status = STATUS_TITLE; });
    if (takeAnyKey(input)) startLevel(world.levelIndex, { time: 0, spottedCount: world.spottedCount });
  } else if (screen === STATUS_LEVEL_CLEAR) {
    drawWorld(ctx, world, world.time);
    drawHud(ctx, world);
    dimScreen(ctx);
    drawLevelClear(ctx, world, mouse, clicks,
      () => startLevel(world.levelIndex + 1, { time: world.time, spottedCount: world.spottedCount }));
    if (takeAnyKey(input)) startLevel(world.levelIndex + 1, { time: world.time, spottedCount: world.spottedCount });
  } else if (screen === STATUS_WON) {
    drawWorld(ctx, world, world.time);
    dimScreen(ctx);
    drawWon(ctx, world, mouse, clicks, () => startLevel(0, null));
    if (takeAnyKey(input)) startLevel(0, null);
  }
  mirrorState();
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Mute toggle, available everywhere.
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') {
    ensureAudio();
    setMuted(!isMuted());
  }
});

if (shotMode) {
  // Stage the scene before the first frame, then freeze it.
  const levelIndex = shotLevelIndex(shotName);
  world = createWorld(levelIndex, seed);
  screen = stageShot(shotName, world);
  world.status = screen === STATUS_TITLE ? STATUS_TITLE : STATUS_PLAY;
  drawWorld(ctx, world, shotTime);
  drawHud(ctx, world);
  drawHints(ctx, world);
  if (screen === STATUS_TITLE) {
    dimScreen(ctx);
    drawTitle(ctx, { x: -1, y: -1 }, [], () => {});
  }
  window.__shotReady = true;
} else {
  setStatus('The Quiet Wing. A museum at night. Press Enter to begin.');
}

window.__game = {
  get world() { return world; },
  get screen() { return screen; },
  get shotMode() { return shotMode; },
  reduceMotion,
  startLevel,
  beginPlay,
};

requestAnimationFrame(frame);
