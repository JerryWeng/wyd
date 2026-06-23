import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUCCESS_URL = "https://whatareyoudoing.app/success";
const CANCEL_URL = "https://whatareyoudoing.app/cancel";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = userRow?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: userRow?.email ?? user.email! });
      customerId = customer.id;
      await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const body = await req.json().catch(() => ({}));
    const priceId = body?.priceType === "yearly"
      ? Deno.env.get("STRIPE_PRO_PRICE_YEARLY_ID")!
      : Deno.env.get("STRIPE_PRO_PRICE_MONTHLY_ID")!;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
