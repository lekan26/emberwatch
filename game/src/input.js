import { audio } from './audio.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, clicked: false };
    this.keys = {};
    this.queue = [];

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouse.x = (e.clientX - rect.left) * scaleX;
    this.mouse.y = (e.clientY - rect.top) * scaleY;
    this.mouse.worldX = this.mouse.x;
    this.mouse.worldY = this.mouse.y;
  }

  onMouseDown(e) {
    audio.init();
    this.onMouseMove(e);
    this.mouse.down = true;
    this.mouse.clicked = true;
    this.queue.push('click');
  }

  onKeyDown(e) {
    audio.init();
    const code = e.code;
    const key = e.key;
    if (code === 'Space' || key === ' ') {
      this.queue.push('confirm');
      e.preventDefault();
    } else if (code === 'Enter') {
      this.queue.push('confirm');
    } else if (code === 'KeyP' || code === 'Escape') {
      this.queue.push('pause');
      e.preventDefault();
    } else if (code === 'KeyR') {
      this.queue.push('restart');
    } else if (code === 'KeyM') {
      this.queue.push('mute');
      e.preventDefault();
    } else if (code === 'Digit1') {
      this.queue.push('select_1');
    } else if (code === 'Digit2') {
      this.queue.push('select_2');
    } else if (code === 'Digit3') {
      this.queue.push('select_3');
    } else if (code === 'Digit4') {
      this.queue.push('select_4');
    } else if (code === 'KeyU') {
      this.queue.push('upgrade');
    } else if (code === 'KeyX') {
      this.queue.push('sell');
    }
  }

  poll() {
    const actions = [...this.queue];
    this.queue = [];
    const clicked = this.mouse.clicked;
    this.mouse.clicked = false;
    return {
      actions,
      mouse: this.mouse,
      clicked
    };
  }
}
