# Settings Page Plan for WhatAreYouDoing (WYD)

Based on the extension's tracked metrics (time, domains, sessions) and manifest permissions (`idle`, `alarms`, `webNavigation`), here are some essential and high-value settings you should include.

## 1. Tracking & Privacy
* **Idle Time Tracking:** Toggle whether to continue tracking time if the user is inactive (e.g., away from the keyboard for 5+ minutes). This utilizes your `idle` permission.
* **Ignored Domains (Whitelist):** A list of domains where time tracking is disabled entirely (e.g., `localhost`, `github.com`, internal work sites).
* **Clear Data:** A way to clear stored data to free up space or maintain privacy. Provide options like "Clear Today's Data" or "Clear All Browsing Data."

<!-- ## 2. Productivity & Site Blocking
* **Daily Time Limits:** Set a maximum daily allowance for specific distracting sites (e.g., `youtube.com`: 45 minutes).
* **Focus Mode & Scheduling:** A master toggle to block a predefined blacklist of sites. Optionally, schedule "Focus Hours" (e.g., 9 AM - 5 PM on weekdays).
* **Strict Mode:** Prevent the user from easily disabling the blocker or changing settings during an active "Focus Mode" session. -->

<!-- ## 3. Notifications & Alerts
* **Usage Warnings:** Get notified when approaching a daily limit (e.g., "5 minutes left on Twitter!"). This utilizes your `alarms` permission.
* **Break Reminders:** A toggle to remind the user to take a screen break after 1-2 consecutive hours of browsing. -->

## 4. Appearance & General
* **Default Dashboard View:** Choose the default timeframe shown when opening the popup (`Today`, `1W`, `1M`, or `Total`).
* **Export Data:** Allow the user to download their browsing statistics as a CSV or JSON file.

### Suggested Implementation Approach
Since your app is built with React and Vite:
- **State:** Use `chrome.storage.sync` or `chrome.storage.local` to store these settings so the background script (`background.js`) can react to them seamlessly.
- **Rendering:** You can either conditionally render a `<Settings />` component in your `popup.tsx` (swapping out the main dashboard when `openSettings` is called), or if the settings become too complex, open a dedicated `settings.html` page in a new full-tab.
