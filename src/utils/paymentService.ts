import { supabase } from "../lib/supabaseClient";

export const paymentService = {
  async openCheckout(): Promise<void> {
    const { data, error } = await supabase.functions.invoke("create-checkout-session");
    if (error || !data?.url) throw error ?? new Error("No checkout URL returned");
    window.open(data.url, "_blank");
  },

  async openPortal(): Promise<void> {
    const { data, error } = await supabase.functions.invoke("create-portal-session");
    if (error || !data?.url) throw error ?? new Error("No portal URL returned");
    window.open(data.url, "_blank");
  },
};
