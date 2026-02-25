import type { Category } from "../types/data.types";

export class TimeFormatter {
  static formatTimeDisplay(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const remainingSeconds = seconds % 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    let timeDisplay = "";
    if (hours > 0) {
      timeDisplay += `${hours} ${hours === 1 ? "hour" : "hours"} `;
    }
    if (minutes > 0 || hours > 0) {
      timeDisplay += `${minutes} ${minutes === 1 ? "minute" : "minutes"} `;
    }
    timeDisplay += `${secs} ${secs === 1 ? "second" : "seconds"}`;

    return timeDisplay;
  }

  static getDateRangeLabel(category: Category): string {
    const today = new Date();

    const fmt = (d: Date, includeYear = false): string => {
      const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
      if (includeYear) opts.year = "numeric";
      return d.toLocaleDateString("en-US", opts);
    };

    if (category === "today") {
      return fmt(today, true);
    }
    if (category === "total") {
      return "All time";
    }

    const daysBack = category === "1W" ? 7 : category === "1M" ? 30 : 365;
    const start = new Date(today);
    start.setDate(today.getDate() - (daysBack - 1));

    const sameYear = start.getFullYear() === today.getFullYear();
    return sameYear
      ? `${fmt(start)} – ${fmt(today)}`
      : `${fmt(start, true)} – ${fmt(today, true)}`;
  }

  static getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
