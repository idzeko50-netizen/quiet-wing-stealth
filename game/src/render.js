// Drawing the world. One job: turn a world state into a picture — floor,
// walls, cover, lanterns, cones, guards, the player, the seal, the door.
// Lighting (darkness + pools) is applied by lighting.js after this runs.

import { VIEW_W, VIEW_H, WORLD, PALETTE, GUARD } from './config.js';
import { guardConeHalfAngle, guardMood } from './guards.js';
import { applyNight, drawLanternWash } from './lighting.js';

const TAU = Math.PI * 2;

function toScreen(x, y) {
  return { x: WORLD.x + x, y: WORLD.y + y };
}

function drawFloor(ctx, world, time) {
  const level = world.level;
  ctx.save();
  // Parquet: alternating planks with hairline seams.
  const plank = 52;
  for (let x = 0; x < WORLD.w; x += plank) {
    for (let y = 0; y < WORLD.h; y += plank) {
      ctx.fillStyle = ((x / plank + y / plank) % 2 === 0) ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(WORLD.x + x, WORLD.y + y, plank, plank);
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.w; x += plank) {
    ctx.moveTo(WORLD.x + x, WORLD.y);
    ctx.lineTo(WORLD.x + x, WORLD.y + WORLD.h);
  }
  for (let y = 0; y <= WORLD.h; y += plank) {
    ctx.moveTo(WORLD.x, WORLD.y + y);
    ctx.lineTo(WORLD.x + WORLD.w, WORLD.y + y);
  }
  ctx.stroke();
  // A central rug in the gallery, a runner in the vault.
  if (level.id === 'gallery') {
    ctx.fillStyle = PALETTE.rug;
    ctx.fillRect(WORLD.x + 380, WORLD.y + 230, 488, 140);
    ctx.strokeStyle = PALETTE.rugEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(WORLD.x + 388, WORLD.y + 238, 472, 124);
  }
  ctx.restore();
}

function drawWalls(ctx, world) {
  ctx.save();
  for (const wall of world.level.walls) {
    const s = toScreen(wall.x, wall.y);
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(s.x, s.y, wall.w, wall.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(s.x, s.y, wall.w, 3);
    ctx.fillStyle = PALETTE.wallEdge;
    ctx.fillRect(s.x, s.y + wall.h - 2, wall.w, 2);
  }
  ctx.restore();
}

function drawCover(ctx, world, time) {
  ctx.save();
  for (const item of world.level.cover) {
    const s = toScreen(item.x, item.y);
    if (item.kind === 'case') {
      ctx.fillStyle = PALETTE.caseBase;
      ctx.fillRect(s.x, s.y, item.w, item.h);
      ctx.fillStyle = 'rgba(127, 180, 199, 0.30)';
      ctx.fillRect(s.x + 4, s.y + 4, item.w - 8, item.h - 8);
      ctx.strokeStyle = PALETTE.caseFrame;
      ctx.lineWidth = 3;
      ctx.strokeRect(s.x + 1.5, s.y + 1.5, item.w - 3, item.h - 3);
      // A small glint inside the case.
      ctx.fillStyle = 'rgba(242, 198, 109, 0.5)';
      ctx.beginPath();
      ctx.arc(s.x + item.w / 2, s.y + item.h / 2, 3, 0, TAU);
      ctx.fill();
    } else if (item.kind === 'shelf') {
      ctx.fillStyle = PALETTE.shelf;
      ctx.fillRect(s.x, s.y, item.w, item.h);
      ctx.strokeStyle = PALETTE.shelfEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 1, s.y + 1, item.w - 2, item.h - 2);
      ctx.strokeStyle = 'rgba(242, 198, 109, 0.25)';
      ctx.lineWidth = 1;
      for (let y = item.y + 24; y < item.y + item.h - 8; y += 28) {
        ctx.beginPath();
        ctx.moveTo(s.x + 5, s.y + y);
        ctx.lineTo(s.x + item.w - 5, s.y + y);
        ctx.stroke();
      }
    } else if (item.kind === 'planter') {
      ctx.fillStyle = PALETTE.planterPot;
      ctx.fillRect(s.x, s.y, item.w, item.h);
      ctx.fillStyle = PALETTE.planter;
      ctx.beginPath();
      ctx.arc(s.x + item.w / 2, s.y + item.h / 2, item.w * 0.42, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#57a377';
      ctx.beginPath();
      ctx.arc(s.x + item.w / 2 - 6, s.y + item.h / 2 - 5, 7, 0, TAU);
      ctx.arc(s.x + item.w / 2 + 7, s.y + item.h / 2 + 4, 6, 0, TAU);
      ctx.fill();
    } else if (item.kind === 'rope') {
      ctx.strokeStyle = PALETTE.rope;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + 4);
      ctx.quadraticCurveTo(s.x + item.w / 2, s.y + 12, s.x + item.w, s.y + 4);
      ctx.stroke();
      ctx.fillStyle = PALETTE.ropePost;
      ctx.beginPath();
      ctx.arc(s.x, s.y + 4, 4, 0, TAU);
      ctx.arc(s.x + item.w, s.y + 4, 4, 0, TAU);
      ctx.fill();
    } else if (item.kind === 'crate') {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(s.x, s.y, item.w, item.h);
      ctx.strokeStyle = PALETTE.crateEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 1, s.y + 1, item.w - 2, item.h - 2);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + item.w, s.y + item.h);
      ctx.moveTo(s.x + item.w, s.y);
      ctx.lineTo(s.x, s.y + item.h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLanterns(ctx, world, time) {
  ctx.save();
  for (const lantern of world.level.lanterns) {
    const s = toScreen(lantern.x, lantern.y);
    const flicker = 1 + Math.sin(time * 2.1 + lantern.x * 0.05) * 0.08;
    ctx.fillStyle = PALETTE.lantern;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7 * flicker, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.lanternCore;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.5 * flicker, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2a3350';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExit(ctx, world, time) {
  const e = world.exit;
  const s = toScreen(e.x, e.y);
  const active = world.artifact.taken;
  const pulse = active ? 0.75 + Math.sin(time * 3) * 0.25 : 0.4;
  ctx.save();
  ctx.fillStyle = PALETTE.exitDoor;
  ctx.fillRect(s.x, s.y, e.w, e.h);
  ctx.strokeStyle = active ? PALETTE.exit : '#2a3350';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(s.x + 1, s.y + 1, e.w - 2, e.h - 2);
  ctx.fillStyle = active ? `rgba(76, 195, 138, ${pulse})` : 'rgba(154, 165, 184, 0.5)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(active ? 'EXIT — GO' : 'SERVICE DOOR', s.x + e.w / 2, s.y + e.h / 2);
  ctx.restore();
}

function drawArtifact(ctx, world, time) {
  if (world.artifact.taken) return;
  const s = toScreen(world.artifact.x, world.artifact.y);
  const bob = Math.sin(time * 2.4) * 3;
  ctx.save();
  ctx.fillStyle = PALETTE.artifact;
  ctx.beginPath();
  ctx.arc(s.x, s.y + bob, 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#8a6d3b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y + bob, 11, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#0d1320';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', s.x, s.y + bob + 0.5);
  ctx.restore();
}

function drawCone(ctx, world, guard) {
  const s = toScreen(guard.x, guard.y);
  const halfAngle = guardConeHalfAngle(guard, world.detection);
  const mood = guardMood(guard, world.detection);
  const fill = mood === 'alarm' ? PALETTE.coneAlarm : mood === 'suspicious' ? PALETTE.coneSuspicious : PALETTE.coneCalm;
  const edge = mood === 'alarm' ? PALETTE.coneAlarmEdge : mood === 'suspicious' ? PALETTE.coneSuspiciousEdge : PALETTE.coneCalmEdge;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.arc(s.x, s.y, GUARD.viewRange, guard.facing - halfAngle, guard.facing + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x + Math.cos(guard.facing - halfAngle) * GUARD.viewRange, s.y + Math.sin(guard.facing - halfAngle) * GUARD.viewRange);
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x + Math.cos(guard.facing + halfAngle) * GUARD.viewRange, s.y + Math.sin(guard.facing + halfAngle) * GUARD.viewRange);
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, world, guard, time) {
  const s = toScreen(guard.x, guard.y);
  const mood = guardMood(guard, world.detection);
  ctx.save();
  // Soft shadow under the guard.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 10, 15, 6, 0, 0, TAU);
  ctx.fill();
  // Body.
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(s.x, s.y, GUARD.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = mood === 'alarm' ? PALETTE.alert : PALETTE.guardTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y, GUARD.radius, 0, TAU);
  ctx.stroke();
  // Cap brim and face, turned toward the facing.
  const fx = Math.cos(guard.facing);
  const fy = Math.sin(guard.facing);
  ctx.fillStyle = '#141a29';
  ctx.beginPath();
  ctx.arc(s.x + fx * 6, s.y + fy * 6, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardSkin;
  ctx.beginPath();
  ctx.arc(s.x + fx * 9, s.y + fy * 9, 4.5, 0, TAU);
  ctx.fill();
  // A small lantern the guard carries — the moving light.
  ctx.fillStyle = PALETTE.lanternCore;
  ctx.beginPath();
  ctx.arc(s.x + fx * 18, s.y + fy * 18, 3, 0, TAU);
  ctx.fill();
  // Suspicion mark above an uneasy guard.
  if (mood === 'suspicious') {
    ctx.fillStyle = PALETTE.suspicion;
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', s.x, s.y - 22);
  } else if (mood === 'alarm') {
    ctx.fillStyle = PALETTE.alert;
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', s.x, s.y - 22);
  }
  ctx.restore();
}

function drawPlayer(ctx, world, time) {
  const s = toScreen(world.player.x, world.player.y);
  const p = world.player;
  const bob = p.moving ? Math.sin(p.stepPhase * Math.PI) * 1.5 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 10, 13, 5, 0, 0, TAU);
  ctx.fill();
  // Hooded figure: pale cloak, teal scarf, facing tick.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(s.x, s.y + bob, p.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerScarf;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(s.x, s.y + bob, p.radius - 2, p.facing - 1.1, p.facing + 1.1);
  ctx.stroke();
  ctx.fillStyle = '#141a29';
  ctx.beginPath();
  ctx.arc(s.x + Math.cos(p.facing) * 5, s.y + bob + Math.sin(p.facing) * 5, 5.5, 0, TAU);
  ctx.fill();
  if (p.sneaking) {
    ctx.strokeStyle = PALETTE.playerScarf;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, p.radius + 5, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** The alarm washes the frame edges red; a near miss pulses once. */
function drawAlarmVignette(ctx, world, time) {
  if (!world.alarm && world.detection < 0.65) return;
  const strength = world.alarm ? 0.30 + Math.sin(time * 6) * 0.10 : (world.detection - 0.65) * 0.4;
  ctx.save();
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.32, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
  g.addColorStop(0, 'rgba(229, 72, 77, 0)');
  g.addColorStop(1, `rgba(229, 72, 77, ${Math.max(0, Math.min(0.4, strength))})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

/** Draw the whole level. `time` is the frozen-or-live clock for flicker. */
export function drawWorld(ctx, world, time) {
  ctx.save();
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, world, time);
  drawLanternWash(ctx, world, time);
  drawCover(ctx, world, time);
  drawWalls(ctx, world);
  drawLanterns(ctx, world, time);
  drawExit(ctx, world, time);
  drawArtifact(ctx, world, time);
  for (const guard of world.guards) drawCone(ctx, world, guard);
  for (const guard of world.guards) drawGuard(ctx, world, guard, time);
  drawPlayer(ctx, world, time);
  applyNight(ctx, world, time);
  drawAlarmVignette(ctx, world, time);
  ctx.restore();
}
