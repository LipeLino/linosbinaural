export type LocalizedText = Readonly<{ en: string; pt: string }>;
export type BandId = "delta" | "theta" | "alpha" | "beta" | "gamma";
export type BandGuide = Readonly<{
  id: BandId;
  min: number;
  max: number;
  name: LocalizedText;
  association: LocalizedText;
  evidence: LocalizedText;
}>;

// Match bandFor() in mix.ts: max is exclusive except gamma's 40 Hz ceiling.
// These are labels for the selected audio difference, never measured EEG states.
export const BAND_GUIDES = [
  {
    id: "delta",
    min: 0.5,
    max: 4,
    name: { en: "Delta", pt: "Delta" },
    association: {
      en: "A slow setting often chosen for winding down; delta EEG is common in deep sleep.",
      pt: "Uma opção lenta, escolhida para desacelerar; o EEG delta é comum no sono profundo.",
    },
    evidence: {
      en: "This audio difference is not a sleep measurement and has not been shown to reliably induce sleep.",
      pt: "Essa diferença sonora não mede o sono nem demonstrou induzi-lo de forma confiável.",
    },
  },
  {
    id: "theta",
    min: 4,
    max: 8,
    name: { en: "Theta", pt: "Teta" },
    association: {
      en: "Often chosen for a quiet pause; theta EEG can appear with drowsiness and inward attention.",
      pt: "Muitas pessoas a escolhem para uma pausa; o EEG teta pode aparecer na sonolência e na atenção voltada para dentro.",
    },
    evidence: {
      en: "A theta-range beat does not establish a theta brain state or reliably create meditation.",
      pt: "Uma batida na faixa teta não comprova um estado cerebral teta nem cria meditação de forma confiável.",
    },
  },
  {
    id: "alpha",
    min: 8,
    max: 13,
    name: { en: "Alpha", pt: "Alfa" },
    association: {
      en: "A gentle choice for a break; alpha EEG is often prominent during restful wakefulness.",
      pt: "Uma escolha leve para uma pausa; o EEG alfa costuma se destacar no repouso acordado.",
    },
    evidence: {
      en: "Choosing an alpha-range beat does not prove or guarantee relaxation.",
      pt: "Escolher uma batida na faixa alfa não comprova nem garante relaxamento.",
    },
  },
  {
    id: "beta",
    min: 13,
    max: 30,
    name: { en: "Beta", pt: "Beta" },
    association: {
      en: "Often paired with a task; beta EEG can accompany alert, active thinking.",
      pt: "Costuma acompanhar uma tarefa; o EEG beta pode ocorrer durante o pensamento ativo e alerta.",
    },
    evidence: {
      en: "Beta-range audio has not been shown to reliably improve focus or performance.",
      pt: "O áudio na faixa beta não demonstrou melhorar foco ou desempenho de forma confiável.",
    },
  },
  {
    id: "gamma",
    min: 30,
    max: 40,
    name: { en: "Gamma-range experiment", pt: "Experimento na faixa gama" },
    association: {
      en: "An exploratory setting; gamma EEG is studied in attention and perception.",
      pt: "Uma opção exploratória; o EEG gama é estudado na atenção e na percepção.",
    },
    evidence: {
      en: "30–40 Hz is only part of the gamma range. Near this limit the binaural beat may be faint or sound like two tones; no cognitive benefit is established.",
      pt: "30–40 Hz é só parte da faixa gama. Perto desse limite, a batida pode ser fraca ou soar como dois tons; não há benefício cognitivo comprovado.",
    },
  },
] as const satisfies readonly BandGuide[];

type FactoryPresetId = (typeof import("./mix").FACTORY_PRESETS)[number]["id"];
export type PresetGuide = Readonly<{
  intent: LocalizedText;
  description: LocalizedText;
}>;

export const PRESET_GUIDES = {
  moon: {
    intent: { en: "Ease into the evening", pt: "Desacelere ao anoitecer" },
    description: {
      en: "Soft rain and a slow beat make room for an unhurried listen; this is not a sleep treatment.",
      pt: "Chuva suave e uma batida lenta convidam a ouvir sem pressa; não é um tratamento para o sono.",
    },
  },
  shore: {
    intent: { en: "Take a quiet pause", pt: "Faça uma pausa tranquila" },
    description: {
      en: "Ocean waves and a gentle tone for a moment between tasks, with no promised change in mood.",
      pt: "Ondas do mar e um tom suave para um intervalo entre tarefas, sem prometer mudar o humor.",
    },
  },
  cafe: {
    intent: { en: "Read at your own pace", pt: "Leia no seu ritmo" },
    description: {
      en: "A familiar café atmosphere and soft tones for a light study session; attention is yours to guide.",
      pt: "O clima familiar de café e tons suaves acompanham um estudo leve; você conduz sua atenção.",
    },
  },
  lantern: {
    intent: { en: "Make room for one task", pt: "Abra espaço para uma tarefa" },
    description: {
      en: "Pink noise and steady tones set a focused atmosphere without a performance promise.",
      pt: "Ruído rosa e tons constantes criam um clima de foco, sem promessa de desempenho.",
    },
  },
  forest: {
    intent: { en: "Just listen to the woods", pt: "Apenas ouça a floresta" },
    description: {
      en: "Forest ambience only: no binaural beat, and no headphones needed for the intended mix.",
      pt: "Só o ambiente da floresta: sem batida binaural e sem necessidade de fones para esta mixagem.",
    },
  },
} as const satisfies Record<FactoryPresetId, PresetGuide>;

export const SOURCE_LINKS = [
  {
    title: "Ingendoh, Posny & Heine (2023), PLOS ONE systematic review",
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0286023",
  },
  {
    title:
      "Corona-González et al. (2021), Frontiers in Psychology EEG experiment",
    url: "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.764068/full",
  },
  {
    title: "Marcantoni et al. (2023), Sensors EEG-index systematic review",
    url: "https://www.mdpi.com/1424-8220/23/13/5968",
  },
] as const satisfies readonly Readonly<{ title: string; url: string }>[];
