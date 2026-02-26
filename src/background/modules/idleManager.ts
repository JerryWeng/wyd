import TabTracker from "./tabTracker";

const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes

export class IdleManager {
  private tabTracker: TabTracker;
  private isLocked: boolean;
  private isIdle: boolean;
  private idleTrackingEnabled: boolean;

  constructor(tabTracker: TabTracker) {
    this.tabTracker = tabTracker;
    this.isLocked = false;
    this.isIdle = false;
    this.idleTrackingEnabled = true;
    this.initialize();
  }

  initialize() {
    // Load initial setting
    chrome.storage.sync.get(["settings"], (result) => {
      this.idleTrackingEnabled = result.settings?.idleTrackingEnabled ?? true;
    });

    // React to live setting changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.settings?.newValue) {
        this.idleTrackingEnabled =
          changes.settings.newValue.idleTrackingEnabled ??
          this.idleTrackingEnabled;
      }
    });

    // Set idle detection threshold
    chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);

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
    chrome.idle.queryState(IDLE_THRESHOLD_SECONDS, async (state) => {
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
