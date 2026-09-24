"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { AudioEngine, type AudioSnapshot } from "@/audio/AudioEngine";
import { DEFAULT_MIX, mixSchema, STORAGE_PREFIX, type Mix } from "@/lib/mix";
import { AUTH_CLEARED_EVENT, getAuthClient } from "@/lib/auth";
import { api } from "@/lib/api";

type Locale = "en" | "pt";
const initial: AudioSnapshot = {
  status: "idle",
  elapsedSeconds: 0,
  remainingSeconds: null,
  sampleRate: null,
  failedLayers: {},
  error: null,
};
function useAppState() {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<"night" | "day">("night");
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const [title, setTitle] = useState("Moonlit Rain");
  const [selected, setSelected] = useState<string | null>("moon");
  const [description, setDescription] = useState("");
  const [editOwner, setEditOwner] = useState<string | null>(null);
  const [master, setMaster] = useState(0.3);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [libraryRevision, setLibraryRevision] = useState(0);
  const notifyMixSaved = useCallback(
    () => setLibraryRevision((v) => v + 1),
    [],
  );
  const [online, setOnline] = useState(true);
  const [engine] = useState(() => new AudioEngine());
  const [audio, setAudio] = useState(initial);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const entitlementGeneration = useRef(0);
  const tr = useCallback(
    (en: string, pt: string) => (locale === "en" ? en : pt),
    [locale],
  );
  useEffect(() => {
    try {
      const draft = JSON.parse(
        localStorage.getItem(STORAGE_PREFIX + "draft") || "null",
      );
      if (draft) {
        const valid = mixSchema.safeParse(draft.mix);
        if (valid.success) {
          setMix(valid.data);
          setTitle(
            typeof draft.title === "string"
              ? draft.title.slice(0, 80)
              : "My mix",
          );
          setDescription(
            typeof draft.description === "string"
              ? draft.description.slice(0, 280)
              : "",
          );
          setSelected(
            typeof draft.selected === "string" ? draft.selected : null,
          );
        }
      }
      setLocale(
        localStorage.getItem(STORAGE_PREFIX + "locale") === "pt" ? "pt" : "en",
      );
      setTheme(
        localStorage.getItem(STORAGE_PREFIX + "theme") === "day"
          ? "day"
          : "night",
      );
    } catch {
      /* Storage failure must not disable listening. */
    }
    setReady(true);
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
    document.documentElement.dataset.theme = theme;
    if (ready)
      try {
        localStorage.setItem(STORAGE_PREFIX + "locale", locale);
        localStorage.setItem(STORAGE_PREFIX + "theme", theme);
      } catch {}
  }, [locale, theme, ready]);
  useEffect(() => {
    const unsub = engine.subscribe(() => setAudio(engine.getSnapshot()));
    return () => {
      unsub();
      engine.dispose();
    };
  }, [engine]);
  useEffect(() => {
    engine.update(mix, master);
    if (ready)
      try {
        localStorage.setItem(
          STORAGE_PREFIX + "draft",
          JSON.stringify({ mix, title, selected, description }),
        );
      } catch {}
  }, [mix, master, engine, ready, title, selected, description]);
  useEffect(() => {
    const auth = getAuthClient();
    if (!auth) {
      setAuthLoading(false);
      setEntitled(false);
      return;
    }
    const clearSession = () => {
      entitlementGeneration.current += 1;
      setSession(null);
      setEntitled(false);
      setAuthLoading(false);
    };
    window.addEventListener(AUTH_CLEARED_EVENT, clearSession);
    const { data } = auth.auth.onAuthStateChange((_event, newSession) => {
      entitlementGeneration.current += 1;
      setSession(newSession);
      setEntitled(null);
      setAuthLoading(false);
    });
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener(AUTH_CLEARED_EVENT, clearSession);
    };
  }, []);
  const refreshEntitlement = useCallback(async () => {
    const generation = ++entitlementGeneration.current;
    if (!session) {
      setEntitled(false);
      return;
    }
    try {
      const result = await api.entitlement();
      if (generation === entitlementGeneration.current)
        setEntitled(result.adFree);
    } catch {
      if (generation === entitlementGeneration.current) setEntitled(null);
    }
  }, [session]);
  useEffect(() => {
    void refreshEntitlement();
  }, [refreshEntitlement]);
  useEffect(() => {
    const hidden = () =>
      document.documentElement.classList.toggle("page-hidden", document.hidden);
    hidden();
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  const loadMix = useCallback(
    (value: Mix, name: string, id: string | null = null, note = "") => {
      const valid = mixSchema.safeParse(value);
      if (!valid.success) return;
      setMix(valid.data);
      setTitle(name);
      setSelected(id);
      setDescription(note);
      setEditOwner(id ? (session?.user.id ?? null) : null);
    },
    [session?.user.id],
  );
  const play = () => {
    setNotice("");
    void engine.play(mix, master);
  };
  return {
    locale,
    setLocale,
    theme,
    setTheme,
    tr,
    mix,
    setMix,
    title,
    setTitle,
    selected,
    description,
    editableMixId:
      editOwner && editOwner === session?.user.id ? selected : null,
    master,
    setMaster,
    audio,
    engine,
    play,
    loadMix,
    ready,
    notice,
    setNotice,
    libraryRevision,
    notifyMixSaved,
    online,
    session,
    authLoading,
    entitled,
    refreshEntitlement,
  };
}
const AppContext = createContext<ReturnType<typeof useAppState> | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
