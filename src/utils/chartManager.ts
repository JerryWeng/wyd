import Chart from "chart.js/auto";

import { TimeFormatter } from "./timeFormatter.js";

import type { TooltipItem } from "chart.js";

export class ChartManager {
  private canvas: HTMLCanvasElement | null;
  private chart: any | null;
  private backgroundColors: string[];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.chart = null;
    this.backgroundColors = [
      "rgba(220, 20, 60, 0.8)",
      "rgba(0, 128, 128, 0.8)",
      "rgba(255, 165, 0, 0.8)",
      "rgba(75, 0, 130, 0.8)",
      "rgba(50, 205, 50, 0.8)",
      "rgba(255, 20, 147, 0.8)",
      "rgba(0, 71, 171, 0.8)",
      "rgba(128, 0, 128, 0.8)",
      "rgba(210, 180, 140, 0.8)",
      "rgba(0, 128, 0, 0.8)",
    ];
  }

  createChart(data: { labels: string[]; values: number[] }) {
    this.destroyExistingChart();

    if (!this.canvas || !data || data.labels.length === 0) {
      return;
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    this.chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.values,
            backgroundColor: this.backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: this.getChartOptions(),
    });
  }

  destroyExistingChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 0 },
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 12,
            font: { size: 10 },
            padding: 8,
            color: "#666",
          },
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"pie">) => {
              const seconds = context.raw as number;
              return `${context.label}: ${TimeFormatter.formatTimeDisplay(
                seconds,
              )}`;
            },
          },
        },
      },
    } as const;
  }

  static prepareChartData(processedSiteData: {}) {
    const sortedSites = Object.entries(
      processedSiteData as Record<string, { time: number }>,
    )
      .sort((a, b) => b[1].time - a[1].time)
      .slice(0, 10);

    return {
      labels: sortedSites.map(([domain]) => domain),
      values: sortedSites.map(([, data]) => data.time),
    };
  }
}
