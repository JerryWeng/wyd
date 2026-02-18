import TabTracker from "./tabTracker";

export class IdleManager {
  private tabTracker: TabTracker;
  private isLocked: boolean;

  constructor(tabTracker: TabTracker) {
    this.tabTracker = tabTracker;
    this.isLocked = false;
    this.initialize();
  }

  initialize() {
    // Listen for state changes
    chrome.idle.onStateChanged.addListener(async (newState) => {
      if (newState === "locked") {
        await this.handleLocked();
      } else if (newState === "active" && this.isLocked) {
        await this.handleUnlocked();
      }
    });

    // Check initial state
    chrome.idle.queryState(15, async (state) => {
      if (state === "locked") {
        await this.handleLocked();
      }
    });
  }

  async handleLocked() {
    if (!this.isLocked) {
      console.log("System locked - pausing tracking");
      this.isLocked = true;

      // Save current time and stop tracking
      await this.tabTracker.saveTime();
      this.tabTracker.cleanup();
    }
  }

  async handleUnlocked() {
    if (this.isLocked) {
      console.log("System unlocked - resuming tracking");
      this.isLocked = false;

      // Resume tracking
      await this.tabTracker.initialize();
    }
  }
}

export default IdleManager;
