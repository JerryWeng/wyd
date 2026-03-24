import type { BlockRule } from "../../types/data.types.js";
import StorageManager from "./storageManager.js";

export interface BlockResult {
  blocked: true;
  redirectUrl: string;
}

export class BlockManager {
  private rules: BlockRule[] = [];
  private defaultRedirectUrl: string = "";
  private storageManager: StorageManager;
  private listenerAdded = false;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  async initialize(): Promise<void> {
    await this.loadFromStorage();
    this.attachStorageListener();
  }

  private loadFromStorage(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["settings"], (result) => {
        this.rules = result.settings?.blocks ?? [];
        this.defaultRedirectUrl = result.settings?.defaultRedirectUrl ?? "";
        resolve();
      });
    });
  }

  private attachStorageListener(): void {
    if (this.listenerAdded) return;
    this.listenerAdded = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.settings?.newValue) {
        this.rules = changes.settings.newValue.blocks ?? this.rules;
        this.defaultRedirectUrl =
          changes.settings.newValue.defaultRedirectUrl ?? this.defaultRedirectUrl;
      }
    });
  }

  private resolveRedirectUrl(rule: BlockRule, domain: string): string {
    const custom = rule.redirectUrl ?? this.defaultRedirectUrl;
    if (custom && custom.length > 0) return custom;
    const base = chrome.runtime.getURL("redirect.html");
    return `${base}?domain=${encodeURIComponent(domain)}`;
  }

  // inFlightSeconds: unsaved session time currently in TabTracker's memory
  async isBlocked(
    domain: string,
    inFlightSeconds: number = 0
  ): Promise<BlockResult | null> {
    for (const rule of this.rules) {
      const domainMatches =
        domain === rule.domain || domain.endsWith(`.${rule.domain}`);
      if (!domainMatches) continue;

      const blocked = await this.evaluateRule(rule, domain, inFlightSeconds);
      if (blocked) {
        return { blocked: true, redirectUrl: this.resolveRedirectUrl(rule, domain) };
      }
    }
    return null;
  }

  private async evaluateRule(
    rule: BlockRule,
    domain: string,
    inFlightSeconds: number
  ): Promise<boolean> {
    switch (rule.type) {
      case "dailyLimit":
        return this.checkDailyLimit(rule, domain, inFlightSeconds);
      case "weeklyLimit":
        return this.checkWeeklyLimit(rule, domain, inFlightSeconds);
      case "scheduled":
        return this.checkScheduled(rule);
      case "daysOfWeek":
        return this.checkDaysOfWeek(rule);
      default:
        return false;
    }
  }

  private async checkDailyLimit(
    rule: BlockRule,
    domain: string,
    inFlightSeconds: number
  ): Promise<boolean> {
    if (!rule.timeLimit) return false;
    const today = this.storageManager.getLocalDateString();
    const storedSeconds = await this.storageManager.getTotalDomainTime(domain, today);
    return storedSeconds + inFlightSeconds >= rule.timeLimit * 60;
  }

  private async checkWeeklyLimit(
    rule: BlockRule,
    domain: string,
    inFlightSeconds: number
  ): Promise<boolean> {
    if (!rule.timeLimit) return false;
    const dates = this.storageManager.getDateStringsForPastDays(7);
    const storedSeconds = await this.storageManager.getTotalDomainTimeRange(domain, dates);
    return storedSeconds + inFlightSeconds >= rule.timeLimit * 60;
  }

  private checkScheduled(rule: BlockRule): boolean {
    if (!rule.startTime || !rule.endTime) return false;
    const now = new Date();
    const [startH, startM] = rule.startTime.split(":").map(Number);
    const [endH, endM] = rule.endTime.split(":").map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight ranges (e.g., 22:00–06:00)
    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
  }

  private checkDaysOfWeek(rule: BlockRule): boolean {
    if (!rule.days || rule.days.length === 0) return false;
    return rule.days.includes(new Date().getDay());
  }
}

export default BlockManager;
