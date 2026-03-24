import { useState, useEffect } from "react";
import { StorageService } from "../utils/storageService";
import type { AppSettings, BlockRule, BlockType } from "../types/data.types";
import { DEFAULT_SETTINGS } from "../types/data.types";
import { isValidDomain, normalizeDomainInput } from "../utils/domainUtils";
import { usePagination } from "../hooks/usePagination";
import "../popup/css/settings.css";
import "../popup/css/blockPage.css";

interface BlockPageProps {
  onClose: () => void;
}

type BlockPageView = "list" | "add";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  dailyLimit: "Daily limit",
  weeklyLimit: "Weekly limit",
  scheduled: "Scheduled",
  daysOfWeek: "Days of week",
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ruleDescription(rule: BlockRule): string {
  switch (rule.type) {
    case "dailyLimit":
      return `${rule.timeLimit ?? "?"} min/day`;
    case "weeklyLimit":
      return `${rule.timeLimit ?? "?"} min/week`;
    case "scheduled":
      return `${rule.startTime ?? "?"} – ${rule.endTime ?? "?"}`;
    case "daysOfWeek": {
      const labels = (rule.days ?? []).map((d) => DAY_LABELS[d]).join(", ");
      return labels || "No days";
    }
  }
}

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15 18L9 12L15 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BlockPage = ({ onClose }: BlockPageProps) => {
  const [view, setView] = useState<BlockPageView>("list");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Add form state
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
  }, []);

  const { currentPage, totalPages, currentPageItems, goToNextPage, goToPreviousPage, isFirstPage, isLastPage } =
    usePagination(settings.blocks, 4);

  const saveSettings = async (updated: AppSettings) => {
    setSettings(updated);
    await StorageService.saveSettings(updated);
  };

  const addRule = async () => {
    if (!domainInput.trim()) return;
    const domain = normalizeDomainInput(domainInput);
    if (!isValidDomain(domain)) {
      setDomainError(`"${domain}" is not a valid domain.`);
      return;
    }
    if (settings.blocks.some((r) => r.domain === domain && r.type === blockType)) {
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

    await saveSettings({ ...settings, blocks: [...settings.blocks, newRule] });
    setDomainInput("");
    setDomainError(null);
    setRedirectUrl("");
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

  // ── Add Rule Subview ──────────────────────────────────────────────────────
  if (view === "add") {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => setView("list")}>
            <BackIcon />
          </button>
          <span className="settings-title">Add Block Rule</span>
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
                  onKeyDown={(e) => { if (e.key === "Enter") addRule(); }}
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
              <button className="domain-add-btn" onClick={addRule}>
                Save Rule
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────
  const pageOffset = (currentPage - 1) * 4;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <BackIcon />
        </button>
        <span className="settings-title">Block Rules</span>
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
                    return (
                      <li key={absoluteIndex} className="domain-item">
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", flex: 1 }}>
                          <span className="domain-name">{rule.domain}</span>
                          <span className="block-rule-badge">{ruleDescription(rule)}</span>
                        </div>
                        <button
                          className="domain-remove-btn"
                          onClick={() => removeRule(absoluteIndex)}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {totalPages > 1 && (
                  <div id="paginationControls" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
                    <button
                      className="pageControl"
                      onClick={goToPreviousPage}
                      disabled={isFirstPage}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      className="pageControl"
                      onClick={goToNextPage}
                      disabled={isLastPage}
                    >
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

        <div className="settings-section">
          <div className="settings-block">
            <button className="domain-add-btn" onClick={() => setView("add")}>
              + Add a block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockPage;
