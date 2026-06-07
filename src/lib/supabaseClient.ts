import { createClient } from "@supabase/supabase-js";

const chromeStorageAdapter = {
  getItem: (key: string) =>
    new Promise<string | null>((resolve) =>
      chrome.storage.local.get([key], (r) => resolve(r[key] ?? null))
    ),
  setItem: (key: string, value: string) =>
    new Promise<void>((resolve) =>
      chrome.storage.local.set({ [key]: value }, resolve)
    ),
  removeItem: (key: string) =>
    new Promise<void>((resolve) =>
      chrome.storage.local.remove(key, resolve)
    ),
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
