import { useState, useEffect, useMemo } from "react";
import { StorageService } from "../utils/storageService";
import { DataProcessor } from "../utils/dataProcessor";
import type { ProcessedSiteInfo, Category, UICategory, DateRangeSelection } from "../types/data.types";

export const usePopupController = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allData, setAllData] = useState<ProcessedSiteInfo>({});
  type PopupView = "main" | "settings" | "block";
  const [currentView, setCurrentView] = useState<PopupView>("main");
  const [refreshTick, setRefreshTick] = useState(0);

  const [currentUICategory, setCurrentUICategory] = useState<UICategory>("today");
  const [dateRange, setDateRange] = useState<DateRangeSelection | null>(null);
  const [filterBy, setFilterBy] = useState<"time" | "session" | "domain">("time");
  const [sortOrder, setSortOrder] = useState<"ascending" | "descending">(
    "descending",
  );

  // Load default view from settings on mount
  useEffect(() => {
    StorageService.getSettings().then((s) => {
      setCurrentUICategory(s.defaultView);
    });
  }, []);

  // Establish a single persistent port for the popup lifetime.
  // Each onDisconnect fires handlePopupClosed exactly once when the popup truly closes.
  useEffect(() => {
    const port = chrome.runtime.connect({ name: "popup" });
    return () => port.disconnect();
  }, []);

  useEffect(() => {
    const loadAndDisplayData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await StorageService.saveCurrentTime();
        const siteInfo = await StorageService.getSiteInfo();

        // Process data based on the current category
        let combinedData: ProcessedSiteInfo;
        if (currentUICategory === "today") {
          combinedData = DataProcessor.processTodayData(siteInfo);
        } else if (currentUICategory === "1W") {
          combinedData = DataProcessor.processWeekData(siteInfo);
        } else if (currentUICategory === "1M") {
          combinedData = DataProcessor.processMonthData(siteInfo);
        } else if (currentUICategory === "1Y") {
          combinedData = DataProcessor.processYearData(siteInfo);
        } else if (currentUICategory === "dateRange" && dateRange) {
          combinedData = DataProcessor.processCustomDateRange(siteInfo, dateRange.start, dateRange.end);
        } else {
          combinedData = DataProcessor.processTotalData(siteInfo);
        }
        setAllData(combinedData);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load website data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAndDisplayData();
  }, [currentUICategory, dateRange, refreshTick]);

  const sortedSites = useMemo(() => {
    return DataProcessor.sortData(allData, filterBy, sortOrder);
  }, [allData, filterBy, sortOrder]);

  const handleCategorySwitch = (category: Category) => {
    setCurrentUICategory(category);
    setDateRange(null);
  };

  const switchToDateRange = () => {
    setCurrentUICategory("dateRange");
  };

  const handleDateRangeSelect = (start: string, end: string) => {
    setDateRange({ start, end });
    setCurrentUICategory("dateRange");
  };

  const handleSortSelect = (type: "time" | "session" | "domain") => {
    if (type === filterBy) {
      setSortOrder((prev) => prev === "descending" ? "ascending" : "descending");
    } else {
      setFilterBy(type);
    }
  };

  const openSettings = () => setCurrentView("settings");
  const openBlockPage = () => setCurrentView("block");
  const closeView = async () => {
    const s = await StorageService.getSettings();
    if (s.defaultView !== currentUICategory || currentUICategory === "dateRange") {
      setCurrentUICategory(s.defaultView);
      setDateRange(null);
    } else {
      setRefreshTick((prev) => prev + 1);
    }
    setCurrentView("main");
  };

  return {
    isLoading,
    error,
    sortedSites,
    currentUICategory,
    dateRange,
    filterBy,
    sortOrder,
    currentView,
    handleCategorySwitch,
    switchToDateRange,
    handleDateRangeSelect,
    handleSortSelect,
    openSettings,
    openBlockPage,
    closeView,
    allData,
  };
};
