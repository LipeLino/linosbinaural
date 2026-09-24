import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BASE_PATH, STORAGE_PREFIX } from "./mix";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const authAvailable = Boolean(url && anonKey);

// Some privacy modes throw even when reading the localStorage property.
// Retain a same-tab session when persistence is unavailable; listening must work.
export const AUTH_CLEARED_EVENT = "linosbinaural:session-cleared";
const transientStorage = new Map<string, string>();
const safeStorage = {
  getItem(key: string): string | null {
    if (transientStorage.has(key)) return transientStorage.get(key)!;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
      transientStorage.delete(key);
    } catch {
      transientStorage.set(key, value);
    }
  },
  removeItem(key: string): void {
    transientStorage.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
};

let client: SupabaseClient | null = null;
export function getAuthClient(): SupabaseClient | null {
  if (!authAvailable || typeof window === "undefined") return null;
  if (!client)
    client = createClient(url!, anonKey!, {
      auth: {
        storageKey: `${STORAGE_PREFIX}auth`,
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  return client;
}

export function authRedirect(): string {
  if (typeof window === "undefined")
    throw new Error("Auth redirect requires a browser.");
  return `${window.location.origin}${BASE_PATH}/account/`;
}

export async function accessToken(): Promise<string | null> {
  const auth = getAuthClient();
  if (!auth) return null;
  const { data, error } = await auth.auth.getSession();
  if (error) throw error;
  return data.session?.access_token ?? null;
}

export async function signUp(
  email: string,
  password: string,
  locale: "en" | "pt" = "en",
) {
  const auth = getAuthClient();
  if (!auth) throw new Error("Account service is not configured.");
  return auth.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: authRedirect(), data: { locale } },
  });
}
export async function signIn(email: string, password: string) {
  const auth = getAuthClient();
  if (!auth) throw new Error("Account service is not configured.");
  return auth.auth.signInWithPassword({ email, password });
}
export async function sendRecovery(email: string) {
  const auth = getAuthClient();
  if (!auth) throw new Error("Account service is not configured.");
  return auth.auth.resetPasswordForEmail(email, { redirectTo: authRedirect() });
}
export async function updatePassword(password: string) {
  const auth = getAuthClient();
  if (!auth) throw new Error("Account service is not configured.");
  return auth.auth.updateUser({ password });
}
export async function signOut(scope: "global" | "local" = "global") {
  const auth = getAuthClient();
  if (!auth) return;
  const { error } = await auth.auth.signOut({ scope });
  if (error) throw error;
}

export async function forgetDeletedSession(): Promise<void> {
  try {
    await signOut("local");
  } catch {
    /* Auth may already have removed the deleted user on the server. */
  }
  if (typeof window !== "undefined") {
    safeStorage.removeItem(`${STORAGE_PREFIX}auth`);
    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
  }
}
