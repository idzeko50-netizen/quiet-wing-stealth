// Deterministic screenshot scenes behind ?shot=start|patrol|alarm|exit.
// Each one loads a fixed game state — guards mid-patrol, the player placed
// by hand, the meter set — so the same seed always gives the same frame.
// Nothing here is random; the browser only renders what is staged.

import { STEP } from './config.js';
import { stepWorld, stepWorldSilent, STATUS_TITLE, STATUS_PLAY } from './world.js';
import { GUARD_ALARM, GUARD_SUSPICIOUS } from './guards.js';

export const SHOT_START = 'start';
export const SHOT_PATROL = 'patrol';
export const SHOT_ALARM = 'alarm';
export const SHOT_EXIT = 'exit';

/** Which level index a shot belongs to (0 gallery, 1 archive, 2 vault). */
export function shotLevelIndex(name) {
  if (name === SHOT_ALARM) return 1;
  if (name === SHOT_EXIT) return 2;
  return 0;
}

/**
 * Stage the named scene on `world` (already created for the right level)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  if (name === SHOT_PATROL) {
    // Guards mid-route, then the player tucked behind the central cases,
    // sneaking, one cone already sweeping toward them.
    stepWorldSilent(world, 8);
    world.player.x = 560;
    world.player.y = 300;
    world.player.facing = -Math.PI / 2;
    world.player.sneaking = true;
    world.detection = 0.28;
    world.status = STATUS_PLAY;
    return STATUS_PLAY;
  }

  if (name === SHOT_ALARM) {
    // The archive's middle guard has the player dead-centre in its cone:
    // meter nearly full, alarm up, the other guards turning to look.
    stepWorldSilent(world, 5);
    world.player.x = 624;
    world.player.y = 300;
    world.player.facing = Math.PI / 2;
    const middle = world.guards[2];
    middle.x = 624;
    middle.y = 200;
    middle.facing = Math.PI / 2;
    middle.state = GUARD_ALARM;
    middle.lastSeen = { x: 624, y: 300 };
    for (const guard of world.guards) {
      if (guard !== middle) {
        guard.state = GUARD_SUSPICIOUS;
        guard.lastSeen = { x: 624, y: 300 };
      }
    }
    world.detection = 0.85;
    world.alarm = true;
    world.alarmTimer = 5;
    world.spottedCount = 1;
    world.message = 'Spotted — break line of sight!';
    world.messageTimer = 2.4;
    world.status = STATUS_PLAY;
    return STATUS_PLAY;
  }

  if (name === SHOT_EXIT) {
    // The vault, seal already taken, the player one step from the service
    // door with the patrols closing in behind them.
    stepWorldSilent(world, 6);
    world.artifact.taken = true;
    world.player.x = 150;
    world.player.y = 100;
    world.player.facing = Math.PI;
    world.detection = 0.12;
    world.status = STATUS_PLAY;
    return STATUS_PLAY;
  }

  // start: the title over a live gallery, guards already on their routes.
  stepWorldSilent(world, 6);
  world.status = STATUS_TITLE;
  return STATUS_TITLE;
}

export { STEP };
