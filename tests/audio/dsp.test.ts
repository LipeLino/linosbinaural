import { describe, expect, it } from "vitest";
import {
  AMBIENCE_BUS_GAIN,
  AMBIENCE_IDS,
  BINAURAL_BUS_GAIN,
  OUTPUT_CEILING,
  carrierFrequencies,
  clamp,
  maximumLinearSum,
  noiseId,
} from "../../src/audio/dsp";

describe("audio mix constraints", () => {
  it("uses carrier as the exact stereo center over both boundary beats", () => {
    for (const carrier of [200, 310, 500]) {
      for (const beat of [0.5, 4, 8, 13, 30, 40]) {
        const { left, right } = carrierFrequencies(carrier, beat);
        expect(right - left).toBeCloseTo(beat, 10);
        expect((left + right) / 2).toBeCloseTo(carrier, 10);
      }
    }
  });

  it("bounds invalid inputs and all nominal full-scale layers below unity", () => {
    expect(carrierFrequencies(900, 80)).toEqual({ left: 480, right: 520 });
    expect(clamp(Number.NaN, 0, 1)).toBe(0);
    expect(BINAURAL_BUS_GAIN + 8 * AMBIENCE_BUS_GAIN).toBe(maximumLinearSum());
    expect(maximumLinearSum()).toBeLessThan(1);
    expect(OUTPUT_CEILING).toBeGreaterThan(maximumLinearSum());
  });

  it("keeps five recordings distinct from three procedural noise layers", () => {
    expect(AMBIENCE_IDS).toHaveLength(8);
    expect(AMBIENCE_IDS.filter(noiseId)).toEqual(["white", "pink", "brown"]);
    expect(new Set(AMBIENCE_IDS).size).toBe(8);
  });
});
