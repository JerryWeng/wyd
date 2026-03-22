import StorageManager from "./storageManager.js";
import BadgeManager from "./badgeManager.js";

export class TabTracker {
  public storageManager: StorageManager;
  public badgeManager: BadgeManager;
  private ignoredDomains: string[] = [];
  private settingsListenerAdded: boolean = false;
  public currentTab: {
    id: number | undefined;
    intervalId: NodeJS.Timeout | null;
    domain: string | null;
    currentDate: string | undefined;
    startTime: number | null;
    accumulatedTime: number;
    lastTickTime: number | null;
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
      lastTickTime: null,
    };
  }

  private readonly SLEEP_THRESHOLD_MS = 60_000;

  private adjustForSleep(): void {
    if (!this.currentTab.lastTickTime || !this.currentTab.startTime) return;
    const now = Date.now();
    const gap = now - this.currentTab.lastTickTime;
    if (gap > this.SLEEP_THRESHOLD_MS) {
      const validElapsed = Math.floor(
        (this.currentTab.lastTickTime - this.currentTab.startTime) / 1000
      );
      const credited = Math.max(0, validElapsed);
      this.currentTab.accumulatedTime += credited;
      this.currentTab.startTime = now;
      this.currentTab.lastTickTime = now;
      console.log(
        `[sleep] gap=${Math.round(gap / 1000)}s > 60s threshold — credited ${credited}s, discarded ${Math.round(gap / 1000) - credited}s`
      );
    }
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
      this.adjustForSleep();
      const elapsedTime = this.getElapsedTime();
      this.currentTab.accumulatedTime += elapsedTime;
    }

    this.currentTab.id = tab.id;
    this.currentTab.domain = this.getDomain(tab.url);

    if (
      this.currentTab.domain &&
      this.ignoredDomains.some(
        (ignored) =>
          this.currentTab.domain === ignored ||
          (this.currentTab.domain as string).endsWith(`.${ignored}`)
      )
    ) {
      this.currentTab.domain = null;
    }

    this.currentTab.startTime = Date.now();
    this.currentTab.lastTickTime = Date.now();
    this.currentTab.accumulatedTime = 0;
    this.currentTab.currentDate = this.storageManager.getLocalDateString();

    if (this.currentTab.domain) {
      await this.badgeManager.startBadgeUpdates(
        this.currentTab.domain,
        () => this.getCurrentSessionTime(),
        () => this.getTotalDomainTime()
      );

      this.currentTab.intervalId = this.startRolloverInterval();

      console.log(`[tracking] interval started for ${this.currentTab.domain} (tab ${tab.id})`);
    } else {
      this.badgeManager.clearBadge();
      console.log(`Not tracking tab: ${tab.id} (invalid domain)`);
    }
  }

  async resumeTracking() {
    if (!this.currentTab.domain) return;

    // If the session paused across midnight, save pre-pause time to the old date
    // and start fresh on the new date so time isn't attributed to the wrong day
    const today = this.storageManager.getLocalDateString();
    if (this.currentTab.currentDate && today !== this.currentTab.currentDate) {
      if (this.currentTab.accumulatedTime > 0) {
        await this.storageManager.updateTimeOnly(
          this.currentTab.domain,
          this.currentTab.accumulatedTime,
          this.currentTab.currentDate
        );
        this.currentTab.accumulatedTime = 0;
      }
      this.currentTab.currentDate = today;
    }

    this.currentTab.startTime = Date.now();
    this.currentTab.lastTickTime = Date.now();

    await this.badgeManager.resumeBadgeUpdates(
      this.currentTab.domain,
      () => this.getCurrentSessionTime(),
      () => this.getTotalDomainTime()
    );

    this.currentTab.intervalId = this.startRolloverInterval();

    console.log(`[tracking] interval started for ${this.currentTab.domain} (resumed)`);
  }

  private startRolloverInterval(): NodeJS.Timeout {
    return setInterval(async () => {
      this.adjustForSleep();
      this.currentTab.lastTickTime = Date.now();
      const today = this.storageManager.getLocalDateString();

      if (today !== this.currentTab.currentDate) {
        const prevDate = this.currentTab.currentDate;
        const totalTime = this.getCurrentSessionTime();

        // Reset synchronously before any await so concurrent callbacks
        // see updated state and don't re-enter this block with stale totals
        this.currentTab.currentDate = today;
        this.currentTab.startTime = Date.now();
        this.currentTab.accumulatedTime = 0;

        console.log(
          `[interval] date rollover ${prevDate}→${today}: saving ${totalTime}s for ${this.currentTab.domain}, state reset`
        );

        if (totalTime > 0) {
          await this.storageManager.updateTimeOnly(
            this.currentTab.domain,
            totalTime,
            prevDate
          );
        }

        console.log(`[interval] date rollover save complete`);

        await this.badgeManager.updateBadge(this.currentTab.domain, () =>
          this.getTotalDomainTime()
        );
      }
    }, 30000);
  }

  async pauseTracking() {
    if (this.currentTab.intervalId) {
      clearInterval(this.currentTab.intervalId);
      this.currentTab.intervalId = null;
    }

    // Capture elapsed time before pausing so it isn't lost when resumeTracking()
    // resets startTime to now. resumeTracking() already preserves accumulatedTime.
    if (this.currentTab.startTime && this.currentTab.domain) {
      this.adjustForSleep();
      this.currentTab.accumulatedTime += this.getElapsedTime();
      this.currentTab.startTime = null;
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
    this.adjustForSleep();
    if (this.currentTab.domain) {
      const totalTime = this.getCurrentSessionTime();
      if (totalTime > 0) {
        const domain = this.currentTab.domain;
        const date = this.currentTab.currentDate;

        // Reset before await so a concurrent interval callback racing us
        // sees totalTime ≈ 0 and skips its own save
        this.currentTab.accumulatedTime = 0;
        this.currentTab.startTime = Date.now();

        console.log(`[saveInfo] ${domain} ${totalTime}s (${date}), state reset`);
        await this.storageManager.updateInfo(domain, totalTime, date);
        await this.badgeManager.updateBadge(domain, () =>
          this.getTotalDomainTime()
        );
      }
    }
  }

  async saveTime() {
    this.adjustForSleep();
    if (this.currentTab.domain) {
      const totalTime = this.getCurrentSessionTime();
      if (totalTime > 0) {
        const domain = this.currentTab.domain;
        const date = this.currentTab.currentDate;

        // Reset before await so a concurrent interval callback racing us
        // sees totalTime ≈ 0 and skips its own save
        this.currentTab.accumulatedTime = 0;
        this.currentTab.startTime = Date.now();

        console.log(`[saveTime] ${domain} ${totalTime}s (${date}), state reset`);
        await this.storageManager.updateTimeOnly(domain, totalTime, date);
        await this.badgeManager.updateBadge(domain, () =>
          this.getTotalDomainTime()
        );
      }
    }
  }

  private loadSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["settings"], (result) => {
        this.ignoredDomains = result.settings?.ignoredDomains ?? [];
        resolve();
      });
    });

    if (!this.settingsListenerAdded) {
      this.settingsListenerAdded = true;
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && changes.settings?.newValue) {
          this.ignoredDomains =
            changes.settings.newValue.ignoredDomains ?? this.ignoredDomains;

          // If the currently tracked domain is now ignored, stop tracking it immediately
          if (
            this.currentTab.domain &&
            this.ignoredDomains.some(
              (ignored) =>
                this.currentTab.domain === ignored ||
                (this.currentTab.domain as string).endsWith(`.${ignored}`)
            )
          ) {
            this.saveTime().then(() => {
              if (this.currentTab.intervalId) {
                clearInterval(this.currentTab.intervalId);
                this.currentTab.intervalId = null;
              }
              this.currentTab.domain = null;
              this.badgeManager.clearBadge();
            });
          }
        }
      });
    }
  }

  async initialize() {
    await this.loadSettings();
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
