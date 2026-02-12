import React, { useState, useMemo } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { calculateMargins } from '../utils/calculations'
import { Copy, Check } from 'lucide-react'

function getVariableOptions(useActivation: boolean) {
  const base = [
    { value: 'evalPrice', label: 'Eval Price' },
    { value: 'purchaseToPayoutRate', label: 'Funded to Payout Rate' },
    { value: 'avgPayout', label: 'Avg Payout' }
  ]
  if (useActivation) base.push({ value: 'activationFee', label: 'Activation Fee' } as any)
  return base
}

interface Combination {
  x: number
  y: number
  margin: number
}

function ContourTab() {
  const { inputs } = useSimulation()
  const variableOptions = useMemo(() => getVariableOptions(!!inputs.useActivationFee), [inputs.useActivationFee])
  const [xVariable, setXVariable] = useState('evalPrice')
  const [yVariable, setYVariable] = useState('avgPayout')
  const [targetMargin, setTargetMargin] = useState('50')
  const [copied, setCopied] = useState(false)

  const parsedInputs = useMemo(() => {
    const toNum = (value: string | number, defaultVal: number) => {
      if (typeof value === 'number') return value
      const parsed = parseFloat(value)
      return isNaN(parsed) ? defaultVal : parsed
    }

    return {
      evalPrice: toNum(inputs.evalPrice, 100),
      purchaseToPayoutRate: (toNum(inputs.evalPassRate, 10) / 100) * (toNum((inputs as any).simFundedRate ?? '50', 50) / 100),
      avgPayout: toNum(inputs.avgPayout, 5000),
      useActivationFee: !!inputs.useActivationFee,
      activationFee: toNum(inputs.activationFee, 200),
      evalPassRate: toNum(inputs.evalPassRate, 10) / 100,
      simFundedRate: toNum((inputs as any).simFundedRate ?? '50', 50) / 100,
      userFeePerAccount: toNum(inputs.userFeePerAccount, 5.83),
      dataFeePerAccount: toNum(inputs.dataFeePerAccount, 2.073),
      accountFeePerAccount: toNum(inputs.accountFeePerAccount, 3.5),
      staffingFeePercent: toNum(inputs.staffingFeePercent, 3.5),
      processorFeePercent: toNum(inputs.processorFeePercent, 5.25),
      affiliateFeePercent: toNum(inputs.affiliateFeePercent, 3),
      liveAllocationPercent: toNum(inputs.liveAllocationPercent, 2),
      affiliateAppliesToActivation: !!inputs.affiliateAppliesToActivation
    }
  }, [inputs])

  const targetMarginValue = useMemo(() => {
    const v = parseFloat(targetMargin)
    if (isNaN(v) || v <= 0) return 50
    return Math.min(100, v)
  }, [targetMargin])

  const getVariableRange = (varName: string) => {
    switch (varName) {
      case 'evalPrice': return { min: 50, max: 500, steps: 60 }
      case 'purchaseToPayoutRate': return { min: 0, max: 10, steps: 60 }
      case 'avgPayout': return { min: 1000, max: 15000, steps: 60 }
      case 'activationFee': return { min: 0, max: 500, steps: 60 }
      default: return { min: 0, max: 100, steps: 40 }
    }
  }

  const xLabel = variableOptions.find(v => v.value === xVariable)?.label || xVariable
  const yLabel = variableOptions.find(v => v.value === yVariable)?.label || yVariable

  // Compute top 20 combinations closest to target margin
  const combinations = useMemo<Combination[]>(() => {
    if (!xVariable || !yVariable || xVariable === yVariable) return []

    const xRange = getVariableRange(xVariable)
    const yRange = getVariableRange(yVariable)
    const target = targetMarginValue

    const evalMarginPercent = (xValue: number, yValue: number): number => {
      const calcParams: any = { ...parsedInputs }
      const xInternal = xVariable === 'purchaseToPayoutRate' ? xValue / 100 : xValue
      const yInternal = yVariable === 'purchaseToPayoutRate' ? yValue / 100 : yValue
      calcParams[xVariable as keyof typeof calcParams] = xInternal
      calcParams[yVariable as keyof typeof calcParams] = yInternal
      if (xVariable !== 'purchaseToPayoutRate' && yVariable !== 'purchaseToPayoutRate') {
        calcParams.purchaseToPayoutRate = parsedInputs.evalPassRate * parsedInputs.simFundedRate
      }
      const result = calculateMargins(
        calcParams.evalPrice,
        calcParams.purchaseToPayoutRate,
        calcParams.avgPayout,
        calcParams.useActivationFee,
        calcParams.activationFee,
        calcParams.evalPassRate,
        calcParams.userFeePerAccount,
        calcParams.dataFeePerAccount,
        calcParams.accountFeePerAccount,
        calcParams.staffingFeePercent,
        calcParams.processorFeePercent,
        calcParams.affiliateFeePercent,
        calcParams.liveAllocationPercent,
        calcParams.affiliateAppliesToActivation
      )
      return result.priceMargin * 100
    }

    // For each X step, use binary search to find the Y that gives the target margin
    const solved: Combination[] = []

    for (let i = 0; i <= 40; i++) {
      const xVal = xRange.min + (xRange.max - xRange.min) * (i / 40)
      try {
        const fMin = evalMarginPercent(xVal, yRange.min) - target
        const fMax = evalMarginPercent(xVal, yRange.max) - target

        if (Number.isFinite(fMin) && Number.isFinite(fMax) && fMin * fMax <= 0) {
          let lo = yRange.min, hi = yRange.max
          for (let iter = 0; iter < 40; iter++) {
            const mid = lo + (hi - lo) / 2
            const fMid = evalMarginPercent(xVal, mid) - target
            if (!Number.isFinite(fMid)) break
            if (Math.abs(fMid) <= 0.01) {
              solved.push({ x: xVal, y: mid, margin: fMid + target })
              break
            }
            if (fMin < 0) {
              if (fMid < 0) lo = mid; else hi = mid
            } else {
              if (fMid > 0) lo = mid; else hi = mid
            }
          }
          // If didn't converge tightly, add best midpoint
          if (solved.length === 0 || solved[solved.length - 1].x !== xVal) {
            const mid = lo + (hi - lo) / 2
            const margin = evalMarginPercent(xVal, mid)
            if (Number.isFinite(margin) && Math.abs(margin - target) <= 2) {
              solved.push({ x: xVal, y: mid, margin })
            }
          }
        }
      } catch {}
    }

    // If iso-solve found enough, pick 20 evenly spaced
    if (solved.length >= 20) {
      const step = (solved.length - 1) / 19
      return Array.from({ length: 20 }, (_, i) => solved[Math.round(i * step)])
    }

    // Fallback: grid search, take closest 20
    if (solved.length < 20) {
      const all: Combination[] = [...solved]
      const stepsX = 50, stepsY = 50
      for (let i = 0; i <= stepsX; i++) {
        for (let j = 0; j <= stepsY; j++) {
          const xVal = xRange.min + (xRange.max - xRange.min) * (i / stepsX)
          const yVal = yRange.min + (yRange.max - yRange.min) * (j / stepsY)
          try {
            const margin = evalMarginPercent(xVal, yVal)
            if (Number.isFinite(margin)) {
              all.push({ x: xVal, y: yVal, margin })
            }
          } catch {}
        }
      }
      all.sort((a, b) => Math.abs(a.margin - target) - Math.abs(b.margin - target))
      // Deduplicate close entries
      const unique: Combination[] = []
      for (const c of all) {
        if (unique.length >= 20) break
        const tooClose = unique.some(u => Math.abs(u.x - c.x) < (xRange.max - xRange.min) * 0.02 && Math.abs(u.y - c.y) < (yRange.max - yRange.min) * 0.02)
        if (!tooClose) unique.push(c)
      }
      unique.sort((a, b) => a.x - b.x)
      return unique
    }

    solved.sort((a, b) => a.x - b.x)
    return solved
  }, [xVariable, yVariable, targetMarginValue, parsedInputs])

  const formatVal = (varName: string, v: number) => {
    if (varName === 'purchaseToPayoutRate') return `${v.toFixed(2)}%`
    if (varName === 'evalPrice' || varName === 'activationFee') return `$${v.toFixed(0)}`
    if (varName === 'avgPayout') return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    return v.toFixed(2)
  }

  const handleCopy = () => {
    const lines: string[] = []
    lines.push(`Target: ${targetMarginValue}% Margin`)
    lines.push(`${xLabel}\t${yLabel}\tMargin`)
    for (const c of combinations) {
      lines.push(`${formatVal(xVariable, c.x)}\t${formatVal(yVariable, c.y)}\t${c.margin.toFixed(2)}%`)
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const sameVariable = xVariable === yVariable

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text_primary">Contour Analysis</h2>
        <p className="text-sm text-text_secondary mt-1">
          Find combinations of two variables that achieve your target margin.
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-text_secondary mb-1.5">X Variable</label>
          <select
            value={xVariable}
            onChange={(e) => setXVariable(e.target.value)}
            className="w-full bg-card border border-border rounded-lg text-sm text-text_primary py-2 px-3 transition-colors"
          >
            {variableOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text_secondary mb-1.5">Y Variable</label>
          <select
            value={yVariable}
            onChange={(e) => setYVariable(e.target.value)}
            className="w-full bg-card border border-border rounded-lg text-sm text-text_primary py-2 px-3 transition-colors"
          >
            {variableOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text_secondary mb-1.5">Target Margin</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={targetMargin}
              onChange={(e) => setTargetMargin(e.target.value)}
              placeholder="e.g. 50"
              className="bg-card border border-border rounded-lg w-full text-sm text-text_primary py-2 px-3 transition-colors"
              min="1"
              max="100"
              step="0.1"
            />
            <span className="text-sm text-text_secondary font-medium">%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      {sameVariable ? (
        <div className="flex items-center justify-center h-48 text-text_secondary text-sm bg-surface rounded-xl border border-border">
          Please select different variables for X and Y
        </div>
      ) : combinations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-text_secondary text-sm bg-surface rounded-xl border border-border gap-2">
          <p>No combinations found for {targetMarginValue}% margin.</p>
          <p className="text-xs text-muted">Try adjusting the target or selecting different variables.</p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-text_secondary">
              {combinations.length} combination{combinations.length !== 1 ? 's' : ''} near {targetMarginValue}% margin
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text_secondary hover:text-text_primary hover:bg-surface transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy All'}
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text_secondary w-12">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text_secondary">{xLabel}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text_secondary">{yLabel}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-text_secondary">Margin</th>
                </tr>
              </thead>
              <tbody>
                {combinations.map((c, i) => {
                  const diff = Math.abs(c.margin - targetMarginValue)
                  const isExact = diff < 0.5
                  return (
                    <tr
                      key={i}
                      className={`border-t border-border/60 transition-colors hover:bg-surface/50 ${i % 2 === 0 ? 'bg-card' : 'bg-card/80'}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-muted tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-text_primary tabular-nums">{formatVal(xVariable, c.x)}</td>
                      <td className="px-4 py-2.5 font-medium text-text_primary tabular-nums">{formatVal(yVariable, c.y)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${isExact ? 'text-primary' : 'text-text_secondary'}`}>
                        {c.margin.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default ContourTab
