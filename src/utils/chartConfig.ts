import { ChartOptions, SimulationDataPoint } from './types';

/** Read theme-aware colors from CSS variables */
function getThemeColors() {
  const style = getComputedStyle(document.documentElement)
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return {
    isDark,
    textSecondary: style.getPropertyValue('--text_secondary').trim() || (isDark ? '#8B8E97' : '#7C7F88'),
    primary: style.getPropertyValue('--primary').trim() || (isDark ? '#5A8FD4' : '#1E3A5F'),
    secondary: style.getPropertyValue('--secondary').trim() || '#C9A84C',
    accent: style.getPropertyValue('--accent').trim() || (isDark ? '#6BA3E0' : '#4A7EC7'),
    gridColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    zeroLine: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
  }
}

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
  const tc = getThemeColors()
  const annotations: any = {};
  
  if (thresholdValue !== null) {
    annotations.line1 = {
      type: 'line',
      xMin: thresholdValue,
      xMax: thresholdValue,
      borderColor: tc.primary,
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        content: `${targetPercent}% Margin: ${thresholdFormatter(thresholdValue)}`,
        position: 'end',
        backgroundColor: tc.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(30, 58, 95, 0.85)',
        color: '#FFFFFF',
        font: { size: 12 },
        enabled: true
      }
    };
  }
  
  // Zero line annotation for reference
  annotations.line2 = {
    type: 'line',
    yMin: 0,
    yMax: 0,
    borderColor: tc.zeroLine,
    borderWidth: 1,
    borderDash: [6, 6]
  };
  
  // Add horizontal target margin line
  annotations.line3 = {
    type: 'line',
    yMin: targetPercent,
    yMax: targetPercent,
    borderColor: 'rgba(201, 168, 76, 0.8)',
    borderWidth: 2,
    borderDash: [5, 5],
    label: {
      content: `${targetPercent}% Margin`,
      position: 'start',
      backgroundColor: 'rgba(201, 168, 76, 0.9)',
      color: '#FFFFFF',
      font: { size: 12 },
      enabled: true
    }
  };

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
        labels: { color: tc.textSecondary }
      },
      tooltip: {
        backgroundColor: tc.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(30, 58, 95, 0.9)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: tc.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(30, 58, 95, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
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
        min: Math.max(0, targetPercent * 0.5),
        max: Math.min(100, targetPercent * 1.5),
        title: {
          display: true,
          text: 'Margin (%)',
          color: tc.textSecondary
        },
        ticks: {
          color: tc.textSecondary,
          callback: (value: number) => `${value}%`
        },
        grid: { color: tc.gridColor }
      },
      x: {
        type: xScaleType,
        title: {
          display: true,
          text: xAxisTitle,
          color: tc.textSecondary
        },
        ticks: {
          color: tc.textSecondary,
          callback: xFormatter
        },
        grid: { color: tc.gridColor }
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
  const tc = getThemeColors()
  return [
    {
      label: 'Price Margin',
      data: values.map((x, i) => ({ x, y: margins[i] * 100 })),
      borderColor: tc.accent,
      backgroundColor: tc.isDark ? 'rgba(107, 163, 224, 0.15)' : 'rgba(74, 126, 199, 0.15)',
      showLine: true,
      tension: tension,
      pointRadius: 0,
      fill: 'origin',
      hidden: false
    }
  ];
}

/**
 * Format data for linear scale charts
 */
export function formatLinearData(range: number[], values: number[], scaleToPercentage: boolean = true): SimulationDataPoint[] {
  try {
    if (!Array.isArray(range) || !Array.isArray(values)) {
      throw new Error('Invalid arrays provided to formatLinearData');
    }
    if (range.length === 0 || values.length === 0) {
      throw new Error('Empty arrays provided to formatLinearData');
    }
    if (range.length !== values.length) {
      throw new Error('Array length mismatch in formatLinearData');
    }
    return range.map((xValue, index) => {
      const yValue = values[index];
      if (yValue === undefined || yValue === null) return { x: xValue, y: 0 };
      return { x: xValue, y: scaleToPercentage ? yValue * 100 : yValue };
    });
  } catch (error) {
    console.error('Error formatting linear data:', error);
    return [];
  }
}

export function formatThresholdText(threshold: number | null, formatter: (val: number) => string): string {
  return threshold !== null ? formatter(threshold) : 'N/A (Stays above target in range)';
}

export function formatValue(varName: string, value: number | null): string {
  if (value === null) return 'N/A';
  if (varName === "Eval Price" || varName === "Avg Payout") {
    return `$${value.toFixed(2)}`;
  } else {
    return `${(value * 100).toFixed(2)}%`;
  }
}

export function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
