"use client";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import { PixelIcon } from "./PixelIcon";
import { FACTORY_PRESETS } from "@/lib/mix";
export function PlayerDock() {
  const {
    tr,
    locale,
    selected,
    audio,
    play,
    engine,
    title,
    master,
    setMaster,
  } = useApp();
  const path = usePathname();
  const record = FACTORY_PRESETS.find((p) => p.id === selected);
  const displayTitle = record
    ? locale === "en"
      ? record.en
      : record.pt
    : title;
  if (audio.status === "idle" || audio.status === "error") return null;
  const home = path === "/" || path === "/linosbinaural/";
  return (
    <aside
      className={`player-dock ${home ? "home-dock" : ""}`}
      aria-label={tr("Persistent player", "Reprodutor persistente")}
    >
      <div>
        <span className="eyebrow">
          {tr("ON THE TURNTABLE", "NO TOCA-DISCOS")}
        </span>
        <strong>{displayTitle}</strong>
      </div>
      <button
        className="button primary"
        onClick={() => (audio.status === "playing" ? engine.pause() : play())}
        disabled={audio.status === "loading"}
        aria-label={
          audio.status === "playing"
            ? tr("Pause playback", "Pausar reprodução")
            : tr("Resume playback", "Continuar reprodução")
        }
      >
        <PixelIcon
          name={audio.status === "playing" ? "pause" : "play"}
          size={18}
        />
      </button>
      <button
        className="icon-button"
        onClick={() => engine.stop()}
        aria-label={tr("Stop playback", "Parar reprodução")}
      >
        <PixelIcon name="stop" size={16} />
      </button>
      <label>
        <span className="sr-only">
          {tr("Player volume", "Volume do reprodutor")}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={master * 100}
          onChange={(e) => setMaster(Number(e.target.value) / 100)}
        />
      </label>
    </aside>
  );
}
