// Shared tuning and the visual world of The Quiet Wing.
// One job: every number and colour the rest of the game reads.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 56;
export const HINT_H = 48;

// The playable floor, in canvas pixels. Levels are defined in this local space.
export const WORLD = { x: 16, y: 64, w: 1248, h: 600 };

// A night museum: ink-navy floors, warm lantern amber, shadow teal.
// Deliberately not the cream-and-terracotta default, and no purple gradient.
export const PALETTE = {
  ink: '#0d1320',
  floorA: '#161d2e',
  floorB: '#1a2334',
  floorLine: '#232c40',
  rug: '#1f2a3d',
  rugEdge: '#8a6d3b',
  wall: '#2a3350',
  wallTop: '#46557c',
  wallEdge: '#141a29',
  caseGlass: '#7fb4c7',
  caseFrame: '#8a6d3b',
  caseBase: '#241f1a',
  planter: '#3f7d5a',
  planterPot: '#5a4632',
  rope: '#a33b3b',
  ropePost: '#c9a227',
  crate: '#6b4f2a',
  crateEdge: '#4a3519',
  shelf: '#3a2f26',
  shelfEdge: '#241c15',
  lantern: '#e8a33d',
  lanternCore: '#f7d774',
  coneCalm: 'rgba(242, 198, 109, 0.20)',
  coneCalmEdge: 'rgba(242, 198, 109, 0.55)',
  coneSuspicious: 'rgba(232, 163, 61, 0.34)',
  coneSuspiciousEdge: 'rgba(232, 163, 61, 0.85)',
  coneAlarm: 'rgba(229, 72, 77, 0.38)',
  coneAlarmEdge: 'rgba(229, 72, 77, 0.9)',
  guard: '#232c42',
  guardTrim: '#46557c',
  guardSkin: '#d9b48f',
  player: '#e8e4d8',
  playerScarf: '#3fa98c',
  playerShadow: '#2e5e52',
  exit: '#4cc38a',
  exitDoor: '#123527',
  artifact: '#f2c66d',
  alert: '#e5484d',
  suspicion: '#e8a33d',
  text: '#e8e4d8',
  muted: '#9aa5b8',
  hudBar: '#0a0e18',
  hudLine: '#2a3350',
  dim: 'rgba(6, 8, 14, 0.74)',
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 138,
  sneakSpeed: 72,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 58,
  suspiciousSpeed: 82,
  alarmSpeed: 110,
  viewRange: 252,
  viewHalfAngle: (38 * Math.PI) / 180, // 76-degree cone
  pauseAtWaypoint: 1.2,
  catchDistance: 26,
};

// Detection meter 0..1. Fills while any guard sees the player, drains in the dark.
export const DETECTION = {
  fillBase: 0.5, // per second, point-blank in the light
  fillFar: 0.30, // multiplier at the edge of a cone
  sneakFactor: 0.45,
  shadowFactor: 0.5,
  lanternFactor: 1.45,
  drain: 0.26, // per second while unseen
  drainInAlarm: 0.10,
  nearMissAt: 0.65, // crossing this upward fires the alarm pulse
  alarmAt: 1.0,
  alarmLength: 5.0, // seconds of chase before guards give up, if sight is broken
  loseSightGrace: 4.0,
};

export const STEP = 1 / 60;
