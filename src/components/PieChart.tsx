import React, { useRef, useEffect } from "react";
import { ChartManager } from "../utils/chartManager";
import type { ChartableSiteData } from "../types/data.types";

interface PieChartProps {
  data: ChartableSiteData;
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);

  const hasData = data && Object.keys(data).length > 0;

  useEffect(() => {
    if (hasData && canvasRef.current) {
      // Create a single instance of ChartManager
      if (!chartManagerRef.current) {
        chartManagerRef.current = new ChartManager(canvasRef.current);
      }

      // Prepare and create/update the chart
      const chartData = ChartManager.prepareChartData(data);
      chartManagerRef.current.createChart(chartData);
    }

    // Cleanup function to destroy the chart when the component unmounts
    return () => {
      chartManagerRef.current?.destroyExistingChart();
      chartManagerRef.current = null;
    };
  }, [data, hasData]);

  if (!hasData) {
    return (
      <div id="chart-container">
        <div className="no-data">No data to display in chart.</div>
      </div>
    );
  }

  return (
    <div id="chart-container">
      <canvas id="pieChart" ref={canvasRef}></canvas>
    </div>
  );
};

export default PieChart;
