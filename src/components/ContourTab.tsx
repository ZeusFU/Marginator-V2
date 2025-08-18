import React, { useMemo, useState } from 'react'
import { useSimulationContext } from '../context/SimulationContext'
import { ContourEngine } from '../engines/ContourEngine'
import { Line } from 'react-chartjs-2'
import { calculateMargins } from '../utils/calculations'

type VarKey = 'evalPrice' | 'purchaseToPayoutRate' | 'avgPayout'

const VAR_LABEL: Record<VarKey, string> = {
  evalPrice: 'Evaluation Price ($)',
  purchaseToPayoutRate: 'Purchase to Payout Rate (%)',
  avgPayout: 'Average Payout ($)'
}

export function ContourTab() {
  const { inputs, results } = useSimulationContext()
  const [xVar, setXVar] = useState<VarKey>('purchaseToPayoutRate')
  const [yVar, setYVar] = useState<VarKey>('avgPayout')
  const [targets, setTargets] = useState<number[]>([0.3, 0.5, 0.8])
  const [customTargetPct, setCustomTargetPct] = useState<string>('')

  const parsed = useMemo(() => {
    const toNum = (v: any, def: number) => {
      if (v === '' || v === undefined || v === null) return def
      const n = Number(v)
      return isNaN(n) ? def : n
    }

    const evalPrice = toNum(inputs.evalPrice, 1)
    const evalPassRate = toNum(inputs.evalPassRate, 0) / 100
    const simFundedRate = toNum(inputs.simFundedRate, 0) / 100
    const avgPayout = toNum(inputs.avgPayout, 1)
    const useActivationFee = !!inputs.useActivationFee
    const activationFee = toNum(inputs.activationFee, 0)
    const avgLiveSaved = toNum(inputs.avgLiveSaved, 0)
    const avgLivePayout = toNum(inputs.avgLivePayout, 0)
    const includeLive = !!inputs.includeLive

    const userFeePerAccount = inputs.userFeePerAccount === '' ? 5.83 : toNum(inputs.userFeePerAccount, 5.83)
    const dataFeePerAccount = inputs.dataFeePerAccount === '' ? 1.467 : toNum(inputs.dataFeePerAccount, 1.467)
    const accountFeePerAccount = inputs.accountFeePerAccount === '' ? 3.5 : toNum(inputs.accountFeePerAccount, 3.5)
    const staffingCostPerAccount = inputs.staffingCostPerAccount === '' ? 3 : toNum(inputs.staffingCostPerAccount, 3)
    const processorFeePercent = inputs.processorFeePercent === '' ? 5.5 : toNum(inputs.processorFeePercent, 5.5)
    const affiliateFeePercent = inputs.affiliateFeePercent === '' ? 9.8 : toNum(inputs.affiliateFeePercent, 9.8)
    const affiliateAppliesToActivation = !!inputs.affiliateAppliesToActivation

    return {
      evalPrice,
      evalPassRate,
      simFundedRate,
      avgPayout,
      useActivationFee,
      activationFee,
      avgLiveSaved,
      avgLivePayout,
      includeLive,
      userFeePerAccount,
      dataFeePerAccount,
      accountFeePerAccount,
      staffingCostPerAccount,
      processorFeePercent,
      affiliateFeePercent,
      affiliateAppliesToActivation
    }
  }, [inputs])

  const datasets = useMemo(() => {
    if (!results) return []

    const engine = new ContourEngine<Record<VarKey, number>>()
      .setFunction((vars) => {
        // Build purchaseToPayoutRate when not directly present
        const purchaseToPayoutRate = vars.purchaseToPayoutRate
        const margin = calculateMargins(
          vars.evalPrice,
          purchaseToPayoutRate,
          vars.avgPayout,
          parsed.useActivationFee,
          parsed.activationFee,
          parsed.evalPassRate,
          parsed.avgLiveSaved,
          parsed.avgLivePayout,
          parsed.includeLive,
          parsed.userFeePerAccount,
          parsed.dataFeePerAccount,
          parsed.accountFeePerAccount,
          parsed.staffingCostPerAccount,
          parsed.processorFeePercent,
          parsed.affiliateFeePercent,
          parsed.affiliateAppliesToActivation
        )
        return margin.priceMargin
      })
      .setPrecision(0.0005)
      .setVariableRanges({
        evalPrice: { min: Math.max(parsed.evalPrice * 0.1, 1), max: parsed.evalPrice * 3, steps: 50 },
        purchaseToPayoutRate: { min: 0.001, max: 1.0, steps: 50 },
        avgPayout: { min: Math.max(parsed.avgPayout * 0.1, 1), max: parsed.avgPayout * 3, steps: 50 }
      })

    const fixedParams: Partial<Record<VarKey, number>> = {
      evalPrice: parsed.evalPrice,
      purchaseToPayoutRate: parsed.evalPassRate * parsed.simFundedRate,
      avgPayout: parsed.avgPayout
    }

    const targetList = [
      ...targets,
      ...(customTargetPct !== '' ? [Math.max(0, Math.min(0.99, Number(customTargetPct) / 100))] : [])
    ]

    const colors = ['#3A82F7', '#FF5724', '#00C49F', '#FFBB28']
    return targetList.map((t, idx) => {
      const points = engine.setContourValue(t).calculate2DContour(xVar, yVar, fixedParams)
      return {
        label: `${Math.round(t * 100)}% margin`,
        data: points.map(p => ({ x: xVar === 'purchaseToPayoutRate' ? p.x * 100 : p.x, y: yVar === 'purchaseToPayoutRate' ? p.y * 100 : p.y })),
        borderColor: colors[idx % colors.length],
        backgroundColor: `${colors[idx % colors.length]}33`,
        pointRadius: 0,
        tension: 0.1,
        showLine: true,
        fill: false
      }
    })
  }, [results, parsed, xVar, yVar, targets, customTargetPct])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { color: '#EBF3FE' } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const x = ctx.parsed.x
            const y = ctx.parsed.y
            const xf = xVar === 'purchaseToPayoutRate' ? `${x.toFixed(2)}%` : `$${x.toFixed(2)}`
            const yf = yVar === 'purchaseToPayoutRate' ? `${y.toFixed(2)}%` : `$${y.toFixed(2)}`
            return `${ctx.dataset.label}: (${xf}, ${yf})`
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: VAR_LABEL[xVar], color: '#EBF3FE' },
        ticks: { color: '#EBF3FE', callback: (v: any) => xVar === 'purchaseToPayoutRate' ? `${v}%` : `$${v}` }
      },
      y: {
        title: { display: true, text: VAR_LABEL[yVar], color: '#EBF3FE' },
        ticks: { color: '#EBF3FE', callback: (v: any) => yVar === 'purchaseToPayoutRate' ? `${v}%` : `$${v}` }
      }
    }
  }), [xVar, yVar])

  const otherOptions: VarKey[] = ['evalPrice', 'purchaseToPayoutRate', 'avgPayout']

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs text-text_secondary mb-1">X Variable</label>
          <select value={xVar} onChange={e => setXVar(e.target.value as VarKey)} className="w-full bg-card border border-border rounded px-2 py-1 text-sm">
            {otherOptions.map(k => (<option key={k} value={k}>{VAR_LABEL[k]}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text_secondary mb-1">Y Variable</label>
          <select value={yVar} onChange={e => setYVar(e.target.value as VarKey)} className="w-full bg-card border border-border rounded px-2 py-1 text-sm">
            {otherOptions.filter(k => k !== xVar).map(k => (<option key={k} value={k}>{VAR_LABEL[k]}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text_secondary mb-1">Custom Target (%)</label>
          <input type="number" min={0} max={99} step={0.1} value={customTargetPct} onChange={e => setCustomTargetPct(e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1 text-sm" placeholder="Optional"/>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        {[30,50,80].map(p => (
          <label key={p} className="inline-flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" checked={targets.includes(p/100)} onChange={(e) => {
              const val = p/100
              setTargets(prev => e.target.checked ? [...prev, val] : prev.filter(t => t !== val))
            }} />
            <span>{p}%</span>
          </label>
        ))}
      </div>

      {!results ? (
        <div className="text-sm text-text_secondary">Run a simulation first, then configure variables and margin targets to view contour lines.</div>
      ) : (
        <div className="h-96">
          <Line data={{ datasets }} options={options as any} />
        </div>
      )}
    </div>
  )
}

export default ContourTab


