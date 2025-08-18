import { ChartOptions, SimulationDataPoint } from './types';

/**
 * Create chart options with dynamic vertical lines
 */
export function createChartOptions(
  xAxisTitle: string,
  xScaleType: 'linear' | 'logarithmic',
  thresholdValue: number | null,
  xFormatter: (val: number) => string,
  thresholdFormatter: (val: number) => string,
  targetPercent: number = 50
) {
  const annotations: any = {};
  
  if (thresholdValue !== null) {
    annotations.line1 = {
      type: 'line',
      xMin: thresholdValue,
      xMax: thresholdValue,
      borderColor: '#EBF3FE', // Changed to light blue for better visibility
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        content: `${targetPercent}% Margin: ${thresholdFormatter(thresholdValue)}`,
        position: 'end',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: '#EBF3FE',
        font: {
          size: 12
        },
        enabled: true
      }
    };
  }
  
  // Zero line annotation for reference
  annotations.line2 = {
    type: 'line',
    yMin: 0,
    yMax: 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderDash: [6, 6]
  };
  
  // Add horizontal 50% margin line
  annotations.line3 = {
    type: 'line',
    yMin: targetPercent,
    yMax: targetPercent,
    borderColor: 'rgba(255, 87, 36, 0.7)', // Orange-red color for visibility
    borderWidth: 2,
    borderDash: [5, 5],
    label: {
      content: `${targetPercent}% Margin`,
      position: 'start',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: '#FF5724',
      font: {
        size: 12
      },
      enabled: true
    }
  };

  // Create chart options
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#EBF3FE'
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            // Create more detailed tooltip
            const label = context.dataset.label || '';
            let value = context.parsed.y;
            if (typeof value !== 'number') return `${label}`;
            
            return `${label}: ${value.toFixed(2)}%`;
          },
          title: (tooltipItems: any[]) => {
            if (tooltipItems.length > 0) {
              return xFormatter(tooltipItems[0].parsed.x);
            }
            return '';
          }
        }
      },
      annotation: {
        annotations
      }
    },
    scales: {
      y: {
        // Focus around the desired target with a ±50% buffer
        min: Math.max(0, targetPercent * 0.5),
        max: Math.min(100, targetPercent * 1.5),
        title: {
          display: true,
          text: 'Margin (%)',
          color: '#EBF3FE'
        },
        ticks: {
          color: '#EBF3FE',
          callback: (value: number) => `${value}%`
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        type: xScaleType,
        title: {
          display: true,
          text: xAxisTitle,
          color: '#EBF3FE'
        },
        ticks: {
          color: '#EBF3FE',
          callback: xFormatter
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };
}

/**
 * Create datasets for charts
 */
export function createDatasets(
  values: number[],
  margins: number[],
  chartType: string,
  showPriceMargin: boolean,
  tension: number = 0
) {
  return [
    {
      label: 'Price Margin',
      data: values.map((x, i) => ({
        x,
        y: margins[i] * 100
      })),
      borderColor: '#3A82F7', // Changed from green to blue
      backgroundColor: 'rgba(58, 130, 247, 0.3)', // Changed from green to blue with transparency
      showLine: true,
      tension: tension,
      pointRadius: 0,
      fill: 'origin', // Always fill to origin
      hidden: false // Always show the data
    }
  ];
}

/**
 * Format data for linear scale charts
 */
export function formatLinearData(range: number[], values: number[], scaleToPercentage: boolean = true): SimulationDataPoint[] {
  try {
    if (!Array.isArray(range) || !Array.isArray(values)) {
      console.error('Invalid input to formatLinearData:', { range, values });
      throw new Error('Invalid arrays provided to formatLinearData');
    }
    
    if (range.length === 0 || values.length === 0) {
      console.error('Empty arrays provided to formatLinearData');
      throw new Error('Empty arrays provided to formatLinearData');
    }
    
    if (range.length !== values.length) {
      console.error(`Array length mismatch: range (${range.length}) vs values (${values.length})`);
      throw new Error('Array length mismatch in formatLinearData');
    }
    
    return range.map((xValue, index) => {
      const yValue = values[index];
      
      if (yValue === undefined || yValue === null) {
        console.error(`Invalid y-value at index ${index}:`, yValue);
        return { x: xValue, y: 0 }; // Use default value
      }
      
      return { 
        x: xValue, 
        y: scaleToPercentage ? yValue * 100 : yValue 
      };
    });
  } catch (error) {
    console.error('Error formatting linear data:', error);
    return []; // Return empty array to prevent further errors
  }
}

/**
 * Helper function to format threshold text
 */
export function formatThresholdText(threshold: number | null, formatter: (val: number) => string): string {
  return threshold !== null ? formatter(threshold) : 'N/A (Stays above 50% in range)';
}

/**
 * Helper function to format value for display
 */
export function formatValue(varName: string, value: number | null): string {
  if (value === null) return 'N/A';
  if (varName === "Eval Price" || varName === "Avg Payout") {
    return `$${value.toFixed(2)}`;
  } else { // Purchase to Payout Rate
    return `${(value * 100).toFixed(2)}%`;
  }
}

/**
 * Helper to format currency
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
} 