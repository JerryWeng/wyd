import type { RawSiteInfo } from "../types/data.types";

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
}
