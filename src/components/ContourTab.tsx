import React, { useMemo, useState } from 'react'
import { useSimulationContext } from '../context/SimulationContext'
import { ContourEngine } from '../engines/ContourEngine'

export function ContourTab() {
  const { inputs, results } = useSimulationContext()
  const [targetMargin, setTargetMargin] = useState<number>(0.5)

  const contourPoints = useMemo(() => {
    if (!results) return []

    // Build an engine that returns margin value given variables
    const engine = new ContourEngine<{ purchaseToPayoutRate: number, avgPayout: number, evalPrice: number }>()
      .setFunction(({ purchaseToPayoutRate, avgPayout, evalPrice }) => {
        const revenue = evalPrice
        const cost = purchaseToPayoutRate * avgPayout
        return revenue > 0 ? (revenue - cost) / revenue : 0
      })
      .setContourValue(targetMargin)
      .setPrecision(0.0005)
      .setVariableRanges({
        purchaseToPayoutRate: { min: 0.001, max: 1.0, steps: 50 },
        avgPayout: { min: Math.max(Number(inputs.avgPayout || 0) * 0.1, 1), max: Number(inputs.avgPayout || 1) * 3, steps: 50 },
        evalPrice: { min: Math.max(Number(inputs.evalPrice || 0) * 0.1, 1), max: Number(inputs.evalPrice || 1) * 3, steps: 50 }
      })

    // Calculate contour across PTR vs Avg Payout holding evalPrice fixed at current
    const evalPriceNum = Number(inputs.evalPrice || 0) || 1
    return engine.calculate2DContour('purchaseToPayoutRate', 'avgPayout', { evalPrice: evalPriceNum })
  }, [inputs.evalPrice, inputs.avgPayout, results, targetMargin])

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="targetMargin" className="text-sm text-text_secondary">Target Margin</label>
        <input
          id="targetMargin"
          type="number"
          min={0}
          max={0.99}
          step={0.01}
          value={targetMargin}
          onChange={(e) => setTargetMargin(parseFloat(e.target.value))}
          className="w-28 bg-card border border-border rounded px-2 py-1 text-sm"
        />
      </div>

      {contourPoints.length === 0 ? (
        <div className="text-sm text-text_secondary">Run a simulation first, then set a margin target to view contour points.</div>
      ) : (
        <div className="text-sm">
          <div className="mb-2 text-text_secondary">PTR vs Avg Payout combinations at target margin:</div>
          <div className="max-h-64 overflow-auto border border-border rounded">
            <table className="w-full text-xs">
              <thead className="bg-surface sticky top-0">
                <tr>
                  <th className="text-left p-2">PTR</th>
                  <th className="text-left p-2">Avg Payout ($)</th>
                </tr>
              </thead>
              <tbody>
                {contourPoints.map((p, idx) => (
                  <tr key={idx} className="odd:bg-background even:bg-surface">
                    <td className="p-2">{(p.x * 100).toFixed(2)}%</td>
                    <td className="p-2">{p.y.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContourTab


