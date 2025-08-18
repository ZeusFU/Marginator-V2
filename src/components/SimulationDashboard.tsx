import React, { useMemo } from 'react'
import { useSimulationContext } from '../context/SimulationContext'
import { SAMPLE_SIZE, MarginCalculationResult, ExactThresholdItem } from '../utils/types'
import ComparisonPlanCard from './ComparisonPlanCard'

interface ThresholdItem extends ExactThresholdItem {
  name: string
  pmValue: number | null
  marginsAtPMValue: MarginCalculationResult | null
}

export function SimulationDashboard() {
  const { 
    results, 
    inputs, 
    isComparisonMode, 
    comparisonSimulations 
  } = useSimulationContext()
  
  // Early return with fallback UI if no results
  if (!results) {
    return (
      <div className="dashboard-container rounded-lg shadow-md p-4 mb-6 bg-card">
        <div className="text-center p-4 text-text_secondary">
          No simulation results available. Please run a simulation first.
        </div>
      </div>
    )
  }
  
  // Extract all needed values from results with safe access patterns
  const baseMargins = results.baseMargins || {} as MarginCalculationResult
  
  // Fix: Format the thresholds correctly from the object into an array for display
  const formattedThresholds = useMemo(() => {
    const thresholds = [];
    
    if (results?.exactThresholds?.fiftyPercentMarginEvalPrice !== undefined) {
      thresholds.push({
        name: "Evaluation Price",
        pmValue: results.exactThresholds.fiftyPercentMarginEvalPrice,
        marginsAtPMValue: null
      });
    }
    
    if (results?.exactThresholds?.breakEvenPtrRate !== undefined) {
      thresholds.push({
        name: "Purchase to Payout Rate",
        pmValue: results.exactThresholds.breakEvenPtrRate,
        marginsAtPMValue: null
      });
    }
    
    if (results?.exactThresholds?.breakEvenAvgPayout !== undefined) {
      thresholds.push({
        name: "Average Payout",
        pmValue: results.exactThresholds.breakEvenAvgPayout,
        marginsAtPMValue: null
      });
    }
    
    return thresholds;
  }, [results?.exactThresholds]);
  
  // Format helpers
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '$0.00'
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
  
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.0%'
    return `${(value * 100).toFixed(1)}%`
  }
  
  // Get margin color (using shades of saturated dark blue)
  const getMarginColor = (margin: number | undefined) => {
    if (!margin || isNaN(margin)) return 'bg-[#5356b8]' // Default light blue
    if (margin >= 0.5) return 'bg-[#0a2472]' // Dark blue
    if (margin >= 0.4) return 'bg-[#1e3799]' // Medium dark blue
    if (margin >= 0.3) return 'bg-[#3742a8]' // Medium blue
    return 'bg-[#5356b8]' // Lighter blue
  }
  
  // Safely access values from baseMargins
  const safeMargin = {
    priceMargin: baseMargins?.priceMargin ?? 0,
    netRevenue: baseMargins?.netRevenue ?? 0,
    grossRevenue: baseMargins?.grossRevenue ?? 0,
    evalRevenueFromEvals: baseMargins?.evalRevenueFromEvals ?? 0,
    activationFeeRevenue: baseMargins?.activationFeeRevenue ?? 0,
    cost: baseMargins?.cost ?? 0,
    totalLiveRevenue: baseMargins?.totalLiveRevenue ?? 0,
    totalSavedAmount: baseMargins?.totalSavedAmount ?? 0,
    liveUserCount: baseMargins?.liveUserCount ?? 0,
    fixedCompanyCosts: baseMargins?.fixedCompanyCosts ?? 0,
    processorCost: baseMargins?.processorCost ?? 0,
    affiliateCost: baseMargins?.affiliateCost ?? 0,
    companyCostsTotal: baseMargins?.companyCostsTotal ?? 0
  }
  
  // Use nullish coalescing for input values
  const safeInputs = {
    evalPrice: Number(inputs?.evalPrice || 0),
    simFundedRate: Number(inputs?.simFundedRate || 0),
    evalPassRate: Number(inputs?.evalPassRate || 0),
    avgPayout: Number(inputs?.avgPayout || 0),
    includeLive: !!inputs?.includeLive
  }
  const purchaseToPayoutRateDec = (safeInputs.evalPassRate / 100) * (safeInputs.simFundedRate / 100)
  
  // For comparison mode
  if (isComparisonMode && comparisonSimulations.length > 0) {
    return (
      <div className="dashboard-container rounded-lg shadow-md p-4 mb-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">Plan Comparison</h2>
        
        {/* Current plan card */}
        <div className="mb-4">
          <ComparisonPlanCard
            id="current"
            name="Current Plan"
            priceMargin={safeMargin.priceMargin}
            baseMargins={baseMargins}
            thresholds={results.exactThresholds}
          />
        </div>
        
        {/* Grid for comparison plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisonSimulations.map(simulation => (
            <ComparisonPlanCard
              key={simulation.id}
              id={simulation.id}
              name={simulation.name}
              priceMargin={simulation.baseMargins?.priceMargin || 0}
              baseMargins={simulation.baseMargins || {}}
              thresholds={simulation.exactThresholds}
            />
          ))}
        </div>
      </div>
    )
  }
  
  // Original single plan view
  return (
    <div className="dashboard-container rounded-lg shadow-md p-4 mb-6 bg-card">
      {/* Main Margin Display */}
      <div className={`margin-card col-span-full p-4 rounded-lg mb-4 
                      ${getMarginColor(safeMargin.priceMargin)} text-white`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-medium text-white/80">Overall Margin</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatPercent(safeMargin.priceMargin)}</span>
              <span className="text-xs text-white/70">(Net Revenue / Gross Revenue)</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-white/80">Net Revenue</span>
            <div className="text-lg font-bold">{formatCurrency(safeMargin.netRevenue)}</div>
          </div>
        </div>
      </div>
      
      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Financials */}
        <div className="financials-card p-4 border border-border rounded-lg bg-background/60">
          <h2 className="text-sm font-medium text-text_secondary mb-3">Financials</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs">Gross Revenue</span>
              <span className="font-medium">{formatCurrency(safeMargin.grossRevenue)}</span>
            </div>
            <div className="pl-4 text-xs text-text_secondary space-y-1">
              <div className="flex justify-between">
                <span>Eval Revenue</span>
                <span>{formatCurrency(safeMargin.evalRevenueFromEvals)}</span>
              </div>
              <div className="flex justify-between">
                <span>Activation Fee</span>
                <span>{formatCurrency(safeMargin.activationFeeRevenue)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-xs">Payout Cost</span>
              <span className="font-medium text-red-500">{formatCurrency(safeMargin.cost)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-xs">Net Revenue</span>
              <span className="font-medium text-green-500">{formatCurrency(safeMargin.netRevenue)}</span>
            </div>
          </div>
        </div>
        
        {/* Live Revenue */}
        <div className={`live-revenue-card p-4 border border-border rounded-lg bg-background/60 ${!safeInputs.includeLive ? 'opacity-50' : ''}`}>
          <h2 className="text-sm font-medium text-text_secondary mb-3">Live Revenue</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs">Total Live Revenue</span>
              <span className="font-medium">{formatCurrency(safeMargin.totalLiveRevenue)}</span>
            </div>
            <div className="pl-4 text-xs text-text_secondary space-y-1">
              <div className="flex justify-between">
                <span>Saved from MLL</span>
                <span>{formatCurrency(safeMargin.totalSavedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Live Payouts</span>
                <span>{formatCurrency(safeMargin.totalLiveRevenue - safeMargin.totalSavedAmount)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-xs">Funded Users</span>
              <span className="font-medium">{safeMargin.liveUserCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* Key Parameters */}
        <div className="parameters-card p-4 border border-border rounded-lg bg-background/60">
          <h2 className="text-sm font-medium text-text_secondary mb-3">Key Parameters</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-text_secondary block">Price</span>
              <span className="font-medium">{formatCurrency(safeInputs.evalPrice)}</span>
            </div>
            <div>
              <span className="text-xs text-text_secondary block">Funded to Payout</span>
              <span className="font-medium">{formatPercent(safeInputs.simFundedRate / 100)}</span>
            </div>
            <div>
              <span className="text-xs text-text_secondary block">Eval to Funded</span>
              <span className="font-medium">{formatPercent(safeInputs.evalPassRate / 100)}</span>
            </div>
            <div>
              <span className="text-xs text-text_secondary block">Purchase to Payout</span>
              <span className="font-medium">{formatPercent(purchaseToPayoutRateDec)}</span>
            </div>
            <div>
              <span className="text-xs text-text_secondary block">Sample Size</span>
              <span className="font-medium">{SAMPLE_SIZE.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Company Costs Breakdown */}
      <div className="company-costs-card p-4 border border-border rounded-lg bg-background/60 mt-4">
        <h2 className="text-sm font-medium text-text_secondary mb-3">Company Costs</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs">Fixed Per-Account Costs</span>
            <span className="font-medium">{formatCurrency(safeMargin.fixedCompanyCosts)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs">Processor Fees</span>
            <span className="font-medium">{formatCurrency(safeMargin.processorCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs">Affiliate Fees</span>
            <span className="font-medium">{formatCurrency(safeMargin.affiliateCost)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-xs">Total Company Costs</span>
            <span className="font-medium">{formatCurrency(safeMargin.companyCostsTotal)}</span>
          </div>
        </div>
      </div>
      
      {/* Thresholds */}
      <div className="thresholds-card p-4 border border-border rounded-lg bg-background/60 mt-4">
        <h2 className="text-sm font-medium text-text_secondary mb-3">50% Margin Thresholds</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formattedThresholds.map((threshold: ThresholdItem, index: number) => (
            <div key={index} className="threshold-item">
              <span className="text-xs text-text_secondary block">{threshold?.name || 'Unknown'}</span>
              <span className="font-medium">
                {threshold?.pmValue !== null && threshold?.pmValue !== undefined
                  ? threshold?.name?.includes('Rate') 
                    ? formatPercent(threshold.pmValue)
                    : formatCurrency(threshold.pmValue)
                  : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SimulationDashboard 