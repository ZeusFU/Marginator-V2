import React, { useMemo, useState } from 'react'
import { Copy as CopyIcon, Check } from 'lucide-react'
import { useSimulationContext } from '../context/SimulationContext'
import { MarginCalculationResult, ExactThresholdItem } from '../utils/types'
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

export function SimulationDashboard({ onSaveScenario }: SimulationDashboardProps) {
  const { 
    results, 
    inputs, 
    isComparisonMode, 
    comparisonSimulations
  } = useSimulationContext()
  
  if (!results) {
    return (
      <div className="text-center py-8 text-text_secondary text-sm">
        No simulation results available. Please run a simulation first.
      </div>
    )
  }
  
  const baseMargins = results.baseMargins || {} as MarginCalculationResult
  
  const fmt = (v: number | undefined) => {
    if (v === undefined || isNaN(v)) return '$0.00'
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
  const pct = (v: number | undefined) => {
    if (v === undefined || isNaN(v)) return '0.0%'
    return `${(v * 100).toFixed(1)}%`
  }
  
  const m = {
    priceMargin: baseMargins?.priceMargin ?? 0,
    netRevenue: baseMargins?.netRevenue ?? 0,
    grossRevenue: baseMargins?.grossRevenue ?? 0,
    evalRevenueFromEvals: baseMargins?.evalRevenueFromEvals ?? 0,
    activationFeeRevenue: baseMargins?.activationFeeRevenue ?? 0,
    payoutCost: baseMargins?.payoutCost ?? 0,
    fixedCompanyCosts: baseMargins?.fixedCompanyCosts ?? 0,
    processorCost: baseMargins?.processorCost ?? 0,
    affiliateCost: baseMargins?.affiliateCost ?? 0,
    liveAllocationCost: baseMargins?.liveAllocationCost ?? 0,
    companyCostsTotal: baseMargins?.companyCostsTotal ?? 0,
    totalCost: baseMargins?.totalCost ?? 0,
  }

  const inp = {
    evalPrice: Number(inputs?.evalPrice || 0),
    simFundedRate: Number(inputs?.simFundedRate || 0),
    evalPassRate: Number(inputs?.evalPassRate || 0),
    avgPayout: Number(inputs?.avgPayout || 0),
  }
  const purchaseToPayoutRateDec = (inp.evalPassRate / 100) * (inp.simFundedRate / 100)

  // Copy summary
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    const lines = [
      `Price = $${inp.evalPrice.toFixed(2)}`,
      `Eval → Funded = ${inp.evalPassRate.toFixed(2)}%`,
      `Funded → Payout = ${inp.simFundedRate.toFixed(2)}%`,
      `Avg. Payout = $${inp.avgPayout.toFixed(2)}`,
      '',
      `Expected Margin = ${(m.priceMargin * 100).toFixed(2)}%`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const handleSave = () => {
    if (!onSaveScenario) return
    const name = window.prompt('Name this scenario', `Scenario ${new Date().toLocaleTimeString()}`)
    if (!name) return
    onSaveScenario({ name: name.trim(), margin: m.priceMargin, price: inp.evalPrice, passRate: inp.evalPassRate, payoutRate: inp.simFundedRate, avgPayout: inp.avgPayout })
  }

  // Margin color for the hero bar
  const barColor = m.priceMargin >= 0.5 ? 'bg-[#1E3A5F]' : m.priceMargin >= 0.3 ? 'bg-[#2A5080]' : 'bg-[#4A7EC7]'
  
  // ── Comparison mode ──
  if (isComparisonMode && comparisonSimulations.length > 0) {
    return (
      <div>
        <div className="mb-4">
          <ComparisonPlanCard id="current" name="Current Plan" priceMargin={m.priceMargin} baseMargins={baseMargins} thresholds={results.exactThresholds} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisonSimulations.map(sim => (
            <ComparisonPlanCard key={sim.id} id={sim.id} name={sim.name} priceMargin={sim.baseMargins?.priceMargin || 0} baseMargins={sim.baseMargins || {}} thresholds={sim.exactThresholds} />
          ))}
        </div>
      </div>
    )
  }
  
  // ── Single plan view — compact & minimal ──
  return (
    <div className="space-y-4">
      {/* Hero margin bar */}
      <div className={`${barColor} text-white rounded-xl px-5 py-4 flex items-center justify-between`}>
        <div>
          <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Margin</span>
          <div className="text-3xl font-bold leading-tight">{pct(m.priceMargin)}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className={`p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors ${copied ? 'text-green-300' : 'text-white'}`}
            title="Copy summary"
          >
            {copied ? <Check className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </button>
          {onSaveScenario && (
            <button onClick={handleSave} className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-sm font-medium text-white transition-colors">
              Save
            </button>
          )}
          <div className="text-right pl-4 border-l border-white/20">
            <span className="text-[10px] uppercase tracking-wide text-white/60">Net / Acct</span>
            <div className="text-lg font-semibold">{fmt(m.netRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Two-column metrics row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue & Costs */}
        <div className="space-y-2 text-sm">
          <Row label="Gross Revenue" value={fmt(m.grossRevenue)} />
          <SubRow label="Eval Revenue" value={fmt(m.evalRevenueFromEvals)} />
          {m.activationFeeRevenue > 0 && <SubRow label="Activation Fee" value={fmt(m.activationFeeRevenue)} />}
          <Divider />
          <Row label="Payout Cost" value={fmt(m.payoutCost)} negative />
          <Row label="Company Costs" value={fmt(m.companyCostsTotal)} negative />
          <SubRow label="Fixed Per-Acct" value={fmt(m.fixedCompanyCosts)} />
          <SubRow label="Processor" value={fmt(m.processorCost)} />
          <SubRow label="Affiliate" value={fmt(m.affiliateCost)} />
          <SubRow label="Live Alloc." value={fmt(m.liveAllocationCost)} />
          <Divider />
          <Row label="Net Revenue" value={fmt(m.netRevenue)} positive />
        </div>

        {/* Key Inputs */}
        <div className="space-y-2 text-sm">
          <Param label="Price" value={fmt(inp.evalPrice)} />
          <Param label="Eval → Funded" value={pct(inp.evalPassRate / 100)} />
          <Param label="Funded → Payout" value={pct(inp.simFundedRate / 100)} />
          <Param label="Purchase → Payout" value={pct(purchaseToPayoutRateDec)} />
          <Param label="Avg. Payout" value={fmt(inp.avgPayout)} />
        </div>
      </div>

      {/* Thresholds */}
      <ThresholdsPanel results={results} />
    </div>
  )
}

export default SimulationDashboard

/* ── Tiny helper components ── */

function Row({ label, value, negative, positive }: { label: string; value: string; negative?: boolean; positive?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-text_secondary text-xs">{label}</span>
      <span className={`font-medium tabular-nums ${negative ? 'text-red-400' : positive ? 'text-green-500' : ''}`}>{value}</span>
    </div>
  )
}
function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between pl-3 text-xs text-text_secondary/80">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
function Param({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text_secondary text-xs">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
function Divider() {
  return <div className="border-t border-border/40 my-1" />
}

/* ── Thresholds Panel ── */

function ThresholdsPanel({ results }: { results: any }) {
  const { chartMarginTarget, setChartMarginTarget, runSimulation } = useSimulationContext()
  const [targetStr, setTargetStr] = useState<string>(String(chartMarginTarget))

  const target = useMemo(() => {
    const n = parseFloat(targetStr)
    if (!Number.isFinite(n)) return 50
    return Math.min(100, Math.max(0.1, n))
  }, [targetStr])

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
    let avgPayout = computeThreshold(
      results?.averagePayoutData?.values || [],
      (results?.averagePayoutData?.priceMargins || []).map((p: number) => p / 100),
      target / 100
    )
    if (avgPayout === null && Array.isArray(results?.averagePayoutData?.values) && results?.averagePayoutData?.values.length > 1) {
      const vals = results.averagePayoutData.values
      const margins = (results.averagePayoutData.priceMargins as number[]).map((p: number) => p / 100)
      avgPayout = computeThreshold(vals, smooth(margins), target / 100)
    }
    return { evalPrice, ptr, avgPayout }
  }, [results?.evaluationPriceData, results?.purchaseToPayoutRateData, results?.averagePayoutData, target])

  const [copiedAll, setCopiedAll] = useState(false)
  const copyAll = () => {
    const lines = [
      `${target}% Margin Thresholds`,
      `Price = ${thresholds.evalPrice === null ? 'N/A' : `$${thresholds.evalPrice.toFixed(2)}`}`,
      `Purchase to Payout = ${thresholds.ptr === null ? 'N/A' : `${(thresholds.ptr * 100).toFixed(2)}%`}`,
      `Avg. Payout = ${thresholds.avgPayout === null ? 'N/A' : `$${thresholds.avgPayout.toFixed(2)}`}`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1200)
  }

  const display = (v: number | null, isRate: boolean) =>
    v === null ? 'N/A' : isRate ? `${(v * 100).toFixed(2)}%` : `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text_secondary">{target}% Margin Thresholds</span>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0.1} max={100} step={0.1}
            value={targetStr}
            onChange={(e) => {
              setTargetStr(e.target.value)
              const n = parseFloat(e.target.value)
              if (Number.isFinite(n)) {
                setChartMarginTarget(Math.min(100, Math.max(0.1, n)))
                runSimulation()
              }
            }}
            className="w-20 bg-card border border-border rounded text-xs text-text_primary py-1 px-2 tabular-nums"
          />
          <span className="text-[10px] text-text_secondary">%</span>
          <button
            onClick={copyAll}
            className={`p-1.5 rounded border border-border transition-colors ${copiedAll ? 'text-green-600 border-green-600' : 'text-text_secondary'}`}
            title="Copy thresholds"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ThresholdCell label="Eval Price" value={display(thresholds.evalPrice, false)} />
        <ThresholdCell label="Purchase to Payout" value={display(thresholds.ptr, true)} />
        <ThresholdCell label="Avg Payout" value={display(thresholds.avgPayout, false)} />
      </div>
    </div>
  )
}

function ThresholdCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] text-text_secondary">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

/* ── Utilities ── */

function computeThreshold(values: number[], margins: number[], target: number): number | null {
  if (!Array.isArray(values) || !Array.isArray(margins) || values.length !== margins.length || values.length === 0) return null
  for (let i = 0; i < values.length - 1; i++) {
    const a = margins[i] - target
    const b = margins[i + 1] - target
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    if (a === 0) return values[i]
    if (a * b <= 0) {
      const y1 = margins[i], y2 = margins[i + 1], x1 = values[i], x2 = values[i + 1]
      return y1 === y2 ? x1 : x1 + (x2 - x1) * (target - y1) / (y2 - y1)
    }
  }
  let minD = Infinity, best: number | null = null
  for (let i = 0; i < values.length; i++) {
    const d = Math.abs(margins[i] - target)
    if (d < minD) { minD = d; best = values[i] }
  }
  return best
}

function smooth(arr: number[], w = 3): number[] {
  if (!arr.length) return []
  const hw = Math.floor(Math.min(w, 7) / 2)
  return arr.map((_, i) => {
    let sum = 0, cnt = 0
    for (let k = -hw; k <= hw; k++) {
      const idx = i + k
      if (idx >= 0 && idx < arr.length) { sum += arr[idx]; cnt++ }
    }
    return sum / cnt
  })
}
