(function (root) {
  "use strict";

  const DEFAULT_OPTIONS = {
    density: 0.00036,
    minFlakes: 240,
    maxFlakes: 820,
    // Simulate one extra viewport of snow on both horizontal sides so wind
    // can blow existing flakes into view instead of creating snow at the edge.
    sideBufferScreens: 1,
    // Weather toggles should feel gradual: quick enough to respond, slow enough
    // to read as snowfall easing in/out instead of a hard visibility switch.
    rampUpSeconds: 4,
    rampDownSeconds: 6
  };

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function create(canvas, options) {
    const config = { ...DEFAULT_OPTIONS, ...(options || {}) };
    const ctx = canvas.getContext("2d");
    const state = {
      width: 0,
      height: 0,
      flakes: [],
      gusts: [],
      lastTime: 0,
      spawnTimer: 0,
      fallSpeed: 58,
      targetFallSpeed: 58,
      nextFallShift: 0,
      ambientWind: -5,
      windPhase: Math.random() * 1000,
      running: false,
      enabled: true,
      intensity: 1,
      targetIntensity: 1
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      state.width = width;
      state.height = height;
      const targetCount = getTargetFlakeCount(width, height);
      while (state.flakes.length < targetCount) {
        state.flakes.push(createFlake(true));
      }
      if (state.enabled && state.flakes.length > targetCount) {
        state.flakes.length = targetCount;
      }
    }

    function getTargetFlakeCount(width, height) {
      if (state.intensity <= 0) return 0;
      const simulatedWidth = width * (1 + config.sideBufferScreens * 2);
      const fullCount = Math.max(config.minFlakes, Math.min(config.maxFlakes, Math.round(simulatedWidth * height * config.density)));
      return Math.round(fullCount * state.intensity);
    }

    function createFlake(anywhere) {
      const depth = Math.pow(Math.random(), 1.85);
      const radius = randomBetween(0.45, 1.32) + depth * randomBetween(0.5, 2.05);
      const sideBuffer = state.width * config.sideBufferScreens;
      return {
        x: randomBetween(-sideBuffer, state.width + sideBuffer),
        y: anywhere ? randomBetween(-state.height * 0.08, state.height * 1.06) : randomBetween(-36, -2),
        radius,
        depth,
        alpha: randomBetween(0.16, 0.42) + depth * 0.4,
        fallFactor: randomBetween(0.58, 1.18) + depth * 0.66,
        windFactor: randomBetween(0.45, 1.15) + depth * 0.72,
        swayPhase: randomBetween(0, Math.PI * 2),
        swaySpeed: randomBetween(0.7, 1.7),
        swaySize: randomBetween(2, 10) + depth * 8
      };
    }

    function resetFlake(flake, fromTop) {
      const replacement = createFlake(false);
      Object.assign(flake, replacement);
      if (!fromTop) {
        const sideBuffer = state.width * config.sideBufferScreens;
        const centerWind = getWindAt(state.width * 0.5, state.height * 0.5, performance.now());
        flake.y = randomBetween(0, state.height);
        flake.x =
          centerWind >= 0
            ? randomBetween(-sideBuffer, -sideBuffer * 0.72)
            : randomBetween(state.width + sideBuffer * 0.72, state.width + sideBuffer);
      }
    }

    function scheduleGust(now) {
      const direction = Math.random() < 0.58 ? 1 : -1;
      const width = randomBetween(210, 520);
      const startX = direction > 0 ? -width * randomBetween(0.6, 1.2) : state.width + width * randomBetween(0.6, 1.2);
      const travelSpeed = randomBetween(46, 145) * direction;
      const strength = randomBetween(20, 86) * direction;
      const canCross = Math.random() < 0.64 || Math.abs(strength) > 48;
      state.gusts.push({
        centerX: startX,
        width,
        travelSpeed,
        strength,
        startTime: now,
        life: canCross ? randomBetween(9, 18) : randomBetween(3.6, 7.5),
        edge: direction > 0 ? -1 : 1
      });
      state.spawnTimer = randomBetween(2.8, 7.8);
    }

    function getWindAt(x, y, now) {
      const slowWind = state.ambientWind + Math.sin(now * 0.00018 + state.windPhase) * 9;
      let wind = slowWind + Math.sin((y + now * 0.035) * 0.009) * 3.5;
      for (const gust of state.gusts) {
        const age = (now - gust.startTime) / 1000;
        const dx = (x - gust.centerX) / gust.width;
        const band = Math.exp(-dx * dx * 2.8);
        const rise = Math.min(1, age / 1.1);
        const fade = Math.max(0, Math.min(1, (gust.life - age) / 2.1));
        const shear = 1 + Math.sin(y * 0.012 + age * 1.6) * 0.18;
        wind += gust.strength * band * rise * fade * shear;
      }
      return wind;
    }

    function updateWeather(dt, now) {
      const rampSeconds = state.targetIntensity > state.intensity ? config.rampUpSeconds : config.rampDownSeconds;
      const rampStep = rampSeconds > 0 ? dt / rampSeconds : 1;
      if (state.intensity < state.targetIntensity) {
        state.intensity = Math.min(state.targetIntensity, state.intensity + rampStep);
      } else if (state.intensity > state.targetIntensity) {
        state.intensity = Math.max(state.targetIntensity, state.intensity - rampStep);
      }

      state.nextFallShift -= dt;
      if (state.nextFallShift <= 0) {
        state.targetFallSpeed = randomBetween(42, 92);
        state.nextFallShift = randomBetween(11, 24);
      }
      state.fallSpeed += (state.targetFallSpeed - state.fallSpeed) * Math.min(1, dt * 0.12);
      state.ambientWind += (Math.sin(now * 0.00009 + 3.2) * 12 - state.ambientWind) * Math.min(1, dt * 0.045);

      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        scheduleGust(now);
      }
      state.gusts = state.gusts.filter((gust) => {
        const age = (now - gust.startTime) / 1000;
        gust.centerX += gust.travelSpeed * dt;
        const crossed = gust.edge < 0 ? gust.centerX > state.width + gust.width : gust.centerX < -gust.width;
        return age < gust.life && !crossed;
      });
    }

    function drawFrame(now) {
      if (!state.running) return;
      resize();
      const dt = Math.min(0.05, Math.max(0.001, (now - state.lastTime) / 1000 || 0.016));
      state.lastTime = now;
      updateWeather(dt, now);
      const targetCount = getTargetFlakeCount(state.width, state.height);
      while (state.enabled && state.flakes.length < targetCount) {
        state.flakes.push(createFlake(false));
      }

      ctx.clearRect(0, 0, state.width, state.height);
      ctx.lineCap = "round";
      for (let i = state.flakes.length - 1; i >= 0; i -= 1) {
        const flake = state.flakes[i];
        const wind = getWindAt(flake.x, flake.y, now) * flake.windFactor;
        const sway = Math.sin(now * 0.001 * flake.swaySpeed + flake.swayPhase) * flake.swaySize;
        const vx = wind + sway;
        const vy = state.fallSpeed * flake.fallFactor;
        flake.x += vx * dt;
        flake.y += vy * dt;

        const sideBuffer = state.width * config.sideBufferScreens;
        if (flake.y > state.height + 36 || flake.x < -sideBuffer - 80 || flake.x > state.width + sideBuffer + 80) {
          if (state.enabled && state.flakes.length <= targetCount) {
            resetFlake(flake, flake.y > state.height + 36);
          } else {
            state.flakes.splice(i, 1);
            continue;
          }
        }

        if (flake.x < -12 || flake.x > state.width + 12) {
          continue;
        }

        const speed = Math.sqrt(vx * vx + vy * vy);
        const streak = Math.min(11, Math.max(1.8, speed * 0.026 * (0.35 + flake.depth)));
        const alpha = Math.max(0.12, Math.min(0.82, flake.alpha));
        ctx.strokeStyle = "rgba(238, 246, 255, " + (alpha * 0.62).toFixed(3) + ")";
        ctx.fillStyle = "rgba(248, 252, 255, " + alpha.toFixed(3) + ")";
        if (streak > 6.4 && flake.depth > 0.58) {
          const angle = Math.atan2(vy, vx);
          const tx = Math.cos(angle) * streak;
          const ty = Math.sin(angle) * streak;
          ctx.lineWidth = Math.max(0.42, flake.radius * 0.66);
          ctx.beginPath();
          ctx.moveTo(flake.x - tx * 0.45, flake.y - ty * 0.45);
          ctx.lineTo(flake.x + tx * 0.55, flake.y + ty * 0.55);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ramp-down behavior: when weather is disabled, no new flakes are added.
      // Existing flakes continue falling/drifting until the buffered simulation is empty,
      // then the animation stops, clears the canvas, and hides the overlay.
      if (!state.enabled && state.flakes.length === 0 && state.intensity <= 0) {
        stop(true);
        return;
      }
      window.requestAnimationFrame(drawFrame);
    }

    function start() {
      if (state.running) return;
      state.running = true;
      state.enabled = true;
      state.targetIntensity = 1;
      canvas.style.display = "block";
      state.lastTime = performance.now();
      state.spawnTimer = 0.4;
      resize();
      window.requestAnimationFrame(drawFrame);
    }

    function stop(immediate) {
      state.running = false;
      if (immediate) {
        state.flakes.length = 0;
        state.intensity = 0;
        state.targetIntensity = 0;
        ctx.clearRect(0, 0, state.width, state.height);
      }
      canvas.style.display = "none";
    }

    function setEnabled(enabled) {
      if (enabled) {
        // Ramp-up behavior: turning weather back on restarts the overlay and
        // gradually repopulates flakes over the configured ramp-up period.
        state.enabled = true;
        state.targetIntensity = 1;
        start();
      } else {
        state.enabled = false;
        state.targetIntensity = 0;
      }
    }

    return {
      resize,
      setEnabled
    };
  }

  root.MapSnowLayer = { create };
})(window);
