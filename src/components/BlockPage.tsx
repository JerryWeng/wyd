import { useState, useEffect } from "react";
import { StorageService } from "../utils/storageService";
import type { AppSettings, BlockRule, BlockType, RawSiteInfo } from "../types/data.types";
import { DEFAULT_SETTINGS } from "../types/data.types";
import { isValidDomain, normalizeDomainInput } from "../utils/domainUtils";
import { usePagination } from "../hooks/usePagination";
import "../popup/css/settings.css";
import "../popup/css/blockPage.css";

interface BlockPageProps {
  onClose: () => void;
}

type BlockPageView = "list" | "form";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  dailyLimit: "Daily limit",
  weeklyLimit: "Weekly limit",
  scheduled: "Scheduled",
  daysOfWeek: "Days of week",
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
  const [timeLimit, setTimeLimit] = useState(60);
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

  const { currentPage, totalPages, currentPageItems, goToNextPage, goToPreviousPage, isFirstPage, isLastPage } =
    usePagination(settings.blocks, 3);

  const saveSettings = async (updated: AppSettings) => {
    setSettings(updated);
    await StorageService.saveSettings(updated);
  };

  const startEdit = (absoluteIndex: number) => {
    const rule = settings.blocks[absoluteIndex];
    setEditingIndex(absoluteIndex);
    setDomainInput(rule.domain);
    setBlockType(rule.type);
    setTimeLimit(rule.timeLimit ?? 60);
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

    const newRule: BlockRule = {
      domain,
      type: blockType,
      ...(blockType === "dailyLimit" || blockType === "weeklyLimit" ? { timeLimit } : {}),
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
    setTimeLimit(60);
    setStartTime("09:00");
    setEndTime("17:00");
    setDays([1, 2, 3, 4, 5]);
    setView("form");
  };

  // ── Form Subview ──────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => { setEditingIndex(null); setView("list"); }}>
            <BackIcon />
          </button>
          <span className="settings-title">{editingIndex === null ? "Add Block Rule" : "Edit Block Rule"}</span>
        </div>

        <div className="settings-content">
          {/* Domain */}
          <div className="settings-section">
            <div className="settings-section-title">Domain</div>
            <div className="settings-block">
              <div className="domain-input-row">
                <input
                  className="domain-input"
                  type="text"
                  placeholder="e.g. youtube.com"
                  value={domainInput}
                  onChange={(e) => { setDomainInput(e.target.value); setDomainError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRule(); }}
                />
              </div>
              {domainError && <span className="domain-error">{domainError}</span>}
            </div>
          </div>

          {/* Block Type */}
          <div className="settings-section">
            <div className="settings-section-title">Block Type</div>
            <div className="settings-block">
              <div className="block-type-options">
                {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((type) => (
                  <button
                    key={type}
                    className={`view-option-btn${blockType === type ? " active" : ""}`}
                    onClick={() => setBlockType(type)}
                  >
                    {BLOCK_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Type-specific inputs */}
          {(blockType === "dailyLimit" || blockType === "weeklyLimit") && (
            <div className="settings-section">
              <div className="settings-section-title">
                {blockType === "dailyLimit" ? "Daily" : "Weekly"} Limit (minutes)
              </div>
              <div className="settings-block">
                <input
                  className="domain-input"
                  type="number"
                  min={1}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
          )}

          {blockType === "scheduled" && (
            <div className="settings-section">
              <div className="settings-section-title">Blocked Hours</div>
              <div className="settings-block">
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
            </div>
          )}

          {blockType === "daysOfWeek" && (
            <div className="settings-section">
              <div className="settings-section-title">Blocked Days</div>
              <div className="settings-block">
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
            </div>
          )}

          {/* Optional redirect URL */}
          <div className="settings-section">
            <div className="settings-section-title">Custom Redirect URL (optional)</div>
            <div className="settings-block">
              <input
                className="domain-input"
                type="url"
                placeholder="https://example.com (leave blank for default)"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-block">
              <button className="domain-add-btn" onClick={saveRule}>
                Save Rule
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────
  const pageOffset = (currentPage - 1) * 3;

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
        <div className="settings-section">
          <div className="settings-block">
            {settings.blocks.length === 0 ? (
              <span className="settings-row-desc">No block rules configured yet.</span>
            ) : (
              <>
                <ul className="domain-list">
                  {currentPageItems.map((rule, pageIdx) => {
                    const absoluteIndex = pageOffset + pageIdx;
                    const analytics = computeAnalytics(rule, siteInfo);
                    return (
                      <li key={absoluteIndex} className="domain-item">
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <span className="domain-name" style={{ flex: 1 }}>{rule.domain}</span>
                            <span className="block-rule-badge">{BLOCK_TYPE_LABELS[rule.type]}</span>
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
                      </li>
                    );
                  })}
                </ul>
                {totalPages > 1 && (
                  <div id="paginationControls" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
                    <button className="pageControl" onClick={goToPreviousPage} disabled={isFirstPage}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {currentPage} of {totalPages}
                    </span>
                    <button className="pageControl" onClick={goToNextPage} disabled={isLastPage}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockPage;
