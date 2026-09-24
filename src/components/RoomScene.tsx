"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { assetPath, STORAGE_PREFIX } from "@/lib/mix";
import { useApp } from "./AppProvider";

export function RoomScene() {
  const { tr, audio, mix } = useApp();
  const [greeting, setGreeting] = useState<"miso" | "maple" | null>(null);
  const [motion, setMotion] = useState(true);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    try {
      setMotion(localStorage.getItem(STORAGE_PREFIX + "room-motion") !== "off");
    } catch {}
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    setReady(true);
    return () => preference.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.roomMotion =
      motion && !reducedMotion ? "on" : "off";
    try {
      localStorage.setItem(
        STORAGE_PREFIX + "room-motion",
        motion ? "on" : "off",
      );
    } catch {}
  }, [motion, ready, reducedMotion]);
  useEffect(() => {
    if (!greeting) return;
    const timer = setTimeout(() => setGreeting(null), 3000);
    return () => clearTimeout(timer);
  }, [greeting]);
  return (
    <>
      <div
        className={`room-scene ${audio.status === "playing" ? "playing" : ""} ${mix.ambience.rain.enabled ? "raining" : ""}`}
      >
        <Image
          src={assetPath("art/listening-room.svg")}
          width={1024}
          height={352}
          alt=""
          priority
        />
        <span className="scene-plaque" id="desk-heading">
          {tr("THE LISTENING ROOM", "A SALA DE ESCUTA")}
        </span>
        <div className="window-rain" aria-hidden="true" />
        <span className="lamp-glow" aria-hidden="true" />
        <span className="mug-steam" aria-hidden="true" />
        {(["miso", "maple"] as const).map((pet) => (
          <button
            key={pet}
            type="button"
            className={`room-pet pet-${pet} ${greeting === pet ? "petted" : ""}`}
            onClick={() => setGreeting(pet)}
            aria-label={
              pet === "miso"
                ? tr("Pet Miso the cat", "Fazer carinho no gato Miso")
                : tr("Pet Maple the dog", "Fazer carinho no cachorro Maple")
            }
          >
            <span className="pet-heart" aria-hidden="true">
              <svg
                width="20"
                height="18"
                viewBox="0 0 12 10"
                fill="currentColor"
                shapeRendering="crispEdges"
              >
                <path d="M1 0h3v1h1v1h2V1h1V0h3v1h1v4h-1v1h-1v1H9v1H8v1H7v1H5V9H4V8H3V7H2V6H1V5H0V1h1Z" />
              </svg>
            </span>
            <Image
              src={assetPath(`art/pet-${pet}.svg`)}
              width={128}
              height={96}
              alt=""
            />
            <span className="pet-name">
              {pet === "miso" ? "Miso" : "Maple"}
            </span>
          </button>
        ))}
      </div>
      <div className="room-caption">
        <span className="pet-message" role="status">
          {greeting === "miso"
            ? tr(
                "Miso leans into your hand. A quiet little friend.",
                "Miso se aconchega na sua mão. Um amigo tranquilo.",
              )
            : greeting === "maple"
              ? tr(
                  "Maple gives a little tail wag. You’re in good company.",
                  "Maple abana o rabo. Você está em boa companhia.",
                )
              : tr(
                  "Miso & Maple · tap a pet to say hello.",
                  "Miso e Maple · toque em um deles para dar um oi.",
                )}
        </span>
        {reducedMotion ? (
          <span className="room-motion-hint">
            {tr("Reduced motion is on", "Movimento reduzido ativo")}
          </span>
        ) : (
          <button
            type="button"
            className="room-motion"
            aria-pressed={!motion}
            onClick={() => setMotion(!motion)}
          >
            {motion
              ? tr("Pause room motion", "Pausar animações")
              : tr("Resume room motion", "Retomar animações")}
          </button>
        )}
      </div>
    </>
  );
}
