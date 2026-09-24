import { describe, it, expect } from "vitest";
import {
  DEFAULT_MIX,
  mixSchema,
  bandFor,
  FACTORY_PRESETS,
  toneFrequencies,
} from "../../src/lib/mix";
import {
  shouldShowSponsor,
  validSponsor,
  type SponsorConfig,
} from "../../src/lib/ads";
import worker from "../../worker/index";
import type { Env } from "../../worker/env";
describe("trusted mix boundaries", () => {
  it("classifies every boundary without overlap", () => {
    expect(
      [0.5, 3.99, 4, 7.99, 8, 12.99, 13, 29.99, 30, 40].map(bandFor),
    ).toEqual([
      "Delta",
      "Delta",
      "Theta",
      "Theta",
      "Alpha",
      "Alpha",
      "Beta",
      "Beta",
      "Gamma",
      "Gamma",
    ]);
  });
  it("validates the specified factory mixes and center carrier", () => {
    for (const preset of FACTORY_PRESETS)
      expect(mixSchema.safeParse(preset.mix).success).toBe(true);
    expect(toneFrequencies(DEFAULT_MIX)).toEqual({ left: 219, right: 221 });
  });
  it("rejects untrusted audio URLs, unsafe gains and injected fields", () => {
    expect(
      mixSchema.safeParse({
        ...DEFAULT_MIX,
        ambience: {
          ...DEFAULT_MIX.ambience,
          external: { url: "https://evil.test/audio" },
        },
      }).success,
    ).toBe(false);
    expect(mixSchema.safeParse({ ...DEFAULT_MIX, master: 1 }).success).toBe(
      false,
    );
    for (const beat of [0, 40.1, Infinity, NaN])
      expect(
        mixSchema.safeParse({
          ...DEFAULT_MIX,
          binaural: { ...DEFAULT_MIX.binaural, beat },
        }).success,
      ).toBe(false);
    expect(
      mixSchema.safeParse({ ...DEFAULT_MIX, durationMinutes: null }).success,
    ).toBe(true);
  });
});
describe("sponsor privacy gate", () => {
  const config: SponsorConfig = {
    enabled: true,
    production: true,
    approved: true,
    name: "Configured sponsor",
    image: "/linosbinaural/sponsors/approved.webp",
    url: "https://example.org",
  };
  const allowed = {
    config,
    host: "mateuslino.com",
    authLoading: false,
    entitled: false,
    consent: "allow" as const,
  };
  it("requires every production, consent and entitlement gate", () => {
    expect(shouldShowSponsor(allowed)).toBe(true);
    for (const patch of [
      { entitled: true },
      { entitled: null },
      { authLoading: true },
      { consent: "reject" as const },
      { consent: null },
      { host: "localhost" },
      { host: "preview.example.org" },
    ])
      expect(shouldShowSponsor({ ...allowed, ...patch })).toBe(false);
    expect(
      shouldShowSponsor({ ...allowed, config: { ...config, approved: false } }),
    ).toBe(false);
    expect(
      shouldShowSponsor({
        ...allowed,
        config: { ...config, production: false },
      }),
    ).toBe(false);
  });
  it("never permits arbitrary image URLs or unsafe destinations", () => {
    expect(
      validSponsor({ ...config, image: "https://tracker.test/a.png" }),
    ).toBe(false);
    expect(validSponsor({ ...config, url: "javascript:alert(1)" })).toBe(false);
  });
});
describe("isolated worker boundary", () => {
  const env = { PUBLIC_ORIGIN: "http://127.0.0.1:8787" } as Env;
  it("does not take over portfolio routes", async () => {
    const result = await worker.fetch(
      new Request("https://mateuslino.com/"),
      env,
    );
    expect(result.status).toBe(404);
  });
  it("normalizes only the exact application path", async () => {
    const result = await worker.fetch(
      new Request("https://mateuslino.com/linosbinaural"),
      env,
    );
    expect(result.status).toBe(308);
    expect(result.headers.get("location")).toBe("/linosbinaural/");
  });
  it("fails closed for missing account services with no-store and security headers", async () => {
    const result = await worker.fetch(
      new Request("https://mateuslino.com/linosbinaural/api/account"),
      env,
    );
    expect(result.status).toBe(503);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("content-security-policy")).toContain(
      "script-src-attr 'none'",
    );
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
