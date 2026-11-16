import { CONFIG } from './config.js';
import { audio } from './audio.js';

export function spawnEnemy(world, typeKey) {
  const eDef = CONFIG.ENEMY_TYPES[typeKey];
  if (!eDef) return;
  world.enemies.push({
    type: typeKey,
    name: eDef.name,
    dist: 0,
    x: world.path[0].x,
    y: world.path[0].y,
    health: eDef.health,
    maxHealth: eDef.health,
    speed: eDef.speed,
    baseSpeed: eDef.speed,
    reward: eDef.reward,
    leakDamage: eDef.leakDamage,
    isBoss: !!eDef.isBoss,
    slowTimer: 0,
    slowFactor: 1,
    rootTimer: 0
  });
}

export function updateEnemies(world, dt) {
  // Spawning logic
  if (world.waveState === 'spawning') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const waveDef = CONFIG.WAVES[world.wave - 1];
      if (world.spawnQueue && world.spawnQueue.length > 0) {
        const nextType = world.spawnQueue.shift();
        spawnEnemy(world, nextType);
        world.spawnTimer = waveDef.interval;
        world.enemiesSpawnedTotal++;
      }
      if (!world.spawnQueue || world.spawnQueue.length === 0) {
        world.waveState = 'combat';
      }
    }
  }

  // Update enemies along path
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];

    // Status effects
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      e.speed = e.baseSpeed * (1 - e.slowFactor);
      if (e.slowTimer <= 0) {
        e.speed = e.baseSpeed;
      }
    }

    if (e.rootTimer > 0) {
      e.rootTimer -= dt;
    } else {
      e.dist += e.speed * dt;
    }

    // Calculate position along path segments
    let traveled = 0;
    let pos = { x: world.path[0].x, y: world.path[0].y };
    for (let p = 0; p < world.path.length - 1; p++) {
      const p1 = world.path[p];
      const p2 = world.path[p + 1];
      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (e.dist <= traveled + segLen) {
        const ratio = (e.dist - traveled) / segLen;
        pos.x = p1.x + (p2.x - p1.x) * ratio;
        pos.y = p1.y + (p2.y - p1.y) * ratio;
        break;
      }
      traveled += segLen;
      if (p === world.path.length - 2) {
        pos.x = p2.x;
        pos.y = p2.y;
      }
    }
    e.x = pos.x;
    e.y = pos.y;

    // Check if reached lantern
    const lastPoint = world.path[world.path.length - 1];
    const distToLantern = Math.hypot(e.x - lastPoint.x, e.y - lastPoint.y);
    if (distToLantern < 12 || e.dist >= world.getTotalPathLength()) {
      world.lives -= e.leakDamage;
      world.addFloatingText(lastPoint.x, lastPoint.y - 20, `-${e.leakDamage} Life`, CONFIG.PALETTE.dangerRed);
      audio.playLeak();
      world.enemies.splice(i, 1);
      if (world.lives <= 0) {
        world.lives = 0;
        world.state = 'gameover';
        audio.playGameOver();
      }
    }
  }
}
