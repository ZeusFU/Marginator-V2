import React, { useMemo, useState } from 'react'
import { Copy as CopyIcon, Check } from 'lucide-react'
import { useSimulationContext } from '../context/SimulationContext'
import { SAMPLE_SIZE, MarginCalculationResult, ExactThresholdItem } from '../utils/types'
import ComparisonPlanCard from './ComparisonPlanCard'

export interface ScenarioSnapshot {
  name: string
  margin: number
  price: number
  passRate: number
  payoutRate: number
  avgPayout: number
}

interface SimulationDashboardProps {
  onSaveScenario?: (snapshot: ScenarioSnapshot) => void
}

interface ThresholdItem extends ExactThresholdItem {
  name: string
  pmValue: number | null
  marginsAtPMValue: MarginCalculationResult | null
}

export function SimulationDashboard({ onSaveScenario }: SimulationDashboardProps) {
  const { 
    results, 
    inputs, 
    isComparisonMode, 
    comparisonSimulations,
    chartMarginTarget
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
    liveAllocationCost: baseMargins?.liveAllocationCost ?? 0,
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
  const payoutCosts = Math.max(0, safeMargin.cost - safeMargin.companyCostsTotal)

  // Copy overall summary, including thresholds for current global target
  const [overallCopied, setOverallCopied] = useState(false)
  const handleCopyOverall = () => {
    const target = chartMarginTarget
    const evalPriceThreshold = computeThreshold(
      results?.evaluationPriceData?.values || [],
      (results?.evaluationPriceData?.priceMargins || []).map((p: number) => p / 100),
      target / 100
    )
    const ptrThreshold = computeThreshold(
      results?.purchaseToPayoutRateData?.values || [],
      (results?.purchaseToPayoutRateData?.priceMargins || []).map((p: number) => p / 100),
      target / 100
    )
    const avgPayoutThreshold = computeThreshold(
      results?.averagePayoutData?.values || [],
      (results?.averagePayoutData?.priceMargins || []).map((p: number) => p / 100),
      target / 100
    )

    const lines: string[] = []
    lines.push(`Price = $${safeInputs.evalPrice.toFixed(2)}`)
    lines.push(`Eval ➡ Funded = ${(safeInputs.evalPassRate).toFixed(2)}%`)
    lines.push(`Funded ➡ Payout = ${(safeInputs.simFundedRate).toFixed(2)}%`)
    lines.push(`Avg. Payout = $${safeInputs.avgPayout.toFixed(2)}`)
    lines.push('')
    lines.push(`**Expected Margins** = ${(safeMargin.priceMargin * 100).toFixed(2)}%`)
    lines.push('')
    lines.push(`${target}% Margin Thresholds`)
    lines.push(`Price = ${evalPriceThreshold === null ? 'N/A' : `$${evalPriceThreshold.toFixed(2)}`}`)
    lines.push(`Purchase to Payout = ${ptrThreshold === null ? 'N/A' : (ptrThreshold * 100).toFixed(2)}%`)
    lines.push(`Avg. Payout = ${avgPayoutThreshold === null ? 'N/A' : `$${avgPayoutThreshold.toFixed(2)}`}`)
    navigator.clipboard.writeText(lines.join('\n'))
    setOverallCopied(true)
    window.setTimeout(() => setOverallCopied(false), 1200)
  }

  const handleSaveScenario = () => {
    if (!onSaveScenario) return
    const defaultName = `Scenario ${new Date().toLocaleTimeString()}`
    const name = window.prompt('Name this scenario', defaultName)
    if (!name) return
    onSaveScenario({
      name: name.trim(),
      margin: safeMargin.priceMargin,
      price: safeInputs.evalPrice,
      passRate: safeInputs.evalPassRate,
      payoutRate: safeInputs.simFundedRate,
      avgPayout: safeInputs.avgPayout
    })
  }
  
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyOverall}
              aria-label="Copy summary"
              className={`p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors ${overallCopied ? 'text-green-300' : 'text-white'}`}
              title="Copy"
            >
              {overallCopied ? <Check className="w-4 h-4 transition-transform" /> : <CopyIcon className="w-4 h-4" />}
            </button>
            {onSaveScenario && (
              <button
                onClick={handleSaveScenario}
                className="px-3 py-2 rounded-md bg-white/20 hover:bg-white/30 text-sm font-medium text-white"
              >
                Save
              </button>
            )}
            <div className="text-right">
              <span className="text-xs font-medium text-white/80">Net Revenue</span>
              <div className="text-lg font-bold">{formatCurrency(safeMargin.netRevenue)}</div>
            </div>
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
              <span className="text-xs">Payout Costs</span>
              <span className="font-medium text-red-500">{formatCurrency(payoutCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Company Costs</span>
              <span className="font-medium text-red-500">{formatCurrency(safeMargin.companyCostsTotal)}</span>
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
              <span className="text-xs text-text_secondary block">Avg. Payout</span>
              <span className="font-medium">{formatCurrency(safeInputs.avgPayout)}</span>
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
          <div className="flex justify-between">
            <span className="text-xs">Live Allocation</span>
            <span className="font-medium">{formatCurrency(safeMargin.liveAllocationCost)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-xs">Total Company Costs</span>
            <span className="font-medium">{formatCurrency(safeMargin.companyCostsTotal)}</span>
          </div>
        </div>
      </div>
      
      {/* Thresholds */}
      <ThresholdsPanel results={results} />
    </div>
  )
}

export default SimulationDashboard 

// Dynamic thresholds panel with user-controlled margin target
function ThresholdsPanel({ results }: { results: any }) {
  const { chartMarginTarget, setChartMarginTarget, runSimulation } = useSimulationContext()
  const [targetPercent, setTargetPercent] = useState<string>(String(chartMarginTarget))

  const target = useMemo(() => {
    const n = parseFloat(targetPercent)
    if (!Number.isFinite(n)) return 50
    return Math.min(100, Math.max(0.1, n))
  }, [targetPercent])

  const thresholds = useMemo(() => {
    const evalPrice = computeThreshold(
      results?.evaluationPriceData?.values || [],
      (results?.evaluationPriceData?.priceMargins || []).map((p: number) => p / 100),
      target / 100
    )
    const ptr = computeThreshold(
      results?.purchaseToPayoutRateData?.values || [],
      (results?.purchaseToPayoutRateData?.priceMargins || []).map((p: number) => p / 100),
      target / 100
    )
    // Ensure we use the latest recomputed series; fall back to interpolation on a widened window if needed
    let avgPayout = computeThreshold(
      results?.averagePayoutData?.values || [],
      (results?.averagePayoutData?.priceMargins || []).map((p: number) => p / 100),
      target / 100
    )
    if (avgPayout === null && Array.isArray(results?.averagePayoutData?.values) && results?.averagePayoutData?.values.length > 1) {
      // Fallback: approximate by smoothing margins and re-running threshold
      const vals = results.averagePayoutData.values
      const margins = (results.averagePayoutData.priceMargins as number[]).map(p => p / 100)
      const smoothed = smoothSeries(margins)
      avgPayout = computeThreshold(vals, smoothed, target / 100)
    }
    return { evalPrice, ptr, avgPayout }
  }, [results?.evaluationPriceData, results?.purchaseToPayoutRateData, results?.averagePayoutData, target])

  return (
    <div className="thresholds-card p-4 border border-border rounded-lg bg-background/60 mt-4">
      <div className="flex items-end justify-between mb-3 gap-3">
        <h2 className="text-sm font-medium text-text_secondary">{target}% Margin Thresholds</h2>
        <div>
          <label className="block text-xs font-medium text-text_secondary mb-1">Target Margin</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.1}
              max={100}
              step={0.1}
              value={targetPercent}
              onChange={(e) => {
                setTargetPercent(e.target.value)
                const n = parseFloat(e.target.value)
                if (Number.isFinite(n)) {
                  const clamped = Math.min(100, Math.max(0.1, n))
                  setChartMarginTarget(clamped)
                  // Recompute datasets centered around new target for accurate thresholds
                  runSimulation()
                }
              }}
              className="bg-card border border-border rounded w-28 sm:text-sm text-text_primary py-1.5 px-3"
            />
            <span className="text-xs text-text_secondary">%</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="threshold-item">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text_secondary block">Evaluation Price</span>
          </div>
          <span className="font-medium">{formatDisplay(thresholds.evalPrice, false)}</span>
        </div>
        <div className="threshold-item">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text_secondary block">Purchase to Payout Rate</span>
          </div>
          <span className="font-medium">{formatDisplay(thresholds.ptr, true)}</span>
        </div>
        <div className="threshold-item">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text_secondary block">Average Payout</span>
          </div>
          <span className="font-medium">{formatDisplay(thresholds.avgPayout, false)}</span>
        </div>
      </div>
      <div className="mt-3">
        <CopyAllButton onClick={() => copyAllThresholds(thresholds, target)} />
      </div>
    </div>
  )
}

function ThresholdItem({ label, value, isRate }: { label: string; value: number | null; isRate: boolean }) {
  const formatted = value === null ? 'N/A' : (isRate ? `${(value * 100).toFixed(2)}%` : `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
  return (
    <div className="threshold-item">
      <span className="text-xs text-text_secondary block">{label}</span>
      <span className="font-medium">{formatted}</span>
    </div>
  )
}

function formatDisplay(value: number | null, isRate: boolean) {
  return value === null ? 'N/A' : (isRate ? `${(value * 100).toFixed(2)}%` : `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
}

function copyThreshold(label: string, value: number | null, isRate: boolean, target: number) {
  const v = value === null ? 'N/A' : (isRate ? `${(value * 100).toFixed(2)}%` : `${value.toFixed(2)}`)
  const text = `${target}% Margin Threshold\n${label} = ${v}`
  navigator.clipboard.writeText(text)
}

function copyAllThresholds(t: { evalPrice: number | null; ptr: number | null; avgPayout: number | null }, target: number) {
  const lines: string[] = []
  lines.push(`${target}% Margin Thresholds`)
  lines.push(`Price = ${t.evalPrice === null ? 'N/A' : `$${t.evalPrice.toFixed(2)}`}`)
  lines.push(`Purchase to Payout = ${t.ptr === null ? 'N/A' : `${(t.ptr * 100).toFixed(2)}%`}`)
  lines.push(`Avg. Payout = ${t.avgPayout === null ? 'N/A' : `$${t.avgPayout.toFixed(2)}`}`)
  navigator.clipboard.writeText(lines.join('\n'))
}

function CopyAllButton({ onClick }: { onClick: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { onClick(); setCopied(true); window.setTimeout(() => setCopied(false), 1200) }}
      aria-label="Copy thresholds"
      className={`p-2 rounded-md border border-border transition-colors ${copied ? 'text-green-600 border-green-600' : 'text-text_secondary'}`}
      title="Copy thresholds"
    >
      {copied ? <Check className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
    </button>
  )
}

function computeThreshold(values: number[], margins: number[], target: number): number | null {
  if (!Array.isArray(values) || !Array.isArray(margins) || values.length !== margins.length || values.length === 0) return null
  // Prefer a segment where the curve crosses the target
  let bestIdx: number | null = null
  for (let i = 0; i < values.length - 1; i++) {
    const a = margins[i] - target
    const b = margins[i + 1] - target
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    if (a === 0) return values[i]
    if (a * b <= 0) { bestIdx = i; break }
  }
  if (bestIdx !== null) {
    const i = bestIdx
    const y1 = margins[i]
    const y2 = margins[i + 1]
    const x1 = values[i]
    const x2 = values[i + 1]
    if (y1 === y2) return x1
    return x1 + (x2 - x1) * (target - y1) / (y2 - y1)
  }
  // Fallback: pick the x at which margin is closest to target
  let minDiff = Infinity
  let xAtMin = null as number | null
  for (let i = 0; i < values.length; i++) {
    const d = Math.abs(margins[i] - target)
    if (d < minDiff) { minDiff = d; xAtMin = values[i] }
  }
  return xAtMin
}

function smoothSeries(arr: number[], window = 3): number[] {
  if (!Array.isArray(arr) || arr.length === 0) return []
  const w = Math.max(1, Math.min(window, 7))
  const out: number[] = []
  for (let i = 0; i < arr.length; i++) {
    let sum = 0, cnt = 0
    for (let k = -Math.floor(w/2); k <= Math.floor(w/2); k++) {
      const idx = i + k
      if (idx >= 0 && idx < arr.length) { sum += arr[idx]; cnt++ }
    }
    out.push(sum / cnt)
  }
  return out
}