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

    const total = data.values.reduce((sum, val) => sum + val, 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const lines: string[] = [];
    if (hours > 0) lines.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
    lines.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

    const centerTextPlugin = {
      id: "centerText",
      afterDraw(chart: any) {
        if (chart.tooltip?.getActiveElements().length > 0) return;

        const { ctx: c, chartArea: { top, bottom, left, right } } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        const lineHeight = 14;
        const startY = (cy - ((lines.length - 1) * lineHeight) / 2) - 5;

        c.save();
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "#2e2e2eff";
        c.font = "bold 15px sans-serif";
        lines.forEach((line, i) => {
          c.fillText(line, cx, startY + i * lineHeight);
        });

        // "Total" label below the time
        c.fillStyle = "#888";
        c.font = "12px sans-serif";
        c.fillText("Total", cx, startY + lines.length * lineHeight);

        c.restore();
      },
    };

    this.chart = new Chart(ctx, {
      type: "doughnut",
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
      plugins: [centerTextPlugin],
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
      cutout: "70%",
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
            label: (context: TooltipItem<"doughnut">) => {
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
      .slice(0, 8);

    return {
      labels: sortedSites.map(([domain]) => domain.replace(/^www\./, "")),
      values: sortedSites.map(([, data]) => data.time),
    };
  }
}
