import { useState, useEffect, useMemo } from "react";
import { StorageService } from "../utils/storageService";
import { DataProcessor } from "../utils/dataProcessor";
import type { ProcessedSiteInfo, Category } from "../types/data.types";

export const usePopupController = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allData, setAllData] = useState<ProcessedSiteInfo>({});

  const [currentCategory, setCurrentCategory] = useState<Category>("today");
  const [filterBy, setFilterBy] = useState<"time" | "session">("time");
  const [sortOrder, setSortOrder] = useState<"ascending" | "descending">(
    "descending",
  );

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
  }, [currentCategory]);

  const sortedSites = useMemo(() => {
    return DataProcessor.sortData(allData, filterBy, sortOrder);
  }, [allData, filterBy, sortOrder]); // re-calculates when these change

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

  const openSettings = () => {
    // In a real extension, you'd use chrome.runtime.openOptionsPage()
    // but for now this is fine.
    window.location.href = "../settings/settings.html";
  };

  return {
    isLoading,
    error,
    sortedSites,
    currentCategory,
    filterBy,
    sortOrder,
    handleCategorySwitch,
    toggleSortOrder,
    toggleFilter,
    openSettings,
    allData,
  };
};
