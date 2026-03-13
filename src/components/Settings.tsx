import { useState, useEffect } from "react";
import { StorageService } from "../utils/storageService";
import type { AppSettings, Category } from "../types/data.types";
import { DEFAULT_SETTINGS } from "../types/data.types";
import "../popup/css/settings.css";

interface SettingsProps {
  onClose: () => void;
}

type ActiveView = "main" | "ignored_domains";

const VIEW_OPTIONS: { label: string; value: Category }[] = [
  { label: "Today", value: "today" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "1Y", value: "1Y" },
  { label: "Total", value: "total" },
];

const CLEAR_OPTIONS: { label: string; value: Exclude<Category, "total"> }[] = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "1W" },
  { label: "Last 30 Days", value: "1M" },
  { label: "Last Year", value: "1Y" },
];

const CLEAR_LABELS: Record<Exclude<Category, "total">, string> = {
  today: "today's data",
  "1W": "data from the last 7 days",
  "1M": "data from the last 30 days",
  "1Y": "data from the last year",
};

const DEFAULT_EXCLUDED = [
  "chrome:// pages (browser internal)",
  "about:// pages (browser internal)",
  "file:// pages (local files)",
  "chrome-extension:// pages (extensions)",
];

function isValidDomain(domain: string): boolean {
  if (domain === "localhost") return true;
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain);
}

const Settings = ({ onClose }: SettingsProps) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeView, setActiveView] = useState<ActiveView>("main");
  const [domainInput, setDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [showIdleTooltip, setShowIdleTooltip] = useState(false);
  const [confirmClear, setConfirmClear] = useState<
    Exclude<Category, "total"> | "all" | null
  >(null);
  const [clearTimeframe, setClearTimeframe] = useState<
    Exclude<Category, "total">
  >("today");
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
    const domain = raw
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/^www\./, "");
    if (!isValidDomain(domain)) {
      setDomainError(`"${domain}" is not a valid domain.`);
      return;
    }
    if (settings.ignoredDomains.includes(domain)) {
      setDomainInput("");
      setDomainError(null);
      return;
    }
    setDomainError(null);
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

  const handleClear = async (type: Exclude<Category, "total"> | "all") => {
    if (type === "all") {
      await StorageService.clearAllData();
      setClearFeedback("All data cleared.");
    } else {
      await StorageService.clearDataRange(type);
      setClearFeedback(`Cleared ${CLEAR_LABELS[type]}.`);
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

  // ── Ignored Domains Subview ──────────────────────────────────────────────
  if (activeView === "ignored_domains") {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <button
            className="settings-back-btn"
            onClick={() => setActiveView("main")}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="settings-title">Ignored Domains</span>
        </div>

        <div className="settings-content">
          {/* Always-excluded (built-in) */}
          <div className="settings-section">
            <div className="settings-section-title">Always Excluded (Built-in)</div>
            <div className="settings-block">
              <span className="settings-row-desc">
                These are filtered automatically and cannot be changed.
              </span>
              <div className="default-domains-section">
                {DEFAULT_EXCLUDED.map((item) => (
                  <span key={item} className="default-domain-item">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* User-added domains */}
          <div className="settings-section">
            <div className="settings-section-title">Custom Ignored Domains</div>
            <div className="settings-block">
              <div className="domain-input-row">
                <input
                  className="domain-input"
                  type="text"
                  placeholder="e.g. github.com, localhost"
                  value={domainInput}
                  onChange={(e) => { setDomainInput(e.target.value); setDomainError(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDomain();
                  }}
                />
                <button className="domain-add-btn" onClick={addDomain}>
                  Add
                </button>
              </div>
              {domainError && (
                <span className="domain-error">{domainError}</span>
              )}
              {settings.ignoredDomains.length === 0 ? (
                <span className="settings-row-desc">No custom domains added yet.</span>
              ) : (
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
          </div>
        </div>
      </div>
    );
  }

  // ── Main Settings View ───────────────────────────────────────────────────
  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <div className="settings-block">
            <div className="idle-header-row">
              <div className="idle-label-group">
                <span className="settings-row-label">Idle Time Tracking</span>
                <button
                  className="info-icon"
                  onClick={() => setShowIdleTooltip((prev) => !prev)}
                  aria-label="About idle tracking"
                >
                  ?
                </button>
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

            {showIdleTooltip && (
              <div className="idle-tooltip">
                If no mouse movement or keystrokes occur for the set duration,
                tracking pauses automatically until you return.
              </div>
            )}

            {settings.idleTrackingEnabled && (
              <div className="idle-slider-row">
                <input
                  type="range"
                  className="idle-slider"
                  min={1}
                  max={10}
                  step={1}
                  value={settings.idleTimeoutMinutes}
                  onChange={(e) =>
                    updateSetting("idleTimeoutMinutes", Number(e.target.value))
                  }
                />
                <span className="idle-slider-value">
                  {settings.idleTimeoutMinutes}{" "}
                  {settings.idleTimeoutMinutes === 1 ? "minute" : "minutes"}
                </span>
              </div>
            )}
          </div>

          {/* Ignored Domains — summary on main view */}
          <div className="settings-block">
            <span className="settings-row-label">Ignored Domains</span>
            <span className="settings-row-desc">
              Time tracking is disabled on custom sites
            </span>
            <div className="domains-summary-row">
              <span className="domains-summary-text">
                {settings.ignoredDomains.length === 0
                  ? "No custom domains"
                  : `${settings.ignoredDomains.length} custom domain${settings.ignoredDomains.length === 1 ? "" : "s"} ignored`}
              </span>
              <button
                className="domains-manage-btn"
                onClick={() => setActiveView("ignored_domains")}
              >
                Manage →
              </button>
            </div>
          </div>

          {/* Clear Data */}
          <div className="settings-block">
            <span className="settings-row-label">Clear Data</span>
            {clearFeedback && (
              <span className="clear-feedback">{clearFeedback}</span>
            )}
            <div className="clear-buttons">
              {confirmClear !== null && confirmClear !== "all" ? (
                <div className="confirm-row">
                  <span className="confirm-text">
                    Clear {CLEAR_LABELS[confirmClear]}?
                  </span>
                  <button
                    className="btn-danger-sm"
                    onClick={() => handleClear(confirmClear)}
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
                <div className="clear-range-row">
                  <select
                    className="clear-select"
                    value={clearTimeframe}
                    onChange={(e) =>
                      setClearTimeframe(
                        e.target.value as Exclude<Category, "total">
                      )
                    }
                    disabled={confirmClear === "all"}
                  >
                    {CLEAR_OPTIONS.map(({ label, value }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-outline-sm"
                    onClick={() => setConfirmClear(clearTimeframe)}
                    disabled={confirmClear === "all"}
                  >
                    Clear Selected
                  </button>
                </div>
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
                  disabled={confirmClear !== null}
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
