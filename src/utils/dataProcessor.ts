import type {
  RawSiteInfo,
  ProcessedSiteInfo,
  SiteEntry,
  ChartableSiteData,
} from "../types/data.types";

import { TimeFormatter } from "./timeFormatter";

export class DataProcessor {
  static processTodayData(siteInfo: RawSiteInfo): ProcessedSiteInfo {
    const today = TimeFormatter.getLocalDateString();
    const todayData = siteInfo[today] || { time: {}, sessions: {} };

    let combinedData: ProcessedSiteInfo = {}; // domain to {time, sessions}

    Object.entries(todayData.time || {}).forEach(([domain, seconds]) => {
      combinedData[domain] = {
        time: seconds,
        sessions: (todayData.sessions && todayData.sessions[domain]) || 0,
      };
    });

    Object.entries(todayData.sessions || {}).forEach(([domain, sessions]) => {
      if (!combinedData[domain]) {
        combinedData[domain] = {
          time: 0,
          sessions: sessions,
        };
      }
    });

    return combinedData;
  }

  static processTotalData(siteInfo: RawSiteInfo): ProcessedSiteInfo {
    let totalTimeData: Record<string, number> = {}; // domain to time
    let totalSessionData: Record<string, number> = {}; // domain to sessions

    Object.values(siteInfo).forEach((dayData) => {
      if (dayData.time) {
        Object.entries(dayData.time).forEach(([domain, seconds]) => {
          totalTimeData[domain] = (totalTimeData[domain] || 0) + seconds;
        });
      }

      if (dayData.sessions) {
        Object.entries(dayData.sessions).forEach(([domain, sessions]) => {
          totalSessionData[domain] = (totalSessionData[domain] || 0) + sessions;
        });
      }
    });

    let combinedData: ProcessedSiteInfo = {}; // domain to {time, sessions}

    Object.entries(totalTimeData).forEach(([domain, seconds]) => {
      combinedData[domain] = {
        time: seconds,
        sessions: totalSessionData[domain] || 0,
      };
    });

    Object.entries(totalSessionData).forEach(([domain, sessions]) => {
      if (!combinedData[domain]) {
        combinedData[domain] = {
          time: 0,
          sessions: sessions,
        };
      }
    });

    return combinedData;
  }

  private static processDateRangeData(siteInfo: RawSiteInfo, daysBack: number): ProcessedSiteInfo {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - (daysBack - 1));

    let totalTimeData: Record<string, number> = {};
    let totalSessionData: Record<string, number> = {};

    Object.entries(siteInfo).forEach(([dateStr, dayData]) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      if (date >= cutoff) {
        if (dayData.time) {
          Object.entries(dayData.time).forEach(([domain, seconds]) => {
            totalTimeData[domain] = (totalTimeData[domain] || 0) + seconds;
          });
        }
        if (dayData.sessions) {
          Object.entries(dayData.sessions).forEach(([domain, sessions]) => {
            totalSessionData[domain] = (totalSessionData[domain] || 0) + sessions;
          });
        }
      }
    });

    const combinedData: ProcessedSiteInfo = {};
    Object.entries(totalTimeData).forEach(([domain, seconds]) => {
      combinedData[domain] = { time: seconds, sessions: totalSessionData[domain] || 0 };
    });
    Object.entries(totalSessionData).forEach(([domain, sessions]) => {
      if (!combinedData[domain]) combinedData[domain] = { time: 0, sessions };
    });

    return combinedData;
  }

  static processWeekData(siteInfo: RawSiteInfo): ProcessedSiteInfo {
    return this.processDateRangeData(siteInfo, 7);
  }

  static processMonthData(siteInfo: RawSiteInfo): ProcessedSiteInfo {
    return this.processDateRangeData(siteInfo, 30);
  }

  static processYearData(siteInfo: RawSiteInfo): ProcessedSiteInfo {
    return this.processDateRangeData(siteInfo, 365);
  }

  static sortData(
    combinedData: ProcessedSiteInfo,
    filterBy: string,
    sortOrder: string
  ): SiteEntry[] {
    return Object.entries(combinedData).sort((a, b) => {
      if (filterBy === "time") {
        return sortOrder === "descending"
          ? b[1].time - a[1].time
          : a[1].time - b[1].time;
      } else {
        return sortOrder === "descending"
          ? b[1].sessions - a[1].sessions
          : a[1].sessions - b[1].sessions;
      }
    });
  }

  static processDataForChart(
    processedSiteData: ProcessedSiteInfo
  ): ChartableSiteData {
    const chartData: ChartableSiteData = {};

    Object.entries(processedSiteData).forEach(([domain, data]) => {
      chartData[domain] = { time: data.time };
    });

    return chartData;
  }
}
