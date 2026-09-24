export type SponsorConfig = {
  enabled: boolean;
  production: boolean;
  approved: boolean;
  name: string;
  image: string;
  url: string;
};
export function validSponsor(config: SponsorConfig) {
  if (
    !config.enabled ||
    !config.production ||
    !config.approved ||
    !config.name.trim() ||
    config.name.length > 100 ||
    !/^\/linosbinaural\/sponsors\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(
      config.image,
    )
  )
    return false;
  try {
    return new URL(config.url).protocol === "https:";
  } catch {
    return false;
  }
}
export function shouldShowSponsor({
  config,
  host,
  authLoading,
  entitled,
  consent,
}: {
  config: SponsorConfig;
  host: string;
  authLoading: boolean;
  entitled: boolean | null;
  consent: "allow" | "reject" | null;
}) {
  return (
    validSponsor(config) &&
    host === "mateuslino.com" &&
    !authLoading &&
    entitled === false &&
    consent === "allow"
  );
}
export const sponsorConfig: SponsorConfig = {
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === "true",
  production: process.env.NEXT_PUBLIC_APP_ENV === "production",
  approved: process.env.NEXT_PUBLIC_SPONSOR_APPROVED === "true",
  name: process.env.NEXT_PUBLIC_SPONSOR_NAME ?? "",
  image: process.env.NEXT_PUBLIC_SPONSOR_IMAGE ?? "",
  url: process.env.NEXT_PUBLIC_SPONSOR_URL ?? "",
};
