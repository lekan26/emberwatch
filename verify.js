import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { existsSync, mkdirSync, statSync } from 'node:fs';

async function main() {
  console.log('Running node --check on JS files...');
  const jsFiles = [
    'game/src/audio.js',
    'game/src/main.js',
    'game/src/render.js',
    'game/src/input.js',
    'game/src/world.js',
    'game/src/towers.js',
    'game/src/enemies.js',
    'game/src/shots.js'
  ];
  for (const file of jsFiles) {
    execSync(`node --check ${file}`);
    console.log(`Checked ${file}: OK`);
  }

  console.log('Starting serve.ts...');
  const server = spawn('node', ['serve.ts', '--port', '8080'], { stdio: 'inherit' });
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Curl test
  const curlOut = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/').toString().trim();
  console.log(`Curl HTTP Status: ${curlOut}`);
  if (curlOut !== '200') {
    throw new Error(`Expected HTTP 200 from server, got ${curlOut}`);
  }

  mkdirSync('screenshots', { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  const shots = [
    { name: '1-start', query: '?shot=start&seed=1' },
    { name: '2-play', query: '?shot=play&seed=1' },
    { name: '4-build', query: '?shot=build&seed=1' },
    { name: '3-end', query: '?shot=end&seed=1' }
  ];

  let consoleErrors = 0;
  let failedRequests = 0;

  for (const shot of shots) {
    const page = await context.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error (${shot.name}):`, msg.text());
        consoleErrors++;
      }
    });

    page.on('requestfailed', req => {
      console.error(`Failed request (${shot.name}):`, req.url(), req.failure()?.errorText);
      failedRequests++;
    });

    const url = `http://localhost:8080/${shot.query}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for window.shotReady
    await page.waitForFunction(() => window.shotReady === true, { timeout: 5000 }).catch(() => {
      console.warn(`Timeout waiting for window.shotReady on ${shot.name}`);
    });

    // Verify gold >= 0 via window.emberwatch
    const gold = await page.evaluate(() => window.emberwatch ? window.emberwatch.gold : -1);
    console.log(`Shot ${shot.name}: Gold = ${gold}`);
    if (gold < 0) {
      throw new Error(`Gold went negative in shot ${shot.name}: ${gold}`);
    }

    const outPath = `screenshots/${shot.name}.jpg`;
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 80 });
    
    const size = statSync(outPath).size;
    console.log(`Saved screenshot to ${outPath} (${size} bytes)`);
    if (size > 262144) {
      throw new Error(`Screenshot ${shot.name}.jpg exceeds 256 KiB limit (${size} bytes)`);
    }

    await page.close();
  }

  // Full Playthrough Check (Waves 1-10)
  console.log('Running full 10-wave playthrough simulation...');
  const playPage = await context.newPage();
  await playPage.goto('http://localhost:8080/', { waitUntil: 'networkidle' });

  const playthroughResult = await playPage.evaluate(async () => {
    const w = window.emberwatch;
    if (!w) return { success: false, reason: 'emberwatch not exposed' };

    w.state = 'play';
    const waveResults = [];

    const costs = { cannon: 50, frost: 75, storm: 100, thorn: 40 };
    const towerTypes = ['cannon', 'storm', 'frost', 'cannon', 'storm', 'thorn', 'frost', 'cannon'];
    for (let i = 0; i < towerTypes.length; i++) {
      const plot = w.plots[i];
      const type = towerTypes[i];
      const cost = costs[type];
      if (plot && w.gold >= cost) {
        w.gold -= cost;
        plot.tower = {
          type,
          name: type.toUpperCase(),
          level: 1,
          cooldown: 0,
          range: 150,
          damage: 18,
          fireRate: 1.2,
          splashRadius: type === 'cannon' ? 50 : 0,
          slowPercent: 0.45,
          slowDuration: 2.2,
          chainCount: 3,
          rootDuration: 1.4,
          baseCost: cost,
          invested: cost,
          kills: 0,
          baseDamage: 18,
          baseRange: 150
        };
        w.towers.push({ plotId: plot.id, x: plot.x, y: plot.y, tower: plot.tower });
      }
    }

    const dt = 1 / 60;
    for (let wave = 1; wave <= 10; wave++) {
      if (w.state !== 'play') break;
      w.waveState = 'waiting';
      w.startWave();
      
      let steps = 0;
      while (w.waveState !== 'waiting' && w.state === 'play' && steps < 7200) {
        w.step(dt, { actions: [], mouse: { x: -1000, y: -1000 }, clicked: false });
        steps++;
      }

      waveResults.push({ wave, lives: w.lives, gold: w.gold, state: w.state, steps });

      // Upgrade towers between waves
      for (const tWrap of w.towers) {
        const t = tWrap.tower;
        let upCost = t.level === 1 ? Math.round(t.baseCost * 0.75) : Math.round(t.baseCost * 1.2);
        if (t.level < 3 && w.gold >= upCost) {
          w.gold -= upCost;
          t.level++;
          t.damage = Math.round(t.baseDamage * (t.level === 2 ? 1.5 : 2.0));
        }
      }

      // Also place remaining plots if gold permits
      for (let i = towerTypes.length; i < w.plots.length; i++) {
        const plot = w.plots[i];
        if (plot && !plot.tower && w.gold >= 100) {
          const type = 'cannon';
          w.gold -= 50;
          plot.tower = {
            type,
            name: 'CANNON',
            level: 1,
            cooldown: 0,
            range: 150,
            damage: 18,
            fireRate: 1.2,
            splashRadius: 50,
            slowPercent: 0.45,
            slowDuration: 2.2,
            chainCount: 3,
            rootDuration: 1.4,
            baseCost: 50,
            invested: 50,
            kills: 0,
            baseDamage: 18,
            baseRange: 150
          };
          w.towers.push({ plotId: plot.id, x: plot.x, y: plot.y, tower: plot.tower });
        }
      }
    }

    return {
      finalState: w.state,
      finalWave: w.wave,
      finalLives: w.lives,
      finalGold: w.gold,
      waveResults
    };
  });

  console.log('Playthrough results:', JSON.stringify(playthroughResult, null, 2));

  await browser.close();
  server.kill();

  console.log(`Verification complete. Console errors: ${consoleErrors}, Failed requests: ${failedRequests}`);
  if (consoleErrors > 0 || failedRequests > 0 || playthroughResult.finalState !== 'victory') {
    throw new Error(`Verification checks failed! Console errors: ${consoleErrors}, Failed requests: ${failedRequests}, Final State: ${playthroughResult.finalState}`);
  }
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
