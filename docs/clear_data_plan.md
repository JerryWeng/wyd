# Clear Data Enhancement Plan

Currently, the `Settings.tsx` has buttons to clear "Today" or "All" data. We want to update this so the "Clear Today" button becomes a dropdown (or selector) allowing the user to choose between 1 Day (Today), 1 Week, 1 Month, or 1 Year, alongside the existing "Clear All" button.

## 1. Update Storage Service (`src/utils/storageService.ts`)
We need methods to clear data for specific timeframes, not just today. The `storageService.ts` handles the interface with `chrome.storage.local`.
- Create a new method: `clearDataRange(category: 'today' | '1W' | '1M' | '1Y')`.
- Ensure it identifies the correct slice of data to delete based on the selected timeframe (e.g., removing entries within the last 7 days for '1W').
- Keep the existing `clearAllData` method intact.

## 2. Update Types (`src/types/data.types.ts`)
- The timeframes map directly to your existing `Category` type (`today`, `1W`, `1M`, `1Y`, `total`). We can reuse these types to identify what data scope needs clearing. 

## 3. Update Settings Component State (`src/components/Settings.tsx`)
Currently, `confirmClear` state is `"today" | "all" | null`.
- Update `confirmClear` state to support the new timeframes: `'today' | '1W' | '1M' | '1Y' | 'all' | null`.
- Add a new state variable: `clearTimeframe` (default to `'today'`) to store the user's current selection from the dropdown.

## 4. UI Implementation in Settings (`src/components/Settings.tsx`)
In the "Clear Data" block under Tracking & Privacy:

- **Dropdown Selector:** Add a standard `<select>` dropdown next to (or part of) the "Clear Data" action. The options will be:
  - Today
  - Last 7 Days (1W)
  - Last 30 Days (1M)
  - Last Year (1Y)
- **Clear Button (Range):** The button next to the dropdown will say "Clear Selected". When clicked, it sets `confirmClear` to the value currently selected in the dropdown.
- **Clear All Button:** Keep the existing "Clear All" button separate, possibly styled differently (e.g., red or disabled outline).
- **Confirmation State:** When a user clicks "Clear Selected" or "Clear All," the UI switches to the inline confirmation row ("Confirm" / "Cancel") just like it does now, but reading dynamically (e.g., "Clear data from the last 7 days?").

## 5. Visual Styling Updates (`src/popup/css/settings.css`)
- Style the new `<select>` HTML element so it visually matches the `btn-outline-sm` theme and aligns nicely next to the buttons.
- Ensure the confirmation warnings text wrap or display neatly.
