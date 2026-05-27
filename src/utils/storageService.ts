import type { AppSettings, Category, RawSiteInfo } from "../types/data.types";
import { DEFAULT_SETTINGS } from "../types/data.types";

export class StorageService {
  static async getSiteInfo(): Promise<RawSiteInfo> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["siteInfo"], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result.siteInfo || {});
        }
      });
    });
  }

  static async sendMessageToBackground(message: any) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "sendMessageToBackground error:",
            chrome.runtime.lastError.message
          );
          resolve(undefined);
        } else {
          resolve(response);
        }
      });
    });
  }

  static async saveCurrentTime() {
    try {
      const response = await this.sendMessageToBackground({
        action: "saveTime",
      });
      console.log("Background script saved current tab information");
      return response;
    } catch (error) {
      console.error("Error saving time:", error);
      throw error;
    }
  }

  static async getDayData(dateString: string) {
    const siteInfo = await this.getSiteInfo();
    return siteInfo[dateString] || { time: {}, sessions: {} };
  }

  static async getAvailableDates() {
    const siteInfo = await this.getSiteInfo();
    return Object.keys(siteInfo).sort();
  }

  static async getSettings(): Promise<AppSettings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["settings"], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...(result.settings || {}) });
      });
    });
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  static async clearDataRange(
    range: Exclude<Category, "total">
  ): Promise<void> {
    await this.sendMessageToBackground({ action: "clearData", range });
  }

  static async clearAllData(): Promise<void> {
    await this.sendMessageToBackground({ action: "clearAllData" });
  }

  static async saveSiteInfo(siteInfo: RawSiteInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ siteInfo }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  static async importData(
    file: File,
    mode: "merge" | "replace"
  ): Promise<void> {
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    let parsed: RawSiteInfo;

    if (ext === "json") {
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file.");
      }
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error("JSON does not match expected format.");
      }
      parsed = raw as RawSiteInfo;
    } else if (ext === "csv") {
      parsed = {};
      const lines = text.trim().split("\n").slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const [date, domain, timeStr, sessionsStr] = line.split(",");
        if (!date || !domain) continue;
        if (!parsed[date]) parsed[date] = { time: {}, sessions: {} };
        parsed[date].time[domain] = Number(timeStr) || 0;
        parsed[date].sessions[domain] = Number(sessionsStr) || 0;
      }
    } else {
      throw new Error("Unsupported file type. Please use a .json or .csv file.");
    }

    if (mode === "merge") {
      const existing = await this.getSiteInfo();
      for (const [date, dayData] of Object.entries(parsed)) {
        if (!existing[date]) {
          existing[date] = { time: {}, sessions: {} };
        }
        for (const [domain, secs] of Object.entries(dayData.time)) {
          existing[date].time[domain] = (existing[date].time[domain] ?? 0) + secs;
        }
        for (const [domain, count] of Object.entries(dayData.sessions)) {
          existing[date].sessions[domain] =
            (existing[date].sessions[domain] ?? 0) + count;
        }
      }
      await this.saveSiteInfo(existing);
    } else {
      await this.saveSiteInfo(parsed);
    }
  }

  static exportData(siteInfo: RawSiteInfo, format: "json" | "csv"): void {
    const dateStr = new Date().toISOString().split("T")[0];
    let blob: Blob;
    let filename: string;

    if (format === "json") {
      blob = new Blob([JSON.stringify(siteInfo, null, 2)], {
        type: "application/json",
      });
      filename = `wyd-data-${dateStr}.json`;
    } else {
      const rows = ["date,domain,time_seconds,sessions"];
      for (const [date, dayData] of Object.entries(siteInfo)) {
        for (const domain of Object.keys(dayData.time)) {
          rows.push(
            `${date},${domain},${dayData.time[domain] ?? 0},${dayData.sessions[domain] ?? 0}`
          );
        }
      }
      blob = new Blob([rows.join("\n")], { type: "text/csv" });
      filename = `wyd-data-${dateStr}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
