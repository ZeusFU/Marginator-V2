// Types for margin calculation and simulation

// Constants
export const SAMPLE_SIZE = 1000;
export const SIMULATION_STEPS = 100;

// Basic types
export interface MarginCalculationResult {
  priceMargin: number;
  revenueEval: number;
  cost: number;
  netRevenue: number;
  // New Live account outputs
  liveUserCount: number;
  totalLiveRevenue: number;
  effectiveAvgPayout: number;
  savedAmountPerAccount: number;
  totalSavedAmount: number;
  grossRevenue: number;
  evalRevenueFromEvals: number;
  activationFeeRevenue: number;
  // Company cost breakdown
  fixedCompanyCosts: number;
  processorCost: number;
  affiliateCost: number;
  companyCostsTotal: number;
  // Note: staffing cost moved into percentage and included inside companyCostsTotal
}

export interface SimulationDataPoint {
  x: number;
  y: number;
}

export interface SimulationData {
  values: number[];
  margins: number[];
  revenue: number[];
  cost: number[];
  netRevenue: number[];
  totalRevenue: number[];
  totalNetRevenue: number[];
  datasets: {
    label: string;
    data: SimulationDataPoint[];
    borderColor: string;
    tension: number;
    hidden?: boolean;
  }[];
}

export interface ThresholdResult {
  priceThreshold: number | null;
}

export interface ExactThresholdItem {
  name: string;
  pmValue: number | null;
  marginsAtPMValue: MarginCalculationResult | null;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: { duration: number };
  plugins: {
    legend: {
      position: 'top';
      labels: { color: string };
      onClick: () => void;
    };
    tooltip: {
      enabled: boolean;
      mode: 'index';
      intersect: boolean;
      callbacks: {
        title: (tooltipItems: any[]) => string;
        label: (tooltipItem: any) => string;
      };
    };
    annotation: { annotations: any };
  };
  scales: {
    y: any;
    x: any;
  };
}

export interface VisibleMarginsState {
  evalPrice: { priceMargin: boolean };
  ptrRate: { priceMargin: boolean };
  avgPayout: { priceMargin: boolean };
  payoutRate: { priceMargin: boolean };
  evalPriceRate: { priceMargin: boolean };
  avgLivePayout: { priceMargin: boolean };
}

// Add type adapter for simulation data in chart components
export interface ChartDataAdapter {
  // Adapter function to convert SimulationResults.evaluationPriceData to SimulationData
  adaptEvalPriceData: (data: {
    values: number[];
    priceMargins: number[];
    revenue: number[];
    cost: number[];
    netRevenue: number[];
    totalRevenue: number[];
    totalNetRevenue: number[];
  }) => SimulationData;
  
  // Adapter for other data types as needed
} 