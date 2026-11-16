import { CONFIG } from './config.js';
import { updateEnemies, spawnEnemy } from './enemies.js';
import { tryPlaceTower, upgradeTower, sellTower, updateTowers } from './towers.js';
import { audio } from './audio.js';

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.gold = CONFIG.START_GOLD;
    this.lives = CONFIG.START_LIVES;
    this.wave = 1;
    this.score = 0;
    this.state = 'title'; // title, play, paused, gameover, victory
    this.selectedTowerType = 'cannon';
    this.selectedPlotIndex = null;
    this.waveBannerTimer = 0;

    this.path = [
      { x: 0, y: 360 },
      { x: 220, y: 360 },
      { x: 340, y: 220 },
      { x: 500, y: 220 },
      { x: 620, y: 500 },
      { x: 800, y: 500 },
      { x: 920, y: 360 },
      { x: 1080, y: 360 }
    ];

    this.plots = [
      { id: 0, x: 150, y: 260, tower: null },
      { id: 1, x: 280, y: 460, tower: null },
      { id: 2, x: 280, y: 120, tower: null },
      { id: 3, x: 420, y: 340, tower: null },
      { id: 4, x: 420, y: 110, tower: null },
      { id: 5, x: 550, y: 610, tower: null },
      { id: 6, x: 550, y: 380, tower: null },
      { id: 7, x: 720, y: 610, tower: null },
      { id: 8, x: 720, y: 380, tower: null },
      { id: 9, x: 850, y: 240, tower: null },
      { id: 10, x: 850, y: 480, tower: null },
      { id: 11, x: 980, y: 240, tower: null }
    ];

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.fireflies = [];

    // Initialize fireflies
    for (let i = 0; i < 25; i++) {
      this.fireflies.push({
        x: Math.random() * CONFIG.WIDTH,
        y: Math.random() * CONFIG.HEIGHT,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        size: 1.5 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        pulseSpeed: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.waveState = 'waiting'; // waiting, spawning, combat
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.enemiesSpawnedTotal = 0;
    this.enemiesDefeated = 0;
  }

  startWave() {
    if (this.waveState !== 'waiting' || this.state !== 'play') return;
    const waveDef = CONFIG.WAVES[this.wave - 1];
    if (!waveDef) return;
    this.waveState = 'spawning';
    this.spawnQueue = [];
    for (const group of waveDef.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push(group.type);
      }
    }
    this.spawnTimer = 0;
    this.enemiesSpawnedTotal = 0;
    this.waveBannerTimer = 3.5;
    audio.playWaveStart();
  }

  step(dt, input) {
    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer -= dt;
    }

    // Update fireflies
    for (const ff of this.fireflies) {
      ff.x += ff.vx * dt;
      ff.y += ff.vy * dt;
      ff.phase += ff.pulseSpeed * dt;
      if (ff.x < 0) ff.x = CONFIG.WIDTH;
      if (ff.x > CONFIG.WIDTH) ff.x = 0;
      if (ff.y < 0) ff.y = CONFIG.HEIGHT;
      if (ff.y > CONFIG.HEIGHT) ff.y = 0;
    }

    // Handle input actions based on state
    for (const action of input.actions) {
      if (action === 'pause') {
        if (this.state === 'play') this.state = 'paused';
        else if (this.state === 'paused') this.state = 'play';
      } else if (action === 'restart') {
        this.reset();
        this.state = 'play';
      } else if (action === 'mute') {
        audio.toggleMute();
      } else if (action === 'confirm') {
        if (this.state === 'title') {
          this.state = 'play';
        } else if (this.state === 'gameover' || this.state === 'victory') {
          this.reset();
          this.state = 'play';
        } else if (this.state === 'play' && this.waveState === 'waiting') {
          this.startWave();
        }
      } else if (action === 'select_1') {
        this.selectedTowerType = 'cannon';
      } else if (action === 'select_2') {
        this.selectedTowerType = 'frost';
      } else if (action === 'select_3') {
        this.selectedTowerType = 'storm';
      } else if (action === 'select_4') {
        this.selectedTowerType = 'thorn';
      } else if (action === 'upgrade') {
        if (this.selectedPlotIndex !== null) {
          const plot = this.plots.find(p => p.id === this.selectedPlotIndex);
          if (plot && plot.tower) {
            upgradeTower(this, plot.tower);
          }
        }
      } else if (action === 'sell') {
        if (this.selectedPlotIndex !== null) {
          const plot = this.plots.find(p => p.id === this.selectedPlotIndex);
          if (plot && plot.tower) {
            sellTower(this, plot);
          }
        }
      }
    }

    if (this.state !== 'play') return;

    // Handle mouse clicks for building / selecting / buttons / mute
    if (input.clicked) {
      const mx = input.mouse.worldX;
      const my = input.mouse.worldY;

      // Check mute button click in HUD (top right: x: 1100 to 1250, y: 16 to 48)
      if (mx >= 1100 && mx <= 1250 && my >= 16 && my <= 48) {
        audio.toggleMute();
        return;
      }

      // Check build bar clicks
      let clickedBuildBar = false;
      const barX = 140;
      const barY = CONFIG.HEIGHT - 80;
      const barW = 1000;
      if (mx >= barX && mx <= barX + barW && my >= barY && my <= barY + 70) {
        clickedBuildBar = true;
        const slotWidth = barW / 4;
        const slot = Math.floor((mx - barX) / slotWidth);
        const types = ['cannon', 'frost', 'storm', 'thorn'];
        if (types[slot]) {
          this.selectedTowerType = types[slot];
          audio.playUI();
        }
      }

      // Check upgrade/sell button clicks if tower selected and panel active
      let clickedPanel = false;
      if (this.selectedPlotIndex !== null) {
        const plot = this.plots.find(p => p.id === this.selectedPlotIndex);
        if (plot && plot.tower) {
          if (mx >= 1020 && mx <= 1120 && my >= CONFIG.HEIGHT - 130 && my <= CONFIG.HEIGHT - 94) {
            clickedPanel = true;
            upgradeTower(this, plot.tower);
          } else if (mx >= 1140 && mx <= 1240 && my >= CONFIG.HEIGHT - 130 && my <= CONFIG.HEIGHT - 94) {
            clickedPanel = true;
            sellTower(this, plot);
          }
        }
      }

      if (!clickedBuildBar && !clickedPanel) {
        let clickedPlot = null;
        for (const plot of this.plots) {
          const dx = mx - plot.x;
          const dy = my - plot.y;
          if (dx * dx + dy * dy <= 30 * 30) {
            clickedPlot = plot;
            break;
          }
        }

        if (clickedPlot) {
          if (clickedPlot.tower) {
            this.selectedPlotIndex = clickedPlot.id;
            audio.playUI();
          } else {
            tryPlaceTower(this, clickedPlot);
          }
        } else {
          if (my > 64) {
            this.selectedPlotIndex = null;
          }
        }
      }
    }

    // Update enemies
    updateEnemies(this, dt);

    // Update towers and projectiles
    updateTowers(this, dt);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 25 * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Check wave clear
    if (this.waveState === 'combat' && this.enemies.length === 0 && (!this.spawnQueue || this.spawnQueue.length === 0)) {
      const waveDef = CONFIG.WAVES[this.wave - 1];
      const baseBonus = waveDef.bonus + this.wave * 5;
      const interest = Math.floor(this.gold * 0.1);
      const totalBonus = baseBonus + interest;
      this.gold += totalBonus;
      this.addFloatingText(640, 340, `Wave ${this.wave} Cleared! +${totalBonus}g`, CONFIG.PALETTE.textGold);
      audio.playWaveClear();
      
      if (this.wave >= CONFIG.WAVES.length) {
        this.state = 'victory';
        audio.playVictory();
      } else {
        this.wave++;
        this.waveState = 'waiting';
      }
    }
  }

  getTotalPathLength() {
    let len = 0;
    for (let p = 0; p < this.path.length - 1; p++) {
      len += Math.hypot(this.path[p+1].x - this.path[p].x, this.path[p+1].y - this.path[p].y);
    }
    return len;
  }

  addParticle(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color
      });
    }
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({
      x, y, text, color, life: 1.2
    });
  }

  reset() {
    this.gold = CONFIG.START_GOLD;
    this.lives = CONFIG.START_LIVES;
    this.wave = 1;
    this.score = 0;
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.waveState = 'waiting';
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.enemiesSpawnedTotal = 0;
    this.enemiesDefeated = 0;
    this.selectedPlotIndex = null;
    this.waveBannerTimer = 0;
    for (const plot of this.plots) {
      plot.tower = null;
    }
  }
}
