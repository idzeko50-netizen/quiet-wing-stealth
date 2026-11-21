// The game state and its rules. One job: hold a level's state and step it
// forward — movement, sight, the detection meter, the alarm, pickup, exit,
// and being caught. Rendering and sound read this; they never change it.

import { DETECTION, GUARD, STEP } from './config.js';
import { LEVELS, isTallCover } from './levels.js';
import { coneVisibility, inLight } from './sight.js';
import { makeGuard, updateGuard, guardConeHalfAngle, GUARD_ALARM, GUARD_PATROL, GUARD_RETURN } from './guards.js';
import { makePlayer, updatePlayer } from './player.js';

export const STATUS_TITLE = 'title';
export const STATUS_INTRO = 'intro';
export const STATUS_PLAY = 'play';
export const STATUS_PAUSED = 'paused';
export const STATUS_CAUGHT = 'caught';
export const STATUS_LEVEL_CLEAR = 'level-clear';
export const STATUS_WON = 'won';

export function createWorld(levelIndex, seed) {
  const level = LEVELS[levelIndex];
  const solids = [...level.walls, ...level.cover];
  const sightBlockers = [...level.walls, ...level.cover.filter((c) => isTallCover(c.kind))];
  return {
    levelIndex,
    level,
    seed,
    solids,
    sightBlockers,
    player: makePlayer(level.playerStart),
    guards: level.guards.map((def, i) => makeGuard(def, i)),
    artifact: { x: level.artifact.x, y: level.artifact.y, taken: false },
    exit: level.exit,
    detection: 0,
    alarm: false,
    alarmTimer: 0,
    loseSightTimer: 0,
    status: STATUS_TITLE,
    time: 0,
    spottedCount: 0,
    nearMissFired: false,
    events: [],
    message: null,
    messageTimer: 0,
    // Per-guard visibility this step, for the renderer and the HUD.
    visibility: level.guards.map(() => 0),
    playerInShadow: true,
    playerInLight: false,
  };
}

/** How exposed the player is right now: 0 hidden, 1 fully seen by some guard. */
export function computeVisibility(world) {
  const { player, guards, sightBlockers } = world;
  let best = 0;
  for (let i = 0; i < guards.length; i += 1) {
    const guard = guards[i];
    const halfAngle = guardConeHalfAngle(guard, world.detection);
    const seen = coneVisibility(
      guard.x, guard.y, guard.facing, GUARD.viewRange, halfAngle,
      player, sightBlockers,
    );
    world.visibility[i] = seen;
    if (seen > best) best = seen;
  }
  return best;
}

export function stepWorld(world, dt, input) {
  world.events.length = 0;
  if (world.status !== STATUS_PLAY) return world.events;
  world.time += dt;

  // --- Player ---
  updatePlayer(world.player, dt, input, world.solids);

  // --- Light and shadow where the player stands ---
  world.playerInLight = inLight(world.player.x, world.player.y, world.level.lanterns);
  const inAnyCone = world.guards.some((guard) => {
    const halfAngle = guardConeHalfAngle(guard, world.detection);
    return coneVisibility(guard.x, guard.y, guard.facing, GUARD.viewRange, halfAngle, world.player, world.sightBlockers) > 0;
  });
  world.playerInShadow = !world.playerInLight && !inAnyCone;

  // --- Guards see, then move ---
  const seen = computeVisibility(world);
  for (const guard of world.guards) {
    const event = updateGuard(guard, dt, world.visibility[guard.index], world.player, world.solids);
    if (event === 'noticed' && !world.alarm) {
      world.events.push({ type: 'noticed', guard: guard.index });
    }
  }

  // --- Detection meter: fills on sight, drains in the dark ---
  const before = world.detection;
  if (seen > 0) {
    let rate = DETECTION.fillBase * (DETECTION.fillFar + (1 - DETECTION.fillFar) * seen);
    if (world.player.sneaking) rate *= DETECTION.sneakFactor;
    if (world.playerInShadow) rate *= DETECTION.shadowFactor;
    if (world.playerInLight) rate *= DETECTION.lanternFactor;
    world.detection = Math.min(1, world.detection + rate * dt);
  } else {
    world.detection = Math.max(0, world.detection - (world.alarm ? DETECTION.drainInAlarm : DETECTION.drain) * dt);
  }

  // Near miss: crossing the threshold upward fires one alarm pulse.
  if (before < DETECTION.nearMissAt && world.detection >= DETECTION.nearMissAt && !world.alarm) {
    world.events.push({ type: 'near-miss' });
    world.nearMissFired = true;
  }

  // Full meter: the alarm goes up and every guard gives chase.
  if (world.detection >= DETECTION.alarmAt && !world.alarm) {
    world.alarm = true;
    world.alarmTimer = DETECTION.alarmLength;
    world.spottedCount += 1;
    for (const guard of world.guards) {
      guard.state = GUARD_ALARM;
      guard.lastSeen = { x: world.player.x, y: world.player.y };
    }
    world.events.push({ type: 'alarm' });
    world.message = 'Spotted — break line of sight!';
    world.messageTimer = 2.4;
  }

  // Alarm decays once sight has been broken for a while.
  if (world.alarm) {
    if (seen > 0) {
      world.loseSightTimer = 0;
      world.alarmTimer = DETECTION.alarmLength;
    } else {
      world.loseSightTimer += dt;
      world.alarmTimer -= dt;
      if (world.alarmTimer <= 0 || world.loseSightTimer >= DETECTION.loseSightGrace) {
        world.alarm = false;
        world.detection = 0.4;
        for (const guard of world.guards) {
          if (guard.state === GUARD_ALARM) {
            guard.state = GUARD_RETURN;
            guard.returnTarget = null;
          }
        }
        world.events.push({ type: 'alarm-over' });
        world.message = 'They lost you. Breathe.';
        world.messageTimer = 2.0;
      }
    }
  }

  // Caught: a chasing guard reaches the player.
  for (const guard of world.guards) {
    if (guard.state === GUARD_ALARM && Math.hypot(guard.x - world.player.x, guard.y - world.player.y) < GUARD.catchDistance) {
      world.status = STATUS_CAUGHT;
      world.events.push({ type: 'caught' });
      return world.events;
    }
  }

  // --- The seal ---
  if (!world.artifact.taken) {
    const d = Math.hypot(world.player.x - world.artifact.x, world.player.y - world.artifact.y);
    if (d < 30) {
      world.artifact.taken = true;
      world.events.push({ type: 'pickup' });
      world.message = 'The seal is yours — reach the service door.';
      world.messageTimer = 3.0;
    }
  }

  // --- The service door ---
  if (world.artifact.taken) {
    const e = world.exit;
    if (world.player.x > e.x && world.player.x < e.x + e.w && world.player.y > e.y && world.player.y < e.y + e.h) {
      if (world.levelIndex + 1 < LEVELS.length) {
        world.status = STATUS_LEVEL_CLEAR;
      } else {
        world.status = STATUS_WON;
      }
      world.events.push({ type: 'exit' });
      return world.events;
    }
  }

  if (world.messageTimer > 0) {
    world.messageTimer -= dt;
    if (world.messageTimer <= 0) world.message = null;
  }
  return world.events;
}

/** Step the world forward with no input (used to stage deterministic shots). */
export function stepWorldSilent(world, seconds) {
  world.status = STATUS_PLAY;
  const idle = { x: 0, y: 0, sneak: false };
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepWorld(world, STEP, idle);
}

export { LEVELS };
