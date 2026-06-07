import { supabase } from "../lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { UserRecord } from "../types/data.types";

export const authService = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signUp: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) => supabase.auth.onAuthStateChange(callback),

  fetchUserRecord: async (userId: string): Promise<UserRecord | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, plan, subscription_status")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("cloud_sync_enabled")
      .eq("user_id", userId)
      .single();

    return {
      id: data.id,
      email: data.email,
      plan: data.plan,
      subscription_status: data.subscription_status,
      cloud_sync_enabled: settingsData?.cloud_sync_enabled ?? false,
    };
  },
};
