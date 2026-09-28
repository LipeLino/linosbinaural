"use client";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { Modal } from "./Modal";
import { STORAGE_PREFIX } from "@/lib/mix";
import { shouldShowSponsor, sponsorConfig, validSponsor } from "@/lib/ads";
const eventName = "linosbinaural:privacy";
export function readConsent() {
  try {
    return localStorage.getItem(STORAGE_PREFIX + "sponsors") === "allow"
      ? "allow"
      : localStorage.getItem(STORAGE_PREFIX + "sponsors") === "reject"
        ? "reject"
        : null;
  } catch {
    return null;
  }
}
export function PrivacyPreferences() {
  const { tr } = useApp();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (value: "allow" | "reject") => {
    try {
      localStorage.setItem(STORAGE_PREFIX + "sponsors", value);
    } catch {}
    window.dispatchEvent(new Event(eventName));
    setSaved(true);
  };
  return (
    <>
      <button
        className="text-button privacy-link"
        onClick={() => {
          setSaved(false);
          setOpen(true);
        }}
      >
        {tr("Privacy preferences", "Preferências de privacidade")}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tr("Your quiet. Your choice.", "Sua calma. Sua escolha.")}
      >
        <p>
          {tr(
            "Essential storage keeps your mix, language, theme and sign-in on this device. There is no behavioral analytics.",
            "O armazenamento essencial mantém seu mix, idioma, tema e acesso neste dispositivo. Não há análise comportamental.",
          )}
        </p>
        <p>
          {tr(
            "You can allow a small sponsor image below the record shelf. It is served by this site and has no advertising scripts, tracking pixels or personalized targeting. Rejecting keeps all listening features free.",
            "Você pode permitir uma pequena imagem de patrocinador abaixo da coleção. Ela é servida por este site, sem scripts publicitários, pixels de rastreamento ou segmentação personalizada. Rejeitar mantém todos os recursos de áudio grátis.",
          )}
        </p>
        <div className="button-row equal-choices">
          <button className="button secondary" onClick={() => set("allow")}>
            {tr("Allow sponsor messages", "Permitir patrocinadores")}
          </button>
          <button className="button secondary" onClick={() => set("reject")}>
            {tr("Reject sponsor messages", "Rejeitar patrocinadores")}
          </button>
        </div>
        {saved && (
          <p role="status">
            {tr(
              "Preference saved. You can change or withdraw it here at any time.",
              "Preferência salva. Você pode alterá-la ou revogá-la aqui a qualquer momento.",
            )}
          </p>
        )}
      </Modal>
    </>
  );
}
export function SponsorSlot() {
  const { tr, authLoading, entitled } = useApp();
  const [consent, setConsent] = useState<"allow" | "reject" | null>(null);
  const [host, setHost] = useState("");
  useEffect(() => {
    const update = () => setConsent(readConsent());
    setHost(window.location.hostname);
    update();
    window.addEventListener(eventName, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(eventName, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  if (
    !validSponsor(sponsorConfig) ||
    !["mateuslino.com", "www.mateuslino.com"].includes(host) ||
    authLoading ||
    entitled !== false
  )
    return null;
  const allowed = shouldShowSponsor({
    config: sponsorConfig,
    host,
    authLoading,
    entitled,
    consent,
  });
  return (
    <aside className="ad-slot" aria-label={tr("Advertisement", "Publicidade")}>
      <span className="eyebrow">{tr("ADVERTISEMENT", "PUBLICIDADE")}</span>
      {allowed ? (
        <a
          href={sponsorConfig.url}
          rel="sponsored noopener noreferrer"
          target="_blank"
        >
          <img
            src={sponsorConfig.image}
            alt={sponsorConfig.name}
            width={704}
            height={80}
            loading="lazy"
          />
        </a>
      ) : (
        <p>
          {tr(
            "Sponsor messages are off.",
            "Mensagens de patrocinadores desativadas.",
          )}
        </p>
      )}
      <PrivacyPreferences />
    </aside>
  );
}
