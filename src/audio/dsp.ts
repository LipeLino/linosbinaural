export const AMBIENCE_IDS = [
  "rain", "ocean", "cafe", "forest", "fireplace", "white", "pink", "brown",
] as const;

export type AmbienceId = (typeof AMBIENCE_IDS)[number];
export type NoiseId = "white" | "pink" | "brown";

// Keeping every layer below unity provides headroom even if all eight are at
// full scale. The worklet output guard is an independent last-resort bound.
export const BINAURAL_BUS_GAIN = 0.18;
export const AMBIENCE_BUS_GAIN = 0.08;
export const OUTPUT_CEILING = 0.92;

export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

export function carrierFrequencies(carrier: number, beat: number): {
  left: number;
  right: number;
} {
  const center = clamp(carrier, 200, 500);
  const difference = clamp(beat, 0.5, 40);
  return { left: center - difference / 2, right: center + difference / 2 };
}

export function maximumLinearSum(): number {
  return BINAURAL_BUS_GAIN + AMBIENCE_IDS.length * AMBIENCE_BUS_GAIN;
}

export function noiseId(id: AmbienceId): id is NoiseId {
  return id === "white" || id === "pink" || id === "brown";
}
