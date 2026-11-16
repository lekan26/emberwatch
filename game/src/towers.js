import { CONFIG } from './config.js';
import { audio } from './audio.js';

export function tryPlaceTower(world, plot) {
  if (plot.tower) return false;
  const tDef = CONFIG.TOWER_TYPES[world.selectedTowerType];
  if (!tDef || world.gold < tDef.cost) return false;
  
  world.gold -= tDef.cost;
  plot.tower = {
    type: world.selectedTowerType,
    name: tDef.name,
    level: 1,
    cooldown: 0,
    range: tDef.range,
    damage: tDef.damage,
    fireRate: tDef.fireRate,
    splashRadius: tDef.splashRadius || 0,
    slowPercent: tDef.slowPercent || 0,
    slowDuration: tDef.slowDuration || 0,
    chainCount: tDef.chainCount || 0,
    rootDuration: tDef.rootDuration || 0,
    baseCost: tDef.cost,
    invested: tDef.cost,
    kills: 0,
    baseDamage: tDef.damage,
    baseRange: tDef.range
  };
  
  world.towers.push({ plotId: plot.id, x: plot.x, y: plot.y, tower: plot.tower });
  world.selectedPlotIndex = plot.id;
  world.addParticle(plot.x, plot.y, CONFIG.PALETTE.cannonGlow, 15);
  audio.playBuild();
  return true;
}

export function upgradeTower(world, tower) {
  let cost = 0;
  if (tower.level === 1) {
    cost = Math.round(tower.baseCost * 0.75);
    if (world.gold < cost) return false;
    world.gold -= cost;
    tower.invested += cost;
    tower.level = 2;
    tower.damage = Math.round(tower.baseDamage * 1.5);
    tower.range = Math.round(tower.baseRange * 1.15);
  } else if (tower.level === 2) {
    cost = Math.round(tower.baseCost * 1.20);
    if (world.gold < cost) return false;
    world.gold -= cost;
    tower.invested += cost;
    tower.level = 3;
    tower.damage = Math.round(tower.baseDamage * 2.0);
    tower.range = Math.round(tower.baseRange * 1.25);
  } else {
    return false; // Max level
  }
  world.addParticle(tower.x, tower.y, CONFIG.PALETTE.textGold, 20);
  world.addFloatingText(tower.x, tower.y - 25, `Level ${tower.level}!`, CONFIG.PALETTE.textGold);
  audio.playUI();
  return true;
}

export function sellTower(world, plot) {
  if (!plot.tower) return false;
  const refund = Math.round(plot.tower.invested * 0.70);
  world.gold += refund;
  world.addFloatingText(plot.x, plot.y - 25, `+${refund}g`, CONFIG.PALETTE.textGold);
  world.addParticle(plot.x, plot.y, CONFIG.PALETTE.dangerRed, 15);

  // Remove from towers array
  world.towers = world.towers.filter(t => t.plotId !== plot.id);
  plot.tower = null;
  world.selectedPlotIndex = null;
  audio.playUI();
  return true;
}

export function updateTowers(world, dt) {
  for (const tWrap of world.towers) {
    const tower = tWrap.tower;
    tower.x = tWrap.x;
    tower.y = tWrap.y;
    if (tower.cooldown > 0) {
      tower.cooldown -= dt;
    }

    if (tower.cooldown <= 0) {
      // Find target furthest along path in range
      let bestTarget = null;
      let maxDist = -1;
      for (const e of world.enemies) {
        const dist = Math.hypot(e.x - tWrap.x, e.y - tWrap.y);
        if (dist <= tower.range) {
          if (e.dist > maxDist) {
            maxDist = e.dist;
            bestTarget = e;
          }
        }
      }

      if (bestTarget) {
        tower.cooldown = 1 / tower.fireRate;
        
        if (tower.type === 'storm') {
          audio.playStorm();
          // Chain lightning hitting up to 3 enemies
          const hitEnemies = [bestTarget];
          let currentTarget = bestTarget;
          for (let c = 1; c < tower.chainCount; c++) {
            let nextBest = null;
            let minDist = 999999;
            for (const e of world.enemies) {
              if (hitEnemies.includes(e)) continue;
              const dist = Math.hypot(e.x - currentTarget.x, e.y - currentTarget.y);
              if (dist <= 120 && dist < minDist) {
                minDist = dist;
                nextBest = e;
              }
            }
            if (nextBest) {
              hitEnemies.push(nextBest);
              currentTarget = nextBest;
            } else {
              break;
            }
          }

          // Apply damage & lightning effects
          for (const target of hitEnemies) {
            target.health -= tower.damage;
            world.addParticle(target.x, target.y, CONFIG.PALETTE.stormGlow, 8);
            if (target.health <= 0) {
              world.gold += target.reward;
              world.score += 10;
              world.enemiesDefeated++;
              tower.kills++;
              world.addFloatingText(target.x, target.y, `+${target.reward}g`, CONFIG.PALETTE.textGold);
              audio.playDeath();
              world.enemies = world.enemies.filter(en => en !== target);
            }
          }
          world.addParticle(tWrap.x, tWrap.y, CONFIG.PALETTE.stormGlow, 15);

        } else {
          // Projectile based towers (cannon, frost, thorn)
          if (tower.type === 'cannon') audio.playCannon();
          else if (tower.type === 'frost') audio.playFrost();
          else if (tower.type === 'thorn') audio.playThorn();

          world.projectiles.push({
            x: tWrap.x,
            y: tWrap.y,
            targetX: bestTarget.x,
            targetY: bestTarget.y,
            targetEnemy: bestTarget,
            speed: 480,
            damage: tower.damage,
            splashRadius: tower.splashRadius,
            slowPercent: tower.slowPercent,
            slowDuration: tower.slowDuration,
            rootDuration: tower.rootDuration,
            towerRef: tower
          });
          const pColor = tower.type === 'frost' ? CONFIG.PALETTE.frostGlow : (tower.type === 'thorn' ? CONFIG.PALETTE.thornGlow : CONFIG.PALETTE.cannonGlow);
          world.addParticle(tWrap.x, tWrap.y, pColor, 10);
        }
      }
    }
  }

  // Update projectiles
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const p = world.projectiles[i];
    let tx = p.targetX;
    let ty = p.targetY;
    if (p.targetEnemy && world.enemies.includes(p.targetEnemy)) {
      tx = p.targetEnemy.x;
      ty = p.targetEnemy.y;
      p.targetX = tx;
      p.targetY = ty;
    }

    const dx = tx - p.x;
    const dy = ty - p.y;
    const dist = Math.hypot(dx, dy);
    const move = p.speed * dt;

    if (dist <= move) {
      // Hit!
      if (p.splashRadius > 0) {
        // Splash damage (Ember Cannon)
        for (let ei = world.enemies.length - 1; ei >= 0; ei--) {
          const enemy = world.enemies[ei];
          const edx = enemy.x - tx;
          const edy = enemy.y - ty;
          if (Math.hypot(edx, edy) <= p.splashRadius) {
            enemy.health -= p.damage;
            world.addParticle(enemy.x, enemy.y, CONFIG.PALETTE.wispOuter, 8);
            if (enemy.health <= 0) {
              world.gold += enemy.reward;
              world.score += 10;
              world.enemiesDefeated++;
              if (p.towerRef) p.towerRef.kills++;
              world.addFloatingText(enemy.x, enemy.y, `+${enemy.reward}g`, CONFIG.PALETTE.textGold);
              audio.playDeath();
              world.enemies.splice(ei, 1);
            }
          }
        }
        world.addParticle(tx, ty, CONFIG.PALETTE.lanternCore, 15);
      } else {
        // Single target with status effect (Frost / Thorn)
        if (p.targetEnemy && world.enemies.includes(p.targetEnemy)) {
          const enemy = p.targetEnemy;
          enemy.health -= p.damage;
          if (p.slowDuration > 0) {
            enemy.slowTimer = p.slowDuration;
            enemy.slowFactor = p.slowPercent;
          }
          if (p.rootDuration > 0) {
            enemy.rootTimer = p.rootDuration;
          }
          world.addParticle(enemy.x, enemy.y, p.slowDuration > 0 ? CONFIG.PALETTE.frostGlow : CONFIG.PALETTE.thornGlow, 8);
          if (enemy.health <= 0) {
            world.gold += enemy.reward;
            world.score += 10;
            world.enemiesDefeated++;
            if (p.towerRef) p.towerRef.kills++;
            world.addFloatingText(enemy.x, enemy.y, `+${enemy.reward}g`, CONFIG.PALETTE.textGold);
            audio.playDeath();
            world.enemies = world.enemies.filter(en => en !== enemy);
          }
        }
      }
      world.projectiles.splice(i, 1);
    } else {
      p.x += (dx / dist) * move;
      p.y += (dy / dist) * move;
    }
  }
}
