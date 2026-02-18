import StorageManager from "./storageManager.js";
import BadgeManager from "./badgeManager.js";

export class TabTracker {
  public storageManager: StorageManager;
  public badgeManager: BadgeManager;
  public currentTab: {
    id: number | undefined;
    intervalId: NodeJS.Timeout | null;
    domain: string | null;
    currentDate: string | undefined;
    startTime: number | null;
    accumulatedTime: number;
  };

  constructor(storageManager: StorageManager, badgeManager: BadgeManager) {
    this.storageManager = storageManager;
    this.badgeManager = badgeManager;

    this.currentTab = {
      id: undefined,
      intervalId: null,
      domain: null,
      currentDate: undefined,
      startTime: null,
      accumulatedTime: 0,
    };
  }

  getDomain(url: string | undefined) {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      if (
        urlObj.protocol === "chrome:" ||
        urlObj.protocol === "about:" ||
        urlObj.protocol === "file:"
      ) {
        return null;
      }
      if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
        return urlObj.hostname;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  getElapsedTime() {
    if (!this.currentTab.startTime) return 0;
    const now = Date.now();
    return Math.floor((now - this.currentTab.startTime) / 1000);
  }

  getCurrentSessionTime() {
    return this.currentTab.accumulatedTime + this.getElapsedTime();
  }

  async getTotalDomainTime() {
    if (!this.currentTab.domain) return 0;

    const storedTime = await this.storageManager.getTotalDomainTime(
      this.currentTab.domain,
      this.currentTab.currentDate
    );
    const currentSessionTime = this.getCurrentSessionTime();

    return storedTime + currentSessionTime;
  }

  async trackTab(tab: chrome.tabs.Tab) {
    if (this.currentTab.intervalId) {
      clearInterval(this.currentTab.intervalId);
      this.currentTab.intervalId = null;
    }

    if (this.currentTab.domain && this.currentTab.startTime) {
      const elapsedTime = this.getElapsedTime();
      this.currentTab.accumulatedTime += elapsedTime;
    }

    this.currentTab.id = tab.id;
    this.currentTab.domain = this.getDomain(tab.url);
    this.currentTab.startTime = Date.now();
    this.currentTab.accumulatedTime = 0;
    this.currentTab.currentDate = this.storageManager.getLocalDateString();

    if (this.currentTab.domain) {
      await this.badgeManager.startBadgeUpdates(
        this.currentTab.domain,
        () => this.getCurrentSessionTime(),
        () => this.getTotalDomainTime()
      );

      this.currentTab.intervalId = setInterval(async () => {
        const today = this.storageManager.getLocalDateString();

        if (today !== this.currentTab.currentDate) {
          console.log(
            `Date changed from ${this.currentTab.currentDate} to ${today}`
          );

          const totalTime = this.getCurrentSessionTime();
          if (totalTime > 0) {
            await this.storageManager.updateTimeOnly(
              this.currentTab.domain,
              totalTime,
              this.currentTab.currentDate
            );
          }

          this.currentTab.currentDate = today;
          this.currentTab.startTime = Date.now();
          this.currentTab.accumulatedTime = 0;

          await this.badgeManager.updateBadge(this.currentTab.domain, () =>
            this.getTotalDomainTime()
          );
        }
      }, 30000);

      console.log(`Now tracking tab: ${tab.id} (${this.currentTab.domain})`);
    } else {
      this.badgeManager.clearBadge();
      console.log(`Not tracking tab: ${tab.id} (invalid domain)`);
    }
  }

  async resumeTracking() {
    if (!this.currentTab.domain) return;

    this.currentTab.startTime = Date.now();

    await this.badgeManager.resumeBadgeUpdates(
      this.currentTab.domain,
      () => this.getCurrentSessionTime(),
      () => this.getTotalDomainTime()
    );

    this.currentTab.intervalId = setInterval(async () => {
      const today = this.storageManager.getLocalDateString();

      if (today !== this.currentTab.currentDate) {
        console.log(
          `Date changed from ${this.currentTab.currentDate} to ${today}`
        );

        const totalTime = this.getCurrentSessionTime();
        if (totalTime > 0) {
          await this.storageManager.updateTimeOnly(
            this.currentTab.domain,
            totalTime,
            this.currentTab.currentDate
          );
        }

        this.currentTab.currentDate = today;
        this.currentTab.startTime = Date.now();
        this.currentTab.accumulatedTime = 0;

        await this.badgeManager.updateBadge(this.currentTab.domain, () =>
          this.getTotalDomainTime()
        );
      }
    }, 30000);

    console.log(`Resumed tracking for: ${this.currentTab.domain}`);
  }

  async pauseTracking() {
    if (this.currentTab.intervalId) {
      clearInterval(this.currentTab.intervalId);
      this.currentTab.intervalId = null;
    }

    this.badgeManager.pauseBadgeUpdates();

    if (this.currentTab.domain) {
      await this.badgeManager.updateBadge(this.currentTab.domain, () =>
        this.getTotalDomainTime()
      );
    }

    console.log("Tracking paused, badge preserved");
  }

  async saveInfo() {
    if (this.currentTab.domain && this.currentTab.startTime) {
      const totalTime = this.getCurrentSessionTime();
      if (totalTime > 0) {
        await this.storageManager.updateInfo(
          this.currentTab.domain,
          totalTime,
          this.currentTab.currentDate
        );
        this.currentTab.accumulatedTime = 0;
        this.currentTab.startTime = Date.now();

        await this.badgeManager.updateBadge(this.currentTab.domain, () =>
          this.getTotalDomainTime()
        );
      }
    }
  }

  async saveTime() {
    if (this.currentTab.domain && this.currentTab.startTime) {
      const totalTime = this.getCurrentSessionTime();
      if (totalTime > 0) {
        await this.storageManager.updateTimeOnly(
          this.currentTab.domain,
          totalTime,
          this.currentTab.currentDate
        );
        this.currentTab.accumulatedTime = 0;
        this.currentTab.startTime = Date.now();

        await this.badgeManager.updateBadge(this.currentTab.domain, () =>
          this.getTotalDomainTime()
        );
      }
    }
  }

  async initialize() {
    this.currentTab.currentDate = this.storageManager.getLocalDateString();

    try {
      const tabs: chrome.tabs.Tab[] = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tabs);
          }
        });
      });

      if (tabs.length > 0) {
        await this.trackTab(tabs[0]);
      }
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  }

  cleanup() {
    if (this.currentTab.intervalId) {
      clearInterval(this.currentTab.intervalId);
      this.currentTab.intervalId = null;
    }
    this.badgeManager.clearBadge();
  }

  get currentDomain() {
    return this.currentTab.domain;
  }

  get currentTabId() {
    return this.currentTab.id;
  }
}

export default TabTracker;
