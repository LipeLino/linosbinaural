import { z } from "zod";

// Strict browser CSP and Workers forbid runtime code generation.
z.config({ jitless: true });

export const AMBIENCE_IDS = [
  "rain",
  "ocean",
  "cafe",
  "forest",
  "fireplace",
  "white",
  "pink",
  "brown",
] as const;
export type AmbienceId = (typeof AMBIENCE_IDS)[number];
export const COVER_IDS = [
  "moon",
  "shore",
  "cafe",
  "lantern",
  "forest",
] as const;
const layer = z
  .object({ enabled: z.boolean(), gain: z.number().finite().min(0).max(1) })
  .strict();
export const mixSchema = z
  .object({
    version: z.literal(1),
    binaural: z
      .object({
        enabled: z.boolean(),
        beat: z.number().finite().min(0.5).max(40),
        carrier: z.number().finite().min(200).max(500),
        waveform: z.enum(["sine", "triangle", "square", "sawtooth"]),
        gain: z.number().finite().min(0).max(1),
      })
      .strict(),
    ambience: z
      .object({
        rain: layer,
        ocean: layer,
        cafe: layer,
        forest: layer,
        fireplace: layer,
        white: layer,
        pink: layer,
        brown: layer,
      })
      .strict(),
    durationMinutes: z.number().finite().min(1).max(720).nullable(),
    fadeSeconds: z.number().finite().min(2).max(30),
    cover: z.enum(COVER_IDS),
  })
  .strict();
export type Mix = z.infer<typeof mixSchema>;
export const presetSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().max(280),
    mix: mixSchema,
  })
  .strict();
export type PresetInput = z.infer<typeof presetSchema>;
export function bandFor(beat: number) {
  if (beat < 4) return "Delta";
  if (beat < 8) return "Theta";
  if (beat < 13) return "Alpha";
  if (beat < 30) return "Beta";
  return "Gamma";
}
export function toneFrequencies(mix: Mix) {
  return {
    left: mix.binaural.carrier - mix.binaural.beat / 2,
    right: mix.binaural.carrier + mix.binaural.beat / 2,
  };
}
export function emptyAmbience(): Mix["ambience"] {
  return Object.fromEntries(
    AMBIENCE_IDS.map((id) => [id, { enabled: false, gain: 0.25 }]),
  ) as Mix["ambience"];
}
function preset(
  cover: Mix["cover"],
  beat: number,
  carrier: number,
  duration: number,
  sound: AmbienceId,
  enabled = true,
): Mix {
  const ambience = emptyAmbience();
  ambience[sound] = { enabled: true, gain: 0.35 };
  return {
    version: 1,
    binaural: { enabled, beat, carrier, waveform: "sine", gain: 0.18 },
    ambience,
    durationMinutes: duration,
    fadeSeconds: 8,
    cover,
  };
}
export const FACTORY_PRESETS = [
  {
    id: "moon",
    en: "Moonlit Rain",
    pt: "Chuva ao luar",
    tagEn: "WIND DOWN",
    tagPt: "DESACELERAR",
    descriptionEn: "A soft rain for the end of the day.",
    descriptionPt: "Uma chuva suave para encerrar o dia.",
    mix: preset("moon", 2, 220, 60, "rain"),
  },
  {
    id: "shore",
    en: "Quiet Shore",
    pt: "Mar tranquilo",
    tagEn: "A QUIET MOMENT",
    tagPt: "UM MOMENTO DE PAZ",
    descriptionEn: "A little space between the waves.",
    descriptionPt: "Um pouco de espaço entre as ondas.",
    mix: preset("shore", 6, 250, 20, "ocean"),
  },
  {
    id: "cafe",
    en: "Window Seat",
    pt: "À janela",
    tagEn: "RELAXED STUDY",
    tagPt: "ESTUDO LEVE",
    descriptionEn: "Your favorite corner, a fresh page.",
    descriptionPt: "Seu canto favorito, uma página nova.",
    mix: preset("cafe", 10, 330, 30, "cafe"),
  },
  {
    id: "lantern",
    en: "Study Lantern",
    pt: "Luz de estudo",
    tagEn: "FOCUSED WORK",
    tagPt: "CONCENTRAÇÃO",
    descriptionEn: "Settle in. One thing at a time.",
    descriptionPt: "Acomode-se. Uma coisa de cada vez.",
    mix: preset("lantern", 16, 440, 25, "pink"),
  },
  {
    id: "forest",
    en: "Forest Cabin",
    pt: "Cabana na floresta",
    tagEn: "JUST AMBIENCE",
    tagPt: "SÓ AMBIENTE",
    descriptionEn: "Leave the door open to the woods.",
    descriptionPt: "Deixe a porta aberta para a floresta.",
    mix: preset("forest", 6, 250, 30, "forest", false),
  },
] as const;
export const DEFAULT_MIX: Mix = structuredClone(FACTORY_PRESETS[0].mix);
export const BASE_PATH = "/builds/linosbinaural";
export const STORAGE_PREFIX = "linosbinaural:v1:";
export function assetPath(path: string) {
  return `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
}
