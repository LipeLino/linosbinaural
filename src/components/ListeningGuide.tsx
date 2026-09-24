"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { Modal } from "./Modal";
import { PixelIcon } from "./PixelIcon";
import { FACTORY_PRESETS } from "@/lib/mix";
import {
  BAND_GUIDES,
  PRESET_GUIDES,
  SOURCE_LINKS,
} from "@/lib/listening-guide";

const intentions = [
  ["Unwind", "Desacelerar", "moon"],
  ["Take a breather", "Fazer uma pausa", "ocean"],
  ["Read & study", "Ler e estudar", "cafe"],
  ["One task at a time", "Uma tarefa por vez", "sun"],
  ["Just nature", "Só natureza", "forest"],
] as const;

export function StartHere() {
  const { tr, locale, loadMix, selected } = useApp();
  const [tour, setTour] = useState(false);
  const [chosen, setChosen] = useState(false);
  return (
    <>
      <section
        className="start-here"
        aria-label={tr(
          "Find your starting point",
          "Encontre seu ponto de partida",
        )}
      >
        <div className="start-heading">
          <span className="step-stamp" aria-hidden="true">
            01
          </span>
          <div>
            <h2>{tr("What brings you here?", "O que você procura?")}</h2>
            <p>
              {tr(
                "Pick a mood. Then press play.",
                "Escolha um clima. Depois, dê o play.",
              )}
            </p>
          </div>
          <button className="tour-button" onClick={() => setTour(true)}>
            {tr("Show me around", "Me mostre como")}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="intentions">
          {FACTORY_PRESETS.map((preset, index) => (
            <button
              key={preset.id}
              type="button"
              aria-label={`${tr(intentions[index][0], intentions[index][1])}. ${tr(`Load ${preset.en}`, `Carregar ${preset.pt}`)}`}
              aria-pressed={selected === preset.id}
              className={selected === preset.id ? "chosen" : ""}
              onClick={() => {
                loadMix(structuredClone(preset.mix), preset[locale], preset.id);
                setChosen(true);
              }}
            >
              <PixelIcon name={intentions[index][2]} size={20} />
              <span>{tr(intentions[index][0], intentions[index][1])}</span>
              <small>
                {preset.mix.binaural.enabled
                  ? `${preset.mix.binaural.beat} Hz`
                  : tr("No tones", "Sem tons")}
              </small>
            </button>
          ))}
        </div>
        {chosen && (
          <p className="start-confirmation" role="status">
            {tr(
              "Your record is on the turntable. Press Start listening when you’re ready.",
              "Seu disco está no toca-discos. Aperte Começar a ouvir quando quiser.",
            )}{" "}
            <a className="player-jump" href="#session-controls">
              {tr("Go to player", "Ir para o player")} ↓
            </a>
          </p>
        )}
      </section>
      <Modal
        open={tour}
        onClose={() => setTour(false)}
        title={tr("Your first few minutes", "Seus primeiros minutos")}
      >
        <p className="tour-intro">
          {tr(
            "No perfect settings to find. Start with a record and make it comfortable.",
            "Não existe ajuste perfeito. Comece com um disco e encontre seu conforto.",
          )}
        </p>
        <ol className="tour-steps">
          <li>
            <span aria-hidden="true">01</span>
            <div>
              <h3>{tr("Choose a little atmosphere", "Escolha um clima")}</h3>
              <p>
                {tr(
                  "The mood buttons and record shelf load a complete mix. They never start sound. Your master volume stays where you left it.",
                  "Os botões de clima e os discos carregam um mix completo, sem iniciar o som. O volume geral continua onde você deixou.",
                )}
              </p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <div>
              <h3>
                {tr(
                  "Headphones on. Volume low.",
                  "Fones no ouvido. Volume baixo.",
                )}
              </h3>
              <p>
                {tr(
                  "Use stereo headphones for binaural tones, then press Start listening. Each ear gets a slightly different tone. For speakers, choose Just nature or switch binaural tones off.",
                  "Use fones estéreo para os tons binaurais e aperte Começar a ouvir. Cada ouvido recebe um tom levemente diferente. Nos alto-falantes, escolha Só natureza ou desative os tons binaurais.",
                )}
              </p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <div>
              <h3>{tr("Make this room yours", "Deixe a sala do seu jeito")}</h3>
              <p>
                {tr(
                  "Switch ambience layers on, adjust their levels, and choose a session length. Pause keeps your place; Stop resets the timer. Sign in only when you want to save a mix to your library.",
                  "Ative sons ambientes, ajuste os volumes e escolha a duração. Pausar mantém seu progresso; Parar reinicia o tempo. Entre na conta quando quiser salvar um mix na sua coleção.",
                )}
              </p>
            </div>
          </li>
        </ol>
        <p className="tour-footnote">
          {tr(
            "Frequency names describe the sound setting, not your brain. Suggested uses are personal experiments, with no guaranteed benefit.",
            "As faixas descrevem o som, não seu cérebro. Os usos sugeridos são experiências pessoais, sem benefício garantido.",
          )}
        </p>
        <button className="button primary" onClick={() => setTour(false)}>
          {tr("Got it. Make myself at home.", "Entendi. Vou me acomodar.")}
        </button>
      </Modal>
    </>
  );
}

export function FrequencyContext() {
  const { tr, locale, mix, selected } = useApp();
  const band = BAND_GUIDES.find(
    (b) =>
      mix.binaural.beat >= b.min &&
      (mix.binaural.beat < b.max || b.id === "gamma"),
  )!;
  const selectedPreset = FACTORY_PRESETS.find((p) => p.id === selected);
  const preset =
    selectedPreset && JSON.stringify(mix) === JSON.stringify(selectedPreset.mix)
      ? selectedPreset
      : undefined;
  return (
    <div className="listening-note">
      {preset && (
        <p className="record-intention">
          <span className="tiny-light on" />
          {PRESET_GUIDES[preset.id].intent[locale]}
          <span className="intention-description">
            {PRESET_GUIDES[preset.id].description[locale]}
          </span>
        </p>
      )}
      {mix.binaural.enabled ? (
        <details className="current-frequency-note" key={band.id}>
          <summary>
            {tr(
              `About this ${band.name.en.toLowerCase()} setting`,
              `Sobre este ajuste: ${band.name.pt.toLowerCase()}`,
            )}
            <span aria-hidden="true">+</span>
          </summary>
          <div>
            <p>{band.association[locale]}</p>
            <p>{band.evidence[locale]}</p>
            <a href="#frequency-guide">
              {tr(
                "Explore all five frequency bands",
                "Conheça as cinco faixas de frequência",
              )}{" "}
              ↓
            </a>
          </div>
        </details>
      ) : (
        <p className="current-frequency-note ambience-explanation">
          {tr(
            "Just environmental sound. Headphones are optional, and there is no binaural beat in this mix.",
            "Apenas sons ambientes. Fones são opcionais e não há batida binaural neste mix.",
          )}
        </p>
      )}
    </div>
  );
}

export function FrequencyGuide() {
  const { tr, locale } = useApp();
  return (
    <section
      className="field-guide"
      id="frequency-guide"
      aria-labelledby="frequency-guide-title"
    >
      <div className="field-guide-intro">
        <span className="eyebrow">
          {tr("NOTES FROM THE LISTENING ROOM", "NOTAS DA SALA DE ESCUTA")}
        </span>
        <h2 id="frequency-guide-title">
          {tr(
            "A little guide to the frequencies.",
            "Um pequeno guia das frequências.",
          )}
        </h2>
        <p>
          {tr(
            "Sleep, calm, focus: you may have heard the promises. Here’s what the labels mean, and where the evidence stops.",
            "Sono, calma, foco: você talvez já tenha ouvido as promessas. Entenda as faixas e os limites das evidências.",
          )}
        </p>
        <div className="guide-definition">
          <strong>{tr("Beat = the difference", "Batida = a diferença")}</strong>
          <p>
            {tr(
              "The Hz setting is the difference between the two ears. Carrier changes the pitch of the tones.",
              "O valor em Hz é a diferença entre os ouvidos. A portadora muda a altura dos tons.",
            )}
          </p>
        </div>
        <p className="guide-caveat">
          {tr(
            "These names come from EEG research. Listening to a named band does not mean your brain enters that state. There is no established best frequency for an activity.",
            "Os nomes vêm da pesquisa com EEG. Ouvir uma faixa não significa que seu cérebro entra nesse estado. Não existe frequência ideal comprovada para uma atividade.",
          )}
        </p>
        <Link href="/evidence/" className="text-button">
          {tr("The science, without the promises", "A ciência, sem promessas")}{" "}
          ↗
        </Link>
      </div>
      <div className="band-pages">
        {BAND_GUIDES.map((band, index) => (
          <details className={`band-page band-${band.id}`} key={band.id}>
            <summary>
              <span className="band-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="band-name">{band.name[locale]}</span>
              <span className="band-range">
                {band.min}–{band.max} Hz
              </span>
              <span className="band-expand" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="band-page-body">
              <h3>{tr("The association", "A associação")}</h3>
              <p>{band.association[locale]}</p>
              <h3>{tr("What to expect", "O que esperar")}</h3>
              <p>{band.evidence[locale]}</p>
            </div>
          </details>
        ))}
        <p className="band-convention">
          {tr(
            "Upper boundaries belong to the next band; 40 Hz is included. EEG conventions vary.",
            "Cada limite superior pertence à próxima faixa; 40 Hz está incluído. As convenções de EEG variam.",
          )}
        </p>
        <div className="guide-sources">
          <span>{tr("Research notes", "Referências")}</span>
          {SOURCE_LINKS.map((source, index) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              aria-label={source.title}
            >
              {
                [
                  "Ingendoh et al., 2023",
                  "Corona-González et al., 2021",
                  "Marcantoni et al., 2023",
                ][index]
              }
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
