import React, { useState, useMemo } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { calculateMargins } from '../utils/calculations'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Scatter } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const VARIABLE_OPTIONS = [
  { value: 'evalPrice', label: 'Eval Price' },
  { value: 'purchaseToPayoutRate', label: 'Funded to Payout Rate' },
  { value: 'avgPayout', label: 'Avg Payout' },
  { value: 'avgLivePayout', label: 'Avg Live Payout' }
]

const MARGIN_TARGETS = [
  { value: 30, label: '30%' },
  { value: 50, label: '50%' },
  { value: 80, label: '80%' }
]

function ContourTab() {
  const { inputs } = useSimulation()
  const [xVariable, setXVariable] = useState('evalPrice')
  const [yVariable, setYVariable] = useState('avgPayout')
  const [selectedTargets, setSelectedTargets] = useState<number[]>([50])
  const [customTarget, setCustomTarget] = useState('')

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
      // avgLiveSaved is a percentage 0..100
      avgLiveSaved: toNum(inputs.avgLiveSaved, 0),
      avgLivePayout: toNum(inputs.avgLivePayout, 7500),
      includeLive: !!inputs.includeLive,
      userFeePerAccount: toNum(inputs.userFeePerAccount, 5.83),
      dataFeePerAccount: toNum(inputs.dataFeePerAccount, 1.467),
      accountFeePerAccount: toNum(inputs.accountFeePerAccount, 3.5),
      staffingFeePercent: toNum(inputs.staffingFeePercent, 5),
      processorFeePercent: toNum(inputs.processorFeePercent, 5.5),
      affiliateFeePercent: toNum(inputs.affiliateFeePercent, 9.8),
      affiliateAppliesToActivation: !!inputs.affiliateAppliesToActivation
    }
  }, [inputs])

  // Get all margin targets (predefined + custom)
  const allTargets = useMemo(() => {
    const targets = [...selectedTargets]
    if (customTarget) {
      const customValue = parseFloat(customTarget)
      if (!isNaN(customValue) && customValue > 0 && customValue <= 100) {
        targets.push(customValue)
      }
    }
    // Ensure we always have at least one target
    return targets.length > 0 ? targets : [50]
  }, [selectedTargets, customTarget])

  // Generate contour data using grid sampling
  const contourData = useMemo(() => {
    if (!xVariable || !yVariable || xVariable === yVariable) {
      return { datasets: [] }
    }

    const datasets: any[] = []
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0ea5e9', '#ef4444']

    allTargets.forEach((targetMargin, index) => {
      const points: { x: number; y: number }[] = []
      
      // Define variable ranges based on the selected variables
      const getVariableRange = (varName: string) => {
        switch (varName) {
          case 'evalPrice': return { min: 50, max: 500, steps: 40 }
          case 'purchaseToPayoutRate': return { min: 0.05, max: 1.0, steps: 40 }
          case 'avgPayout': return { min: 1000, max: 15000, steps: 40 }
          case 'avgLivePayout': return { min: 1000, max: 20000, steps: 40 }
          default: return { min: 0, max: 100, steps: 25 }
        }
      }

      const xRange = getVariableRange(xVariable)
      const yRange = getVariableRange(yVariable)

      const sampleGrid = (stepsX: number, stepsY: number, tolerance: number) => {
        for (let i = 0; i <= stepsX; i++) {
          for (let j = 0; j <= stepsY; j++) {
            const xValue = xRange.min + (xRange.max - xRange.min) * (i / stepsX)
            const yValue = yRange.min + (yRange.max - yRange.min) * (j / stepsY)

            // Create calculation parameters with current x,y values
            const calcParams = { ...parsedInputs }
            calcParams[xVariable as keyof typeof calcParams] = xValue
            calcParams[yVariable as keyof typeof calcParams] = yValue

            try {
              const result = calculateMargins(
                calcParams.evalPrice,
                calcParams.purchaseToPayoutRate,
                calcParams.avgPayout,
                calcParams.useActivationFee,
                calcParams.activationFee,
                calcParams.evalPassRate,
                calcParams.avgLiveSaved,
                calcParams.avgLivePayout,
                calcParams.includeLive,
                calcParams.userFeePerAccount,
                calcParams.dataFeePerAccount,
                calcParams.accountFeePerAccount,
                calcParams.staffingFeePercent,
                calcParams.processorFeePercent,
                calcParams.affiliateFeePercent,
                calcParams.affiliateAppliesToActivation
              )

              const margin = result.priceMargin * 100 // Convert to percentage
              if (Number.isFinite(margin) && Math.abs(margin - targetMargin) <= tolerance) {
                points.push({ x: xValue, y: yValue })
              }
            } catch {
              // Skip invalid calculations
              continue
            }
          }
        }
      }

      // First pass: standard tolerance and resolution
      sampleGrid(xRange.steps, yRange.steps, 2)
      // Fallback: increase tolerance and resolution if no points found
      if (points.length === 0) sampleGrid(Math.max(50, xRange.steps), Math.max(50, yRange.steps), 5)

      if (points.length > 0) {
        datasets.push({
          label: `${targetMargin}% Margin`,
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
  }, [xVariable, yVariable, allTargets, parsedInputs])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Contour Plot: ${VARIABLE_OPTIONS.find(v => v.value === xVariable)?.label} vs ${VARIABLE_OPTIONS.find(v => v.value === yVariable)?.label}`
      },
      legend: {
        position: 'top' as const
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: (${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)})`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: VARIABLE_OPTIONS.find(v => v.value === xVariable)?.label || xVariable
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: VARIABLE_OPTIONS.find(v => v.value === yVariable)?.label || yVariable
        }
      }
    }
  }

  const handleTargetToggle = (target: number) => {
    setSelectedTargets(prev => 
      prev.includes(target) 
        ? prev.filter(t => t !== target)
        : [...prev, target]
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Contour Analysis</h2>
      
      {/* Variable Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">X Variable</label>
          <select 
            value={xVariable} 
            onChange={(e) => setXVariable(e.target.value)}
            className="w-full p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700"
          >
            {VARIABLE_OPTIONS.map(option => (
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
            onChange={(e) => setYVariable(e.target.value)}
            className="w-full p-2 rounded-md bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700"
          >
            {VARIABLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Margin Target Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Margin Targets</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {MARGIN_TARGETS.map(target => (
            <button
              key={target.value}
              onClick={() => handleTargetToggle(target.value)}
              className={`px-3 py-1 rounded-md text-sm ${
                selectedTargets.includes(target.value)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {target.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            placeholder="Custom target %"
            className="p-2 rounded-md w-32 bg-white text-gray-900 border border-gray-300 dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-700"
            min="0"
            max="100"
            step="0.1"
          />
          <span className="text-sm text-gray-500">%</span>
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

      {/* Data Summary */}
      <div className="text-sm text-gray-600">
        <p>Showing contour lines for margin targets: {allTargets.map(t => `${t}%`).join(', ')}</p>
        <p>Points plotted: {contourData.datasets.reduce((sum, dataset) => sum + dataset.data.length, 0)}</p>
        {contourData.datasets.length === 0 && (
          <p className="text-yellow-600 mt-2">
            No data points found. Try adjusting your margin targets or variable ranges.
          </p>
        )}
      </div>
    </div>
  )
}

export default ContourTab