// Menus, buttons and the HUD, drawn on the same canvas as the game.
// One job: every screen that is not the level itself — title, wing intro,
// pause, caught, level clear, win — plus the top bar and the hints below.
// Motion here is one entrance per container (title rises once, the rest
// arrives with it); nothing staggers on a surface used every few seconds.

import { VIEW_W, VIEW_H, HUD_H, HINT_H, PALETTE } from './config.js';
import { LEVELS } from './levels.js';
import { STATUS_TITLE, STATUS_INTRO, STATUS_PAUSED, STATUS_CAUGHT, STATUS_LEVEL_CLEAR, STATUS_WON } from './world.js';

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function makeButton(x, y, w, h, label, action) {
  return { x, y, w, h, label, action, hover: false };
}

function drawButton(ctx, button, mouse) {
  button.hover = mouse.x >= button.x && mouse.x <= button.x + button.w
    && mouse.y >= button.y && mouse.y <= button.y + button.h;
  ctx.save();
  ctx.strokeStyle = button.hover ? PALETTE.lantern : PALETTE.hudLine;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = button.hover ? 'rgba(232, 163, 61, 0.16)' : 'rgba(13, 19, 32, 0.72)';
  ctx.beginPath();
  ctx.roundRect(button.x, button.y, button.w, button.h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = button.hover ? PALETTE.lanternCore : PALETTE.text;
  ctx.font = '600 15px ' + SANS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2 + 1);
  ctx.restore();
}

function clickHit(button, clicks) {
  return clicks.some((c) => c.x >= button.x && c.x <= button.x + button.w && c.y >= button.y && c.y <= button.y + button.h);
}

function centerText(ctx, text, y, font, color) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.restore();
}

function thinRule(ctx, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2 - 130, y);
  ctx.lineTo(VIEW_W / 2 + 130, y);
  ctx.stroke();
  ctx.restore();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The top bar: wing name, the detection eye, the seal, the clock. */
export function drawHud(ctx, world) {
  const level = world.level;
  ctx.save();
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = PALETTE.hudLine;
  ctx.fillRect(0, HUD_H - 1, VIEW_W, 1);

  // Wing name, left.
  ctx.font = '600 15px ' + SERIF;
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${level.numeral} · ${level.name}`, 20, HUD_H / 2);

  // Detection eye, centre: an eye that opens as the meter fills.
  const eyeX = VIEW_W / 2 - 130;
  const eyeY = HUD_H / 2;
  const d = world.detection;
  const eyeColor = world.alarm ? PALETTE.alert : d > 0.35 ? PALETTE.suspicion : PALETTE.muted;
  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, 13, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 2.5 + d * 3.5, 0, Math.PI * 2);
  ctx.fill();
  // The meter beside it.
  ctx.fillStyle = '#1a2334';
  ctx.fillRect(eyeX + 22, eyeY - 5, 150, 10);
  ctx.fillStyle = eyeColor;
  ctx.fillRect(eyeX + 22, eyeY - 5, 150 * d, 10);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.strokeRect(eyeX + 22, eyeY - 5, 150, 10);
  ctx.font = '12px ' + SANS;
  ctx.fillStyle = world.alarm ? PALETTE.alert : PALETTE.muted;
  ctx.textAlign = 'left';
  ctx.fillText(world.alarm ? 'ALARM' : d > 0.65 ? 'Nearly seen' : d > 0.35 ? 'Suspicious' : d > 0.05 ? 'Glanced' : 'Unseen', eyeX + 180, eyeY);

  // Seal, clock and wing dots, right.
  const sealText = world.artifact.taken ? 'Seal found' : 'Seal missing';
  ctx.font = '13px ' + SANS;
  ctx.fillStyle = world.artifact.taken ? PALETTE.artifact : PALETTE.muted;
  ctx.textAlign = 'right';
  ctx.fillText(sealText, VIEW_W - 190, eyeY);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(formatTime(world.time), VIEW_W - 110, eyeY);
  for (let i = 0; i < LEVELS.length; i += 1) {
    ctx.beginPath();
    ctx.arc(VIEW_W - 78 + i * 18, eyeY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = i < world.levelIndex ? PALETTE.exit : i === world.levelIndex ? PALETTE.lantern : '#2a3350';
    ctx.fill();
  }
  ctx.restore();
}

/** The hint line under the floor. */
export function drawHints(ctx, world) {
  ctx.save();
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(0, VIEW_H - HINT_H, VIEW_W, HINT_H);
  ctx.fillStyle = PALETTE.hudLine;
  ctx.fillRect(0, VIEW_H - HINT_H, VIEW_W, 1);
  ctx.font = '13px ' + SANS;
  ctx.fillStyle = PALETTE.muted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const sneak = world.player.sneaking ? 'Sneaking — slower, harder to see' : 'WASD or arrows to move · Shift to sneak · Esc to pause';
  ctx.fillText(world.message || sneak, VIEW_W / 2, VIEW_H - HINT_H / 2);
  ctx.restore();
}

/** A full-screen dim, for menus over the level. */
export function dimScreen(ctx) {
  ctx.save();
  ctx.fillStyle = PALETTE.dim;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

export function drawTitle(ctx, mouse, clicks, onStart) {
  const start = makeButton(VIEW_W / 2 - 110, 470, 220, 48, 'Begin the night', 'start');
  drawButton(ctx, start, mouse);
  centerText(ctx, 'The Quiet Wing', 250, '64px ' + SERIF, PALETTE.text);
  thinRule(ctx, 282, PALETTE.rugEdge);
  centerText(ctx, 'A museum at night. One misfiled seal. Four guards who know every footstep.', 330, '17px ' + SANS, PALETTE.muted);
  centerText(ctx, 'Slip through the galleries, take the seal, and leave by the service door — unseen.', 358, '17px ' + SANS, PALETTE.muted);
  centerText(ctx, 'WASD or arrows to move · Shift to sneak · Mouse for menus', 420, '14px ' + SANS, PALETTE.muted);
  if (clickHit(start, clicks)) onStart();
  return start;
}

export function drawIntro(ctx, world, mouse, clicks, onBegin) {
  const level = world.level;
  const begin = makeButton(VIEW_W / 2 - 110, 440, 220, 48, 'Enter the wing', 'begin');
  drawButton(ctx, begin, mouse);
  centerText(ctx, `Wing ${level.numeral} — ${level.name}`, 250, '44px ' + SERIF, PALETTE.text);
  thinRule(ctx, 282, PALETTE.rugEdge);
  centerText(ctx, level.subtitle, 330, '18px ' + SANS, PALETTE.text);
  centerText(ctx, level.tip, 362, '15px ' + SANS, PALETTE.muted);
  if (clickHit(begin, clicks)) onBegin();
  return begin;
}

export function drawPaused(ctx, mouse, clicks, onResume, onTitle) {
  const resume = makeButton(VIEW_W / 2 - 110, 380, 220, 48, 'Resume', 'resume');
  const title = makeButton(VIEW_W / 2 - 110, 442, 220, 48, 'Back to title', 'title');
  drawButton(ctx, resume, mouse);
  drawButton(ctx, title, mouse);
  centerText(ctx, 'Paused', 250, '48px ' + SERIF, PALETTE.text);
  thinRule(ctx, 282, PALETTE.rugEdge);
  centerText(ctx, 'The guards wait. So does the seal.', 330, '16px ' + SANS, PALETTE.muted);
  if (clickHit(resume, clicks)) onResume();
  if (clickHit(title, clicks)) onTitle();
  return [resume, title];
}

export function drawCaught(ctx, world, mouse, clicks, onRetry, onTitle) {
  const retry = makeButton(VIEW_W / 2 - 110, 400, 220, 48, 'Try this wing again', 'retry');
  const title = makeButton(VIEW_W / 2 - 110, 462, 220, 48, 'Back to title', 'title');
  drawButton(ctx, retry, mouse);
  drawButton(ctx, title, mouse);
  centerText(ctx, 'Spotted.', 250, '52px ' + SERIF, PALETTE.alert);
  thinRule(ctx, 282, PALETTE.rugEdge);
  centerText(ctx, 'A guard reached you. The wing resets — the patrols do not change.', 330, '16px ' + SANS, PALETTE.muted);
  centerText(ctx, `Time in the wing: ${formatTime(world.time)} · Times spotted: ${world.spottedCount}`, 362, '14px ' + SANS, PALETTE.muted);
  if (clickHit(retry, clicks)) onRetry();
  if (clickHit(title, clicks)) onTitle();
  return [retry, title];
}

export function drawLevelClear(ctx, world, mouse, clicks, onNext) {
  const next = makeButton(VIEW_W / 2 - 110, 420, 220, 48, 'Next wing', 'next');
  drawButton(ctx, next, mouse);
  centerText(ctx, 'Out the service door.', 250, '44px ' + SERIF, PALETTE.exit);
  thinRule(ctx, 282, PALETTE.rugEdge);
  centerText(ctx, `Wing ${world.level.numeral} cleared in ${formatTime(world.time)}.`, 330, '17px ' + SANS, PALETTE.text);
  centerText(ctx, `Times spotted: ${world.spottedCount}`, 362, '15px ' + SANS, PALETTE.muted);
  if (clickHit(next, clicks)) onNext();
  return next;
}

export function drawWon(ctx, world, mouse, clicks, onAgain) {
  const again = makeButton(VIEW_W / 2 - 110, 430, 220, 48, 'Play again', 'again');
  drawButton(ctx, again, mouse);
  centerText(ctx, 'The seal is yours.', 240, '52px ' + SERIF, PALETTE.artifact);
  thinRule(ctx, 272, PALETTE.rugEdge);
  centerText(ctx, 'Three wings, no alarms raised that stuck. The museum never knew you were there.', 322, '17px ' + SANS, PALETTE.text);
  centerText(ctx, `Total time ${formatTime(world.time)} · Times spotted: ${world.spottedCount}`, 362, '15px ' + SANS, PALETTE.muted);
  centerText(ctx, 'The Quiet Wing — an original game, made for the make.fun stealth bounty.', 396, '13px ' + SANS, PALETTE.muted);
  if (clickHit(again, clicks)) onAgain();
  return again;
}

export { STATUS_TITLE, STATUS_INTRO, STATUS_PAUSED, STATUS_CAUGHT, STATUS_LEVEL_CLEAR, STATUS_WON };
