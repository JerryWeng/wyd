import StorageManager from "./modules/storageManager";
import BadgeManager from "./modules/badgeManager";
import IdleManager from "./modules/idleManager";
import TabTracker from "./modules/tabTracker";
import EventHandler from "./modules/eventHandler";

class BackgroundScript {
  private storageManager: StorageManager;
  private badgeManager: BadgeManager;
  private tabTracker: TabTracker;

  constructor() {
    this.storageManager = new StorageManager();
    this.badgeManager = new BadgeManager();
    this.tabTracker = new TabTracker(this.storageManager, this.badgeManager);

    const idleManager = new IdleManager(this.tabTracker);
    new EventHandler(this.tabTracker, idleManager);

    this.initialize();
  }

  async initialize() {
    console.log("Background script initialized");
    chrome.storage.session.get(["systemLocked"], (result) => {
      if (result.systemLocked) return; // Was locked — handleActive() will resume when unlocked
      chrome.idle.queryState(60, async (state) => {
        if (state !== "locked") {
          await this.tabTracker.initialize();
        }
      });
    });
  }
}

// Initialize the background script
new BackgroundScript();
