import type { RawSiteInfo } from "../../types/data.types";

export class StorageManager {
  private _writeLock: Promise<void> = Promise.resolve();

  private withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const result = this._writeLock.then(() => operation());
    this._writeLock = result.then(
      () => {},
      () => {}
    );
    return result;
  }

  async getStorageData<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[key] || null);
        }
      });
    });
  }

  async setStorageData(data: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async updateInfo(domain: string | null, seconds: number, date?: string) {
    if (!domain || seconds <= 0) return;
    return this.withWriteLock(async () => {
      const today = date || this.getLocalDateString();
      let siteInfo = (await this.getStorageData<RawSiteInfo>("siteInfo")) || {};

      if (!siteInfo[today]) {
        siteInfo[today] = { sessions: {}, time: {} };
      }

      if (!siteInfo[today].time[domain]) {
        siteInfo[today].time[domain] = 0;
      }
      siteInfo[today].time[domain] += seconds;

      if (!siteInfo[today].sessions[domain]) {
        siteInfo[today].sessions[domain] = 0;
      }
      siteInfo[today].sessions[domain] += 1;

      await this.setStorageData({ siteInfo: siteInfo });
      console.log(
        `Updated ${domain}: +${seconds}s, sessions: ${siteInfo[today].sessions[domain]}`
      );

      return siteInfo[today];
    });
  }

  async updateTimeOnly(domain: string | null, seconds: number, date?: string) {
    if (!domain || seconds <= 0) return;
    return this.withWriteLock(async () => {
      const today = date || this.getLocalDateString();
      let siteInfo = (await this.getStorageData<RawSiteInfo>("siteInfo")) || {};

      if (!siteInfo[today]) {
        siteInfo[today] = { sessions: {}, time: {} };
      }

      if (!siteInfo[today].time[domain]) {
        siteInfo[today].time[domain] = 0;
      }
      siteInfo[today].time[domain] += seconds;

      await this.setStorageData({ siteInfo: siteInfo });
      console.log(
        `Updated time for ${domain}: +${seconds}s (total: ${siteInfo[today].time[domain]}s)`
      );

      return siteInfo[today];
    });
  }

  async clearDataRange(range: string): Promise<void> {
    const daysBackMap: Record<string, number> = {
      today: 1,
      "1W": 7,
      "1M": 30,
      "1Y": 365,
    };
    const daysBack = daysBackMap[range];
    if (!daysBack) return;

    return this.withWriteLock(async () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - (daysBack - 1));

      const siteInfo = (await this.getStorageData<RawSiteInfo>("siteInfo")) || {};
      for (const dateStr of Object.keys(siteInfo)) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        if (date >= cutoff) {
          delete siteInfo[dateStr];
        }
      }
      await this.setStorageData({ siteInfo });
    });
  }

  async clearAllData(): Promise<void> {
    return this.withWriteLock(async () => {
      await this.setStorageData({ siteInfo: {} });
    });
  }

  async getTotalDomainTime(domain: string | null, date?: string) {
    if (!domain) return 0;

    const today = date || this.getLocalDateString();
    const siteInfo = (await this.getStorageData<RawSiteInfo>("siteInfo")) || {};

    if (
      siteInfo[today] &&
      siteInfo[today].time &&
      siteInfo[today].time[domain]
    ) {
      return siteInfo[today].time[domain];
    }

    return 0;
  }

  async getTotalDomainTimeRange(domain: string, dates: string[]): Promise<number> {
    if (!domain || dates.length === 0) return 0;
    const siteInfo = (await this.getStorageData<RawSiteInfo>("siteInfo")) || {};
    return dates.reduce((total, date) => {
      return total + (siteInfo[date]?.time?.[domain] ?? 0);
    }, 0);
  }

  getDateStringsForPastDays(n: number): string[] {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  }

  getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export default StorageManager;
