import StorageManager from "./modules/storageManager";
import BadgeManager from "./modules/badgeManager";
import IdleManager from "./modules/idleManager";
import TabTracker from "./modules/tabTracker";
import EventHandler from "./modules/eventHandler";
import BlockManager from "./modules/blockManager";

class BackgroundScript {
  private storageManager: StorageManager;
  private badgeManager: BadgeManager;
  private blockManager: BlockManager;
  private tabTracker: TabTracker;

  constructor() {
    this.storageManager = new StorageManager();
    this.badgeManager = new BadgeManager();
    this.blockManager = new BlockManager(this.storageManager);
    this.tabTracker = new TabTracker(this.storageManager, this.badgeManager, this.blockManager);

    const idleManager = new IdleManager(this.tabTracker);
    new EventHandler(this.tabTracker, idleManager);

    this.initialize();
  }

  async initialize() {
    console.log("Background script initialized");
    await this.blockManager.initialize();
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
