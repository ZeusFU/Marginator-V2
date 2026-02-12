// Types for margin calculation and simulation

// Constants
export const SIMULATION_STEPS = 100;

// Basic types — all dollar values are per-account
export interface MarginCalculationResult {
  priceMargin: number;
  grossRevenue: number;
  evalRevenueFromEvals: number;
  activationFeeRevenue: number;
  payoutCost: number;
  fixedCompanyCosts: number;
  processorCost: number;
  affiliateCost: number;
  liveAllocationCost: number;
  companyCostsTotal: number;
  totalCost: number;
  netRevenue: number;
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
}

export interface ChartDataAdapter {
  adaptEvalPriceData: (data: {
    values: number[];
    priceMargins: number[];
    revenue: number[];
    cost: number[];
    netRevenue: number[];
    totalRevenue: number[];
    totalNetRevenue: number[];
  }) => SimulationData;
}
