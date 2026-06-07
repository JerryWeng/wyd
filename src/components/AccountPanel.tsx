import type { UserRecord } from "../types/data.types";
import "../popup/css/settings.css";
import "../popup/css/auth.css";

interface AccountPanelProps {
  userRecord: UserRecord | null;
  onSignOut: () => void;
  onClose: () => void;
}

const AccountPanel = ({ userRecord, onSignOut, onClose }: AccountPanelProps) => {
  const initial = userRecord?.email?.[0]?.toUpperCase() ?? "?";
  const isPro = userRecord?.plan === "pro";

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="settings-title">Account</span>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <div className="settings-section-title">Profile</div>
          <div className="settings-block">
            <div className="account-user-row">
              <div className="account-avatar">{initial}</div>
              <div className="account-user-info">
                <span className="account-email">{userRecord?.email ?? "—"}</span>
                <span className={`account-plan-badge ${isPro ? "pro" : "free"}`}>
                  {isPro ? "Pro" : "Free"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Sync</div>
          <div className="settings-block">
            <div className="account-sync-row">
              <div className="account-sync-label">
                <span className="settings-row-label">Cloud Sync</span>
                {!isPro && (
                  <span className="account-sync-upgrade">Upgrade to Pro to enable</span>
                )}
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  disabled={!isPro}
                  checked={userRecord?.cloud_sync_enabled ?? false}
                  onChange={() => {}}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-block">
            <button className="account-signout-btn" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPanel;
