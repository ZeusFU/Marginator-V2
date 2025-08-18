import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { VisibleMarginsState } from '../utils/types';
import ChartTitle from '../components/ChartTitle';
import { Chart } from 'chart.js';
import { createChartOptions } from '../utils/chartConfig';

interface EvalPriceRateChartProps {
  data: any;
  visibleMargins: { priceMargin: boolean };
  toggleMargin: (margin: 'priceMargin') => void;
  isComparisonMode?: boolean;
  comparisonData?: Array<{ id: string; name: string; data: any }>;
}

function EvalPriceRateChart({
  data,
  visibleMargins,
  toggleMargin,
  isComparisonMode = false,
  comparisonData = []
}: EvalPriceRateChartProps) {
  const chartRef = useRef<Chart | null>(null);
  
  // Generate base chart options for consistency
  const baseOptions = createChartOptions(
    'Evaluation Price ($)',
    'linear',
    null, // No threshold value for this chart type
    (val) => `$${val.toFixed(0)}`,
    (val) => `$${val.toFixed(0)}`
  );
  
  // Custom options specific to this chart
  const chartOptions = {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        title: {
          display: true,
          text: 'Purchase to Payout Rate (%)',
          color: '#EBF3FE'
        },
        ticks: {
          color: '#EBF3FE',
          callback: (val: number) => `${(val*100).toFixed(0)}%`
        },
        // Remove the min/max since this chart doesn't show percentages
        min: undefined,
        max: undefined
      }
    }
  };
  
  // Handle download data
  const downloadData = () => {
    if (!chartRef.current) return;
    
    // Download logic here
    alert('Download functionality would go here');
  };
  
  // Prepare chart data
  const chartData = {
    datasets: []
  };
  
  // Check if data contains the results array and add datasets for each eval price
  if (data && data.results && Array.isArray(data.results)) {
    // Define a color scale based on eval price
    const colors = ['#3A82F7', '#00C49F', '#FFBB28', '#9C27B0', '#FF9800', '#F44336'];
    
    data.results.forEach((evalPriceData: any, index: number) => {
      if (evalPriceData && evalPriceData.dataPoints) {
        const color = colors[index % colors.length];
        
        chartData.datasets.push({
          label: `Eval Price: $${evalPriceData.evalPrice}`,
          data: evalPriceData.dataPoints,
          borderColor: color,
          backgroundColor: `${color}33`,
          tension: 0.1,
          pointRadius: 2,
          showLine: true,
          fill: false
        });
      }
    });
  }
  
  // Add comparison datasets if in comparison mode
  if (isComparisonMode && comparisonData && comparisonData.length > 0) {
    comparisonData.forEach((item, index) => {
      if (item && item.data && item.data.results && Array.isArray(item.data.results)) {
        // Use dashed lines for comparison datasets
        item.data.results.forEach((evalPriceData: any, dataIndex: number) => {
          if (evalPriceData && evalPriceData.dataPoints) {
            // Create a unique color for each comparison dataset
            const hue = 180 + (index * 30 + dataIndex * 15) % 180;
            const color = `hsl(${hue}, 70%, 60%)`;
            
            chartData.datasets.push({
              label: `${item.name} - $${evalPriceData.evalPrice}`,
              data: evalPriceData.dataPoints,
              borderColor: color,
              backgroundColor: `hsla(${hue}, 70%, 60%, 0.2)`,
              tension: 0.1,
              pointRadius: 2,
              borderDash: [5, 5],
              showLine: true,
              fill: false
            });
          }
        });
      }
    });
  }
  
  return (
    <div className="bg-surface pt-4 p-5 rounded-lg shadow-sm transition-all chart-container">
      <ChartTitle 
        title="Eval Price vs Rate for 50% Margin" 
        chartKey="evalPriceRate" 
        toggleMargin={toggleMargin} 
        visibleMargins={visibleMargins}
        description="This chart shows combinations of evaluation prices and rates that result in 50% price margin."
      />
      
      {/* Chart - no control buttons */}
      <div className="h-80 relative mb-4">
        {chartData.datasets.length > 0 ? (
          <Line 
            data={chartData} 
            options={chartOptions} 
            ref={(chart) => {
              if (chart) {
                chartRef.current = chart;
              }
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-text_secondary text-sm">
            No data available for this chart. Adjust your simulation parameters or compare plans.
          </div>
        )}
      </div>
      
      {/* Key insights section */}
      <div className="mt-4 p-4 bg-card/30 border border-border/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2 text-text_primary">Key Insights</h4>
        <div className="text-sm text-gray-400 space-y-1">
          <p>
            Each curve shows combinations of Purchase to Payout Rate and Evaluation Price
            that result in exactly 50% price margin.
          </p>
          <p>
            Higher evaluation prices allow for higher payouts at the same rate while maintaining 50% margin.
          </p>
        </div>
      </div>
      
      {/* Download button */}
      <button 
        onClick={downloadData} 
        className="mt-4 px-4 py-2 bg-secondary text-background rounded hover:bg-opacity-80 flex items-center gap-2 text-sm font-medium"
      >
        <Download className="w-4 h-4"/> Download Data
      </button>
    </div>
  );
}

export default EvalPriceRateChart; 