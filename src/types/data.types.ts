// category type
export type Category = "today" | "1W" | "1M" | "1Y" | "total";

// settings types
export interface AppSettings {
  idleTrackingEnabled: boolean;
  ignoredDomains: string[];
  defaultView: Category;
}

export const DEFAULT_SETTINGS: AppSettings = {
  idleTrackingEnabled: true,
  ignoredDomains: [],
  defaultView: "today",
};

// raw data types
type DomainData = Record<string, number>; // domain name to either time(seconds) or sessions
interface MultipleDomainStats {
  // for multiple domains
  time: DomainData;
  sessions: DomainData;
}
export type RawSiteInfo = Record<string, MultipleDomainStats>; // date string to MultipleDomainStats

// processed data types
export interface SingleDomainStats {
  // for a single domain
  time: number;
  sessions: number;
}

export type ProcessedSiteInfo = Record<string, SingleDomainStats>; // domain name to SingleDomainStats
export type SiteEntry = [string, SingleDomainStats]; // [domain name, SingleDomainStats]
export type ChartableSiteData = Record<string, { time: number }>; // domain name to {time} for chart.js
