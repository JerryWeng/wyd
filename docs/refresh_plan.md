# Automatic Refresh Implementation Plan

To ensure the user always sees their most up-to-date settings and tracking data when they return from the Settings view, we will implement an automatic refresh mechanism triggered when the settings panel is closed. No extra buttons are needed!

## 1. Update `usePopupController.ts`
Currently, data fetching and settings loading happen inside `useEffect` hooks that run on mount or when `currentCategory` changes. We need to expose a reusable `refreshData` function and trigger it automatically.

**Changes:**
- Consolidate the data fetching logic (`loadAndDisplayData`) from the `useEffect` into a standalone, reusable `async` function.
- Create a `refreshData` function inside the hook:
  - This function will first fetch the latest settings using `StorageService.getSettings()`.
  - It will update the component state (e.g., `currentCategory`) if it differs from the loaded defaults.
  - It will manually invoke the `loadAndDisplayData()` function to fetch the newest tracking stats.
- Modify the `closeSettings` function:
  - Currently, it likely just does `setShowSettings(false)`.
  - Update it to call `refreshData()` immediately before returning to the main dashboard view, so the new settings are instantly applied.

## 2. Update `Settings.tsx`
Ensure that however the settings component is closed (via a "Back" or "Close" button), it calls the `closeSettings` prop properly.

**Changes:**
- Verify that `Settings.tsx` receives `closeSettings` and triggers it on unmount or when the user explicitly cliks out of it.
- If settings auto-save dynamically onChange, nothing extra is needed.
- If settings are saved via a "Save" button, ensure `closeSettings` (and therefore the refresh mechanism) fires right after the save completes sequentially.
