// Guard patrol AI. One job: walk a route, pause, look, and react.
// States: patrol -> suspicious (go look where you last saw something)
// -> alarm (chase the player) -> return (walk back to the route).

import { GUARD } from './config.js';
import { angleDifference, resolveCircleRect } from './sight.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALARM = 'alarm';
export const GUARD_RETURN = 'return';

export function makeGuard(def, index) {
  const start = def.waypoints[0];
  return {
    index,
    x: start[0],
    y: start[1],
    facing: def.waypoints.length > 1
      ? Math.atan2(def.waypoints[1][1] - start[1], def.waypoints[1][0] - start[0])
      : 0,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    pause: def.pause ?? GUARD.pauseAtWaypoint,
    speed: def.speed ?? GUARD.patrolSpeed,
    state: GUARD_PATROL,
    pauseTimer: 0,
    lookTimer: 0,
    lastSeen: null,
    returnTarget: null,
    stepPhase: index * 0.37,
    stepTimer: 0,
    moving: false,
    turnSpeed: 5.5,
  };
}

function turnToward(guard, targetAngle, dt) {
  let d = targetAngle - guard.facing;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const step = guard.turnSpeed * dt;
  guard.facing += Math.max(-step, Math.min(step, d));
}

/** Walk toward (tx, ty) at `speed`, sliding along walls. Returns true on arrival. */
function walkToward(guard, tx, ty, speed, dt, solids) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const vx = (dx / dist) * speed * dt;
  const vy = (dy / dist) * speed * dt;
  guard.x += vx;
  guard.y += vy;
  for (const solid of solids) {
    const fixed = resolveCircleRect(guard.x, guard.y, GUARD.radius, solid);
    if (fixed) {
      guard.x = fixed.x;
      guard.y = fixed.y;
    }
  }
  guard.moving = true;
  turnToward(guard, Math.atan2(dy, dx), dt);
  return Math.hypot(tx - guard.x, ty - guard.y) < 6;
}

/**
 * Advance one guard. `seen` is how visible the player is to this guard right
 * now (0..1, from world.js); `player` is the player's position.
 * Returns 'spotted' the moment this guard first locks on, else null.
 */
export function updateGuard(guard, dt, seen, player, solids) {
  guard.moving = false;
  let event = null;

  if (seen > 0.12) {
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.state === GUARD_PATROL || guard.state === GUARD_RETURN) {
      guard.state = GUARD_SUSPICIOUS;
      guard.lookTimer = 0;
      event = 'noticed';
    }
  }

  if (guard.state === GUARD_PATROL) {
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      // A pausing guard slowly scans: sweep the facing back and forth.
      guard.facing += Math.sin(guard.pauseTimer * 2.2) * 0.35 * dt;
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      if (walkToward(guard, target[0], target[1], guard.speed, dt, solids)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = guard.pause;
      }
    }
  } else if (guard.state === GUARD_SUSPICIOUS) {
    if (guard.lastSeen) {
      const arrived = walkToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.suspiciousSpeed, dt, solids);
      if (arrived) {
        guard.lookTimer += dt;
        guard.facing += 1.6 * dt; // look around the spot
        if (guard.lookTimer > 2.0) {
          guard.state = GUARD_RETURN;
          guard.returnTarget = nearestWaypoint(guard);
        }
      }
    } else {
      guard.state = GUARD_RETURN;
      guard.returnTarget = nearestWaypoint(guard);
    }
  } else if (guard.state === GUARD_ALARM) {
    // Chase the player's live position while seen; otherwise the last seen spot.
    const target = seen > 0.12 ? { x: player.x, y: player.y } : guard.lastSeen;
    if (target) walkToward(guard, target.x, target.y, GUARD.alarmSpeed, dt, solids);
  } else if (guard.state === GUARD_RETURN) {
    const target = guard.returnTarget || nearestWaypoint(guard);
    if (walkToward(guard, target[0], target[1], GUARD.patrolSpeed, dt, solids)) {
      guard.waypointIndex = nearestWaypointIndex(guard);
      guard.state = GUARD_PATROL;
      guard.pauseTimer = guard.pause * 0.5;
      guard.lastSeen = null;
    }
  }

  // Footstep timing: a step every stride, scaled by speed.
  if (guard.moving) {
    guard.stepTimer -= dt;
    if (guard.stepTimer <= 0) {
      guard.stepTimer = 0.42 * (GUARD.patrolSpeed / currentSpeed(guard));
      guard.stepPhase += 1;
    }
  }
  return event;
}

function currentSpeed(guard) {
  if (guard.state === GUARD_ALARM) return GUARD.alarmSpeed;
  if (guard.state === GUARD_SUSPICIOUS) return GUARD.suspiciousSpeed;
  return GUARD.patrolSpeed;
}

function nearestWaypoint(guard) {
  let best = guard.waypoints[0];
  let bestDist = Infinity;
  for (const point of guard.waypoints) {
    const d = Math.hypot(point[0] - guard.x, point[1] - guard.y);
    if (d < bestDist) {
      bestDist = d;
      best = point;
    }
  }
  return best;
}

function nearestWaypointIndex(guard) {
  let bestIndex = 0;
  let bestDist = Infinity;
  guard.waypoints.forEach((point, i) => {
    const d = Math.hypot(point[0] - guard.x, point[1] - guard.y);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  });
  return (bestIndex + 1) % guard.waypoints.length;
}

/** Cone colour/width state for rendering: calm, suspicious, alarm. */
export function guardMood(guard, detection) {
  if (guard.state === GUARD_ALARM) return 'alarm';
  if (guard.state === GUARD_SUSPICIOUS || detection > 0.35) return 'suspicious';
  return 'calm';
}

/** A suspicious guard focuses: narrower cone. An alarmed guard sweeps wide. */
export function guardConeHalfAngle(guard, detection) {
  const mood = guardMood(guard, detection);
  if (mood === 'suspicious') return GUARD.viewHalfAngle * 0.62;
  if (mood === 'alarm') return GUARD.viewHalfAngle * 1.15;
  return GUARD.viewHalfAngle;
}

export { angleDifference };
