import { MarginCalculationResult } from './types';

/**
 * Calculate margins per account (no sample size).
 * All dollar values returned are per single account purchased.
 */
export function calculateMargins(
  evalPrice: number,
  purchaseToPayoutRate: number,
  avgPayout: number,
  useActivationFee: boolean,
  activationFee: number,
  evalPassRate: number,
  // Company cost parameters
  userFeePerAccount: number = 5.83,
  dataFeePerAccount: number = 2.073,
  accountFeePerAccount: number = 3.5,
  staffingFeePercent: number = 3.5,
  processorFeePercent: number = 5.25,
  affiliateFeePercent: number = 3,
  liveAllocationPercent: number = 2,
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

  // Revenue per account
  const evalRevenueFromEvals = evalPrice;
  const activationFeeRevenue = useActivationFee ? activationFee * evalPassRate : 0;
  const grossRevenue = evalRevenueFromEvals + activationFeeRevenue;

  // Payout cost per account
  const payoutCost = purchaseToPayoutRate * avgPayout;

  // Fixed per-account company costs
  const fixedCompanyCosts =
    (isNaN(userFeePerAccount) ? 0 : userFeePerAccount) +
    (isNaN(dataFeePerAccount) ? 0 : dataFeePerAccount) +
    (isNaN(accountFeePerAccount) ? 0 : accountFeePerAccount);

  // Percentage-based costs (applied to gross revenue per account)
  const processorCost = grossRevenue * ((isNaN(processorFeePercent) ? 0 : processorFeePercent) / 100);
  const affiliateBase = affiliateAppliesToActivation ? grossRevenue : evalRevenueFromEvals;
  const affiliateCost = affiliateBase * ((isNaN(affiliateFeePercent) ? 0 : affiliateFeePercent) / 100);
  const staffingCost = grossRevenue * ((isNaN(staffingFeePercent) ? 0 : staffingFeePercent) / 100);
  const liveAllocationCost = grossRevenue * ((isNaN(liveAllocationPercent) ? 0 : liveAllocationPercent) / 100);

  const companyCostsTotal = fixedCompanyCosts + processorCost + affiliateCost + staffingCost + liveAllocationCost;
  const totalCost = payoutCost + companyCostsTotal;
  const netRevenue = grossRevenue - totalCost;
  const priceMargin = grossRevenue > 0 ? netRevenue / grossRevenue : 0;

  return {
    priceMargin,
    grossRevenue,
    evalRevenueFromEvals,
    activationFeeRevenue,
    payoutCost,
    fixedCompanyCosts,
    processorCost,
    affiliateCost,
    liveAllocationCost,
    companyCostsTotal,
    totalCost,
    netRevenue,
  };
}

/**
 * Generate simulation data with a range of values
 */
export function generateSimulationData(baseValue: number, range: number, steps: number) {
  if (isNaN(baseValue)) throw new Error(`Invalid base value: ${baseValue}.`);
  if (isNaN(range) || range < 0) throw new Error(`Invalid range: ${range}.`);
  if (isNaN(steps) || steps <= 0 || !Number.isInteger(steps)) throw new Error(`Invalid steps: ${steps}.`);

  const numSteps = Math.max(steps, 2);

  if (baseValue === 0) {
    const end = range > 0 ? range : 1;
    return Array.from({ length: numSteps }, (_, i) => (end * i) / (numSteps - 1));
  }

  const absBaseValue = Math.abs(baseValue);
  const start = baseValue - (absBaseValue * range / 2);
  const end = baseValue + (absBaseValue * range / 2);

  if (Math.abs(end - start) < 1e-6) {
    const smallVariation = Math.max(0.1, absBaseValue * 0.01);
    return Array.from({ length: numSteps }, (_, i) =>
      start + smallVariation * i / (numSteps - 1));
  }

  return Array.from({ length: numSteps }, (_, i) =>
    start + (end - start) * (i / (numSteps - 1)));
}

/**
 * Adaptive sampling around a target margin level.
 */
export function adaptiveSampleRange(
  min: number,
  max: number,
  getMarginFn: (value: number) => number,
  targetMargin: number,
  desiredPoints = 50,
  passes = 3,
  bandFraction = 0.25
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return []

  const samples = new Map<number, number>()
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
    let bestX = windowMin
    let bestDiff = Infinity
    for (const [x, m] of samples) {
      const d = Math.abs(m - targetMargin)
      if (d < bestDiff) { bestDiff = d; bestX = x }
    }
    const shrink = 0.5 / (pass + 1)
    const span = (windowMax - windowMin) * shrink
    windowMin = Math.max(min, bestX - span / 2)
    windowMax = Math.min(max, bestX + span / 2)
    steps = Math.max(steps, Math.ceil(desiredPoints / (pass + 1)))
  }

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

  return Array.from(samples.keys()).sort((a, b) => a - b)
}

/**
 * Find the variable value for a target margin using binary search
 */
export function findTargetMarginValue(
  varName: string,
  evalPrice: number,
  purchaseToPayoutRate: number,
  avgPayout: number,
  useActivationFee: boolean,
  activationFee: number,
  baseEvalPassRate: number,
  targetMargin: number = 0.5,
  userFeePerAccount: number = 5.83,
  dataFeePerAccount: number = 2.073,
  accountFeePerAccount: number = 3.5,
  staffingFeePercent: number = 3.5,
  processorFeePercent: number = 5.25,
  affiliateFeePercent: number = 3,
  liveAllocationPercent: number = 2,
  affiliateAppliesToActivation: boolean = false
): number | null {
  const getMargin = (value: number) => {
    switch (varName) {
      case "Eval Price": return calculateMargins(value, purchaseToPayoutRate, avgPayout, useActivationFee, activationFee, baseEvalPassRate, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation).priceMargin;
      case "Purchase to Payout Rate": return calculateMargins(evalPrice, value, avgPayout, useActivationFee, activationFee, baseEvalPassRate, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation).priceMargin;
      case "Avg Payout": return calculateMargins(evalPrice, purchaseToPayoutRate, value, useActivationFee, activationFee, baseEvalPassRate, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation).priceMargin;
      default: return NaN;
    }
  };
  return findThresholdValue(varName, getMargin, targetMargin, evalPrice, purchaseToPayoutRate, avgPayout, useActivationFee, activationFee, baseEvalPassRate);
}

/** @deprecated Use findTargetMarginValue with explicit targetMargin parameter */
export function find50PercentMarginValue(
  varName: string,
  evalPrice: number,
  purchaseToPayoutRate: number,
  avgPayout: number,
  useActivationFee: boolean,
  activationFee: number,
  baseEvalPassRate: number,
  userFeePerAccount: number = 5.83,
  dataFeePerAccount: number = 2.073,
  accountFeePerAccount: number = 3.5,
  staffingFeePercent: number = 3.5,
  processorFeePercent: number = 5.25,
  affiliateFeePercent: number = 3,
  liveAllocationPercent: number = 2,
  affiliateAppliesToActivation: boolean = false
): number | null {
  return findTargetMarginValue(varName, evalPrice, purchaseToPayoutRate, avgPayout, useActivationFee, activationFee, baseEvalPassRate, 0.5, userFeePerAccount, dataFeePerAccount, accountFeePerAccount, staffingFeePercent, processorFeePercent, affiliateFeePercent, liveAllocationPercent, affiliateAppliesToActivation);
}

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
  switch (varName) {
    case "Eval Price":
      min = evalPrice * 0.1;
      max = evalPrice * 2;
      break;
    case "Purchase to Payout Rate":
      min = 0;
      max = 1.0;
      break;
    case "Avg Payout":
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

  const marginNearMin = getMarginFn(min + (max - min) * 0.01);
  const marginFurtherFromMin = getMarginFn(min + (max - min) * 0.02);
  const increasingVarIncreasesMargin = marginFurtherFromMin > marginNearMin;

  for (let i = 0; i < iterations; i++) {
    if (right < left) break;
    const mid = left + (right - left) / 2;
    const margin = getMarginFn(mid);
    if (isNaN(margin)) break;

    if (Math.abs(margin - targetMargin) < tolerance) {
      result = mid;
      break;
    }

    if (increasingVarIncreasesMargin) {
      if (margin < targetMargin) left = mid + tolerance;
      else right = mid - tolerance;
    } else {
      if (margin < targetMargin) right = mid - tolerance;
      else left = mid + tolerance;
    }
  }

  return result;
}

export function findMarginThresholds(values: number[], priceMargins: number[], targetMargin: number = 0.5) {
  let priceThreshold = null;

  for (let i = 0; i < values.length; i++) {
    if (priceThreshold === null && priceMargins[i] <= targetMargin) {
      if (priceMargins[i] === targetMargin) {
        priceThreshold = values[i];
      } else if (i > 0) {
        const y1 = priceMargins[i - 1];
        const y2 = priceMargins[i];
        const x1 = values[i - 1];
        const x2 = values[i];
        if (y1 !== y2) {
          priceThreshold = x1 + (x2 - x1) * (targetMargin - y1) / (y2 - y1);
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
