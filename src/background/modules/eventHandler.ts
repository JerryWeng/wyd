import TabTracker from "./tabTracker.js";
import { IdleManager } from "./idleManager.js";

export class EventHandler {
  private tabTracker: TabTracker;
  private idleManager: IdleManager;

  constructor(tabTracker: TabTracker, idleManager: IdleManager) {
    this.tabTracker = tabTracker;
    this.idleManager = idleManager;
    this.setupEventListeners();
  }

  setupEventListeners() {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log("Tab activated:", activeInfo.tabId);
      await this.handleTabActivated(activeInfo);
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (this.tabTracker.currentTabId === tabId && changeInfo.url) {
        console.log("Tab URL updated:", tabId, changeInfo.url);
        await this.handleTabUpdated(changeInfo, tab);
      }
    });

    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      console.log("Window focus changed:", windowId);
      await this.handleWindowFocusChanged(windowId);
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleRuntimeMessage(message, sender, sendResponse);
    });

    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "popup") {
        console.log("Popup connected");
        port.onDisconnect.addListener(async () => {
          console.log("Popup disconnected - resuming tracking");
          await this.handlePopupClosed();
        });
      }
    });

    chrome.runtime.onSuspend.addListener(async () => {
      console.log("Browser is closing, saving data...");
      await this.handleSuspend();
    });

    chrome.tabs.onRemoved.addListener(async (tabId) => {
      if (tabId === this.tabTracker.currentTabId) {
        await this.tabTracker.saveTime();
        this.tabTracker.cleanup();
      }
    });
  }

  async handleTabActivated(activeInfo: chrome.tabs.OnActivatedInfo) {
    try {
      await this.tabTracker.saveInfo();

      const tab: chrome.tabs.Tab = await new Promise((resolve, reject) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      });

      // Capture idle state before trackTab() resets badgeManager.isPaused
      const wasPaused = this.idleManager.isSuppressed;
      await this.tabTracker.trackTab(tab);

      // If we were idle/paused, re-pause so the correct tab is tracked when
      // the system becomes active, without starting a second interval
      if (wasPaused) {
        await this.tabTracker.pauseTracking();
      }
    } catch (error) {
      console.error("Error getting tab info:", error);
      this.tabTracker.badgeManager.stopBadgeUpdates();
    }
  }

  async handleTabUpdated(
    changeInfo: chrome.tabs.OnUpdatedInfo,
    tab: chrome.tabs.Tab
  ) {
    const newDomain = this.tabTracker.getDomain(changeInfo.url);

    if (newDomain !== this.tabTracker.currentDomain) {
      const wasPaused = this.idleManager.isSuppressed;
      await this.tabTracker.saveInfo();
      await this.tabTracker.trackTab(tab);
      if (wasPaused) {
        await this.tabTracker.pauseTracking();
      }
    }
  }

  async handleWindowFocusChanged(windowId: number) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      if (this.tabTracker.badgeManager.isUpdating()) {
        await this.tabTracker.saveTime();
        this.tabTracker.cleanup();
      } else if (
        this.tabTracker.badgeManager.paused &&
        this.tabTracker.currentTab.accumulatedTime > 0
      ) {
        // Persist any accumulated time from before the idle pause
        await this.tabTracker.saveTime();
      }
    } else {
      try {
        const tabs: chrome.tabs.Tab[] = await new Promise(
          (resolve, reject) => {
            chrome.tabs.query(
              { active: true, windowId: windowId },
              (tabs) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(tabs);
                }
              }
            );
          }
        );

        if (tabs.length > 0) {
          if (!this.idleManager.isSuppressed) {
            const newDomain = this.tabTracker.getDomain(tabs[0].url);

            if (newDomain === this.tabTracker.currentDomain) {
              // Same domain in newly focused window — just ensure the interval is running
              if (!this.tabTracker.currentTab.intervalId) {
                await this.tabTracker.trackTab(tabs[0]);
              }
            } else {
              await this.tabTracker.trackTab(tabs[0]);
            }
          } else {
            // System is idle/locked — update which tab to resume on when active again
            const newDomain = this.tabTracker.getDomain(tabs[0].url);
            if (newDomain !== this.tabTracker.currentDomain) {
              await this.tabTracker.saveInfo();
              await this.tabTracker.trackTab(tabs[0]);
              await this.tabTracker.pauseTracking();
            }
          }
        }
      } catch (error) {
        console.error("Error handling window focus:", error);
        this.tabTracker.badgeManager.stopBadgeUpdates();
      }
    }
  }

  handleRuntimeMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    if (message.action === "mediaPlayingState") {
      if (sender.tab?.id === this.tabTracker.currentTabId) {
        this.idleManager.setMediaPlaying(message.isPlaying);
      }
      return false;
    }

    if (message.action === "saveTime") {
      (async () => {
        try {
          await this.tabTracker.saveTime();
          await this.tabTracker.pauseTracking();
          console.log("Time saved and tracking paused due to popup opening");
          sendResponse({ success: true });
        } catch (error) {
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          console.error("Error saving time:", error);
          sendResponse({ success: false, error: errorMessage });
        }
      })();
      return true;
    }

    if (message.action === "clearData") {
      (async () => {
        try {
          await this.tabTracker.saveTime();
          await this.tabTracker.storageManager.clearDataRange(message.range);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      })();
      return true;
    }

    if (message.action === "clearAllData") {
      (async () => {
        try {
          await this.tabTracker.saveTime();
          await this.tabTracker.storageManager.clearAllData();
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      })();
      return true;
    }

    return false;
  }

  async handleSuspend() {
    try {
      await this.tabTracker.saveInfo();
      this.tabTracker.cleanup();
    } catch (error) {
      console.error("Error saving data on suspend:", error);
    }
  }

  async handlePopupClosed() {
    const wasPaused = this.idleManager.isSuppressed;
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
        const currentDomain = this.tabTracker.getDomain(tabs[0].url);

        if (currentDomain === this.tabTracker.currentDomain && currentDomain) {
          if (!wasPaused) {
            await this.tabTracker.resumeTracking();
          }
          // If paused (system idle), leave tracking paused — it will resume via handleActive
        } else if (currentDomain !== this.tabTracker.currentDomain) {
          await this.tabTracker.trackTab(tabs[0]);
          if (wasPaused) {
            await this.tabTracker.pauseTracking();
          }
        }
      }
    } catch (error) {
      console.error("Error resuming tracking after popup closed:", error);
    }
  }
}

export default EventHandler;
