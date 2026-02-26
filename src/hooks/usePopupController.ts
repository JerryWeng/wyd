import { useState, useEffect, useMemo } from "react";
import { StorageService } from "../utils/storageService";
import { DataProcessor } from "../utils/dataProcessor";
import type { ProcessedSiteInfo, Category } from "../types/data.types";

export const usePopupController = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allData, setAllData] = useState<ProcessedSiteInfo>({});
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [currentCategory, setCurrentCategory] = useState<Category>("today");
  const [filterBy, setFilterBy] = useState<"time" | "session">("time");
  const [sortOrder, setSortOrder] = useState<"ascending" | "descending">(
    "descending",
  );

  // Load default view from settings on mount
  useEffect(() => {
    StorageService.getSettings().then((s) => {
      setCurrentCategory(s.defaultView);
    });
  }, []);

  useEffect(() => {
    const loadAndDisplayData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize the extension and get data
        chrome.runtime.connect({ name: "popup" });
        await StorageService.saveCurrentTime();
        const siteInfo = await StorageService.getSiteInfo();

        // Process data based on the current category
        let combinedData: ProcessedSiteInfo;
        if (currentCategory === "today") {
          combinedData = DataProcessor.processTodayData(siteInfo);
        } else if (currentCategory === "1W") {
          combinedData = DataProcessor.processWeekData(siteInfo);
        } else if (currentCategory === "1M") {
          combinedData = DataProcessor.processMonthData(siteInfo);
        } else if (currentCategory === "1Y") {
          combinedData = DataProcessor.processYearData(siteInfo);
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
  }, [currentCategory, refreshTick]);

  const sortedSites = useMemo(() => {
    return DataProcessor.sortData(allData, filterBy, sortOrder);
  }, [allData, filterBy, sortOrder]);

  const handleCategorySwitch = (category: Category) => {
    setCurrentCategory(category);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) =>
      prev === "descending" ? "ascending" : "descending",
    );
  };

  const toggleFilter = () => {
    setFilterBy((prev) => (prev === "time" ? "session" : "time"));
  };

  const openSettings = () => setShowSettings(true);
  const closeSettings = async () => {
    const s = await StorageService.getSettings();
    if (s.defaultView !== currentCategory) {
      setCurrentCategory(s.defaultView); // triggers the data effect with the new category
    } else {
      setRefreshTick((prev) => prev + 1); // forces re-fetch without changing category
    }
    setShowSettings(false);
  };

  return {
    isLoading,
    error,
    sortedSites,
    currentCategory,
    filterBy,
    sortOrder,
    showSettings,
    handleCategorySwitch,
    toggleSortOrder,
    toggleFilter,
    openSettings,
    closeSettings,
    allData,
  };
};
