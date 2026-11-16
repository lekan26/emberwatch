export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type, duration, vol = 0.1, endFreq = null) {
    if (this.muted || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);
      }

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Ignore audio execution errors
    }
  }

  playNoise(duration, vol = 0.1) {
    if (this.muted || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch (e) {}
  }

  playBuild() {
    this.playTone(440, 'sine', 0.15, 0.12, 880);
  }

  playCannon() {
    this.playTone(120, 'triangle', 0.2, 0.2, 40);
  }

  playFrost() {
    this.playTone(880, 'sine', 0.25, 0.1, 1320);
  }

  playStorm() {
    this.playNoise(0.18, 0.15);
    this.playTone(300, 'sawtooth', 0.15, 0.08, 150);
  }

  playThorn() {
    this.playTone(520, 'square', 0.1, 0.08, 200);
  }

  playHit() {
    this.playTone(600, 'triangle', 0.05, 0.06);
  }

  playDeath() {
    this.playNoise(0.2, 0.12);
  }

  playLeak() {
    this.playTone(90, 'sawtooth', 0.3, 0.25, 30);
  }

  playWaveStart() {
    this.playTone(330, 'sawtooth', 0.4, 0.15, 660);
    setTimeout(() => this.playTone(660, 'sawtooth', 0.4, 0.15, 880), 150);
  }

  playWaveClear() {
    this.playTone(523.25, 'sine', 0.2, 0.15);
    setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.15), 100);
    setTimeout(() => this.playTone(783.99, 'sine', 0.3, 0.15), 200);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'triangle', 0.3, 0.18), idx * 150);
    });
  }

  playGameOver() {
    const notes = [300, 250, 200, 140];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'sawtooth', 0.35, 0.2), idx * 200);
    });
  }

  playUI() {
    this.playTone(750, 'sine', 0.08, 0.08);
  }
}

export const audio = new AudioManager();
