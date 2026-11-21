// Keyboard and mouse. One job: turn raw events into a movement vector,
// a sneak flag, and clicks in canvas coordinates.

export function makeInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    clickQueue: [],
    anyKeyPressed: false,
    pausePressed: false,
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };

  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (action) {
      input.keys.add(action);
      event.preventDefault();
    }
    if (event.code === 'Enter' || event.code === 'Space') input.anyKeyPressed = true;
    // Edge-triggered: a quick press must survive until the next frame reads it.
    if (event.code === 'Escape' || event.code === 'KeyP') input.pausePressed = true;
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    input.clickQueue.push({ x: input.mouseX, y: input.mouseY });
  });

  return input;
}

/** The movement vector for this frame: -1..1 on each axis, plus sneak. */
export function readMovement(input) {
  const x = (input.keys.has('right') ? 1 : 0) - (input.keys.has('left') ? 1 : 0);
  const y = (input.keys.has('down') ? 1 : 0) - (input.keys.has('up') ? 1 : 0);
  return { x, y, sneak: input.keys.has('sneak') };
}

/** Take and clear the queued clicks (consumed once, by the UI). */
export function takeClicks(input) {
  const clicks = input.clickQueue;
  input.clickQueue = [];
  return clicks;
}

export function takeAnyKey(input) {
  const pressed = input.anyKeyPressed;
  input.anyKeyPressed = false;
  return pressed;
}

export function takePauseKey(input) {
  if (!input.pausePressed) return false;
  input.pausePressed = false;
  return true;
}
