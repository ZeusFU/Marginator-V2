import React, { useState, useMemo } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { calculateMargins } from '../utils/calculations'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import { exportContourAsCSV, exportContourAsJSON, ContourExportPoint } from '../utils/export'
import AssistantDrawer from './AssistantDrawer'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function getVariableOptions(useActivation: boolean) {
  const base = [
    { value: 'evalPrice', label: 'Eval Price' },
    { value: 'purchaseToPayoutRate', label: 'Funded to Payout Rate' },
    { value: 'avgPayout', label: 'Avg Payout' }
  ]
  if (useActivation) base.push({ value: 'activationFee', label: 'Activation Fee' } as any)
  return base
}

// Single target margin input (percent)

function ContourTab() {
  const { inputs } = useSimulation()
  const variableOptions = useMemo(() => getVariableOptions(!!inputs.useActivationFee), [inputs.useActivationFee])
  const [xVariable, setXVariable] = useState('evalPrice')
  const [yVariable, setYVariable] = useState('avgPayout')
  const [targetMargin, setTargetMargin] = useState('50')

  // Parse inputs with defaults
  const parsedInputs = useMemo(() => {
    const toNum = (value: string | number, defaultVal: number) => {
      if (typeof value === 'number') return value
      const parsed = parseFloat(value)
      return isNaN(parsed) ? defaultVal : parsed
    }

    return {
      evalPrice: toNum(inputs.evalPrice, 100),
      purchaseToPayoutRate: toNum(inputs.purchaseToPayoutRate, 0.8),
      avgPayout: toNum(inputs.avgPayout, 5000),
      useActivationFee: !!inputs.useActivationFee,
      activationFee: toNum(inputs.activationFee, 200),
      // evalPassRate is entered as %, convert to decimal
      evalPassRate: toNum(inputs.evalPassRate, 10) / 100,
      simFundedRate: toNum((inputs as any).simFundedRate ?? '50', 50) / 100,
      // For contour analysis we focus on pre-live only
      avgLiveSaved: 0,
      avgLivePayout: 0,
      includeLive: false,
      userFeePerAccount: toNum(inputs.userFeePerAccount, 5.83),
      dataFeePerAccount: toNum(inputs.dataFeePerAccount, 1.467),
      accountFeePerAccount: toNum(inputs.accountFeePerAccount, 3.5),
      staffingFeePercent: toNum(inputs.staffingFeePercent, 5),
      processorFeePercent: toNum(inputs.processorFeePercent, 5.5),
      affiliateFeePercent: toNum(inputs.affiliateFeePercent, 9.8),
      affiliateAppliesToActivation: !!inputs.affiliateAppliesToActivation
    }
  }, [inputs])

  const targetMarginValue = useMemo(() => {
    const v = parseFloat(targetMargin)
    if (isNaN(v) || v <= 0) return 50
    return Math.min(100, v)
  }, [targetMargin])

  // Utility to get variable range for axis scaling and sampling
  const getVariableRange = (varName: string) => {
    switch (varName) {
      case 'evalPrice': return { min: 50, max: 500, steps: 40 }
      case 'purchaseToPayoutRate': return { min: 0, max: 10, steps: 40 } // percent UI (0% - 10%)
      case 'avgPayout': return { min: 1000, max: 15000, steps: 40 }
      case 'activationFee': return { min: 0, max: 500, steps: 40 }
      default: return { min: 0, max: 100, steps: 25 }
    }
  }

  const [xMin, setXMin] = useState(getVariableRange('evalPrice').min)
  const [xMax, setXMax] = useState(getVariableRange('evalPrice').max)
  const [yMin, setYMin] = useState(getVariableRange('avgPayout').min)
  const [yMax, setYMax] = useState(getVariableRange('avgPayout').max)

  const xRange = useMemo(() => {
    const { steps } = getVariableRange(xVariable)
    return { min: xMin, max: xMax, steps }
  }, [xVariable, xMin, xMax])
  const yRange = useMemo(() => {
    const { steps } = getVariableRange(yVariable)
    return { min: yMin, max: yMax, steps }
  }, [yVariable, yMin, yMax])

  // Reset ranges when variable changes
  const resetAxisIfChanged = (axis: 'x' | 'y', variable: string) => {
    const d = getVariableRange(variable)
    if (axis === 'x') { setXMin(d.min); setXMax(d.max) }
    else { setYMin(d.min); setYMax(d.max) }
  }

  // Generate contour data using iso-solver per X and grid fallback
  const contourData = useMemo(() => {
    if (!xVariable || !yVariable || xVariable === yVariable) {
      return { datasets: [] }
    }

    const datasets: any[] = []
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0ea5e9', '#ef4444']

    ;[targetMarginValue].forEach((target, index) => {
      const points: { x: number; y: number }[] = []

      // Helper to evaluate margin percent given x,y
      const evalMarginPercent = (xValue: number, yValue: number) => {
        const calcParams: any = { ...parsedInputs }
        const xInternal = xVariable === 'purchaseToPayoutRate' ? xValue / 100 : xValue
        const yInternal = yVariable === 'purchaseToPayoutRate' ? yValue / 100 : yValue
        calcParams[xVariable as keyof typeof calcParams] = xInternal
        calcParams[yVariable as keyof typeof calcParams] = yInternal
        // If PTR is not on axes, derive it from evalPassRate × simFundedRate
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
          0,
          0,
          false,
          calcParams.userFeePerAccount,
          calcParams.dataFeePerAccount,
          calcParams.accountFeePerAccount,
          calcParams.staffingFeePercent,
          calcParams.processorFeePercent,
          calcParams.affiliateFeePercent,
          calcParams.affiliateAppliesToActivation
        )
        return result.priceMargin * 100
      }

      const sampleGrid = (stepsX: number, stepsY: number, tolerance: number) => {
        for (let i = 0; i <= stepsX; i++) {
          for (let j = 0; j <= stepsY; j++) {
            const xValue = xRange.min + (xRange.max - xRange.min) * (i / stepsX)
            const yValue = yRange.min + (yRange.max - yRange.min) * (j / stepsY)
            try {
              const margin = evalMarginPercent(xValue, yValue)
              if (Number.isFinite(margin) && Math.abs(margin - target) <= tolerance) points.push({ x: xValue, y: yValue })
            } catch {}
          }
        }
      }

      // Iso-contour solve: for each X, find Y that hits target using binary search if bracketed
      for (let i = 0; i <= xRange.steps; i++) {
        const xVal = xRange.min + (xRange.max - xRange.min) * (i / xRange.steps)
        try {
          const fMin = evalMarginPercent(xVal, yRange.min) - target
          const fMax = evalMarginPercent(xVal, yRange.max) - target
          if (Number.isFinite(fMin) && Number.isFinite(fMax) && fMin * fMax <= 0) {
            // Bracketed - binary search
            let lo = yRange.min, hi = yRange.max
            for (let iter = 0; iter < 30; iter++) {
              const mid = lo + (hi - lo) / 2
              const fMid = evalMarginPercent(xVal, mid) - target
              if (!Number.isFinite(fMid)) break
              if (Math.abs(fMid) <= 0.5) { // 0.5% tolerance
                points.push({ x: xVal, y: mid })
                break
              }
              if (fMin < 0) {
                // Function increases with decreasing y
                if (fMid < 0) lo = mid; else hi = mid
              } else {
                if (fMid > 0) lo = mid; else hi = mid
              }
            }
          }
        } catch {}
      }

      // Fallback: sample grid if iso-solve found nothing
      if (points.length === 0) {
        sampleGrid(xRange.steps, yRange.steps, 2)
        if (points.length === 0) sampleGrid(Math.max(60, xRange.steps), Math.max(60, yRange.steps), 6)
      }

      if (points.length > 0) {
        datasets.push({
          label: `${target}% Margin`,
          data: points,
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length],
          pointRadius: 2.5,
          pointHoverRadius: 4,
          borderWidth: 0,
          showLine: false
        })
      }
    })

    return { datasets }
  }, [xVariable, yVariable, targetMarginValue, parsedInputs, xMin, xMax, yMin, yMax])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Contour Plot: ${variableOptions.find(v => v.value === xVariable)?.label || xVariable} vs ${variableOptions.find(v => v.value === yVariable)?.label || yVariable}`
      },
      legend: {
        position: 'top' as const
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const xLabel = xVariable === 'purchaseToPayoutRate' ? `${context.parsed.x.toFixed(2)}%` : context.parsed.x.toFixed(2)
            const yLabel = yVariable === 'purchaseToPayoutRate' ? `${context.parsed.y.toFixed(2)}%` : context.parsed.y.toFixed(2)
            return `${context.dataset.label}: (${xLabel}, ${yLabel})`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        display: true,
        title: {
          display: true,
          text: variableOptions.find(v => v.value === xVariable)?.label || xVariable
        },
        min: xRange.min,
        max: xRange.max,
        ticks: xVariable === 'purchaseToPayoutRate' ? { callback: (v: any) => `${v}%` } : undefined
      },
      y: {
        type: 'linear' as const,
        display: true,
        title: {
          display: true,
          text: variableOptions.find(v => v.value === yVariable)?.label || yVariable
        },
        min: yRange.min,
        max: yRange.max,
        ticks: yVariable === 'purchaseToPayoutRate' ? { callback: (v: any) => `${v}%` } : undefined
      }
    }
  }

  // Export helpers
  function collectExportPoints(): ContourExportPoint[] {
    const points: ContourExportPoint[] = []
    for (const d of contourData.datasets as any[]) {
      for (const p of d.data as Array<{x:number,y:number}>) points.push({ dataset: d.label, x: p.x, y: p.y })
    }
    return points
  }

  // Simple “AI” assistant: parse commands like "set x 100 400", "target 45", "ptr 0-10"
  function handleAssistantCommand(cmd: string) {
    const t = cmd.trim().toLowerCase()
    if (t.startsWith('target')) { setTargetMargin(t.replace(/[^0-9.]/g, '')); return }
    if (t.startsWith('x ')) {
      const [a,b] = t.slice(2).split(/\s+/).map(parseFloat)
      if (!isNaN(a)) setXMin(a)
      if (!isNaN(b)) setXMax(b)
      return
    }
    if (t.startsWith('y ')) {
      const [a,b] = t.slice(2).split(/\s+/).map(parseFloat)
      if (!isNaN(a)) setYMin(a)
      if (!isNaN(b)) setYMax(b)
      return
    }
    if (t.startsWith('ptr')) { setXVariable('purchaseToPayoutRate') }
  }

  function handleXVarChange(v: string) {
    setXVariable(v)
    resetAxisIfChanged('x', v)
  }
  function handleYVarChange(v: string) {
    setYVariable(v)
    resetAxisIfChanged('y', v)
  }

  const [assistantOpen, setAssistantOpen] = useState(false)

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Contour Analysis</h2>
      
      {/* Variable Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">X Variable</label>
          <select 
            value={xVariable} 
            onChange={(e) => handleXVarChange(e.target.value)}
            className="w-full p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700"
          >
            {variableOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Y Variable</label>
          <select 
            value={yVariable} 
            onChange={(e) => handleYVarChange(e.target.value)}
            className="w-full p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700"
          >
            {variableOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Margin and Axis Ranges */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Target Margin</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={targetMargin}
              onChange={(e) => setTargetMargin(e.target.value)}
              placeholder="e.g. 50"
              className="p-2 rounded-md w-32 bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700"
              min="1"
              max="100"
              step="0.1"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">X Range</label>
          <div className="flex gap-2">
            <input type="number" className="w-24 p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700" value={xMin} onChange={(e)=>setXMin(parseFloat(e.target.value))} />
            <span className="self-center">to</span>
            <input type="number" className="w-24 p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700" value={xMax} onChange={(e)=>setXMax(parseFloat(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Y Range</label>
          <div className="flex gap-2">
            <input type="number" className="w-24 p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700" value={yMin} onChange={(e)=>setYMin(parseFloat(e.target.value))} />
            <span className="self-center">to</span>
            <input type="number" className="w-24 p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700" value={yMax} onChange={(e)=>setYMax(parseFloat(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 mb-4">
        {xVariable && yVariable && xVariable !== yVariable ? (
          <Scatter data={contourData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {xVariable === yVariable 
              ? "Please select different variables for X and Y axes"
              : "Select X and Y variables to generate contour plot"
            }
          </div>
        )}
      </div>

      {/* Export + Assistant */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => exportContourAsCSV(collectExportPoints())}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm"
          >Export CSV</button>
          <button
            onClick={() => exportContourAsJSON(collectExportPoints(), { xVariable, yVariable, targetMargin: targetMarginValue })}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm"
          >Export JSON</button>
        </div>
        <div className="flex-1" />
        <button onClick={() => setAssistantOpen(true)} className="px-3 py-2 rounded-md bg-neutral-800 text-white text-sm border border-border">Open AI Assistant</button>
      </div>

      {/* Data Summary */}
      <div className="text-sm text-gray-600">
        <p>Target margin: {targetMarginValue}%</p>
        <p>Points plotted: {contourData.datasets.reduce((sum, dataset) => sum + dataset.data.length, 0)}</p>
        {contourData.datasets.length === 0 && (
          <p className="text-yellow-600 mt-2">
            No data points found. Try adjusting your margin targets or variable ranges.
          </p>
        )}
      </div>

      <AssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        xVariable={xVariable}
        yVariable={yVariable}
        setXVariable={setXVariable}
        setYVariable={setYVariable}
        xMin={xMin}
        xMax={xMax}
        yMin={yMin}
        yMax={yMax}
        setXMin={setXMin}
        setXMax={setXMax}
        setYMin={setYMin}
        setYMax={setYMax}
        targetMargin={targetMarginValue}
        setTargetMarginString={setTargetMargin}
      />
    </div>
  )
}

export default ContourTab