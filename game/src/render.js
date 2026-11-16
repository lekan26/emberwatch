import { CONFIG } from './config.js';
import { audio } from './audio.js';

export class Render {
  constructor(ctx) {
    this.ctx = ctx;
  }

  draw(world, input) {
    const { ctx } = this;
    ctx.fillStyle = CONFIG.PALETTE.bgSky;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Draw background grass & texture dots
    ctx.fillStyle = CONFIG.PALETTE.grass;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.fillStyle = CONFIG.PALETTE.grassDot;
    for (let x = 40; x < CONFIG.WIDTH; x += 80) {
      for (let y = 40; y < CONFIG.HEIGHT; y += 80) {
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x + 20, y + 40, 3, 3);
        // Small decorative flowers / grass tufts
        if ((x + y) % 160 === 0) {
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(x + 10, y + 15, 2, 6);
          ctx.fillRect(x + 13, y + 17, 2, 4);
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(x + 12, y + 12, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = CONFIG.PALETTE.grassDot;
        }
      }
    }

    // Draw path
    ctx.strokeStyle = CONFIG.PALETTE.pathEdge;
    ctx.lineWidth = 44;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(world.path[0].x, world.path[0].y);
    for (let i = 1; i < world.path.length; i++) {
      ctx.lineTo(world.path[i].x, world.path[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = CONFIG.PALETTE.path;
    ctx.lineWidth = 36;
    ctx.beginPath();
    ctx.moveTo(world.path[0].x, world.path[0].y);
    for (let i = 1; i < world.path.length; i++) {
      ctx.lineTo(world.path[i].x, world.path[i].y);
    }
    ctx.stroke();

    // Draw Lantern (destination at final path point) with flickering glow
    const lanternPos = world.path[world.path.length - 1];
    const flicker = 65 + Math.sin(performance.now() * 0.008) * 6;
    const glowGrad = ctx.createRadialGradient(lanternPos.x, lanternPos.y, 5, lanternPos.x, lanternPos.y, flicker);
    glowGrad.addColorStop(0, CONFIG.PALETTE.lanternGlow);
    glowGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(lanternPos.x, lanternPos.y, flicker, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CONFIG.PALETTE.lanternCore;
    ctx.beginPath();
    ctx.arc(lanternPos.x, lanternPos.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw Build Plots
    for (const plot of world.plots) {
      const dx = input.mouse.worldX - plot.x;
      const dy = input.mouse.worldY - plot.y;
      const hovered = dx * dx + dy * dy <= 30 * 30;
      const selected = world.selectedPlotIndex === plot.id;

      ctx.fillStyle = selected ? CONFIG.PALETTE.plotSelected : (hovered ? CONFIG.PALETTE.plotHover : CONFIG.PALETTE.plotNormal);
      ctx.beginPath();
      ctx.arc(plot.x, plot.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CONFIG.PALETTE.uiBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (plot.tower) {
        const tower = plot.tower;
        let baseCol = CONFIG.PALETTE.cannonBase;
        let glowCol = CONFIG.PALETTE.cannonGlow;
        if (tower.type === 'frost') {
          baseCol = CONFIG.PALETTE.frostBase;
          glowCol = CONFIG.PALETTE.frostGlow;
        } else if (tower.type === 'storm') {
          baseCol = CONFIG.PALETTE.stormBase;
          glowCol = CONFIG.PALETTE.stormGlow;
        } else if (tower.type === 'thorn') {
          baseCol = CONFIG.PALETTE.thornBase;
          glowCol = CONFIG.PALETTE.thornGlow;
        }

        ctx.fillStyle = baseCol;
        ctx.beginPath();
        ctx.arc(plot.x, plot.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = glowCol;
        ctx.beginPath();
        ctx.arc(plot.x, plot.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw level stars or indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`L${tower.level}`, plot.x, plot.y - 20);

        // If selected, show range circle
        if (selected) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(plot.x, plot.y, tower.range, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Draw Enemies
    for (const e of world.enemies) {
      let coreCol = CONFIG.PALETTE.wispCore;
      let outerCol = CONFIG.PALETTE.wispOuter;
      let radius = 14;

      if (e.type === 'moth') {
        coreCol = CONFIG.PALETTE.mothCore;
        outerCol = CONFIG.PALETTE.mothOuter;
        radius = 16;
      } else if (e.type === 'brute') {
        coreCol = CONFIG.PALETTE.bruteCore;
        outerCol = CONFIG.PALETTE.bruteOuter;
        radius = 22;
      } else if (e.type === 'swarmer') {
        coreCol = CONFIG.PALETTE.swarmerCore;
        outerCol = CONFIG.PALETTE.swarmerOuter;
        radius = 10;
      } else if (e.type === 'gloomMoth') {
        coreCol = CONFIG.PALETTE.bossCore;
        outerCol = CONFIG.PALETTE.bossOuter;
        radius = 32;
        // Boss dark aura
        ctx.fillStyle = 'rgba(147, 51, 234, 0.25)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 48, 0, Math.PI * 2);
        ctx.fill();
      }

      const grad = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, coreCol);
      grad.addColorStop(1, outerCol);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      const barW = e.isBoss ? 56 : 28;
      const barH = e.isBoss ? 6 : 4;
      const barYOffset = radius + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - barW/2, e.y - barYOffset, barW, barH);
      ctx.fillStyle = e.isBoss ? CONFIG.PALETTE.textGold : CONFIG.PALETTE.dangerRed;
      const hpRatio = Math.max(0, e.health / e.maxHealth);
      ctx.fillRect(e.x - barW/2, e.y - barYOffset, barW * hpRatio, barH);
    }

    // Draw Projectiles
    for (const p of world.projectiles) {
      ctx.fillStyle = CONFIG.PALETTE.projectile;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Particles
    for (const pt of world.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Draw Fireflies
    if (world.fireflies) {
      for (const ff of world.fireflies) {
        ctx.fillStyle = '#fde047';
        ctx.globalAlpha = Math.max(0.1, Math.sin(ff.phase) * 0.4 + 0.5);
        ctx.beginPath();
        ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw Floating Texts
    for (const ft of world.floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1.0;
    }

    // Draw Wave Banner if active
    if (world.waveBannerTimer > 0 && world.state === 'play') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(CONFIG.WIDTH / 2 - 250, 100, 500, 60);
      ctx.strokeStyle = CONFIG.PALETTE.textGold;
      ctx.lineWidth = 2;
      ctx.strokeRect(CONFIG.WIDTH / 2 - 250, 100, 500, 60);

      ctx.fillStyle = CONFIG.PALETTE.textGold;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${world.wave} INCOMING`, CONFIG.WIDTH / 2, 128);
      ctx.fillStyle = CONFIG.PALETTE.textPale;
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('Defend the ember lantern from the shadow horde!', CONFIG.WIDTH / 2, 148);
    }

    // Draw HUD
    this.drawHUD(world);

    // Draw Overlays (Title, Paused, GameOver, Victory)
    if (world.state === 'title') {
      this.drawOverlay('EMBERWATCH', 'The Last Lantern in the Dusk Garden', 'Press SPACE or Click to Begin');
    } else if (world.state === 'paused') {
      this.drawOverlay('PAUSED', 'Press P or ESC to Resume', '');
    } else if (world.state === 'gameover') {
      this.drawOverlay('GAME OVER', 'The Lantern Has Gone Dark', 'Press R or SPACE to Restart');
    } else if (world.state === 'victory') {
      this.drawOverlay('VICTORY!', 'The Garden is Safe!', `Final Score: ${world.score} - Press SPACE to Play Again`);
    }
  }

  drawHUD(world) {
    const { ctx } = this;
    // Top HUD Bar
    ctx.fillStyle = CONFIG.PALETTE.uiPanel;
    ctx.fillRect(0, 0, CONFIG.WIDTH, 64);
    ctx.strokeStyle = CONFIG.PALETTE.uiBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.lineTo(CONFIG.WIDTH, 64);
    ctx.stroke();

    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = CONFIG.PALETTE.textGold;
    ctx.textAlign = 'left';
    ctx.fillText(`Gold: ${world.gold}g`, 30, 38);

    ctx.fillStyle = CONFIG.PALETTE.dangerRed;
    ctx.fillText(`Lives: ${world.lives}`, 170, 38);

    ctx.fillStyle = CONFIG.PALETTE.textPale;
    ctx.fillText(`Wave: ${world.wave} / ${CONFIG.WAVES.length}`, 310, 38);

    const enemiesLeft = world.enemies.length + (world.spawnQueue ? world.spawnQueue.length : 0);
    ctx.fillText(`Enemies Left: ${enemiesLeft}`, 470, 38);

    if (world.waveState === 'waiting' && world.state === 'play') {
      ctx.fillStyle = CONFIG.PALETTE.textGold;
      ctx.fillText('Press SPACE to Start Wave', 670, 38);
    }

    // Mute Button on HUD (top right: x: 1100, y: 16, w: 140, h: 32)
    ctx.fillStyle = audio.muted ? CONFIG.PALETTE.dangerRed : CONFIG.PALETTE.plotNormal;
    ctx.fillRect(1100, 16, 140, 32);
    ctx.strokeStyle = CONFIG.PALETTE.uiBorder;
    ctx.strokeRect(1100, 16, 140, 32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(audio.muted ? 'Mute: ON [M]' : 'Mute: OFF [M]', 1170, 37);

    // Bottom Build Bar (4 towers: 1 to 4) - Widen bar to 1000px so all 4 cards fit cleanly without text truncation
    const barX = 140;
    const barY = CONFIG.HEIGHT - 80;
    const barW = 1000;
    const barH = 70;
    ctx.fillStyle = CONFIG.PALETTE.uiPanel;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = CONFIG.PALETTE.uiBorder;
    ctx.strokeRect(barX, barY, barW, barH);

    const towerEntries = [
      { key: 'cannon', hotkey: '[1]', def: CONFIG.TOWER_TYPES.cannon },
      { key: 'frost', hotkey: '[2]', def: CONFIG.TOWER_TYPES.frost },
      { key: 'storm', hotkey: '[3]', def: CONFIG.TOWER_TYPES.storm },
      { key: 'thorn', hotkey: '[4]', def: CONFIG.TOWER_TYPES.thorn },
    ];

    const slotW = barW / 4;
    for (let i = 0; i < towerEntries.length; i++) {
      const entry = towerEntries[i];
      const sx = barX + i * slotW;
      const selected = world.selectedTowerType === entry.key;
      const affordable = world.gold >= entry.def.cost;

      if (selected) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.fillRect(sx, barY, slotW, barH);
      }

      ctx.fillStyle = affordable ? CONFIG.PALETTE.successGreen : CONFIG.PALETTE.dangerRed;
      ctx.fillRect(sx + 8, barY + 12, 36, 46);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(entry.hotkey, sx + 26, barY + 40);

      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.PALETTE.textPale;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(entry.def.name, sx + 50, barY + 26);
      ctx.fillStyle = CONFIG.PALETTE.textGold;
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(`Cost: ${entry.def.cost}g | Rng: ${entry.def.range}`, sx + 50, barY + 46);
    }

    // Selected Tower Inspector Panel (Right side if tower selected)
    if (world.selectedPlotIndex !== null) {
      const plot = world.plots.find(p => p.id === world.selectedPlotIndex);
      if (plot && plot.tower) {
        const t = plot.tower;
        const panelX = 940;
        const panelY = CONFIG.HEIGHT - 170;
        const panelW = 320;
        const panelH = 150;

        ctx.fillStyle = CONFIG.PALETTE.uiPanel;
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = CONFIG.PALETTE.uiBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        ctx.fillStyle = CONFIG.PALETTE.textGold;
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${t.name} (Lvl ${t.level})`, panelX + 16, panelY + 26);

        ctx.fillStyle = CONFIG.PALETTE.textPale;
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(`Dmg: ${t.damage} | Rng: ${t.range} | Kills: ${t.kills}`, panelX + 16, panelY + 52);

        // Upgrade & Sell buttons
        const upgradeCost = t.level === 1 ? Math.round(t.baseCost * 0.75) : (t.level === 2 ? Math.round(t.baseCost * 1.20) : 0);
        const refundAmt = Math.round(t.invested * 0.70);

        // Upgrade button
        const canUpgrade = t.level < 3 && world.gold >= upgradeCost;
        ctx.fillStyle = canUpgrade ? CONFIG.PALETTE.successGreen : CONFIG.PALETTE.plotNormal;
        ctx.fillRect(panelX + 16, panelY + 74, 135, 42);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.level >= 3 ? 'MAX LEVEL' : `Upgrade (${upgradeCost}g) [U]`, panelX + 83, panelY + 100);

        // Sell button
        ctx.fillStyle = CONFIG.PALETTE.dangerRed;
        ctx.fillRect(panelX + 165, panelY + 74, 135, 42);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Sell (+${refundAmt}g) [X]`, panelX + 232, panelY + 100);
      }
    }
  }

  drawOverlay(title, subtitle, prompt) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(13, 15, 24, 0.85)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.PALETTE.textGold;
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(title, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40);

    ctx.fillStyle = CONFIG.PALETTE.textPale;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(subtitle, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 10);

    if (prompt) {
      ctx.fillStyle = CONFIG.PALETTE.cannonGlow;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(prompt, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 70);
    }
  }
}
