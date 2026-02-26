import { useState, useEffect } from "react";
import { StorageService } from "../utils/storageService";
import type { AppSettings, Category } from "../types/data.types";
import { DEFAULT_SETTINGS } from "../types/data.types";
import "../popup/css/settings.css";

interface SettingsProps {
  onClose: () => void;
}

const VIEW_OPTIONS: { label: string; value: Category }[] = [
  { label: "Today", value: "today" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "1Y", value: "1Y" },
  { label: "Total", value: "total" },
];

const Settings = ({ onClose }: SettingsProps) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [domainInput, setDomainInput] = useState("");
  const [confirmClear, setConfirmClear] = useState<"today" | "all" | null>(
    null
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<string | null>(null);

  useEffect(() => {
    StorageService.getSettings().then(setSettings);
  }, []);

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await StorageService.saveSettings(updated);
  };

  const addDomain = async () => {
    const raw = domainInput.trim().toLowerCase();
    if (!raw) return;
    // Strip protocol and path, keep only the hostname
    const domain = raw.replace(/^https?:\/\//, "").split("/")[0];
    if (!domain || settings.ignoredDomains.includes(domain)) {
      setDomainInput("");
      return;
    }
    await updateSetting("ignoredDomains", [
      ...settings.ignoredDomains,
      domain,
    ]);
    setDomainInput("");
  };

  const removeDomain = async (domain: string) => {
    await updateSetting(
      "ignoredDomains",
      settings.ignoredDomains.filter((d) => d !== domain)
    );
  };

  const handleClear = async (type: "today" | "all") => {
    if (type === "today") {
      await StorageService.clearTodayData();
      setClearFeedback("Today's data cleared.");
    } else {
      await StorageService.clearAllData();
      setClearFeedback("All data cleared.");
    }
    setConfirmClear(null);
    setTimeout(() => setClearFeedback(null), 3000);
  };

  const handleExport = async (format: "json" | "csv") => {
    setExportLoading(true);
    try {
      const siteInfo = await StorageService.getSiteInfo();
      StorageService.exportData(siteInfo, format);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="settings-title">Settings</span>
      </div>

      <div className="settings-content">
        {/* Section 1: Tracking & Privacy */}
        <div className="settings-section">
          <div className="settings-section-title">Tracking & Privacy</div>

          {/* Idle Time Tracking */}
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Idle Time Tracking</span>
              <span className="settings-row-desc">
                Pause tracking after 5 min of inactivity
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.idleTrackingEnabled}
                onChange={(e) =>
                  updateSetting("idleTrackingEnabled", e.target.checked)
                }
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Ignored Domains */}
          <div className="settings-block">
            <span className="settings-row-label">Ignored Domains</span>
            <span className="settings-row-desc">
              Time tracking is disabled on these sites
            </span>
            <div className="domain-input-row">
              <input
                className="domain-input"
                type="text"
                placeholder="e.g. localhost, github.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addDomain();
                }}
              />
              <button className="domain-add-btn" onClick={addDomain}>
                Add
              </button>
            </div>
            {settings.ignoredDomains.length > 0 && (
              <ul className="domain-list">
                {settings.ignoredDomains.map((d) => (
                  <li key={d} className="domain-item">
                    <span className="domain-name">{d}</span>
                    <button
                      className="domain-remove-btn"
                      onClick={() => removeDomain(d)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Clear Data */}
          <div className="settings-block">
            <span className="settings-row-label">Clear Data</span>
            {clearFeedback && (
              <span className="clear-feedback">{clearFeedback}</span>
            )}
            <div className="clear-buttons">
              {confirmClear === "today" ? (
                <div className="confirm-row">
                  <span className="confirm-text">Clear today's data?</span>
                  <button
                    className="btn-danger-sm"
                    onClick={() => handleClear("today")}
                  >
                    Confirm
                  </button>
                  <button
                    className="btn-cancel-sm"
                    onClick={() => setConfirmClear(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn-outline-sm"
                  onClick={() => setConfirmClear("today")}
                  disabled={confirmClear === "all"}
                >
                  Clear Today
                </button>
              )}

              {confirmClear === "all" ? (
                <div className="confirm-row">
                  <span className="confirm-text">Clear all data?</span>
                  <button
                    className="btn-danger-sm"
                    onClick={() => handleClear("all")}
                  >
                    Confirm
                  </button>
                  <button
                    className="btn-cancel-sm"
                    onClick={() => setConfirmClear(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn-outline-sm btn-outline-danger"
                  onClick={() => setConfirmClear("all")}
                  disabled={confirmClear === "today"}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Appearance & General */}
        <div className="settings-section">
          <div className="settings-section-title">Appearance & General</div>

          {/* Default Dashboard View */}
          <div className="settings-block">
            <span className="settings-row-label">Default Dashboard View</span>
            <span className="settings-row-desc">
              The time range shown when you open the popup
            </span>
            <div className="view-options">
              {VIEW_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  className={`view-option-btn${settings.defaultView === value ? " active" : ""}`}
                  onClick={() => updateSetting("defaultView", value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Data */}
          <div className="settings-block">
            <span className="settings-row-label">Export Data</span>
            <span className="settings-row-desc">
              Download your full browsing history
            </span>
            <div className="export-buttons">
              <button
                className="btn-outline-sm"
                onClick={() => handleExport("json")}
                disabled={exportLoading}
              >
                Export JSON
              </button>
              <button
                className="btn-outline-sm"
                onClick={() => handleExport("csv")}
                disabled={exportLoading}
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
