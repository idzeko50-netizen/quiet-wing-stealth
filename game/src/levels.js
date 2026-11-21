// The three wings of the museum. One job: the static shape of each level —
// walls, cover, lanterns, patrol routes, where the seal sits and where the
// service door is. Coordinates are local to the WORLD rect in config.js.
// Cover kinds: 'case' and 'shelf' are tall and block sight; 'planter',
// 'rope' and 'crate' are low and block movement only.

function borderWalls() {
  const t = 14;
  const W = 1248;
  const H = 600;
  return [
    { x: 0, y: 0, w: W, h: t },
    { x: 0, y: H - t, w: W, h: t },
    { x: 0, y: 0, w: t, h: H },
    { x: W - t, y: 0, w: t, h: H },
  ];
}

export const LEVELS = [
  {
    id: 'gallery',
    numeral: 'I',
    name: 'The Quiet Wing',
    subtitle: 'Two guards. Learn their rhythm, then cross.',
    tip: 'Lantern light exposes you. Shadow is your friend — hold Shift to sneak.',
    artifactName: 'the Lumen Seal',
    playerStart: { x: 90, y: 540 },
    artifact: { x: 1150, y: 90 },
    exit: { x: 58, y: 58, w: 76, h: 46 },
    walls: [
      ...borderWalls(),
    ],
    cover: [
      { kind: 'case', x: 500, y: 180, w: 120, h: 60 },
      { kind: 'case', x: 628, y: 180, w: 120, h: 60 },
      { kind: 'case', x: 500, y: 360, w: 120, h: 60 },
      { kind: 'case', x: 628, y: 360, w: 120, h: 60 },
      { kind: 'planter', x: 220, y: 140, w: 44, h: 44 },
      { kind: 'planter', x: 1020, y: 140, w: 44, h: 44 },
      { kind: 'planter', x: 220, y: 420, w: 44, h: 44 },
      { kind: 'planter', x: 1020, y: 420, w: 44, h: 44 },
      { kind: 'rope', x: 340, y: 296, w: 160, h: 8 },
      { kind: 'rope', x: 788, y: 296, w: 160, h: 8 },
      { kind: 'crate', x: 100, y: 280, w: 56, h: 56 },
      { kind: 'crate', x: 1100, y: 280, w: 56, h: 56 },
    ],
    lanterns: [
      { x: 624, y: 90, r: 110 },
      { x: 624, y: 510, r: 110 },
      { x: 200, y: 300, r: 90 },
      { x: 1048, y: 300, r: 90 },
    ],
    guards: [
      {
        waypoints: [[300, 120], [950, 120], [950, 220], [300, 220]],
        pause: 1.2, speed: 58,
      },
      {
        waypoints: [[300, 480], [950, 480], [950, 380], [300, 380]],
        pause: 1.2, speed: 58,
      },
    ],
  },
  {
    id: 'archive',
    numeral: 'II',
    name: 'The Archive',
    subtitle: 'Three guards. The shelves hide you — and them.',
    tip: 'Tall shelves block sight. Slip between them while a guard pauses.',
    artifactName: 'the Lumen Seal',
    playerStart: { x: 90, y: 300 },
    artifact: { x: 1150, y: 300 },
    exit: { x: 58, y: 58, w: 76, h: 46 },
    walls: [...borderWalls()],
    cover: [
      { kind: 'shelf', x: 300, y: 100, w: 60, h: 380 },
      { kind: 'shelf', x: 624, y: 100, w: 60, h: 380 },
      { kind: 'shelf', x: 948, y: 100, w: 60, h: 380 },
      { kind: 'crate', x: 140, y: 140, w: 56, h: 56 },
      { kind: 'crate', x: 140, y: 420, w: 56, h: 56 },
      { kind: 'crate', x: 1050, y: 140, w: 56, h: 56 },
      { kind: 'crate', x: 1050, y: 420, w: 56, h: 56 },
      { kind: 'planter', x: 470, y: 500, w: 44, h: 44 },
      { kind: 'planter', x: 790, y: 500, w: 44, h: 44 },
    ],
    lanterns: [
      { x: 180, y: 300, r: 100 },
      { x: 624, y: 60, r: 100 },
      { x: 624, y: 540, r: 100 },
      { x: 1068, y: 300, r: 100 },
    ],
    guards: [
      { waypoints: [[180, 90], [1068, 90]], pause: 1.0, speed: 62 },
      { waypoints: [[180, 510], [1068, 510]], pause: 1.0, speed: 62 },
      { waypoints: [[624, 180], [624, 420]], pause: 1.5, speed: 56 },
    ],
  },
  {
    id: 'vault',
    numeral: 'III',
    name: 'The Vault',
    subtitle: 'Four guards, and the seal is behind them all.',
    tip: 'Patience wins this wing. Wait for the pause, then move.',
    artifactName: 'the Lumen Seal',
    playerStart: { x: 90, y: 540 },
    artifact: { x: 1150, y: 60 },
    exit: { x: 58, y: 58, w: 76, h: 46 },
    walls: [...borderWalls()],
    cover: [
      { kind: 'case', x: 400, y: 140, w: 100, h: 60 },
      { kind: 'case', x: 748, y: 140, w: 100, h: 60 },
      { kind: 'case', x: 400, y: 400, w: 100, h: 60 },
      { kind: 'case', x: 748, y: 400, w: 100, h: 60 },
      { kind: 'case', x: 574, y: 260, w: 100, h: 80 },
      { kind: 'crate', x: 180, y: 180, w: 56, h: 56 },
      { kind: 'crate', x: 1012, y: 180, w: 56, h: 56 },
      { kind: 'crate', x: 180, y: 360, w: 56, h: 56 },
      { kind: 'crate', x: 1012, y: 360, w: 56, h: 56 },
      { kind: 'rope', x: 300, y: 300, w: 120, h: 8 },
      { kind: 'rope', x: 828, y: 300, w: 120, h: 8 },
      { kind: 'planter', x: 624, y: 90, w: 44, h: 44 },
      { kind: 'planter', x: 624, y: 470, w: 44, h: 44 },
    ],
    lanterns: [
      { x: 300, y: 120, r: 100 },
      { x: 948, y: 120, r: 100 },
      { x: 300, y: 480, r: 100 },
      { x: 948, y: 480, r: 100 },
      { x: 624, y: 300, r: 120 },
    ],
    guards: [
      { waypoints: [[250, 100], [1000, 100]], pause: 0.8, speed: 66 },
      { waypoints: [[250, 500], [1000, 500]], pause: 0.8, speed: 66 },
      { waypoints: [[400, 300], [850, 300]], pause: 1.0, speed: 60 },
      { waypoints: [[624, 140], [624, 460]], pause: 1.2, speed: 58 },
    ],
  },
];

/** Tall cover blocks sight as well as movement; low cover blocks movement only. */
export function isTallCover(kind) {
  return kind === 'case' || kind === 'shelf';
}
