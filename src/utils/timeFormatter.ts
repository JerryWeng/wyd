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

  static getDateRangeLabel(category: Category) {
    if (category === "today") {
      return "Today";
    } else if (category === "1W") {
      return "Past Week";
    } else if (category === "1M") {
      return "Past Month";
    } else if (category === "1Y") {
      return "Past Year";
    } else if (category === "total") {
      return "All Time";
    }
  }

  static getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
