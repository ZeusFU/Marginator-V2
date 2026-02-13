import React, { useState, useLayoutEffect, useEffect, useRef } from 'react'
import 'react-tabs/style/react-tabs.css'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

// Import context providers
import { SimulationProvider, useSimulationContext } from './context/SimulationContext'
import { ThemeProvider } from './context/ThemeContext'

// Import components
import { TabNavigation } from './components/TabNavigation'
import { ChartTabs } from './components/ChartTabs'
import { Toast } from './components/Toast'
import SimulationDashboard, { ScenarioSnapshot } from './components/SimulationDashboard'
import { VariablesPopover } from './components/VariablesPopover'
import { Settings as SettingsIcon, Pencil, Copy, X, Check } from 'lucide-react'
import EvalPriceChart from './charts/EvalPriceChart'
import PtrChart from './charts/PtrChart'
import AvgPayoutChart from './charts/AvgPayoutChart'
import PayoutRateChart from './charts/PayoutRateChart'
import EvalPriceRateChart from './charts/EvalPriceRateChart'
import ThresholdsTable from './charts/ThresholdsTable'
import ContourTab from './components/ContourTab'

// Import utilities
import { generatePDFReport } from './utils/pdfGenerator'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
)

// Chart closest results — shows top 10 data points nearest to a target margin
function ChartClosestResults({ activeTab, results }: { activeTab: number; results: any }) {
  const { chartMarginTarget, setChartMarginTarget, runSimulation } = useSimulationContext()
  const [targetStr, setTargetStr] = useState(String(chartMarginTarget))

  // Pick the right data set based on active chart tab
  const getDataAndLabel = () => {
    switch (activeTab) {
      case 0: return { data: results.evaluationPriceData, varLabel: 'Eval Price', fmt: (v: number) => `$${v.toFixed(2)}` }
      case 1: return { data: results.purchaseToPayoutRateData, varLabel: 'Purchase to Payout', fmt: (v: number) => `${(v * 100).toFixed(2)}%` }
      case 2: return { data: results.averagePayoutData, varLabel: 'Avg Payout', fmt: (v: number) => `$${v.toFixed(0)}` }
      default: return null
    }
  }

  const info = getDataAndLabel()
  if (!info || !info.data?.values?.length) return null

  const target = chartMarginTarget // already in percent
  const { data, varLabel, fmt } = info

  // Build rows: { value, margin% }
  const rows = data.values.map((v: number, i: number) => ({
    value: v,
    margin: data.priceMargins[i] as number, // already in percent
  }))

  // Sort by distance to target, take top 10
  const closest = [...rows]
    .filter((r: any) => Number.isFinite(r.margin))
    .sort((a: any, b: any) => Math.abs(a.margin - target) - Math.abs(b.margin - target))
    .slice(0, 10)
    .sort((a: any, b: any) => a.value - b.value)

  return (
    <div className="mt-4 space-y-3">
      {/* Target margin input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text_secondary">Target Margin</span>
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
      </div>

      {/* Top 10 closest */}
      <div>
        <span className="text-xs font-medium text-text_secondary mb-1.5 block">
          10 closest to {target}% margin
        </span>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface">
                <th className="text-left px-3 py-2 text-text_secondary font-medium w-8">#</th>
                <th className="text-left px-3 py-2 text-text_secondary font-medium">{varLabel}</th>
                <th className="text-right px-3 py-2 text-text_secondary font-medium">Margin</th>
                <th className="text-right px-3 py-2 text-text_secondary font-medium">Diff</th>
              </tr>
            </thead>
            <tbody>
              {closest.map((r: any, i: number) => {
                const diff = r.margin - target
                const isClose = Math.abs(diff) < 1
                return (
                  <tr key={i} className={`border-t border-border/50 ${i % 2 === 0 ? 'bg-card' : 'bg-card/80'}`}>
                    <td className="px-3 py-1.5 text-text_secondary tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-text_primary tabular-nums">{fmt(r.value)}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${isClose ? 'text-primary' : ''}`}>{r.margin.toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${diff > 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Main application content that uses the context
function AppContent() {
  const {
    inputs,
    updateInput,
    isLoading,
    error,
    results,
    runSimulation,
    visibleMargins,
    toggleMargin
  } = useSimulationContext()

  // Local UI state
  const [activeTab, setActiveTab] = useState(0)
  const [activeCategory, setActiveCategory] = useState('margins')
  const [showToast, setShowToast] = useState<{visible: boolean, message: string, type: 'success' | 'error'}>({
    visible: false, 
    message: '', 
    type: 'success'
  })
  const [savedScenarios, setSavedScenarios] = useState<Array<ScenarioSnapshot & { id: string; createdAt: number }>>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isVariablesOpen, setIsVariablesOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ top: 50, left: 0, caret: 24 })
  const pageRef = useRef<HTMLDivElement>(null)
  const variablesButtonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Position the popover relative to the gear button in the nav
  useLayoutEffect(() => {
    if (!isVariablesOpen || !variablesButtonRef.current || !pageRef.current) return
    const updatePosition = () => {
      const pageRect = pageRef.current!.getBoundingClientRect()
      const buttonRect = variablesButtonRef.current!.getBoundingClientRect()
      const width = 360
      const buttonLeftWithin = buttonRect.left - pageRect.left
      const desiredLeft = buttonLeftWithin - 12
      const left = Math.min(
        Math.max(0, desiredLeft),
        pageRect.width - width - 16
      )
      const top = buttonRect.bottom - pageRect.top + 10
      const caretRaw = buttonLeftWithin + buttonRect.width / 2 - left - 6
      const caret = Math.min(Math.max(18, caretRaw), width - 18)
      setPopoverPosition({ top, left, caret })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isVariablesOpen])

  useEffect(() => {
    if (!isVariablesOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        variablesButtonRef.current?.contains(event.target as Node) ||
        popoverRef.current?.contains(event.target as Node)
      ) return
      setIsVariablesOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isVariablesOpen])

  // Helper functions
  const displayToast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ visible: true, message, type })
  }
  const handleScenarioSave = (snapshot: ScenarioSnapshot) => {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setSavedScenarios(prev => [
      ...prev,
      { ...snapshot, id: newId, createdAt: Date.now() }
    ])
    setSelectedScenarioId(newId)
    displayToast('Scenario saved & selected')
  }

  const handleRemoveScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(item => item.id !== id))
    if (selectedScenarioId === id) setSelectedScenarioId(null)
  }

  const handleStartRename = (id: string) => {
    const scenario = savedScenarios.find(s => s.id === id)
    if (!scenario) return
    setRenamingId(id)
    setRenameValue(scenario.name)
  }

  const handleConfirmRename = () => {
    if (!renamingId || !renameValue.trim()) return
    setSavedScenarios(prev => prev.map(s => s.id === renamingId ? { ...s, name: renameValue.trim() } : s))
    setRenamingId(null)
    setRenameValue('')
  }

  const handleCancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const handleDuplicateScenario = (id: string) => {
    const scenario = savedScenarios.find(s => s.id === id)
    if (!scenario) return
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const copy = {
      ...scenario,
      id: newId,
      name: `${scenario.name} (Copy)`,
      createdAt: Date.now()
    }
    setSavedScenarios(prev => [...prev, copy])
    setSelectedScenarioId(newId)
    displayToast('Scenario duplicated & selected')
  }

  // Track when we're loading a card's values so the sync effect doesn't
  // overwrite the card with stale data from the previous simulation.
  const suppressSyncRef = useRef(false)
  const [pendingRun, setPendingRun] = useState(0)

  const handleSelectScenario = (id: string) => {
    if (selectedScenarioId === id) {
      setSelectedScenarioId(null)
      return
    }
    const scenario = savedScenarios.find(s => s.id === id)
    if (!scenario) return

    suppressSyncRef.current = true
    setSelectedScenarioId(id)

    // Populate variables from the card's saved data
    updateInput('evalPrice', scenario.price)
    updateInput('evalPassRate', scenario.passRate)
    updateInput('simFundedRate', scenario.payoutRate)
    updateInput('avgPayout', scenario.avgPayout)

    // Signal that we need to run simulation after state flushes
    setPendingRun(c => c + 1)
  }

  // Run simulation after React has flushed the input state updates
  useEffect(() => {
    if (pendingRun === 0) return
    runSimulation()
    // Re-enable sync after this simulation's results arrive
    const timer = setTimeout(() => { suppressSyncRef.current = false }, 100)
    return () => clearTimeout(timer)
  }, [pendingRun])

  // Sync variable changes back to the selected scenario card
  // (only when the user actively changes variables, not during card selection)
  useEffect(() => {
    if (!selectedScenarioId || !results || suppressSyncRef.current) return
    const m = results.baseMargins
    if (!m) return
    setSavedScenarios(prev => prev.map(s => {
      if (s.id !== selectedScenarioId) return s
      return {
        ...s,
        price: Number(inputs.evalPrice),
        passRate: Number(inputs.evalPassRate),
        payoutRate: Number(inputs.simFundedRate),
        avgPayout: Number(inputs.avgPayout),
        margin: m.priceMargin ?? s.margin
      }
    }))
  }, [results, selectedScenarioId])

  const formatCurrencyDisplay = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  const formatPercentDisplay = (value: number) => `${value.toFixed(2)}%`

  const handleCloseToast = () => {
    setShowToast(prev => ({ ...prev, visible: false }))
  }

  const handleGeneratePDFReport = () => {
    if (!results) return

    generatePDFReport({
      baseMargins: results.baseMargins,
      evalPrice: Number(inputs.evalPrice),
      evalPassRate: Number(inputs.evalPassRate),
      simFundedRate: Number(inputs.simFundedRate),
      avgPayout: Number(inputs.avgPayout),
      useActivationFee: inputs.useActivationFee,
      activationFee: Number(inputs.activationFee),
      purchaseToPayoutRate: results.purchaseToPayoutRate,
      evaluationPriceData: results.evaluationPriceData,
      purchaseToPayoutRateData: results.purchaseToPayoutRateData,
      averagePayoutData: results.averagePayoutData,
      payoutRateData: results.payoutRateData,
      evalPriceRateData: results.evalPriceRateData,
      evaluationPriceThresholds: results.evaluationPriceThresholds,
      purchaseToPayoutRateThresholds: results.purchaseToPayoutRateThresholds,
      averagePayoutThresholds: results.averagePayoutThresholds,
      exactThresholds: results.exactThresholds
    })

    displayToast('PDF report generated successfully')
  }

  const handleRunSimulation = () => {
    try {
      const simulationResults = runSimulation()
      if (simulationResults) {
        displayToast('Simulation completed successfully')
      } else if (error) {
        displayToast(error, 'error')
      }
    } catch (err) {
      console.error('Error running simulation:', err)
      displayToast('An unexpected error occurred while running the simulation', 'error')
    }
  }

  // Render the active chart based on current tab
  const renderActiveChart = () => {
    if (!results) return (
      <div className="flex flex-col items-center justify-center h-96 text-text_secondary">
        <p className="text-sm">Enter values and run simulation to see charts</p>
        <button 
          onClick={handleRunSimulation}
          className="mt-4 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Run Simulation
        </button>
      </div>
    )

    switch (activeTab) {
      case 0:
        return (
          <EvalPriceChart 
            data={results.evaluationPriceData} 
            thresholds={results.evaluationPriceThresholds}
            visibleMargins={visibleMargins.evalPrice}
            toggleMargin={(margin) => toggleMargin('evalPrice', margin)}
          />
        )
      case 1:
        return (
          <PtrChart 
            data={results.purchaseToPayoutRateData} 
            thresholds={results.purchaseToPayoutRateThresholds}
            visibleMargins={visibleMargins.ptrRate}
            toggleMargin={(margin) => toggleMargin('ptrRate', margin)}
          />
        )
      case 2:
        return (
          <AvgPayoutChart 
            data={results.averagePayoutData} 
            thresholds={results.averagePayoutThresholds}
            visibleMargins={visibleMargins.avgPayout}
            toggleMargin={(margin) => toggleMargin('avgPayout', margin)}
          />
        )
      case 3:
        return (
          <PayoutRateChart 
            data={results.payoutRateData}
            visibleMargins={visibleMargins.payoutRate}
            toggleMargin={(margin) => toggleMargin('payoutRate', margin)}
          />
        )
      case 4:
        return (
          <EvalPriceRateChart 
            data={results.evalPriceRateData}
            visibleMargins={visibleMargins.evalPriceRate}
            toggleMargin={(margin) => toggleMargin('evalPriceRate', margin)}
          />
        )
      default:
        return null
    }
  }

  // Gear button rendered in the nav bar (hidden on mobile — FAB is used instead)
  const gearButton = (
    <button
      ref={variablesButtonRef}
      onClick={() => setIsVariablesOpen(!isVariablesOpen)}
      aria-label="Adjust variables"
      className={`hidden md:flex w-9 h-9 rounded-lg border items-center justify-center transition-colors mr-1 ${
        isVariablesOpen
          ? 'bg-primary text-white border-primary'
          : 'bg-card text-primary border-border hover:bg-surface'
      }`}
    >
      <SettingsIcon className="w-4 h-4" />
    </button>
  )

  // Render content based on the current activeCategory
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'margins':
        return (
          <div className="bg-card rounded-xl shadow-card border border-border p-4">
            {error ? (
              <div className="error-message p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                {error}
              </div>
            ) : results ? (
              <SimulationDashboard
                onSaveScenario={handleScenarioSave}
                onDuplicateScenario={handleDuplicateScenario}
                planCount={savedScenarios.length}
                savedScenarios={savedScenarios}
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={handleSelectScenario}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-text_secondary">
                <p className="text-sm mb-1">Configure your variables and run a simulation.</p>
                <p className="text-xs text-muted mb-4">Use the gear icon to set parameters.</p>
                <button 
                  onClick={handleRunSimulation}
                  className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Run Simulation
                </button>
              </div>
            )}
          </div>
        )
      case 'charts':
        return (
          <div className="chart-container relative p-4 bg-card rounded-xl shadow-card border border-border overflow-visible">
            {error ? (
              <div className="error-message p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                {error}
              </div>
            ) : isLoading ? (
              <div className="loading-indicator flex items-center justify-center h-96">
                <div className="spinner"></div>
                <span className="ml-2">Processing simulation...</span>
              </div>
            ) : results ? (
              <>
                <div className="mb-4">
                  <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                {renderActiveChart()}
                <ChartClosestResults activeTab={activeTab} results={results} />
              </>
            ) : (
              <>
                <div className="mb-4">
                  <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                {renderActiveChart()}
              </>
            )}
          </div>
        )
      case 'thresholds':
        return (
          <div className="thresholds-container p-4 bg-card rounded-xl shadow-card border border-border">
            {results ? (
              <>
                <SimulationDashboard
                  onSaveScenario={handleScenarioSave}
                  onDuplicateScenario={handleDuplicateScenario}
                  planCount={savedScenarios.length}
                  savedScenarios={savedScenarios}
                  selectedScenarioId={selectedScenarioId}
                  onSelectScenario={handleSelectScenario}
                />
                <ThresholdsTable 
                  thresholds={results.exactThresholds}
                  evalPrice={inputs.evalPrice}
                  purchaseToPayoutRate={results.purchaseToPayoutRate}
                  avgPayout={inputs.avgPayout}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-text_secondary">
                Run simulation to see threshold values
              </div>
            )}
          </div>
        )
      case 'contour':
        return (
          <div className="bg-card rounded-xl shadow-card border border-border">
            <ContourTab />
          </div>
        )
      case 'compare':
        return (
          <div>
            {savedScenarios.length === 0 ? (
              <div className="text-center text-text_secondary py-8 text-sm bg-card rounded-xl shadow-card border border-border">
                Save scenarios from the Margins tab to compare them here.
              </div>
            ) : (
              <div className={`grid gap-3 ${
                savedScenarios.length === 1 ? 'grid-cols-1 max-w-xs' :
                savedScenarios.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {savedScenarios.map((scenario) => {
                  const isSelected = selectedScenarioId === scenario.id
                  const barColor = scenario.margin >= 0.5 ? 'bg-[#1E3A5F]' : scenario.margin >= 0.3 ? 'bg-[#2A5080]' : 'bg-[#4A7EC7]'
                  return (
                    <div
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario.id)}
                      className={`${barColor} text-white rounded-xl px-4 py-3 cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-white/70 shadow-lg scale-[1.02]' : 'hover:brightness-110'
                      }`}
                    >
                      {/* Header: name + actions */}
                      <div className="flex items-center justify-between mb-1" onClick={(e) => e.stopPropagation()}>
                        {renamingId === scenario.id ? (
                          <>
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRename()
                                if (e.key === 'Escape') handleCancelRename()
                              }}
                              className="flex-1 min-w-0 bg-white/15 text-white text-[11px] font-medium rounded px-2 py-0.5 outline-none placeholder:text-white/30 border border-white/20 focus:border-white/50"
                              placeholder="Scenario name"
                            />
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={handleConfirmRename}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                title="Confirm"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={handleCancelRename}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span
                              className="text-[10px] font-medium text-white/60 uppercase tracking-wide truncate mr-2"
                              onDoubleClick={() => handleStartRename(scenario.id)}
                            >
                              {scenario.name}
                              {isSelected && <span className="ml-1.5 text-white/40">· selected</span>}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => handleStartRename(scenario.id)}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                title="Rename"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicateScenario(scenario.id)}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveScenario(scenario.id)}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                title="Remove"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Margin */}
                      <div className="text-2xl font-bold leading-tight mb-2">{formatPercentDisplay(scenario.margin * 100)}</div>
                      {/* Metrics stacked */}
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-white/50">Price</span>
                          <span className="text-white font-medium tabular-nums">{formatCurrencyDisplay(scenario.price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Pass Rate</span>
                          <span className="text-white font-medium tabular-nums">{formatPercentDisplay(scenario.passRate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Payout Rate</span>
                          <span className="text-white font-medium tabular-nums">{formatPercentDisplay(scenario.payoutRate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Avg. Payout</span>
                          <span className="text-white font-medium tabular-nums">{formatCurrencyDisplay(scenario.avgPayout)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      case 'export':
        return (
          <div className="export-container p-4 bg-card rounded-xl shadow-card border border-border">
            <h2 className="text-lg font-semibold mb-4">Export Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleGeneratePDFReport}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                disabled={!results}
              >
                Generate PDF Report
              </button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div ref={pageRef} className="app-container min-h-screen bg-background text-text_primary relative">
      <main className="p-4 pb-24 md:pb-4 max-w-7xl mx-auto">
        <TabNavigation 
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          gearButton={gearButton}
          onOpenVariables={() => setIsVariablesOpen(true)}
          isVariablesOpen={isVariablesOpen}
        />
        <div className="mt-4">
          {renderCategoryContent()}
        </div>
      </main>
      {/* Variables Popover - now positioned relative to the page */}
      <VariablesPopover
        isOpen={isVariablesOpen}
        onClose={() => setIsVariablesOpen(false)}
        onRun={handleRunSimulation}
        position={popoverPosition}
        popoverRef={popoverRef}
      />
      <Toast
        visible={showToast.visible}
        message={showToast.message}
        type={showToast.type}
        onClose={handleCloseToast}
      />
    </div>
  )
}

// Wrap with providers
function App() {
  return (
    <ThemeProvider>
      <SimulationProvider>
        <AppContent />
      </SimulationProvider>
    </ThemeProvider>
  )
}

export default App
