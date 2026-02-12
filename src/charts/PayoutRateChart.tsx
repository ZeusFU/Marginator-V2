import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import ChartTitle from '../components/ChartTitle';
import { Chart } from 'chart.js';
import { createChartOptions } from '../utils/chartConfig';
import { useSimulationContext } from '../context/SimulationContext';

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
  const { chartMarginTarget } = useSimulationContext();
  
  // Chart options
  const baseOptions = createChartOptions(
    'Purchase to Payout Rate (%)',
    'linear',
    null,
    (val) => `${(val*100).toFixed(0)}%`,
    (val) => `${(val*100).toFixed(0)}%`,
    chartMarginTarget
  );
  
  const chartOptions = {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        title: { display: true, text: 'Average Payout ($)', color: '#7C7F88' },
        ticks: { color: '#7C7F88', callback: (val: number) => `$${val.toFixed(0)}` },
        min: undefined,
        max: undefined
      }
    },
    plugins: {
      ...baseOptions.plugins,
      annotation: { annotations: {} }, // No horizontal margin line for combo charts
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const x = context.parsed.x;
            const y = context.parsed.y;
            return `${label}: Rate ${(x*100).toFixed(1)}%, Payout $${y.toFixed(0)}`;
          }
        }
      }
    }
  };
  
  const downloadData = () => {
    if (!chartRef.current) return;
    alert('Download functionality would go here');
  };
  
  // Prepare chart data
  const chartData: { datasets: any[] } = { datasets: [] };
  
  if (data && data.combinationsPM && Array.isArray(data.combinationsPM) && data.combinationsPM.length > 0) {
    chartData.datasets.push({
      label: `${chartMarginTarget}% Margin Combinations`,
      data: data.combinationsPM,
      borderColor: 'var(--accent, #4A7EC7)',
      backgroundColor: 'rgba(107, 163, 224, 0.15)',
      tension: 0.1,
      pointRadius: 2,
      showLine: true,
      fill: false
    });
  }
  
  if (isComparisonMode && comparisonData && comparisonData.length > 0) {
    const colors = ['#FF5724', '#00C49F', '#FFBB28', '#9C27B0', '#FF9800'];
    comparisonData.forEach((item, index) => {
      if (item?.data?.combinationsPM) {
        const color = colors[index % colors.length];
        chartData.datasets.push({
          label: `${item.name} - ${chartMarginTarget}% Margin`,
          data: item.data.combinationsPM,
          borderColor: color,
          backgroundColor: `${color}33`,
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
    <div className="bg-card pt-4 p-5 rounded-xl border border-border shadow-soft transition-all chart-container">
      <ChartTitle 
        title={`Payout vs Rate for ${chartMarginTarget}% Margin`}
        chartKey="payoutRate" 
        toggleMargin={() => toggleMargin('priceMargin')} 
        visibleMargins={visibleMargins}
        description={`Combinations of payout rates and average payouts that result in ${chartMarginTarget}% price margin.`}
      />
      
      <div className="h-80 relative mb-4">
        {chartData.datasets.length > 0 ? (
          <Line 
            data={chartData} 
            options={chartOptions} 
            ref={(chart) => { if (chart) chartRef.current = chart; }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-text_secondary text-sm">
            No data available. Adjust your simulation parameters.
          </div>
        )}
      </div>
      
      <div className="mt-4 p-4 bg-surface/60 border border-border rounded-xl">
        <h4 className="text-sm font-medium mb-2 text-text_primary">Key Insights</h4>
        <div className="text-sm text-text_secondary space-y-1">
          <p>
            This curve shows all combinations of Purchase to Payout Rate and Average Payout
            that result in exactly {chartMarginTarget}% price margin.
          </p>
          <p>
            Points below the curve have margins over {chartMarginTarget}%, points above have margins under {chartMarginTarget}%.
          </p>
        </div>
      </div>
      
      <button 
        onClick={downloadData} 
        className="mt-4 px-4 py-2 bg-secondary text-white rounded hover:bg-opacity-80 flex items-center gap-2 text-sm font-medium"
      >
        <Download className="w-4 h-4"/> Download Data
      </button>
    </div>
  );
}

export default PayoutRateChart;
