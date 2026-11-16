import { CONFIG } from './config.js';
import { World } from './world.js';
import { Render } from './render.js';
import { Input } from './input.js';
import { runAutopilot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = parseInt(params.get('seed') ?? '1', 10);

const world = new World(seed);
window.emberwatch = world; // Expose world for testing

const render = new Render(ctx);
const input = new Input(canvas);

if (shot) {
  runAutopilot(world, shot, 120);
  render.draw(world, { mouse: { x: -1000, y: -1000 } });
  // Paint twice for robustness
  requestAnimationFrame(() => {
    render.draw(world, { mouse: { x: -1000, y: -1000 } });
    window.shotReady = true;
  });
} else {
  let lastTime = performance.now();
  const fixedDt = 1 / 60;
  let accumulator = 0;

  function gameLoop(now) {
    const dt = Math.min(1, (now - lastTime) / 1000);
    lastTime = now;

    // Pause if document hidden
    if (!document.hidden) {
      accumulator += dt;
      const polledInput = input.poll();

      while (accumulator >= fixedDt) {
        world.step(fixedDt, polledInput);
        accumulator -= fixedDt;
        // consume polled input only on first sub-step
        polledInput.actions = [];
        polledInput.clicked = false;
      }

      render.draw(world, input);
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}
