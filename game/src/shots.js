import { CONFIG } from './config.js';
import { tryPlaceTower, upgradeTower } from './towers.js';

export function runAutopilot(world, shotType, stepCount) {
  if (shotType === 'start') {
    world.state = 'title';
    // Place at most 2 cannons for ambiance, keeping gold positive (120 - 100 = 20)
    const plotIndices = [0, 1];
    for (const idx of plotIndices) {
      const plot = world.plots[idx];
      if (plot) {
        world.selectedTowerType = 'cannon';
        tryPlaceTower(world, plot);
      }
    }
    world.selectedPlotIndex = null; // Clear selection on title shot
    // Simulate a few steps for visual ambiance without running wave
    const dt = 1 / 60;
    for (let i = 0; i < 30; i++) {
      world.step(dt, { actions: [], mouse: { x: -1000, y: -1000 }, clicked: false });
    }
  } else if (shotType === 'play') {
    world.state = 'play';
    // Place at most 2 cannons
    const plotIndices = [0, 1];
    for (const idx of plotIndices) {
      const plot = world.plots[idx];
      if (plot) {
        world.selectedTowerType = 'cannon';
        tryPlaceTower(world, plot);
      }
    }
    world.selectedPlotIndex = null;
    world.startWave();
    // Simulate ~8 seconds (480 steps at 60fps) so mid-wave shows wisps and firing towers
    const dt = 1 / 60;
    for (let i = 0; i < 480; i++) {
      world.step(dt, { actions: [], mouse: { x: -1000, y: -1000 }, clicked: false });
    }
  } else if (shotType === 'build') {
    world.state = 'play';
    world.gold = 500;
    world.wave = 6;
    // Place mix of all 4 tower types
    const placement = [
      { plot: 0, type: 'cannon' },
      { plot: 1, type: 'frost' },
      { plot: 2, type: 'storm' },
      { plot: 3, type: 'thorn' }
    ];
    for (const p of placement) {
      const plot = world.plots[p.plot];
      if (plot) {
        world.selectedTowerType = p.type;
        tryPlaceTower(world, plot);
      }
    }
    // Upgrade tower at plot 0
    const plot0 = world.plots[0];
    if (plot0 && plot0.tower) {
      upgradeTower(world, plot0.tower);
    }
    world.selectedPlotIndex = null;
    world.startWave();
    const dt = 1 / 60;
    for (let i = 0; i < 200; i++) {
      world.step(dt, { actions: [], mouse: { x: -1000, y: -1000 }, clicked: false });
    }
  } else if (shotType === 'end') {
    world.state = 'gameover';
    world.lives = 0;
  }
}
