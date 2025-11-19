import { SAMPLE_SIZE, SIMULATION_STEPS, MarginCalculationResult } from './types';

/**
 * Calculate margins based on various parameters
 */
export function calculateMargins(
  evalPrice: number, 
  purchaseToPayoutRate: number, 
  avgPayout: number,
  useActivationFee: boolean,
  activationFee: number,
  evalPassRate: number, 
  avgLiveSaved: number = 0, 
  avgLivePayout: number = 0, 
  includeLive: boolean = false,
  // New company cost parameters
  userFeePerAccount: number = 5.83,
  dataFeePerAccount: number = 2.073,
  accountFeePerAccount: number = 3.5,
  // Staffing cost is now a percentage of pre-live gross revenue
  staffingFeePercent: number = 3.5,
  processorFeePercent: number = 5.25,
  affiliateFeePercent: number = 7.5,
  liveAllocationPercent: number = 4,
  affiliateAppliesToActivation: boolean = false
): MarginCalculationResult {
  // Input validation
  if (isNaN(evalPrice) || evalPrice < 0) {
    throw new Error(`Invalid evaluation price: ${evalPrice}. Must be a non-negative number.`);
  }
  
  if (isNaN(purchaseToPayoutRate) || purchaseToPayoutRate < 0 || purchaseToPayoutRate > 1) {
    throw new Error(`Invalid purchase to payout rate: ${purchaseToPayoutRate}. Must be between 0 and 1.`);
  }
  
  if (isNaN(avgPayout) || avgPayout < 0) {
    throw new Error(`Invalid average payout: ${avgPayout}. Must be a non-negative number.`);
  }
  
  if (isNaN(evalPassRate) || evalPassRate < 0 || evalPassRate > 1) {
    throw new Error(`Invalid evaluation pass rate: ${evalPassRate}. Must be between 0 and 1.`);
  }
  
  if (useActivationFee && (isNaN(activationFee) || activationFee < 0)) {
    throw new Error(`Invalid activation fee: ${activationFee}. Must be a non-negative number.`);
  }
  
  if (isNaN(avgLiveSaved) || avgLiveSaved < 0 || avgLiveSaved > 100) {
    throw new Error(`Invalid average live saved: ${avgLiveSaved}. Must be between 0 and 100.`);
  }
  
  if (includeLive && (isNaN(avgLivePayout) || avgLivePayout < 0)) {
    throw new Error(`Invalid average live payout: ${avgLivePayout}. Must be a non-negative number.`);
  }
  
  // Revenue purely from Eval price based on pass rate
  const evalRevenueFromEvals = evalPrice * SAMPLE_SIZE;

  // Activation Fee Revenue - dependent on pass rate
  const activationFeeRevenue = useActivationFee ? activationFee * SAMPLE_SIZE * evalPassRate : 0;

  // Pre-live Gross Revenues (Eval + Activation)
  const preLiveGrossRevenue = evalRevenueFromEvals + activationFeeRevenue;

  // Total Gross Revenues (before live additions)
  const revenueEval = preLiveGrossRevenue;
  
  // Calculate the effective avgPayout (reduced by % Saved from MLL)
  const effectiveAvgPayout = avgPayout * (1 - avgLiveSaved / 100);
  const savedAmountPerAccount = avgPayout - effectiveAvgPayout;
  
  // Always use full avgPayout for cost calculations regardless of includeLive setting
  // Base payout cost
  const payoutCost = purchaseToPayoutRate * avgPayout * SAMPLE_SIZE;

  // Company fixed per-account costs
  const fixedCompanyCosts = SAMPLE_SIZE * (
    (isNaN(userFeePerAccount) ? 0 : userFeePerAccount) +
    (isNaN(dataFeePerAccount) ? 0 : dataFeePerAccount) +
    (isNaN(accountFeePerAccount) ? 0 : accountFeePerAccount)
  );

  // Percentage-based costs from Gross Revenue (Eval + Activation)
  const processorCost = preLiveGrossRevenue * ((isNaN(processorFeePercent) ? 0 : processorFeePercent) / 100);
  const affiliateBase = affiliateAppliesToActivation ? preLiveGrossRevenue : evalRevenueFromEvals;
  const affiliateCost = affiliateBase * ((isNaN(affiliateFeePercent) ? 0 : affiliateFeePercent) / 100);
  const staffingCost = preLiveGrossRevenue * ((isNaN(staffingFeePercent) ? 0 : staffingFeePercent) / 100);
  const liveAllocationCost = preLiveGrossRevenue * ((isNaN(liveAllocationPercent) ? 0 : liveAllocationPercent) / 100);

  const companyCostsTotal = fixedCompanyCosts + processorCost + affiliateCost + staffingCost + liveAllocationCost;

  const cost = payoutCost + companyCostsTotal;
  let netRevenue = revenueEval - cost;
  
  // New Live account revenue calculations
  const liveUserCount = purchaseToPayoutRate * SAMPLE_SIZE;
  const totalSavedAmount = savedAmountPerAccount * liveUserCount;
  const liveRevenuePerUser = avgLivePayout * 0.20;
  
  // Add MLL Savings to totalLiveRevenue
  const totalLiveRevenue = includeLive ? (liveUserCount * liveRevenuePerUser) + totalSavedAmount : 0;
  
  // Add live revenue to total revenue values if includeLive is true
  let grossRevenue = revenueEval;
  if (includeLive) {
    grossRevenue += totalLiveRevenue;
    netRevenue += totalLiveRevenue;
  }
  
  // Calculate margin using the final revenue numbers
  const priceMargin = grossRevenue > 0 ? netRevenue / grossRevenue : 0;
  
  return {
    priceMargin,
    revenueEval,
    cost,
    netRevenue,
    // Return components for display
    evalRevenueFromEvals,
    activationFeeRevenue,
    // New Live account outputs
    liveUserCount,
    totalLiveRevenue,
    effectiveAvgPayout,
    savedAmountPerAccount,
    totalSavedAmount,
    grossRevenue,
    // Company costs breakdown
    fixedCompanyCosts,
    processorCost,
    affiliateCost,
    liveAllocationCost,
    companyCostsTotal
  };
}

/**
 * Generate simulation data with a range of values
 */
export function generateSimulationData(baseValue: number, range: number, steps: number) {
  // Input validation
  if (isNaN(baseValue)) {
    throw new Error(`Invalid base value: ${baseValue}. Must be a valid number.`);
  }
  
  if (isNaN(range) || range < 0) {
    throw new Error(`Invalid range: ${range}. Must be a non-negative number.`);
  }
  
  if (isNaN(steps) || steps <= 0 || !Number.isInteger(steps)) {
    throw new Error(`Invalid steps: ${steps}. Must be a positive integer.`);
  }
  
  // Ensure steps is at least 2 to avoid division by zero
  const numSteps = Math.max(steps, 2);
  
  // Special handling for baseValue of 0
  if (baseValue === 0) {
    // When baseValue is 0, create a simple range from 0 to a small positive number
    const end = range > 0 ? range : 1;
    return Array.from({ length: numSteps }, (_, i) => (end * i) / (numSteps - 1));
  }
  
  // Normal case: adjust range calculation to handle negative baseValues correctly
  const absBaseValue = Math.abs(baseValue);
  const start = baseValue - (absBaseValue * range / 2);
  const end = baseValue + (absBaseValue * range / 2);
  
  // If start and end are too close, create a simple array with small variation
  if (Math.abs(end - start) < 1e-6) {
    const smallVariation = Math.max(0.1, absBaseValue * 0.01);
    return Array.from({ length: numSteps }, (_, i) => 
      start + smallVariation * i / (numSteps - 1));
  }
  
  // Create the range of values
  return Array.from({ length: numSteps }, (_, i) => 
    start + (end - start) * (i / (numSteps - 1)));
}

/**
 * Adaptive sampling around a target margin level.
 * - Pass 1: coarse scan to find region near target
 * - Pass 2..n: refine the window around closest area
 * Ensures at least desiredPoints located within ±25% of target (relative band) when possible.
 */
export function adaptiveSampleRange(
  min: number,
  max: number,
  getMarginFn: (value: number) => number,
  targetMargin: number, // in 0..1
  desiredPoints = 50,
  passes = 3,
  bandFraction = 0.25
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return []

  const samples = new Map<number, number>() // x -> margin
  const band = Math.max(0.05, Math.abs(targetMargin) * bandFraction)

  let windowMin = min
  let windowMax = max
  let steps = 21

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < steps; i++) {
      const x = windowMin + (windowMax - windowMin) * (i / (steps - 1))
      if (!samples.has(x)) {
        const m = getMarginFn(x)
        if (Number.isFinite(m)) samples.set(x, m)
      }
    }
    // Find closest point to target
    let bestX = windowMin
    let bestDiff = Infinity
    for (const [x, m] of samples) {
      const d = Math.abs(m - targetMargin)
      if (d < bestDiff) { bestDiff = d; bestX = x }
    }
    // Set new window around bestX with shrinking factor
    const shrink = 0.5 / (pass + 1)
    const span = (windowMax - windowMin) * shrink
    windowMin = Math.max(min, bestX - span / 2)
    windowMax = Math.min(max, bestX + span / 2)
    steps = Math.max(steps, Math.ceil(desiredPoints / (pass + 1)))
  }

  // Ensure enough points within band around target
  let within = [...samples].filter(([_, m]) => Math.abs(m - targetMargin) <= band).map(([x]) => x)
  if (within.length < desiredPoints) {
    const needed = desiredPoints - within.length
    for (let i = 0; i < needed; i++) {
      const x = windowMin + (windowMax - windowMin) * (i / Math.max(1, needed - 1))
      if (!samples.has(x)) {
        const m = getMarginFn(x)
        if (Number.isFinite(m)) samples.set(x, m)
      }
    }
  }

  const xs = Array.from(samples.keys()).sort((a, b) => a - b)
  return xs
}

/**
 * Find the value for 50% Margin
 * Merged functionality from previous find50PercentMarginValue and find50PercentCombinedMarginValue
 */
export function find50PercentMarginValue(
  varName: string,
  evalPrice: number,
  purchaseToPayoutRate: number,
  avgPayout: number,
  useActivationFee: boolean,
  activationFee: number,
  baseEvalPassRate: number,
  avgLiveSaved: number = 0,
  avgLivePayout: number = 0,
  includeLive: boolean = false,
  // Company cost parameters
  userFeePerAccount: number = 5.83,
  dataFeePerAccount: number = 2.073,
  accountFeePerAccount: number = 3.5,
  staffingFeePercent: number = 3.5,
  processorFeePercent: number = 5.25,
  affiliateFeePercent: number = 7.5,
  liveAllocationPercent: number = 4,
  affiliateAppliesToActivation: boolean = false
): number | null {
  const getMargin = (value: number) => {
    const currentEvalPassRate = baseEvalPassRate;
        
    switch (varName) {
      case "Eval Price": return calculateMargins(value, purchaseToPayoutRate, avgPayout, useActivationFee, activationFee, currentEvalPassRate, avgLiveSaved, avgLivePayout, includeLive, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation).priceMargin;
      case "Purchase to Payout Rate": return calculateMargins(evalPrice, value, avgPayout, useActivationFee, activationFee, currentEvalPassRate, avgLiveSaved, avgLivePayout, includeLive, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation).priceMargin;
      case "Avg Payout": return calculateMargins(evalPrice, purchaseToPayoutRate, value, useActivationFee, activationFee, currentEvalPassRate, avgLiveSaved, avgLivePayout, includeLive, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation).priceMargin;
      case "Avg Live Payout": return calculateMargins(evalPrice, purchaseToPayoutRate, avgPayout, useActivationFee, activationFee, currentEvalPassRate, avgLiveSaved, value, includeLive, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation).priceMargin;
      default: return NaN;
    }
  };
  return findThresholdValue(varName, getMargin, 0.5, evalPrice, purchaseToPayoutRate, avgPayout, useActivationFee, activationFee, baseEvalPassRate);
}

/**
 * Generic function to find the variable value for a target margin using binary search
 */
export function findThresholdValue(
  varName: string,
  getMarginFn: (value: number) => number,
  targetMargin: number,
  evalPrice: number,
  purchaseToPayoutRate: number,
  avgPayout: number,
  useActivationFee: boolean,
  activationFee: number,
  baseEvalPassRate: number
): number | null {

  let min, max;
  // Set wider ranges based on Streamlit example
  switch (varName) {
    case "Eval Price":
      min = evalPrice * 0.1; // 10% of base
      max = evalPrice * 2;   // 200% of base
      break;
    case "Purchase to Payout Rate":
      min = 0;   // 0%
      max = 1.0; // 100%
      break;
    case "Avg Payout":
      // Enforce practical floor/ceiling to avoid degenerate ranges
      min = Math.max(500, avgPayout * 0.1);
      max = Math.max(5000, avgPayout * 10);
      break;
    default:
      return null;
  }

  let left = min;
  let right = max;
  let result = null;
  const iterations = 100; 
  const tolerance = 0.001;

  // Determine if increasing the variable increases or decreases the margin
  const marginNearMin = getMarginFn(min + (max - min) * 0.01); 
  const marginFurtherFromMin = getMarginFn(min + (max - min) * 0.02);
  const increasingVarIncreasesMargin = marginFurtherFromMin > marginNearMin;

  for (let i = 0; i < iterations; i++) {
    if (right < left) break; // Should not happen in correct binary search
    const mid = left + (right - left) / 2;
    const margin = getMarginFn(mid);

    if (isNaN(margin)) break; // Stop if calculation failed

    if (Math.abs(margin - targetMargin) < tolerance) {
      result = mid;
      break;
    }

    if (increasingVarIncreasesMargin) {
      // If increasing the variable increases the margin
      if (margin < targetMargin) {
        left = mid + tolerance;
      } else {
        right = mid - tolerance;
      }
    } else {
      // If increasing the variable decreases the margin
      if (margin < targetMargin) {
        right = mid - tolerance;
      } else {
        left = mid + tolerance;
      }
    }
  }

  return result;
}

/**
 * Find margin thresholds (points where margins cross specific values)
 * Updated to use priceMargins for both regular and combined calculations
 */
export function findMarginThresholds(values: number[], priceMargins: number[]) {
  let priceThreshold = null;

  for (let i = 0; i < values.length; i++) {
    // Find approximate threshold for 50% margin by checking when it crosses 0.5
    if (priceThreshold === null && priceMargins[i] <= 0.5) {
      // If we find an exact match or the first value below threshold
      if (priceMargins[i] === 0.5) {
        priceThreshold = values[i];
      } else if (i > 0) {
        // Linear interpolation to get more accurate threshold
        const y1 = priceMargins[i-1];
        const y2 = priceMargins[i];
        const x1 = values[i-1];
        const x2 = values[i];
        
        // Skip interpolation if y values are the same (would cause division by zero)
        if (y1 !== y2) {
          priceThreshold = x1 + (x2 - x1) * (0.5 - y1) / (y2 - y1);
        } else {
          priceThreshold = x1;
        }
      } else {
        priceThreshold = values[i];
      }
    }
  }

  return { priceThreshold };
} 