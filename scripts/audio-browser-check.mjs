import { createServer } from "node:http";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";

const root = process.cwd();
execSync(
  "pnpm.cmd exec esbuild src/audio/AudioEngine.ts --bundle --format=esm --platform=browser --target=es2022 --outfile=scripts/audio-engine-bundle.js",
  { cwd: root, stdio: "pipe" },
);
const types = {
  ".js": "text/javascript",
  ".mp3": "audio/mpeg",
  ".json": "application/json",
};
const server = createServer(async (req, res) => {
  if (req.url === "/engine.js") {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.end(await readFile(join(root, "scripts/audio-engine-bundle.js")));
    return;
  }
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<button id='start'>Start</button><button id='resume'>Resume</button>",
    );
    return;
  }
  if (!req.url?.startsWith("/builds/linosbinaural/audio/")) {
    res.writeHead(404);
    res.end();
    return;
  }
  const name = req.url.slice("/builds/linosbinaural/audio/".length);
  if (!/^[a-z0-9._-]+$/i.test(name)) {
    res.writeHead(400);
    res.end();
    return;
  }
  try {
    const file = await readFile(join(root, "public/audio", name));
    res.writeHead(200, {
      "Content-Type":
        types[name.slice(name.lastIndexOf("."))] ?? "application/octet-stream",
    });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
const failures = [];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
try {
  await page.goto("http://127.0.0.1:" + address.port);
  const signal = await page.evaluate(async () => {
    const sampleRates = [44100, 48000, 96000];
    const results = [];
    const amplitude = (samples, frequency, rate) => {
      let real = 0,
        imaginary = 0;
      for (let i = 0; i < samples.length; i++) {
        const phase = (2 * Math.PI * frequency * i) / rate;
        real += samples[i] * Math.cos(phase);
        imaginary -= samples[i] * Math.sin(phase);
      }
      return (2 * Math.hypot(real, imaginary)) / samples.length;
    };
    for (const rate of sampleRates) {
      const context = new OfflineAudioContext(2, rate * 2, rate);
      await context.audioWorklet.addModule(
        "/builds/linosbinaural/audio/output-guard.js",
      );
      const merger = context.createChannelMerger(2);
      const left = context.createOscillator();
      const right = context.createOscillator();
      const leftGain = context.createGain();
      const rightGain = context.createGain();
      left.frequency.value = 296;
      right.frequency.value = 304;
      leftGain.gain.value = rightGain.gain.value = 0.18;
      left.connect(leftGain).connect(merger, 0, 0);
      right.connect(rightGain).connect(merger, 0, 1);
      const guard = new AudioWorkletNode(context, "lino-output-guard", {
        outputChannelCount: [2],
      });
      merger.connect(guard).connect(context.destination);
      left.start();
      right.start();
      const rendered = await context.startRendering();
      const l = rendered.getChannelData(0).subarray(rate / 2, (rate * 3) / 2);
      const r = rendered.getChannelData(1).subarray(rate / 2, (rate * 3) / 2);
      results.push({
        rate,
        left296: amplitude(l, 296, rate),
        left304: amplitude(l, 304, rate),
        right296: amplitude(r, 296, rate),
        right304: amplitude(r, 304, rate),
        peak: Math.max(
          l.reduce((p, x) => Math.max(p, Math.abs(x)), 0),
          r.reduce((p, x) => Math.max(p, Math.abs(x)), 0),
        ),
      });
    }
    const bound = new OfflineAudioContext(2, 48000, 48000);
    await bound.audioWorklet.addModule("/builds/linosbinaural/audio/output-guard.js");
    const source = bound.createConstantSource();
    source.offset.value = 2;
    const guard = new AudioWorkletNode(bound, "lino-output-guard", {
      outputChannelCount: [2],
    });
    source.connect(guard).connect(bound.destination);
    source.start();
    const output = await bound.startRendering();
    const hardPeak = Math.max(
      ...Array.from(output.getChannelData(0), Math.abs),
    );
    const stack = new OfflineAudioContext(2, 48000, 48000);
    await stack.audioWorklet.addModule("/builds/linosbinaural/audio/output-guard.js");
    const stackGuard = new AudioWorkletNode(stack, "lino-output-guard", {
      outputChannelCount: [2],
    });
    stackGuard.connect(stack.destination);
    for (const level of [
      0.18, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08,
    ]) {
      const source = stack.createConstantSource();
      const gain = stack.createGain();
      gain.gain.value = level;
      source.connect(gain).connect(stackGuard);
      source.start();
    }
    const stacked = await stack.startRendering();
    const stackPeak = Math.max(
      ...Array.from(stacked.getChannelData(0).subarray(1000, 2000), Math.abs),
    );
    const noise = {};
    for (const color of ["white", "pink", "brown"]) {
      const ctx = new OfflineAudioContext(2, 24000, 48000);
      await ctx.audioWorklet.addModule(
        "/builds/linosbinaural/audio/noise-processor.js",
      );
      const node = new AudioWorkletNode(ctx, "lino-noise", {
        processorOptions: { color },
        outputChannelCount: [2],
      });
      node.connect(ctx.destination);
      const result = await ctx.startRendering();
      const samples = result.getChannelData(0);
      let square = 0,
        adjacent = 0;
      for (let i = 1; i < samples.length; i++) {
        square += samples[i] * samples[i];
        adjacent += samples[i] * samples[i - 1];
      }
      noise[color] = {
        rms: Math.sqrt(square / samples.length),
        lag1: adjacent / square,
      };
    }
    const timed = new OfflineAudioContext(2, 96000, 48000);
    const wave = timed.createOscillator();
    const envelope = timed.createGain();
    wave.frequency.value = 300;
    envelope.gain.setValueAtTime(1, 0);
    envelope.gain.setValueAtTime(1, 1);
    envelope.gain.linearRampToValueAtTime(0, 1.5);
    wave.connect(envelope).connect(timed.destination);
    wave.start();
    const faded = await timed.startRendering();
    const before = faded.getChannelData(0)[24000];
    let tail = 0;
    for (const x of faded.getChannelData(0).subarray(84000))
      tail = Math.max(tail, Math.abs(x));
    return {
      results,
      hardPeak,
      stackPeak,
      noise,
      fadeBefore: Math.abs(before),
      fadeTail: tail,
    };
  });
  for (const item of signal.results) {
    assert(
      Math.abs(item.left296 - 0.18) < 0.002 &&
        Math.abs(item.right304 - 0.18) < 0.002,
      "carrier amplitude at " + item.rate,
    );
    assert(
      item.left304 < 0.0001 && item.right296 < 0.0001,
      "opposite channel leakage at " + item.rate,
    );
    assert(item.peak <= 0.92, "normal peak at " + item.rate);
  }
  assert(
    signal.hardPeak <= 0.920001 && signal.hardPeak >= 0.919,
    "output hard bound",
  );
  assert(
    Math.abs(signal.stackPeak - 0.82) < 0.0001,
    "full-scale nine-layer stack has headroom",
  );
  assert(signal.noise.white.rms > 0.3, "white noise render");
  assert(signal.noise.pink.rms > 0.03, "pink noise render");
  assert(signal.noise.brown.rms > 0.01, "brown noise render");
  assert(Math.abs(signal.noise.white.lag1) < 0.05, "white correlation");
  assert(signal.noise.pink.lag1 > signal.noise.white.lag1, "pink correlation");
  assert(signal.noise.brown.lag1 > signal.noise.pink.lag1, "brown correlation");
  assert(signal.fadeTail < 0.00001, "audio-timeline fade reaches silence");
  console.log("OFFLINE_SIGNAL_PASS", JSON.stringify(signal));

  await page.evaluate(async () => {
    const { AudioEngine } = await import("/engine.js");
    const mix = {
      version: 1,
      binaural: {
        enabled: true,
        beat: 8,
        carrier: 300,
        waveform: "sine",
        gain: 0.5,
      },
      ambience: Object.fromEntries(
        [
          "rain",
          "ocean",
          "cafe",
          "forest",
          "fireplace",
          "white",
          "pink",
          "brown",
        ].map((id) => [id, { enabled: false, gain: 0.5 }]),
      ),
      durationMinutes: null,
      fadeSeconds: 10,
      cover: "dusk",
    };
    window.testEngine = new AudioEngine();
    window.testMix = mix;
    document.querySelector("#start").addEventListener("click", () => {
      void window.testEngine.play(window.testMix);
    });
    document.querySelector("#resume").addEventListener("click", () => {
      void window.testEngine.play(window.testMix);
    });
  });
  await page.click("#start");
  await page.waitForFunction(
    () => window.testEngine.getSnapshot().status === "playing",
  );
  let state = await page.evaluate(() => ({
    snapshot: window.testEngine.getSnapshot(),
    left: window.testEngine.tone.left.frequency.value,
    right: window.testEngine.tone.right.frequency.value,
  }));
  assert(state.left === 296 && state.right === 304, "real engine carrier");
  await page.evaluate(() => {
    window.testMix.binaural.waveform = "triangle";
    window.testMix.binaural.beat = 13;
    window.testMix.binaural.carrier = 400;
    window.testMix.binaural.gain = 0.25;
    window.testEngine.update(window.testMix, 0.2);
  });
  await page.waitForFunction(
    () => window.testEngine.tone.left.type === "triangle",
  );
  state = await page.evaluate(() => ({
    left: window.testEngine.tone.left.frequency.value,
    right: window.testEngine.tone.right.frequency.value,
    master: window.testEngine.master,
  }));
  assert(
    state.left === 393.5 && state.right === 406.5 && state.master === 0.2,
    "real engine waveform and preset switch",
  );
  await page.evaluate(() => window.testEngine.pause());
  await page.waitForFunction(
    () => window.testEngine.getSnapshot().status === "paused",
  );
  await page.click("#resume");
  await page.waitForFunction(
    () => window.testEngine.getSnapshot().status === "playing",
  );
  await page.evaluate(() => {
    window.testMix.ambience.rain.enabled = true;
    window.testEngine.update(window.testMix);
  });
  await page.waitForFunction(() => window.testEngine.layers.has("rain"));
  await page.route("**/forest.mp3", (route) => route.abort());
  await page.evaluate(() => {
    window.testMix.ambience.rain.enabled = false;
    window.testMix.ambience.forest.enabled = true;
    window.testEngine.update(window.testMix);
  });
  await page.waitForFunction(() =>
    Boolean(window.testEngine.getSnapshot().failedLayers.forest),
  );
  const survived = await page.evaluate(
    () =>
      window.testEngine.getSnapshot().status === "playing" &&
      Boolean(window.testEngine.tone),
  );
  assert(survived, "recording failure leaves active tone playing");
  await page.evaluate(() => {
    window.testEngine.stop();
  });
  state = await page.evaluate(() => ({
    status: window.testEngine.getSnapshot().status,
    layers: window.testEngine.layers.size,
  }));
  assert(
    state.status === "idle" && state.layers === 0,
    "real engine stop cleanup",
  );
  for (let i = 0; i < 10; i++) {
    await page.click("#start");
    await page.waitForFunction(
      () => window.testEngine.getSnapshot().status === "playing",
    );
    await page.evaluate(() => window.testEngine.stop());
  }
  await page.evaluate(() => {
    window.testMix.ambience.forest.enabled = false;
    window.testMix.durationMinutes = 0.02; // accelerated fixture; UI schema requires >= 1 minute
    window.testMix.fadeSeconds = 0.4;
  });
  await page.click("#start");
  await page.waitForFunction(
    () => window.testEngine.getSnapshot().status === "playing",
  );
  await page.waitForFunction(
    () => window.testEngine.getSnapshot().status === "idle",
    undefined,
    { timeout: 5000 },
  );
  assert(
    await page.evaluate(() => window.testEngine.context === null),
    "audio timeline session stop closes context",
  );
  console.log(
    "ENGINE_PLAYBACK_PASS",
    JSON.stringify(state),
    "10 start/stop cycles and accelerated timed stop",
  );
  if (process.argv.includes("--soak")) {
    await page.unroute("**/forest.mp3");
    await page.evaluate(() => {
      window.testMix.durationMinutes = null;
      for (const id of Object.keys(window.testMix.ambience))
        window.testMix.ambience[id].enabled = true;
    });
    await page.click("#start");
    await page.waitForFunction(
      () => window.testEngine.layers.size === 8,
      undefined,
      { timeout: 15000 },
    );
    const initial = await page.evaluate(() => ({
      status: window.testEngine.getSnapshot().status,
      layers: window.testEngine.layers.size,
      cache: window.testEngine.cache.size,
      sampleRate: window.testEngine.getSnapshot().sampleRate,
      failed: window.testEngine.getSnapshot().failedLayers,
    }));
    await page.waitForTimeout(60000);
    const after = await page.evaluate(() => ({
      status: window.testEngine.getSnapshot().status,
      layers: window.testEngine.layers.size,
      cache: window.testEngine.cache.size,
      elapsed: window.testEngine.getSnapshot().elapsedSeconds,
      failed: window.testEngine.getSnapshot().failedLayers,
    }));
    assert(
      initial.status === "playing" &&
        initial.layers === 8 &&
        initial.cache <= 3,
      "soak initial bounds",
    );
    assert(
      after.status === "playing" &&
        after.layers === 8 &&
        after.cache <= 3 &&
        after.elapsed >= 60,
      "soak active bounds",
    );
    assert(Object.keys(after.failed).length === 0, "soak asset failures");
    await page.evaluate(() => window.testEngine.stop());
    const cleaned = await page.evaluate(() => ({
      layers: window.testEngine.layers.size,
      cache: window.testEngine.cache.size,
      requests: window.testEngine.requests.size,
      context: window.testEngine.context,
    }));
    assert(
      cleaned.layers === 0 &&
        cleaned.cache === 0 &&
        cleaned.requests === 0 &&
        cleaned.context === null,
      "soak cleanup",
    );
    console.log(
      "ENGINE_SOAK_PASS",
      JSON.stringify({ initial, after, cleaned }),
    );
  }
} catch (error) {
  failures.push(error);
  console.error("AUDIO_BROWSER_FAIL", error);
} finally {
  await page.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await unlink(join(root, "scripts/audio-engine-bundle.js")).catch(() => {});
}
if (failures.length) process.exitCode = 1;
