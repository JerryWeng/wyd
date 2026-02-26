import type { AppSettings, RawSiteInfo } from "../types/data.types";
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

  static async clearTodayData(): Promise<void> {
    const siteInfo = await this.getSiteInfo();
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    delete siteInfo[dateKey];
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

  static async clearAllData(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ siteInfo: {} }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
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
