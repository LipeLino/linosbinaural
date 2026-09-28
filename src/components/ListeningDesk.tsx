"use client";
import { useId, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useApp } from "./AppProvider";
import { PixelIcon } from "./PixelIcon";
import { Modal } from "./Modal";
import { SponsorSlot } from "./SponsorSlot";
import { RoomScene } from "./RoomScene";
import { StartHere, FrequencyContext, FrequencyGuide } from "./ListeningGuide";
import {
  AMBIENCE_IDS,
  FACTORY_PRESETS,
  bandFor,
  toneFrequencies,
  assetPath,
  type Mix,
} from "@/lib/mix";
import { api } from "@/lib/api";
import { authAvailable } from "@/lib/auth";

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "%",
  onChange,
  disabled = false,
  compact = false,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className={`slider-field ${compact ? "compact" : ""}`}>
      <div className="slider-label">
        <label htmlFor={id}>{label}</label>
        <span className="numeric-value">
          <input
            aria-label={`${label} (${unit})`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(value.toFixed(2))}
            disabled={disabled}
            onChange={(e) => {
              if (
                e.target.value !== "" &&
                Number.isFinite(e.target.valueAsNumber)
              )
                onChange(Math.max(min, Math.min(max, e.target.valueAsNumber)));
            }}
          />
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={
          {
            "--fill": `${((value - min) / (max - min)) * 100}%`,
          } as CSSProperties
        }
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`toggle ${on ? "is-on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
const ambienceLabels = {
  rain: ["Rain", "Chuva"],
  ocean: ["Ocean waves", "Ondas do mar"],
  cafe: ["Café", "Café"],
  forest: ["Forest", "Floresta"],
  fireplace: ["Fireplace", "Lareira"],
  white: ["White noise", "Ruído branco"],
  pink: ["Pink noise", "Ruído rosa"],
  brown: ["Brown noise", "Ruído marrom"],
} as const;
export function AmbiencePanel() {
  const { mix, setMix, tr, audio } = useApp();
  const active = AMBIENCE_IDS.filter((id) => mix.ambience[id].enabled).length;
  return (
    <aside
      className="ambience-panel wood-frame"
      aria-labelledby="ambience-heading"
    >
      <div className="ambience-heading">
        <span className="eyebrow">{tr("MAKE IT YOURS", "DO SEU JEITO")}</span>
        <h2 id="ambience-heading">{tr("Outside & around", "Ao seu redor")}</h2>
        <p>
          {tr(
            "A few sounds. Your kind of quiet.",
            "Alguns sons. Seu tipo de silêncio.",
          )}
        </p>
      </div>
      <div className="ambience-list">
        {AMBIENCE_IDS.map((id) => {
          const layer = mix.ambience[id];
          const name = tr(ambienceLabels[id][0], ambienceLabels[id][1]);
          return (
            <div
              className={`ambience-row ${layer.enabled ? "enabled" : ""}`}
              key={id}
            >
              <div className={`sound-icon ${id}`}>
                <PixelIcon name={id} size={24} />
              </div>
              <div className="sound-control">
                <div className="sound-top">
                  <span>{name}</span>
                  <Toggle
                    label={tr(`Enable ${name}`, `Ativar ${name}`)}
                    on={layer.enabled}
                    onChange={() =>
                      setMix({
                        ...mix,
                        ambience: {
                          ...mix.ambience,
                          [id]: { ...layer, enabled: !layer.enabled },
                        },
                      })
                    }
                  />
                </div>
                <Slider
                  label={tr(`${name} level`, `Volume de ${name}`)}
                  value={layer.gain * 100}
                  compact
                  disabled={!layer.enabled}
                  onChange={(gain) =>
                    setMix({
                      ...mix,
                      ambience: {
                        ...mix.ambience,
                        [id]: { ...layer, gain: gain / 100 },
                      },
                    })
                  }
                />
                {audio.failedLayers[id] && (
                  <p className="field-error">
                    {tr(
                      "Could not load. Toggle to retry.",
                      "Não foi possível carregar. Desative e ative para tentar novamente.",
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ambience-foot">
        <span className={`tiny-light ${active ? "on" : ""}`} />
        {tr(
          `${active} layer${active === 1 ? "" : "s"} selected`,
          `${active} camada${active === 1 ? "" : "s"} selecionada${active === 1 ? "" : "s"}`,
        )}
      </div>
    </aside>
  );
}
export function RecordShelf() {
  const { tr, locale, loadMix, selected } = useApp();
  return (
    <section className="record-section" aria-labelledby="record-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {tr("PICK A PLACE TO BEGIN", "ESCOLHA POR ONDE COMEÇAR")}
          </span>
          <h2 id="record-heading">
            {tr("From the record shelf", "Da nossa coleção")}
          </h2>
        </div>
        <span className="shelf-note">
          {tr(
            "Suggested starting points. Make them your own.",
            "Pontos de partida. Dê seu toque.",
          )}
        </span>
      </div>
      <ul className="record-shelf">
        {FACTORY_PRESETS.map((record) => (
          <li key={record.id}>
            <button
              className={`record-choice ${selected === record.id ? "selected" : ""}`}
              onClick={() =>
                loadMix(
                  structuredClone(record.mix),
                  locale === "en" ? record.en : record.pt,
                  record.id,
                )
              }
              aria-pressed={selected === record.id}
            >
              <div className="sleeve">
                <div className="vinyl-peek" />
                <Image
                  src={assetPath(`art/cover-${record.id}.svg`)}
                  width={192}
                  height={192}
                  alt=""
                />
                <span className="sleeve-number">
                  {String(FACTORY_PRESETS.indexOf(record) + 1).padStart(2, "0")}
                </span>
              </div>
              <strong>{locale === "en" ? record.en : record.pt}</strong>
              <span>{locale === "en" ? record.tagEn : record.tagPt}</span>
              <small>
                {record.mix.binaural.enabled
                  ? `${record.mix.binaural.beat} Hz · `
                  : tr("Ambience · ", "Ambiente · ")}
                {record.mix.durationMinutes} min
              </small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function SaveMixButton() {
  const {
    tr,
    session,
    mix,
    title,
    loadMix,
    setNotice,
    editableMixId,
    notifyMixSaved,
    description: currentDescription,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(title);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button secondary save-button"
        onClick={() => {
          setName(title);
          setDescription(currentDescription);
          setError("");
          setOpen(true);
        }}
      >
        <PixelIcon name="save" size={17} />
        {tr("Save mix", "Salvar mix")}
      </button>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={tr("Keep this little moment", "Guarde este momento")}
      >
        {!session && !authAvailable ? (
          <>
            <p>
              {tr(
                "Your mix is already kept on this device as you adjust it. Accounts and cloud libraries are not connected in this release.",
                "Seu mix já fica guardado neste aparelho enquanto você faz ajustes. Contas e coleções na nuvem não estão conectadas nesta versão.",
              )}
            </p>
            <button className="button primary" onClick={() => setOpen(false)}>
              {tr("Got it", "Entendi")}
            </button>
          </>
        ) : !session ? (
          <>
            <p>
              {tr(
                "Sign in to save private mixes to your shelf and listen on another device. Your current mix will stay here.",
                "Entre para salvar mixes privados na sua coleção e ouvir em outro dispositivo. Seu mix atual fica aqui.",
              )}
            </p>
            <Link
              href="/account/"
              className="button primary"
              onClick={() => setOpen(false)}
            >
              {tr("Sign in or create account", "Entrar ou criar conta")}
            </Link>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const input = {
                  title: name.trim(),
                  description: description.trim(),
                  mix,
                };
                const record =
                  editableMixId &&
                  !FACTORY_PRESETS.some((p) => p.id === editableMixId)
                    ? await api.updateMix(editableMixId, input)
                    : await api.saveMix(input);
                loadMix(
                  record.mix,
                  record.title,
                  record.id,
                  record.description,
                );
                notifyMixSaved();
                setNotice(
                  record.publishedAt
                    ? tr(
                        "Changes saved. Your shared link includes this update.",
                        "Alterações salvas. Seu link compartilhado inclui esta atualização.",
                      )
                    : tr(
                        "Mix saved privately to your library.",
                        "Mix salvo de forma privada na sua coleção.",
                      ),
                );
                setOpen(false);
              } catch {
                setError(
                  tr(
                    "Could not save this mix. Check your connection and try again.",
                    "Não foi possível salvar. Confira sua conexão e tente novamente.",
                  ),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="form-field">
              {tr("Record title", "Nome do disco")}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
              />
            </label>
            <label className="form-field">
              {tr("A little note (optional)", "Uma nota (opcional)")}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
              />
            </label>
            <p className="muted">
              {tr(
                "Private by default. You choose if you share it.",
                "Privado por padrão. Você decide se quer compartilhar.",
              )}
            </p>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy || !name.trim()}>
              {busy
                ? tr("Saving…", "Salvando…")
                : tr("Save to my shelf", "Salvar na coleção")}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
export function Transport({ compact = false }: { compact?: boolean }) {
  const { tr, audio, engine, play, mix, master, setMaster } = useApp();
  const playing = audio.status === "playing";
  const pending = audio.status === "loading";
  return (
    <div
      id={compact ? undefined : "session-controls"}
      tabIndex={-1}
      className={`transport ${compact ? "mini-transport" : ""}`}
    >
      <button
        className="button play-button"
        onClick={() => (playing ? engine.pause() : play())}
        disabled={pending}
        aria-label={
          playing
            ? tr("Pause session", "Pausar sessão")
            : tr("Play session", "Reproduzir sessão")
        }
      >
        <PixelIcon name={playing ? "pause" : "play"} size={20} />
        <span>
          {pending
            ? tr("Starting…", "Iniciando…")
            : playing
              ? tr("Pause", "Pausar")
              : audio.status === "paused" || audio.status === "interrupted"
                ? tr("Resume", "Continuar")
                : tr("Start listening", "Começar a ouvir")}
        </span>
      </button>
      <button
        className="icon-button stop-button"
        onClick={() => engine.stop()}
        disabled={audio.status === "idle"}
        aria-label={tr("Stop and reset session", "Parar e reiniciar sessão")}
      >
        <PixelIcon name="stop" size={18} />
      </button>
      <div className="transport-time">
        <PixelIcon name="clock" size={16} />
        <span>
          {audio.remainingSeconds !== null
            ? formatTime(audio.remainingSeconds)
            : mix.durationMinutes === null
              ? "∞"
              : formatTime(mix.durationMinutes * 60)}
        </span>
      </div>
      <div className="master-control">
        <PixelIcon name="volume" size={19} />
        <Slider
          label={tr("Master volume", "Volume geral")}
          value={master * 100}
          onChange={(v) => setMaster(v / 100)}
          compact
        />
      </div>
    </div>
  );
}
export function ListeningDesk() {
  const { tr, locale, mix, setMix, title, selected, audio, engine } = useApp();
  const [advanced, setAdvanced] = useState(false);
  const [custom, setCustom] = useState(false);
  const frequencies = toneFrequencies(mix);
  const record = FACTORY_PRESETS.find((p) => p.id === selected);
  const currentTitle = record
    ? locale === "en"
      ? record.en
      : record.pt
    : title;
  const updateTone = (patch: Partial<Mix["binaural"]>) =>
    setMix({ ...mix, binaural: { ...mix.binaural, ...patch } });
  return (
    <main id="main" className="home-main">
      <div className="welcome-row">
        <div>
          <h1>{tr("Come in. Tune out.", "Entre. Desacelere.")}</h1>
          <p>
            {tr(
              "A little woodland room. A sound that’s entirely yours.",
              "Um cantinho na floresta. Um som inteiramente seu.",
            )}
          </p>
        </div>
        <span className="open-sign">
          <span className="tiny-light on" />
          {tr("FREE TO LISTEN", "GRÁTIS PARA OUVIR")}
        </span>
      </div>
      <StartHere />
      <div className="listening-layout">
        <section
          className="listening-console wood-frame"
          aria-labelledby="desk-heading"
        >
          <RoomScene />
          <div className="console-face">
            <div className="now-playing">
              <div className="turntable-deck" aria-hidden="true">
                <span className="tonearm" />
                <div
                  className={`mini-vinyl ${audio.status === "playing" ? "spinning" : ""}`}
                >
                  <Image
                    src={assetPath(`art/cover-${mix.cover}.svg`)}
                    width={28}
                    height={28}
                    alt=""
                  />
                </div>
              </div>
              <div>
                <span className="eyebrow">
                  {audio.status === "playing"
                    ? tr("NOW PLAYING", "TOCANDO AGORA")
                    : tr("ON THE TURNTABLE", "NO TOCA-DISCOS")}
                </span>
                <h2>{currentTitle}</h2>
              </div>
              <SaveMixButton />
            </div>
            <Transport />
            <div className="binaural-head">
              <div>
                <h3>{tr("Binaural tones", "Tons binaurais")}</h3>
                <span>
                  {tr(
                    "Two ears. A little difference.",
                    "Dois ouvidos. Uma pequena diferença.",
                  )}
                </span>
              </div>
              <Toggle
                label={tr("Enable binaural tones", "Ativar tons binaurais")}
                on={mix.binaural.enabled}
                onChange={() => updateTone({ enabled: !mix.binaural.enabled })}
              />
            </div>
            <div
              className={`frequency-controls ${!mix.binaural.enabled ? "tones-off" : ""}`}
            >
              <div className="frequency-screen">
                <span className="eyebrow">
                  {tr("BEAT FREQUENCY", "FREQUÊNCIA DA BATIDA")}
                </span>
                <div className="frequency-number">
                  {mix.binaural.beat.toFixed(1)}
                  <span>Hz</span>
                </div>
                <span className="band-badge">
                  {tr(
                    bandFor(mix.binaural.beat),
                    (
                      {
                        Delta: "Delta",
                        Theta: "Teta",
                        Alpha: "Alfa",
                        Beta: "Beta",
                        Gamma: "Gama",
                      } as const
                    )[bandFor(mix.binaural.beat)],
                  )}
                  {mix.binaural.beat >= 30
                    ? tr(" · experiment", " · experimento")
                    : ""}
                </span>
                <div className="wave-lines" aria-hidden="true">
                  <svg viewBox="0 0 180 22">
                    <path d="M0 11 Q10 -7 20 11T40 11T60 11T80 11T100 11T120 11T140 11T160 11T180 11" />
                    <path d="M0 11 Q15 27 30 11T60 11T90 11T120 11T150 11T180 11" />
                  </svg>
                </div>
              </div>
              <div className="frequency-sliders">
                <Slider
                  label={tr("Beat frequency", "Frequência da batida")}
                  value={mix.binaural.beat}
                  min={0.5}
                  max={40}
                  step={0.1}
                  unit="Hz"
                  disabled={!mix.binaural.enabled}
                  onChange={(beat) => updateTone({ beat })}
                />
                <Slider
                  label={tr("Carrier frequency", "Frequência portadora")}
                  value={mix.binaural.carrier}
                  min={200}
                  max={500}
                  unit="Hz"
                  disabled={!mix.binaural.enabled}
                  onChange={(carrier) => updateTone({ carrier })}
                />
                <Slider
                  label={tr("Tone level", "Volume dos tons")}
                  value={mix.binaural.gain * 100}
                  disabled={!mix.binaural.enabled}
                  onChange={(gain) => updateTone({ gain: gain / 100 })}
                />
              </div>
            </div>
            {!mix.binaural.enabled && (
              <p className="ambience-only-note">
                {tr(
                  "Ambience only. Headphones are optional.",
                  "Só ambiente. Fones são opcionais.",
                )}
              </p>
            )}
            <div className="session-row">
              <div className="duration-field">
                <label htmlFor="duration">
                  <PixelIcon name="clock" size={16} />
                  {tr("Stay a while", "Fique um pouco")}
                </label>
                <select
                  id="duration"
                  value={
                    custom ? "custom" : (mix.durationMinutes ?? "continuous")
                  }
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setCustom(true);
                      return;
                    }
                    setCustom(false);
                    setMix({
                      ...mix,
                      durationMinutes:
                        e.target.value === "continuous"
                          ? null
                          : Number(e.target.value),
                    });
                  }}
                >
                  {[15, 20, 25, 30, 45, 60, 90].map((m) => (
                    <option value={m} key={m}>
                      {m} min
                    </option>
                  ))}
                  {mix.durationMinutes !== null &&
                    ![15, 20, 25, 30, 45, 60, 90].includes(
                      mix.durationMinutes,
                    ) && (
                      <option value={mix.durationMinutes}>
                        {mix.durationMinutes} min
                      </option>
                    )}
                  <option value="continuous">
                    {tr("Continuous", "Contínuo")}
                  </option>
                  <option value="custom">
                    {tr("Custom…", "Personalizar…")}
                  </option>
                </select>
                {custom && (
                  <input
                    type="number"
                    aria-label={tr(
                      "Custom duration in minutes",
                      "Duração personalizada em minutos",
                    )}
                    min={1}
                    max={720}
                    value={mix.durationMinutes ?? 30}
                    onChange={(e) => {
                      if (
                        e.target.valueAsNumber >= 1 &&
                        e.target.valueAsNumber <= 720
                      )
                        setMix({
                          ...mix,
                          durationMinutes: e.target.valueAsNumber,
                        });
                    }}
                  />
                )}
              </div>
              <button
                className="text-button advanced-button"
                onClick={() => setAdvanced(!advanced)}
                aria-expanded={advanced}
                aria-controls="advanced-audio"
              >
                {tr("Fine tuning", "Ajuste fino")}{" "}
                <span aria-hidden="true">{advanced ? "−" : "+"}</span>
              </button>
            </div>
            {advanced && (
              <div className="advanced-panel" id="advanced-audio">
                <p>
                  {tr(
                    `Left: ${frequencies.left} Hz · Right: ${frequencies.right} Hz. Carrier is the center frequency.`,
                    `Esquerdo: ${frequencies.left} Hz · Direito: ${frequencies.right} Hz. A portadora é a frequência central.`,
                  )}
                </p>
                <label className="form-field">
                  {tr("Sound texture", "Textura sonora")}
                  <select
                    value={mix.binaural.waveform}
                    onChange={(e) =>
                      updateTone({
                        waveform: e.target.value as Mix["binaural"]["waveform"],
                      })
                    }
                  >
                    <option value="sine">
                      {tr("Sine (standard)", "Senoidal (padrão)")}
                    </option>
                    <option value="triangle">
                      {tr("Triangle", "Triangular")}
                    </option>
                    <option value="square">{tr("Square", "Quadrada")}</option>
                    <option value="sawtooth">
                      {tr("Sawtooth", "Dente de serra")}
                    </option>
                  </select>
                </label>
                <p className="muted">
                  {tr(
                    "Other textures add harmonics. Research with sine tones does not establish the same effects for these waveforms.",
                    "Outras texturas adicionam harmônicos. Pesquisas com tons senoidais não estabelecem os mesmos efeitos para essas formas de onda.",
                  )}
                </p>
                <Slider
                  label={tr("End fade", "Fade ao encerrar")}
                  min={2}
                  max={30}
                  unit="s"
                  value={mix.fadeSeconds}
                  onChange={(fadeSeconds) => setMix({ ...mix, fadeSeconds })}
                />
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => void engine.channelCheck("left")}
                  >
                    {tr("Check left ear", "Testar ouvido esquerdo")}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => void engine.channelCheck("right")}
                  >
                    {tr("Check right ear", "Testar ouvido direito")}
                  </button>
                </div>
                <p className="muted">
                  {tr(
                    "The band names classify the selected frequency, not your brain activity. Mixer percentages are not calibrated loudness.",
                    "As faixas classificam a frequência selecionada, não sua atividade cerebral. Percentuais não são medidas calibradas de volume.",
                  )}
                </p>
              </div>
            )}
            <FrequencyContext />
            {(audio.status === "error" || audio.status === "interrupted") && (
              <p className="field-error" role="alert">
                {tr(
                  "Audio was interrupted or could not start. Press play to try again.",
                  "O áudio foi interrompido ou não iniciou. Pressione reproduzir para tentar novamente.",
                )}
              </p>
            )}
          </div>
        </section>
        <AmbiencePanel />
      </div>
      <div className="headphone-note">
        <PixelIcon name="headphones" size={22} />
        <p>
          <strong>
            {tr(
              "A little better with headphones.",
              "Use fones para a experiência binaural.",
            )}
          </strong>{" "}
          {tr(
            "Stereo headphones keep each tone in its own ear. Ambience works with speakers, too.",
            "Fones estéreo separam os tons entre os ouvidos. Sons ambientes também funcionam com alto-falantes.",
          )}{" "}
          <Link href="/how-it-works/">{tr("Why?", "Por quê?")}</Link>
        </p>
      </div>
      <RecordShelf />
      <FrequencyGuide />
      <SponsorSlot />
      <div className="quiet-note">
        <span className="tiny-light" />
        {tr(
          "No rush. No perfect frequency. Just find what feels comfortable.",
          "Sem pressa. Sem frequência perfeita. Encontre o que é confortável para você.",
        )}
      </div>
    </main>
  );
}
