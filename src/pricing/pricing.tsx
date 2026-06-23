import { useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "../lib/supabaseClient";
import "./pricing.css";

type PriceType = "monthly" | "yearly";

const FREE_FEATURES = [
  "Track time on websites",
  "Daily & weekly summaries",
  "Block distracting sites",
  "Up to 30 days of history",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Cloud sync across devices",
  "Unlimited tracking history",
  "Advanced analytics",
  "Data export (CSV & JSON)",
  "Priority support",
];

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const PricingPage = () => {
  const [billing, setBilling] = useState<PriceType>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        { body: { priceType: billing } }
      );
      if (fnError || !data?.url) throw fnError ?? new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="pricing-page">
      <main className="pricing-main">
        <h1 className="pricing-title">Upgrade your plan</h1>

        <div className="billing-toggle">
          <button
            className={`billing-toggle-btn${billing === "monthly" ? " active" : ""}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`billing-toggle-btn${billing === "yearly" ? " active" : ""}`}
            onClick={() => setBilling("yearly")}
          >
            Yearly
            <span className="billing-toggle-save">Save 17%</span>
          </button>
        </div>

        <div className="pricing-cards">
          {/* Free */}
          <div className="pricing-card free">
            <div className="card-plan-name">Free</div>
            <div className="card-price">
              <span className="card-price-amount">$0</span>
              <span className="card-price-period">/ month</span>
            </div>
            <div className="card-billing">Your current plan</div>
            <ul className="card-features">
              {FREE_FEATURES.map((f) => (
                <li key={f}><CheckIcon />{f}</li>
              ))}
            </ul>
            <div className="card-cta card-cta--ghost">Current plan</div>
          </div>

          {/* Pro */}
          <div className="pricing-card pro">
            <div className="popular-badge">Popular</div>
            <div className="card-plan-name">Pro</div>
            <div className="card-price">
              {billing === "monthly" ? (
                <>
                  <span className="card-price-amount">$5</span>
                  <span className="card-price-period">/ month</span>
                </>
              ) : (
                <>
                  <span className="card-price-amount">$50</span>
                  <span className="card-price-period">/ year</span>
                </>
              )}
            </div>
            <div className="card-billing">
              {billing === "monthly" ? "Billed monthly" : "$4.17 / month · Save 17%"}
            </div>
            <ul className="card-features">
              {PRO_FEATURES.map((f) => (
                <li key={f}><CheckIcon />{f}</li>
              ))}
            </ul>
            <button
              className="card-cta"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <span className="card-cta-loading">
                  <span className="spinner" />Opening Stripe…
                </span>
              ) : (
                "Upgrade to Pro"
              )}
            </button>
          </div>
        </div>

        {error && <div className="pricing-error">{error}</div>}
      </main>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<PricingPage />);
