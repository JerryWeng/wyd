import TabTracker from "./tabTracker.js";

export class EventHandler {
  private tabTracker: TabTracker;

  constructor(tabTracker: TabTracker) {
    this.tabTracker = tabTracker;
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
      this.handleRuntimeMessage(message, sender, sendResponse);
      return true;
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

    chrome.runtime.onStartup.addListener(() => {
      console.log("Chrome started up - initializing extension");
      this.handleStartup();
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

      await this.tabTracker.trackTab(tab);
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
      await this.tabTracker.saveInfo();
      await this.tabTracker.trackTab(tab);
    }
  }

  async handleWindowFocusChanged(windowId: number) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      if (this.tabTracker.badgeManager.isUpdating()) {
        this.tabTracker.cleanup();
        await this.tabTracker.saveTime();
      }
    } else {
      if (!this.tabTracker.badgeManager.paused) {
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
            const newDomain = this.tabTracker.getDomain(tabs[0].url);

            if (newDomain === this.tabTracker.currentDomain) {
              this.tabTracker.currentTab.startTime = Date.now();
              if (!this.tabTracker.currentTab.intervalId) {
                await this.tabTracker.trackTab(tabs[0]);
              }
            } else {
              await this.tabTracker.trackTab(tabs[0]);
            }
          }
        } catch (error) {
          console.error("Error handling window focus:", error);
          this.tabTracker.badgeManager.stopBadgeUpdates();
        }
      }
    }
  }

  handleRuntimeMessage(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
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
    }
  }

  async handleSuspend() {
    try {
      await this.tabTracker.saveInfo();
      this.tabTracker.cleanup();
    } catch (error) {
      console.error("Error saving data on suspend:", error);
    }
  }

  async handleStartup() {
    await this.tabTracker.initialize();
  }

  async handlePopupClosed() {
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
          await this.tabTracker.resumeTracking();
        } else if (currentDomain !== this.tabTracker.currentDomain) {
          await this.tabTracker.trackTab(tabs[0]);
        }
      }
    } catch (error) {
      console.error("Error resuming tracking after popup closed:", error);
    }
  }
}

export default EventHandler;
