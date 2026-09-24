import type { Mix } from "../lib/mix";
import {
  AMBIENCE_BUS_GAIN,
  AMBIENCE_IDS,
  BINAURAL_BUS_GAIN,
  carrierFrequencies,
  clamp,
  noiseId,
  type AmbienceId,
} from "./dsp";

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "interrupted" | "error";
export interface AudioSnapshot {
  status: AudioStatus;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  sampleRate: number | null;
  failedLayers: Partial<Record<AmbienceId, string>>;
  error: string | null;
}
type Listener = () => void;
type Tone = { left: OscillatorNode; right: OscillatorNode; gain: GainNode; merger: ChannelMergerNode };
type Layer = {
  gain: GainNode;
  node?: AudioWorkletNode;
  sources?: Set<AudioBufferSourceNode>;
};
type Manifest = { version: number; assets: Partial<Record<AmbienceId, { file: string }>> };

const BASE = "/linosbinaural/audio/";
const SLEW = 0.06;
const CACHE_LIMIT_BYTES = 64 * 1024 * 1024;
const CACHE_LIMIT_ITEMS = 3;

function fade(gain: AudioParam, value: number, now: number, seconds = SLEW) {
  if (typeof gain.cancelAndHoldAtTime === "function") gain.cancelAndHoldAtTime(now);
  else {
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
  }
  gain.linearRampToValueAtTime(value, now + seconds);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private mix: Mix | null = null;
  private master = 0.3;
  private output: GainNode | null = null;
  private session: GainNode | null = null;
  private guard: AudioWorkletNode | null = null;
  private tone: Tone | null = null;
  private layers = new Map<AmbienceId, Layer>();
  private requests = new Map<AmbienceId, AbortController>();
  private cache = new Map<string, AudioBuffer>();
  private listeners = new Set<Listener>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private endAt: number | null = null;
  private beganAt = 0;
  private state: AudioSnapshot = {
    status: "idle", elapsedSeconds: 0, remainingSeconds: null,
    sampleRate: null, failedLayers: {}, error: null,
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): AudioSnapshot { return this.state; }

  private publish(patch: Partial<AudioSnapshot>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Invoke in a click/key handler: resume() is called before the first await. */
  async play(mix: Mix, master = 0.3): Promise<void> {
    if (this.context && (this.state.status === "playing" || this.state.status === "paused" || this.state.status === "interrupted")) {
      this.update(mix, master);
      if (this.state.status !== "playing") {
        try {
          await this.context.resume();
          this.publish({ status: "playing", error: null });
          if (typeof navigator !== "undefined" && "mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          this.startTicker();
        } catch (error) {
          this.publish({ status: "interrupted", error: errorText(error) });
        }
      }
      return;
    }
    this.stop();
    const generation = ++this.generation;
    let context: AudioContext;
    try {
      context = new AudioContext({ latencyHint: "playback" });
    } catch (error) {
      this.publish({ status: "error", error: errorText(error) });
      return;
    }
    this.context = context;
    this.mix = mix;
    this.master = clamp(master, 0, 1);
    this.publish({ status: "loading", error: null, failedLayers: {}, elapsedSeconds: 0,
      remainingSeconds: mix.durationMinutes === null ? null : mix.durationMinutes * 60,
      sampleRate: context.sampleRate });
    // Browser gesture activation can be lost across an await.
    const resume = context.resume();
    try {
      await Promise.all([
        context.audioWorklet.addModule(`${BASE}noise-processor.js`),
        context.audioWorklet.addModule(`${BASE}output-guard.js`),
        resume,
      ]);
      if (generation !== this.generation) return;
      this.buildGraph(context);
      this.beganAt = context.currentTime;
      this.scheduleSessionEnd(mix);
      this.updateTones(mix);
      this.updateLayers(mix, generation);
      this.startTicker();
      this.configureMediaSession();
      this.publish({ status: "playing" });
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        this.publish({ status: "error", error: errorText(error) });
      }
    }
  }

  pause(): void {
    if (!this.context || this.state.status !== "playing") return;
    const context = this.context;
    context.suspend().then(() => {
      if (this.context === context) {
        this.publish({ status: "paused" });
        if (typeof navigator !== "undefined" && "mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
      }
    }).catch((error) => {
      if (this.context === context) this.publish({ status: "interrupted", error: errorText(error) });
    });
    this.stopTicker();
  }

  stop(): void {
    ++this.generation;
    this.stopTicker();
    for (const request of this.requests.values()) request.abort();
    this.requests.clear();
    for (const id of [...this.layers.keys()]) this.removeLayer(id, true);
    if (this.tone) this.stopTone(this.tone, true);
    this.tone = null;
    this.output = null;
    this.session = null;
    this.guard = null;
    this.mix = null;
    this.cache.clear();
    this.endAt = null;
    const old = this.context;
    this.context = null;
    if (old && old.state !== "closed") void old.close().catch(() => {});
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
    this.publish({ status: "idle", elapsedSeconds: 0, remainingSeconds: null, sampleRate: null,
      failedLayers: {}, error: null });
  }

  update(mix: Mix, master = this.master): void {
    const previousDuration = this.mix?.durationMinutes;
    const previousFade = this.mix?.fadeSeconds;
    this.mix = mix;
    this.master = clamp(master, 0, 1);
    const context = this.context;
    if (!context || !this.output || !this.session) return;
    fade(this.output.gain, this.master, context.currentTime);
    this.updateTones(mix);
    this.updateLayers(mix, this.generation);
    // A changed duration starts a new interval at the current audio time.
    if (previousDuration !== mix.durationMinutes || previousFade !== mix.fadeSeconds) {
      this.beganAt = context.currentTime;
      this.scheduleSessionEnd(mix);
    }
    this.tick();
  }

  async channelCheck(channel: "left" | "right"): Promise<void> {
    const context = this.context ?? new AudioContext();
    const temporary = !this.context;
    const resume = context.resume();
    try {
      await resume;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const merger = context.createChannelMerger(2);
      oscillator.frequency.value = 440;
      gain.gain.value = 0.045;
      oscillator.connect(gain).connect(merger, 0, channel === "left" ? 0 : 1);
      merger.connect(context.destination);
      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.03);
      gain.gain.setValueAtTime(0.045, now + 0.65);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);
      oscillator.start(now);
      oscillator.stop(now + 0.82);
      oscillator.onended = () => {
        oscillator.disconnect(); gain.disconnect(); merger.disconnect();
        if (temporary) void context.close().catch(() => {});
      };
    } catch (error) {
      if (temporary) void context.close().catch(() => {});
      throw error;
    }
  }

  dispose(): void { this.stop(); this.listeners.clear(); }

  private buildGraph(context: AudioContext) {
    this.session = context.createGain();
    this.output = context.createGain();
    this.guard = new AudioWorkletNode(context, "lino-output-guard", { outputChannelCount: [2] });
    this.session.connect(this.output).connect(this.guard).connect(context.destination);
    this.output.gain.value = this.master;
    this.session.gain.value = 1;
    context.onstatechange = () => {
      if (context !== this.context) return;
      if (context.state !== "running" && this.state.status === "playing") {
        this.stopTicker();
        this.publish({ status: "interrupted", error: "Audio was suspended by the browser. Resume playback to continue." });
      }
    };
  }

  private makeTone(mix: Mix): Tone {
    const context = this.context!;
    const { left, right } = carrierFrequencies(mix.binaural.carrier, mix.binaural.beat);
    const gain = context.createGain();
    const merger = context.createChannelMerger(2);
    const leftOsc = context.createOscillator();
    const rightOsc = context.createOscillator();
    const leftGain = context.createGain();
    const rightGain = context.createGain();
    leftOsc.type = rightOsc.type = mix.binaural.waveform;
    leftOsc.frequency.value = left;
    rightOsc.frequency.value = right;
    leftGain.gain.value = rightGain.gain.value = 1;
    leftOsc.connect(leftGain).connect(merger, 0, 0);
    rightOsc.connect(rightGain).connect(merger, 0, 1);
    merger.connect(gain).connect(this.session!);
    gain.gain.value = 0;
    leftOsc.start(); rightOsc.start();
    return { left: leftOsc, right: rightOsc, gain, merger };
  }

  private stopTone(tone: Tone, immediate = false) {
    const when = immediate ? 0 : this.context!.currentTime + 0.1;
    try { tone.left.stop(when); tone.right.stop(when); } catch { /* already stopped */ }
    tone.right.onended = () => {
      tone.left.disconnect(); tone.right.disconnect(); tone.merger.disconnect(); tone.gain.disconnect();
    };
  }

  private updateTones(mix: Mix) {
    const context = this.context!;
    const now = context.currentTime;
    const target = mix.binaural.enabled ? clamp(mix.binaural.gain, 0, 1) * BINAURAL_BUS_GAIN : 0;
    if (!this.tone || this.tone.left.type !== mix.binaural.waveform) {
      const previous = this.tone;
      this.tone = this.makeTone(mix);
      fade(this.tone.gain.gain, target, now, 0.1);
      if (previous) {
        fade(previous.gain.gain, 0, now, 0.1);
        this.stopTone(previous);
      }
    } else {
      const { left, right } = carrierFrequencies(mix.binaural.carrier, mix.binaural.beat);
      this.tone.left.frequency.setTargetAtTime(left, now, 0.03);
      this.tone.right.frequency.setTargetAtTime(right, now, 0.03);
      fade(this.tone.gain.gain, target, now);
    }
  }

  private updateLayers(mix: Mix, generation: number) {
    const context = this.context!;
    for (const id of AMBIENCE_IDS) {
      const setting = mix.ambience[id];
      if (!setting?.enabled) {
        this.requests.get(id)?.abort();
        this.requests.delete(id);
        this.removeLayer(id);
        continue;
      }
      const existing = this.layers.get(id);
      if (existing) {
        fade(existing.gain.gain, clamp(setting.gain, 0, 1) * AMBIENCE_BUS_GAIN, context.currentTime);
      } else if (noiseId(id)) {
        const gain = context.createGain();
        gain.gain.value = 0;
        const node = new AudioWorkletNode(context, "lino-noise", {
          processorOptions: { color: id }, outputChannelCount: [2],
        });
        node.connect(gain).connect(this.session!);
        this.layers.set(id, { gain, node });
        fade(gain.gain, clamp(setting.gain, 0, 1) * AMBIENCE_BUS_GAIN, context.currentTime);
      } else if (!this.requests.has(id)) {
        void this.loadRecording(id, generation);
      }
    }
  }

  private async loadRecording(id: AmbienceId, generation: number) {
    const context = this.context!;
    const request = new AbortController();
    this.requests.set(id, request);
    try {
      const manifestResponse = await fetch(`${BASE}manifest.json`, { signal: request.signal });
      if (!manifestResponse.ok) throw new Error(`Asset manifest: HTTP ${manifestResponse.status}`);
      const manifest = await manifestResponse.json() as Manifest;
      const file = manifest.assets[id]?.file;
      if (!file || !/^[a-z0-9._-]+$/i.test(file)) throw new Error("Recording unavailable");
      let buffer = this.cache.get(file);
      if (!buffer) {
        const response = await fetch(`${BASE}${file}`, { signal: request.signal });
        if (!response.ok) throw new Error(`Recording: HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 32 * 1024 * 1024) throw new Error("Recording exceeds size limit");
        const decoded = await context.decodeAudioData(bytes);
        if (generation !== this.generation || request.signal.aborted) return;
        buffer = this.makeSeamlessBuffer(context, decoded);
        if (buffer.duration < 3) throw new Error("Recording is too short to loop");
        this.putCache(file, buffer);
      } else {
        // Refresh insertion order for LRU eviction.
        this.cache.delete(file); this.cache.set(file, buffer);
      }
      if (generation !== this.generation || request.signal.aborted || !this.mix?.ambience[id].enabled) return;
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(this.session!);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      const layer: Layer = { gain, sources: new Set([source]) };
      this.layers.set(id, layer);
      fade(gain.gain, clamp(this.mix.ambience[id].gain, 0, 1) * AMBIENCE_BUS_GAIN, context.currentTime);
      source.start();
      const failedLayers = { ...this.state.failedLayers };
      delete failedLayers[id];
      this.publish({ failedLayers });
    } catch (error) {
      if (!request.signal.aborted && generation === this.generation) {
        this.publish({ failedLayers: { ...this.state.failedLayers, [id]: errorText(error) } });
      }
    } finally {
      if (this.requests.get(id) === request) this.requests.delete(id);
    }
  }

  private putCache(file: string, buffer: AudioBuffer) {
    const size = (item: AudioBuffer) => item.length * item.numberOfChannels * 4;
    if (size(buffer) > CACHE_LIMIT_BYTES) return;
    this.cache.set(file, buffer);
    let bytes = [...this.cache.values()].reduce((sum, item) => sum + size(item), 0);
    while (this.cache.size > CACHE_LIMIT_ITEMS || bytes > CACHE_LIMIT_BYTES) {
      const oldest = this.cache.keys().next().value;
      if (!oldest) break;
      bytes -= size(this.cache.get(oldest)!);
      this.cache.delete(oldest);
    }
  }

  private makeSeamlessBuffer(context: AudioContext, original: AudioBuffer): AudioBuffer {
    const overlap = Math.min(Math.floor(original.sampleRate * 1.5), Math.floor(original.length / 4));
    const length = original.length - overlap;
    const result = context.createBuffer(original.numberOfChannels, length, original.sampleRate);
    for (let channel = 0; channel < original.numberOfChannels; channel++) {
      const input = original.getChannelData(channel);
      const output = result.getChannelData(channel);
      output.set(input.subarray(overlap));
      // The discarded head blends into the tail. The final sample is then
      // adjacent to the first sample at the loop boundary.
      for (let i = 0; i < overlap; i++) {
        const alpha = (i + 1) / overlap;
        const position = length - overlap + i;
        output[position] = output[position] * (1 - alpha) + input[i] * alpha;
      }
    }
    return result;
  }

  private removeLayer(id: AmbienceId, immediate = false) {
    const layer = this.layers.get(id);
    if (!layer) return;
    this.layers.delete(id);
    const now = this.context?.currentTime ?? 0;
    if (!immediate) fade(layer.gain.gain, 0, now);
    const finish = () => {
      try { layer.node?.disconnect(); } catch { /* context closed */ }
      for (const source of layer.sources ?? []) { try { source.stop(); } catch { /* ended */ } }
      layer.gain.disconnect();
    };
    if (immediate) finish(); else setTimeout(finish, 100);
  }

  private scheduleSessionEnd(mix: Mix) {
    const context = this.context!;
    const session = this.session!;
    const now = context.currentTime;
    session.gain.cancelScheduledValues(now);
    session.gain.setValueAtTime(session.gain.value, now);
    if (mix.durationMinutes === null) { this.endAt = null; fade(session.gain, 1, now); return; }
    const total = clamp(mix.durationMinutes * 60, 1, 720 * 60);
    const fadeLength = Math.min(total, clamp(mix.fadeSeconds, 0, 120));
    this.endAt = now + total;
    fade(session.gain, 1, now);
    session.gain.setValueAtTime(1, Math.max(now + SLEW, this.endAt - fadeLength));
    session.gain.linearRampToValueAtTime(0, this.endAt);
  }

  private tick() {
    const context = this.context;
    if (!context) return;
    if (context.state === "suspended") return;
    const elapsedSeconds = Math.max(0, context.currentTime - this.beganAt);
    const remainingSeconds = this.endAt === null ? null : Math.max(0, this.endAt - context.currentTime);
    if (this.endAt !== null && context.currentTime >= this.endAt) { this.stop(); return; }
    this.publish({ elapsedSeconds, remainingSeconds });
  }

  private startTicker() {
    this.stopTicker();
    this.ticker = setInterval(() => this.tick(), 250);
  }

  private stopTicker() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  private configureMediaSession() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => { if (this.mix) void this.play(this.mix, this.master); });
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("stop", () => this.stop());
    navigator.mediaSession.playbackState = "playing";
  }
}
