import { useState } from "react";
import type { UserRecord } from "../types/data.types";
import { paymentService } from "../utils/paymentService";
import "../popup/css/settings.css";
import "../popup/css/auth.css";

interface AccountPanelProps {
  userRecord: UserRecord | null;
  onRefresh: () => Promise<void>;
  onSignOut: () => void;
  onClose: () => void;
}

const AccountPanel = ({ userRecord, onRefresh, onSignOut, onClose }: AccountPanelProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const initial = userRecord?.email?.[0]?.toUpperCase() ?? "?";
  const isPro = userRecord?.plan === "pro";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleUpgrade = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("pricing.html") });
  };

  const handleManage = async () => {
    setIsPortalLoading(true);
    try { await paymentService.openPortal(); } finally { setIsPortalLoading(false); }
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
        <span className="settings-title">Account</span>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <div className="settings-section-title">
            Profile
            <button
              className={`account-refresh-btn${isRefreshing ? " spinning" : ""}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh plan"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L20 8M4 16l1.64 2.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
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
            {!isPro && (
              <button className="account-upgrade-btn" onClick={handleUpgrade}>
                Upgrade to Pro
              </button>
            )}
            {isPro && (
              <button className="account-manage-btn" onClick={handleManage} disabled={isPortalLoading}>
                {isPortalLoading ? "Opening…" : "Manage subscription"}
              </button>
            )}
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
