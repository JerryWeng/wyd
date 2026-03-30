import { useState, useEffect } from "react";
import { StorageService } from "../utils/storageService";
import type { AppSettings, BlockRule, BlockType, RawSiteInfo } from "../types/data.types";
import { DEFAULT_SETTINGS } from "../types/data.types";
import { isValidDomain, normalizeDomainInput } from "../utils/domainUtils";
import "../popup/css/settings.css";
import "../popup/css/blockPage.css";

interface BlockPageProps {
  onClose: () => void;
}

type BlockPageView = "list" | "form";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  dailyLimit: "Daily",
  weeklyLimit: "Weekly",
  scheduled: "Scheduled",
  daysOfWeek: "Days of week",
};

const BLOCK_TYPE_FORM_LABELS: Record<BlockType, string> = {
  dailyLimit: "Daily Limit",
  weeklyLimit: "Weekly Limit",
  scheduled: "Scheduled",
  daysOfWeek: "Days of Week",
};

const BLOCK_TYPE_DESCRIPTIONS: Record<BlockType, string> = {
  dailyLimit: "Block after X min/day",
  weeklyLimit: "Block after X min/week",
  scheduled: "Block during time range",
  daysOfWeek: "Block on certain days",
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getLocalDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getLastNDateStrings(n: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function getScheduledStatus(rule: BlockRule): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = (rule.startTime ?? "00:00").split(":").map(Number);
  const [endH, endM] = (rule.endTime ?? "00:00").split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight range
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

interface RuleAnalytics {
  percentUsed?: number;
  usedSeconds?: number;
  limitSeconds?: number;
  isActiveNow?: boolean;
}

function getSecondsForDomain(domain: string, timeData: Record<string, number> | undefined): number {
  if (!timeData) return 0;
  return Object.entries(timeData).reduce((sum, [key, val]) => {
    if (key === domain || key.endsWith(`.${domain}`)) return sum + val;
    return sum;
  }, 0);
}

function computeAnalytics(rule: BlockRule, siteInfo: RawSiteInfo): RuleAnalytics {
  const { domain, type } = rule;
  if (type === "dailyLimit") {
    const today = getLocalDateString();
    const usedSeconds = getSecondsForDomain(domain, siteInfo[today]?.time);
    const limitSeconds = (rule.timeLimit ?? 60) * 60;
    const percentUsed = limitSeconds > 0 ? Math.min(100, (usedSeconds / limitSeconds) * 100) : 0;
    return { percentUsed, usedSeconds, limitSeconds };
  }
  if (type === "weeklyLimit") {
    const dates = getLastNDateStrings(7);
    const usedSeconds = dates.reduce((sum, date) => sum + getSecondsForDomain(domain, siteInfo[date]?.time), 0);
    const limitSeconds = (rule.timeLimit ?? 60) * 60;
    const percentUsed = limitSeconds > 0 ? Math.min(100, (usedSeconds / limitSeconds) * 100) : 0;
    return { percentUsed, usedSeconds, limitSeconds };
  }
  if (type === "scheduled") {
    return { isActiveNow: getScheduledStatus(rule) };
  }
  if (type === "daysOfWeek") {
    return { isActiveNow: (rule.days ?? []).includes(new Date().getDay()) };
  }
  return {};
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function getProgressColor(percent: number): string {
  if (percent >= 85) return "#ef5350";
  if (percent >= 60) return "#ff9800";
  return "#4caf50";
}

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BlockPage = ({ onClose }: BlockPageProps) => {
  const [view, setView] = useState<BlockPageView>("list");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [siteInfo, setSiteInfo] = useState<RawSiteInfo>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form state
  const [domainInput, setDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [blockType, setBlockType] = useState<BlockType>("dailyLimit");
  const [timeLimitInput, setTimeLimitInput] = useState("60");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    StorageService.getSettings().then(setSettings);
    StorageService.getSiteInfo().then(setSiteInfo);
  }, []);

  useEffect(() => {
    StorageService.getSiteInfo().then(setSiteInfo);
  }, [settings.blocks]);

  const saveSettings = async (updated: AppSettings) => {
    setSettings(updated);
    await StorageService.saveSettings(updated);
  };

  const startEdit = (absoluteIndex: number) => {
    const rule = settings.blocks[absoluteIndex];
    setEditingIndex(absoluteIndex);
    setDomainInput(rule.domain);
    setBlockType(rule.type);
    setTimeLimitInput(String(rule.timeLimit ?? 60));
    setStartTime(rule.startTime ?? "09:00");
    setEndTime(rule.endTime ?? "17:00");
    setDays(rule.days ?? [1, 2, 3, 4, 5]);
    setRedirectUrl(rule.redirectUrl ?? "");
    setDomainError(null);
    setView("form");
  };

  const saveRule = async () => {
    if (!domainInput.trim()) return;
    const domain = normalizeDomainInput(domainInput);
    if (!isValidDomain(domain)) {
      setDomainError(`"${domain}" is not a valid domain.`);
      return;
    }
    const isDuplicate = settings.blocks.some(
      (r, i) => r.domain === domain && r.type === blockType && i !== editingIndex
    );
    if (isDuplicate) {
      setDomainError("A rule for this domain and type already exists.");
      return;
    }

    const clampedTimeLimit = Math.max(1, Number(timeLimitInput) || 1);

    const newRule: BlockRule = {
      domain,
      type: blockType,
      ...(blockType === "dailyLimit" || blockType === "weeklyLimit" ? { timeLimit: clampedTimeLimit } : {}),
      ...(blockType === "scheduled" ? { startTime, endTime } : {}),
      ...(blockType === "daysOfWeek" ? { days } : {}),
      ...(redirectUrl.trim() ? { redirectUrl: redirectUrl.trim() } : {}),
    };

    const updatedBlocks =
      editingIndex === null
        ? [...settings.blocks, newRule]
        : settings.blocks.map((r, i) => (i === editingIndex ? newRule : r));

    await saveSettings({ ...settings, blocks: updatedBlocks });
    setDomainInput("");
    setDomainError(null);
    setRedirectUrl("");
    setEditingIndex(null);
    setView("list");
  };

  const toggleRule = async (absoluteIndex: number) => {
    const updatedBlocks = settings.blocks.map((r, i) =>
      i === absoluteIndex ? { ...r, enabled: r.enabled === false ? true : false } : r
    );
    await saveSettings({ ...settings, blocks: updatedBlocks });
  };

  const removeRule = async (absoluteIndex: number) => {
    await saveSettings({
      ...settings,
      blocks: settings.blocks.filter((_, i) => i !== absoluteIndex),
    });
  };

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const openAddForm = () => {
    setEditingIndex(null);
    setDomainInput("");
    setDomainError(null);
    setRedirectUrl("");
    setBlockType("dailyLimit");
    setTimeLimitInput("60");
    setStartTime("09:00");
    setEndTime("17:00");
    setDays([1, 2, 3, 4, 5]);
    setView("form");
  };

  // ── Form Subview ──────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <div className="bf-container">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => { setEditingIndex(null); setView("list"); }}>
            <BackIcon />
          </button>
          <span className="settings-title">{editingIndex === null ? "Add Block Rule" : "Edit Block Rule"}</span>
        </div>

        <div className="bf-content">
          {/* Domain */}
          <div className="bf-section">
            <div className="bf-label">Website Domain</div>
            <div className="bf-domain-wrap">
              <GlobeIcon />
              <input
                className="bf-input"
                type="text"
                placeholder="e.g. youtube.com"
                value={domainInput}
                onChange={(e) => { setDomainInput(e.target.value); setDomainError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") saveRule(); }}
              />
            </div>
            {domainError && <span className="domain-error">{domainError}</span>}
          </div>

          {/* Block Type */}
          <div className="bf-section">
            <div className="bf-label">Block Type</div>
            <div className="bf-type-grid">
              {(Object.keys(BLOCK_TYPE_FORM_LABELS) as BlockType[]).map((type) => (
                <button
                  key={type}
                  className={`bf-type-card${blockType === type ? " active" : ""}`}
                  onClick={() => setBlockType(type)}
                >
                  <span className="bf-type-title">{BLOCK_TYPE_FORM_LABELS[type]}</span>
                  <span className="bf-type-desc">{BLOCK_TYPE_DESCRIPTIONS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Limit (dailyLimit / weeklyLimit) */}
          {(blockType === "dailyLimit" || blockType === "weeklyLimit") && (
            <div className="bf-section">
              <div className="bf-label">
                Time Limit{" "}
                <span className="bf-label-muted">
                  ({blockType === "dailyLimit" ? "minutes per day" : "minutes per week"})
                </span>
              </div>
              <div className="bf-time-row">
                <input
                  className="bf-time-input"
                  type="number"
                  value={timeLimitInput}
                  onChange={(e) => setTimeLimitInput(e.target.value)}
                  onBlur={() => {
                    const v = Math.max(1, Number(timeLimitInput) || 1);
                    setTimeLimitInput(String(v));
                  }}
                />
                <span className="bf-time-unit">minutes</span>
                <div className="bf-presets">
                  {[15, 30, 60].map((v) => (
                    <button
                      key={v}
                      className={`bf-preset-btn${Number(timeLimitInput) === v ? " active" : ""}`}
                      onClick={() => setTimeLimitInput(String(v))}
                    >
                      {v}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scheduled */}
          {blockType === "scheduled" && (
            <div className="bf-section">
              <div className="bf-label">Blocked Hours</div>
              <div className="time-range-row">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <span className="time-range-sep">to</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Days of Week */}
          {blockType === "daysOfWeek" && (
            <div className="bf-section">
              <div className="bf-label">Blocked Days</div>
              <div className="day-toggle-row">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    className={`day-toggle-btn${days.includes(i) ? " active" : ""}`}
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Redirect URL */}
          <div className="bf-section">
            <div className="bf-label bf-label-row">
              <ExternalLinkIcon />
              <span>Custom Redirect URL</span>
              <span className="bf-label-muted">(optional)</span>
            </div>
            <input
              className="bf-input bf-input-mono"
              type="url"
              placeholder="https://example.com"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
            />
            <span className="bf-hint">Where to send users when they visit a blocked site</span>
          </div>

          {/* Save */}
          <button className="bf-save-btn" onClick={saveRule}>
            {editingIndex === null ? "Add Block Rule" : "Save Rule"}
          </button>
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────
  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <BackIcon />
        </button>
        <span className="settings-title" style={{ flex: 1 }}>Block Rules</span>
        <button className="block-add-header-btn" onClick={openAddForm}>
          <PlusIcon />
        </button>
      </div>

      <div className="settings-content">
        {settings.blocks.length === 0 ? (
          <span className="settings-row-desc">No block rules configured yet.</span>
        ) : (() => {
          const activeRules = settings.blocks.map((r, i) => ({ rule: r, index: i })).filter(({ rule }) => rule.enabled !== false);
          const pausedRules = settings.blocks.map((r, i) => ({ rule: r, index: i })).filter(({ rule }) => rule.enabled === false);

          const renderCard = (rule: BlockRule, absoluteIndex: number) => {
            const analytics = computeAnalytics(rule, siteInfo);
            return (
              <div key={absoluteIndex} className={`block-rule-card${rule.enabled === false ? " block-rule-card-paused" : ""}`}>
                <img
                  src={navigator.onLine
                    ? `https://www.google.com/s2/favicons?domain=${rule.domain}&sz=32`
                    : '/icons/default.png'}
                  alt=""
                  className="block-rule-favicon"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!navigator.onLine || img.src.endsWith('/icons/default.png')) return;
                    if (img.src.includes('google.com')) {
                      img.src = `https://icons.duckduckgo.com/ip3/${rule.domain}.ico`;
                    } else if (img.src.includes('duckduckgo.com')) {
                      img.src = `https://${rule.domain}/favicon.ico`;
                    } else {
                      img.src = '/icons/default.png';
                    }
                  }}
                />
                <div className="block-rule-card-content">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span className="domain-name">{rule.domain}</span>
                    <span className="block-rule-badge">{BLOCK_TYPE_LABELS[rule.type]}</span>
                    <div style={{ flex: 1 }} />
                    <button
                      className={`block-rule-toggle${rule.enabled !== false ? " block-rule-toggle-on" : ""}`}
                      onClick={() => toggleRule(absoluteIndex)}
                    >
                      <span className="block-rule-toggle-knob" />
                    </button>
                    <button className="block-edit-btn" onClick={() => startEdit(absoluteIndex)}>
                      <EditIcon />
                    </button>
                    <button className="domain-remove-btn" onClick={() => removeRule(absoluteIndex)}>✕</button>
                  </div>
                  {(rule.type === "dailyLimit" || rule.type === "weeklyLimit") &&
                    analytics.usedSeconds !== undefined &&
                    analytics.limitSeconds !== undefined && (
                      <>
                        <span className="block-usage-text">
                          {formatSeconds(analytics.usedSeconds)} / {formatSeconds(analytics.limitSeconds)}
                        </span>
                        <div className="block-progress-bar">
                          <div
                            className="block-progress-fill"
                            style={{
                              width: `${analytics.percentUsed ?? 0}%`,
                              backgroundColor: getProgressColor(analytics.percentUsed ?? 0),
                            }}
                          />
                        </div>
                      </>
                    )}
                  {(rule.type === "scheduled" || rule.type === "daysOfWeek") && (
                    <span
                      className={`block-status-badge ${analytics.isActiveNow ? "block-status-active" : "block-status-inactive"}`}
                    >
                      {analytics.isActiveNow ? "Active now" : "Inactive"}
                    </span>
                  )}
                </div>
              </div>
            );
          };

          return (
            <>
              {activeRules.length > 0 && (
                <>
                  <span className="block-section-label">ACTIVE ({activeRules.length})</span>
                  {activeRules.map(({ rule, index }) => renderCard(rule, index))}
                </>
              )}
              {pausedRules.length > 0 && (
                <>
                  <span className="block-section-label">PAUSED ({pausedRules.length})</span>
                  {pausedRules.map(({ rule, index }) => renderCard(rule, index))}
                </>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default BlockPage;
