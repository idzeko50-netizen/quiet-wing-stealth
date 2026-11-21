// Geometry for sight: segment-vs-rectangle tests, line of sight, and
// whether a point sits inside a guard's vision cone. One job: answer
// "can this guard see that point?" with walls and tall cover in the way.

/** True when the segment (x1,y1)-(x2,y2) touches or crosses the rect. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Liang-Barsky clipping: find the part of the segment inside the rect.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rect.x, rect.x + rect.w - x1, y1 - rect.y, rect.y + rect.h - y1];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

/** True when no sight-blocking rect stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

/** Smallest absolute angle between two headings, 0..PI. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

/**
 * How visible `point` is to a guard at (gx, gy) facing `facing`:
 * 0 when out of range, outside the cone, or behind cover; 1 point-blank,
 * falling with distance. `blockers` are the rects that stop sight.
 */
export function coneVisibility(gx, gy, facing, range, halfAngle, point, blockers) {
  const dx = point.x - gx;
  const dy = point.y - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (dist > 1 && angleDifference(Math.atan2(dy, dx), facing) > halfAngle) return 0;
  if (!hasLineOfSight(gx, gy, point.x, point.y, blockers)) return 0;
  return 1 - (dist / range) * 0.65;
}

/** True when the point lies inside any circle in `lights` (lantern pools). */
export function inLight(x, y, lights) {
  for (let i = 0; i < lights.length; i += 1) {
    const light = lights[i];
    if (Math.hypot(x - light.x, y - light.y) < light.r * 0.85) return true;
  }
  return false;
}

/** Circle-vs-rect collision: push the circle out of the rect, return corrected centre. */
export function resolveCircleRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= radius * radius) return null;
  if (distSq === 0) {
    // Centre inside the rect: push out along the shortest side.
    const left = cx - rect.x;
    const right = rect.x + rect.w - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: rect.x - radius, y: cy };
    if (min === right) return { x: rect.x + rect.w + radius, y: cy };
    if (min === top) return { x: cx, y: rect.y - radius };
    return { x: cx, y: rect.y + rect.h + radius };
  }
  const dist = Math.sqrt(distSq);
  return { x: nearestX + (dx / dist) * radius, y: nearestY + (dy / dist) * radius };
}
