import TabTracker from "./tabTracker";

export class IdleManager {
  private tabTracker: TabTracker;
  private isLocked: boolean;
  private isIdle: boolean;
  private idleTrackingEnabled: boolean;
  private idleTimeoutMinutes: number;

  constructor(tabTracker: TabTracker) {
    this.tabTracker = tabTracker;
    this.isLocked = false;
    this.isIdle = false;
    this.idleTrackingEnabled = true;
    this.idleTimeoutMinutes = 5;
    this.initialize();
  }

  initialize() {
    // Load initial settings
    chrome.storage.sync.get(["settings"], (result) => {
      this.idleTrackingEnabled = result.settings?.idleTrackingEnabled ?? true;
      this.idleTimeoutMinutes = result.settings?.idleTimeoutMinutes ?? 5;
      chrome.idle.setDetectionInterval(this.idleTimeoutMinutes * 60);
    });

    // React to live setting changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.settings?.newValue) {
        this.idleTrackingEnabled =
          changes.settings.newValue.idleTrackingEnabled ??
          this.idleTrackingEnabled;

        const newMinutes = changes.settings.newValue.idleTimeoutMinutes;
        if (newMinutes !== undefined && newMinutes !== this.idleTimeoutMinutes) {
          this.idleTimeoutMinutes = newMinutes;
          chrome.idle.setDetectionInterval(this.idleTimeoutMinutes * 60);
        }
      }
    });

    // Listen for state changes
    chrome.idle.onStateChanged.addListener(async (newState) => {
      if (newState === "locked") {
        await this.handleLocked();
      } else if (newState === "idle") {
        await this.handleIdle();
      } else if (newState === "active") {
        await this.handleActive();
      }
    });

    // Check initial state
    chrome.idle.queryState(this.idleTimeoutMinutes * 60, async (state) => {
      if (state === "locked") {
        await this.handleLocked();
      } else if (state === "idle") {
        await this.handleIdle();
      }
    });
  }

  async handleLocked() {
    if (!this.isLocked) {
      console.log("System locked - pausing tracking");
      this.isLocked = true;
      this.isIdle = false;

      await this.tabTracker.saveTime();
      this.tabTracker.cleanup();
    }
  }

  async handleIdle() {
    if (!this.idleTrackingEnabled || this.isIdle || this.isLocked) return;

    console.log("System idle - pausing tracking");
    this.isIdle = true;
    await this.tabTracker.pauseTracking();
  }

  async handleActive() {
    if (this.isLocked) {
      console.log("System unlocked - resuming tracking");
      this.isLocked = false;
      this.isIdle = false;
      await this.tabTracker.initialize();
    } else if (this.isIdle) {
      console.log("System active - resuming tracking");
      this.isIdle = false;
      await this.tabTracker.resumeTracking();
    }
  }
}

export default IdleManager;
