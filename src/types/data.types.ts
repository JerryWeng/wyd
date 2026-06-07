// category type
export type Category = "today" | "1W" | "1M" | "1Y" | "total";
export type UICategory = Category | "dateRange";
export interface DateRangeSelection {
  start: string; // "YYYY-MM-DD"
  end: string;   // "YYYY-MM-DD"
}

// block rule types
export type BlockType = "dailyLimit" | "weeklyLimit" | "scheduled" | "daysOfWeek";

export interface BlockRule {
  domain: string;
  type: BlockType;
  timeLimit?: number;    // minutes — dailyLimit / weeklyLimit / dailyLimitBefore
  startTime?: string;    // "HH:MM" — scheduled
  endTime?: string;      // "HH:MM" — scheduled
  days?: number[];       // 0–6 (Sun=0) — daysOfWeek
  deadlineTime?: string; // "HH:MM" — dailyLimitBefore (rule inactive after this time)
  redirectUrl?: string;  // per-rule override; empty = use defaultRedirectUrl or built-in page
  enabled?: boolean;     // undefined/true = active, false = paused
}

// settings types
export interface AppSettings {
  idleTrackingEnabled: boolean;
  idleTimeoutMinutes: number;
  ignoredDomains: string[];
  defaultView: Category;
  blocks: BlockRule[];
  defaultRedirectUrl: string; // empty string = use built-in redirect.html
}

export const DEFAULT_SETTINGS: AppSettings = {
  idleTrackingEnabled: true,
  idleTimeoutMinutes: 5,
  ignoredDomains: [],
  defaultView: "today",
  blocks: [],
  defaultRedirectUrl: "",
};

// auth / user types
export interface UserRecord {
  id: string;
  email: string;
  plan: "free" | "pro";
  subscription_status: "active" | "canceled" | "past_due" | null;
  cloud_sync_enabled: boolean;
}

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
