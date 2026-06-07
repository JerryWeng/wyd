import { useState } from "react";
import { authService } from "../utils/authService";
import type { Session } from "@supabase/supabase-js";
import "../popup/css/settings.css";
import "../popup/css/auth.css";

interface AuthPanelProps {
  onSuccess: (session: Session) => void;
  onClose: () => void;
}

type AuthView = "login" | "signup";

const AuthPanel = ({ onSuccess, onClose }: AuthPanelProps) => {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSent, setSignupSent] = useState(false);

  const reset = (nextView: AuthView) => {
    setView(nextView);
    setError(null);
    setSignupSent(false);
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (view === "login") {
        const { data, error } = await authService.signIn(email, password);
        if (error) { setError(error.message); return; }
        if (data.session) onSuccess(data.session);
      } else {
        const { error } = await authService.signUp(email, password);
        if (error) { setError(error.message); return; }
        setSignupSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="settings-title">
          {view === "login" ? "Sign in" : "Create account"}
        </span>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <div className="settings-block">
            {signupSent ? (
              <p className="auth-success-note">
                Check your email — we sent a confirmation link. Once confirmed,
                sign in with your credentials.
              </p>
            ) : (
              <form className="auth-form-section" onSubmit={handleSubmit}>
                {error && <p className="auth-error">{error}</p>}

                <div className="auth-field">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    className="auth-input"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-password">Password</label>
                  <input
                    id="auth-password"
                    className="auth-input"
                    type="password"
                    autoComplete={view === "login" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading
                    ? view === "login" ? "Signing in…" : "Creating account…"
                    : view === "login" ? "Sign in" : "Create account"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="auth-toggle-row">
          <span className="auth-toggle-text">
            {view === "login" ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button
            className="auth-toggle-btn"
            onClick={() => reset(view === "login" ? "signup" : "login")}
          >
            {view === "login" ? "Create account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPanel;
