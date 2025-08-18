import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { SimulationData, ThresholdResult, VisibleMarginsState } from '../utils/types';
import { formatThresholdText, createChartOptions } from '../utils/chartConfig';
import { useSimulationContext } from '../context/SimulationContext';
import ChartTitle from '../components/ChartTitle';
import { Chart } from 'chart.js';

interface AvgPayoutChartProps {
  data: any;
  thresholds: ThresholdResult;
  visibleMargins: { priceMargin: boolean };
  toggleMargin: (margin: 'priceMargin') => void;
  isComparisonMode?: boolean;
  comparisonData?: Array<{ id: string; name: string; data: any }>;
}

function AvgPayoutChart({
  data,
  thresholds,
  visibleMargins,
  toggleMargin,
  isComparisonMode = false,
  comparisonData = []
}: AvgPayoutChartProps) {
  const chartRef = useRef<Chart | null>(null);
  const { chartMarginTarget } = useSimulationContext();
  
  // Generate chart options
  const options = createChartOptions(
    'Average Payout ($)',
    'linear',
    thresholds.priceThreshold,
    (val) => `$${val.toFixed(2)}`,
    (val) => `$${val.toFixed(2)}`,
    chartMarginTarget
  );
  
  // Handle download data
  const downloadData = () => {
    if (!chartRef.current) return;
    
    // Download logic here
    alert('Download functionality would go here');
  };

  // Build datasets
  const datasets = [
    {
      label: 'Price Margin',
      data: data.values.map((x: number, i: number) => ({ x, y: data.priceMargins[i] })),
      borderColor: '#3A82F7',
      backgroundColor: 'rgba(58, 130, 247, 0.3)',
      tension: 0.1,
      pointRadius: 0,
      fill: 'origin',
      hidden: !visibleMargins.priceMargin
    }
  ];

  // Add comparison datasets if in comparison mode
  if (isComparisonMode && comparisonData && comparisonData.length > 0) {
    const colors = ['#FF5724', '#00C49F', '#FFBB28', '#9C27B0', '#FF9800'];
    
    comparisonData.forEach((item, index) => {
      if (item && item.data && item.data.values) {
        const color = colors[index % colors.length];
        
        datasets.push({
          label: `${item.name} - Price Margin`,
          data: item.data.values.map((x: number, i: number) => ({ 
            x, 
            y: item.data.priceMargins[i] 
          })),
          borderColor: color,
          backgroundColor: `${color}33`, // Add transparency
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
          fill: false
        });
      }
    });
  }
  
  return (
    <div className="bg-surface pt-4 p-5 rounded-lg shadow-sm transition-all chart-container">
      <ChartTitle 
        title="Average Payout Simulation" 
        chartKey="avgPayout" 
        toggleMargin={toggleMargin} 
        visibleMargins={visibleMargins}
        description="This chart shows how average payout affects your profit margins."
      />
      
      {/* Chart - no control buttons */}
      <div className="h-80 relative mb-4">
        <Line 
          data={{datasets}} 
          options={options} 
          ref={(chart) => {
            if (chart) {
              chartRef.current = chart;
            }
          }}
        />
      </div>
      
      {/* Key insights section */}
      <div className="mt-4 p-4 bg-card/30 border border-border/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2 text-text_primary">Key Insights</h4>
        <div className="text-sm text-gray-400 space-y-1">
          <p>
            Price Margin falls below {chartMarginTarget}% at: {formatThresholdText(thresholds.priceThreshold, val => `$${val.toFixed(2)}`)}
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

export default AvgPayoutChart; 