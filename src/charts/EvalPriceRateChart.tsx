import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import ChartTitle from '../components/ChartTitle';
import { Chart } from 'chart.js';
import { createChartOptions } from '../utils/chartConfig';
import { useSimulationContext } from '../context/SimulationContext';

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
  const { chartMarginTarget } = useSimulationContext();
  
  const baseOptions = createChartOptions(
    'Evaluation Price ($)',
    'linear',
    null,
    (val) => `$${val.toFixed(0)}`,
    (val) => `$${val.toFixed(0)}`,
    chartMarginTarget
  );
  
  const chartOptions = {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        title: { display: true, text: 'Purchase to Payout Rate (%)', color: '#7C7F88' },
        ticks: { color: '#7C7F88', callback: (val: number) => `${(val*100).toFixed(0)}%` },
        min: undefined,
        max: undefined
      }
    },
    plugins: {
      ...baseOptions.plugins,
      annotation: { annotations: {} },
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const x = context.parsed.x;
            const y = context.parsed.y;
            return `${label}: Price $${x.toFixed(0)}, Rate ${(y*100).toFixed(1)}%`;
          }
        }
      }
    }
  };
  
  const downloadData = () => {
    if (!chartRef.current) return;
    alert('Download functionality would go here');
  };
  
  // Prepare chart data — each result set is for a different avg payout level
  const chartData: { datasets: any[] } = { datasets: [] };
  const colors = ['#4A7EC7', '#00C49F', '#FFBB28', '#9C27B0', '#FF9800', '#F44336'];
  
  if (data?.results && Array.isArray(data.results)) {
    data.results.forEach((item: any, index: number) => {
      if (item?.dataPoints?.length > 0) {
        const color = colors[index % colors.length];
        chartData.datasets.push({
          label: `Avg Payout: $${item.evalPrice}`,
          data: item.dataPoints,
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
  
  if (isComparisonMode && comparisonData && comparisonData.length > 0) {
    comparisonData.forEach((comp, index) => {
      if (comp?.data?.results && Array.isArray(comp.data.results)) {
        comp.data.results.forEach((item: any, dataIndex: number) => {
          if (item?.dataPoints?.length > 0) {
            const hue = 180 + (index * 30 + dataIndex * 15) % 180;
            const color = `hsl(${hue}, 70%, 60%)`;
            chartData.datasets.push({
              label: `${comp.name} - $${item.evalPrice}`,
              data: item.dataPoints,
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
    <div className="bg-card pt-4 p-5 rounded-xl border border-border shadow-soft transition-all chart-container">
      <ChartTitle 
        title={`Eval Price vs Rate for ${chartMarginTarget}% Margin`}
        chartKey="evalPriceRate" 
        toggleMargin={() => toggleMargin('priceMargin')} 
        visibleMargins={visibleMargins}
        description={`Combinations of evaluation prices and payout rates that result in ${chartMarginTarget}% price margin at different avg payout levels.`}
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
            Each curve shows the max Purchase to Payout Rate that achieves {chartMarginTarget}% margin
            at a given Evaluation Price, for a specific Average Payout level.
          </p>
          <p>
            Higher evaluation prices allow for higher payout rates while maintaining {chartMarginTarget}% margin.
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

export default EvalPriceRateChart;
