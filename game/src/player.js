// The player: a night archivist in soft shoes. One job: move where the
// keys point, slide along walls, and sneak when asked.

import { PLAYER } from './config.js';
import { resolveCircleRect } from './sight.js';

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER.radius,
    facing: -Math.PI / 2, // facing up the gallery
    moving: false,
    sneaking: false,
    stepTimer: 0,
    stepPhase: 0,
  };
}

/**
 * Move the player by the input direction (-1..1 on each axis), resolving
 * against every solid rect. Returns the distance actually travelled.
 */
export function updatePlayer(player, dt, input, solids) {
  const ix = input.x;
  const iy = input.y;
  const len = Math.hypot(ix, iy);
  player.moving = len > 0.1;
  player.sneaking = !!input.sneak;
  if (!player.moving) return 0;

  const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const nx = ix / len;
  const ny = iy / len;
  const fromX = player.x;
  const fromY = player.y;
  player.x += nx * speed * dt;
  player.y += ny * speed * dt;
  for (const solid of solids) {
    const fixed = resolveCircleRect(player.x, player.y, player.radius, solid);
    if (fixed) {
      player.x = fixed.x;
      player.y = fixed.y;
    }
  }
  player.facing = Math.atan2(player.y - fromY, player.x - fromX);
  if (player.moving) {
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.55 : 0.34;
      player.stepPhase += 1;
    }
  }
  return Math.hypot(player.x - fromX, player.y - fromY);
}
