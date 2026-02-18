import { PieChart } from "../../components/PieChart";
import { PaginationManager } from "../old_utilities/paginationManager";
import { UIController } from "../old_utilities/uiController";
import { StorageService } from "../../utils/storageService";
import { DataProcessor } from "../../utils/dataProcessor";

import type { SiteEntry } from "../../types/data.types";

export class PopupController {
  private chartManager: ChartManager;
  private paginationManager: PaginationManager<SiteEntry>;
  private uiController: UIController;
  private currentCategory: "today" | "total";
  private filterBy: "time" | "session";
  private sortOrder: "ascending" | "descending";
  private todayBtn: HTMLElement | null;
  private totalBtn: HTMLElement | null;
  private allCategories: (HTMLElement | null)[];

  constructor() {
    this.chartManager = new ChartManager("pieChart");
    this.paginationManager = new PaginationManager<SiteEntry>(4, () => {
      this.displayCurrentPage();
    });
    this.uiController = new UIController();

    this.currentCategory = "today";
    this.filterBy = "time";
    this.sortOrder = "descending";

    this.todayBtn = document.getElementById("todayBtn");
    this.totalBtn = document.getElementById("totalBtn");
    this.allCategories = [this.todayBtn, this.totalBtn];

    this.setupEventListeners();
    this.initialize();
  }

  setupEventListeners() {
    this.allCategories.forEach((button) => {
      if (button === null) return;
      button.addEventListener("click", () => {
        const category = button === this.todayBtn ? "today" : "total";
        this.switchCategory(category);
      });
    });

    const sortBtn = document.getElementById("sortBtn");
    if (sortBtn) {
      sortBtn.addEventListener("click", () => this.toggleSortOrder());
    }

    const filterBtn = document.getElementById("filterBtn");
    if (filterBtn) {
      filterBtn.addEventListener("click", () => this.toggleFilter());
    }

    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => this.openSettings());
    }
  }

  async initialize() {
    chrome.runtime.connect({ name: "popup" });

    try {
      await StorageService.saveCurrentTime();
      this.switchCategory("today");
    } catch (error) {
      console.error("Error initializing:", error);
      this.switchCategory("today");
    }
  }

  async switchCategory(category: "today" | "total") {
    this.currentCategory = category;
    const activeButton = category === "today" ? this.todayBtn : this.totalBtn;

    this.uiController.updateCategoryButtons(activeButton, this.allCategories);
    this.paginationManager.reset();

    await this.loadAndDisplayData();
  }

  async loadAndDisplayData() {
    try {
      this.uiController.showLoading();

      await this.createChart();

      const siteInfo = await StorageService.getSiteInfo();
      let combinedData = {};

      if (this.currentCategory === "today") {
        combinedData = DataProcessor.processTodayData(siteInfo);
      } else {
        combinedData = DataProcessor.processTotalData(siteInfo);
      }

      const sortedSites = DataProcessor.sortData(
        combinedData,
        this.filterBy,
        this.sortOrder
      );
      this.paginationManager.setItems(sortedSites);
      this.displayCurrentPage();
    } catch (error) {
      console.error("Error loading data:", error);
      this.uiController.showError("Failed to load website data.");
    }
  }

  async createChart() {
    try {
      const siteInfo = await StorageService.getSiteInfo();
      const processedData = DataProcessor.processDataForChart(
        siteInfo,
        this.currentCategory
      );
      const chartData = ChartManager.prepareChartData(processedData);
      this.chartManager.createChart(chartData);
    } catch (error) {
      console.error("Error creating chart:", error);
    }
  }

  displayCurrentPage() {
    const currentPageItems = this.paginationManager.getCurrentPageItems();
    this.uiController.renderSitesList(
      currentPageItems,
      this.filterBy,
      this.sortOrder
    );
  }

  toggleSortOrder() {
    this.sortOrder =
      this.sortOrder === "descending" ? "ascending" : "descending";
    this.loadAndDisplayData();
  }

  toggleFilter() {
    this.filterBy = this.filterBy === "time" ? "session" : "time";
    this.loadAndDisplayData();
  }

  openSettings() {
    window.location.href = "../settings/settings.html";
  }
}
