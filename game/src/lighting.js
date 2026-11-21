// Night lighting. One job: paint the darkness over the lit world, then cut
// pools of light back out of it — lanterns, the player's small lamp, the
// guards' cones, and the service door's glow. Canvas 2D compositing only.

import { VIEW_W, VIEW_H, WORLD, PALETTE } from './config.js';
import { GUARD } from './config.js';
import { guardConeHalfAngle, guardMood } from './guards.js';

let lightCanvas = null;
let lightCtx = null;

function getLightLayer() {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = VIEW_W;
    lightCanvas.height = VIEW_H;
    lightCtx = lightCanvas.getContext('2d');
  }
  return lightCtx;
}

/** Cut a soft round hole out of the darkness at (x, y) with radius r. */
function punchHole(ctx, x, y, r, strength) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
  g.addColorStop(0.65, `rgba(0, 0, 0, ${strength * 0.55})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Cut a wedge-shaped hole along a guard's cone. */
function punchCone(ctx, x, y, facing, range, halfAngle, strength) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
  g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
  g.addColorStop(0.7, `rgba(0, 0, 0, ${strength * 0.4})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, -halfAngle, halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Paint the night over the scene already drawn on `ctx`: darkness everywhere
 * except the lantern pools, cones, the player, and the exit. `time` drives a
 * slow lantern flicker. Call after the world is drawn, before the HUD.
 */
export function applyNight(ctx, world, time) {
  const layer = getLightLayer();
  layer.clearRect(0, 0, VIEW_W, VIEW_H);
  layer.globalCompositeOperation = 'source-over';
  layer.fillStyle = 'rgba(4, 6, 12, 0.84)';
  layer.fillRect(0, 0, VIEW_W, VIEW_H);
  layer.globalCompositeOperation = 'destination-out';

  const ox = WORLD.x;
  const oy = WORLD.y;
  // Lantern pools, with a slow flicker so the light feels alive.
  for (const lantern of world.level.lanterns) {
    const flicker = 1 + Math.sin(time * 2.1 + lantern.x * 0.05) * 0.04;
    punchHole(layer, ox + lantern.x, oy + lantern.y, lantern.r * flicker, 0.95);
  }
  // The player's own small lamp.
  punchHole(layer, ox + world.player.x, oy + world.player.y, 78, 0.75);
  // Each guard's cone lets some light through.
  for (const guard of world.guards) {
    const halfAngle = guardConeHalfAngle(guard, world.detection);
    const mood = guardMood(guard, world.detection);
    const strength = mood === 'alarm' ? 0.6 : mood === 'suspicious' ? 0.55 : 0.42;
    punchCone(layer, ox + guard.x, oy + guard.y, guard.facing, GUARD.viewRange, halfAngle, strength);
  }
  // The service door glows once the seal is taken.
  if (world.artifact.taken) {
    const e = world.exit;
    punchHole(layer, ox + e.x + e.w / 2, oy + e.y + e.h / 2, 110, 0.85);
  }
  // The seal itself glints.
  if (!world.artifact.taken) {
    const pulse = 0.5 + Math.sin(time * 3) * 0.18;
    punchHole(layer, ox + world.artifact.x, oy + world.artifact.y, 56, pulse);
  }

  ctx.save();
  ctx.drawImage(lightCanvas, 0, 0);
  ctx.restore();
}

/** A soft amber wash drawn under the darkness, so lit ground reads warm. */
export function drawLanternWash(ctx, world, time) {
  const ox = WORLD.x;
  const oy = WORLD.y;
  ctx.save();
  for (const lantern of world.level.lanterns) {
    const flicker = 1 + Math.sin(time * 2.1 + lantern.x * 0.05) * 0.03;
    const g = ctx.createRadialGradient(ox + lantern.x, oy + lantern.y, 0, ox + lantern.x, oy + lantern.y, lantern.r * 1.15 * flicker);
    g.addColorStop(0, 'rgba(232, 163, 61, 0.16)');
    g.addColorStop(1, 'rgba(232, 163, 61, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox + lantern.x, oy + lantern.y, lantern.r * 1.15 * flicker, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export { PALETTE };
