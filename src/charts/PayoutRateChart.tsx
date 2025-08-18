import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { VisibleMarginsState } from '../utils/types';
import ChartTitle from '../components/ChartTitle';
import { Chart } from 'chart.js';
import { createChartOptions } from '../utils/chartConfig';

interface PayoutRateChartProps {
  data: any;
  visibleMargins: { priceMargin: boolean };
  toggleMargin: (margin: 'priceMargin') => void;
  isComparisonMode?: boolean;
  comparisonData?: Array<{ id: string; name: string; data: any }>;
}

function PayoutRateChart({
  data,
  visibleMargins,
  toggleMargin,
  isComparisonMode = false,
  comparisonData = []
}: PayoutRateChartProps) {
  const chartRef = useRef<Chart | null>(null);
  
  // Chart options - using createChartOptions for consistency
  const baseOptions = createChartOptions(
    'Purchase to Payout Rate (%)',
    'linear',
    null, // No threshold value for this chart type
    (val) => `${(val*100).toFixed(0)}%`,
    (val) => `${(val*100).toFixed(0)}%`
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
          text: 'Average Payout ($)',
          color: '#EBF3FE'
        },
        ticks: {
          color: '#EBF3FE',
          callback: (val: number) => `$${val.toFixed(0)}`
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
  
  // Check if data contains the combinationsPM points and add them
  if (data && data.combinationsPM && Array.isArray(data.combinationsPM)) {
    chartData.datasets.push({
      label: '50% Price Margin Combinations',
      data: data.combinationsPM,
      borderColor: '#3A82F7',
      backgroundColor: 'rgba(58, 130, 247, 0.3)',
      tension: 0.1,
      pointRadius: 2,
      showLine: true,
      fill: false
    });
  }
  
  // Add comparison datasets if in comparison mode
  if (isComparisonMode && comparisonData && comparisonData.length > 0) {
    const colors = ['#FF5724', '#00C49F', '#FFBB28', '#9C27B0', '#FF9800'];
    
    comparisonData.forEach((item, index) => {
      if (item && item.data && item.data.combinationsPM) {
        const color = colors[index % colors.length];
        
        chartData.datasets.push({
          label: `${item.name} - 50% Margin`,
          data: item.data.combinationsPM,
          borderColor: color,
          backgroundColor: `${color}33`, // Add transparency
          tension: 0.1,
          pointRadius: 2,
          borderDash: [5, 5],
          fill: false,
          showLine: true
        });
      }
    });
  }
  
  return (
    <div className="bg-surface pt-4 p-5 rounded-lg shadow-sm transition-all chart-container">
      <ChartTitle 
        title="Payout vs Rate for 50% Margin" 
        chartKey="payoutRate" 
        toggleMargin={toggleMargin} 
        visibleMargins={visibleMargins}
        description="This chart shows combinations of payouts and rates that result in 50% price margin."
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
            This curve shows all combinations of Purchase to Payout Rate and Average Payout
            that result in exactly 50% price margin.
          </p>
          <p>
            Points below the curve have margins over 50%, points above have margins under 50%.
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

export default PayoutRateChart; 